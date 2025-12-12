/**
 * Spatial Service
 * Extracts OSM features from vector tiles
 */

const pbfModule = require('pbf');
const Pbf = pbfModule.default || pbfModule;
const zlib = require('zlib');
const TileServer = require('../map/tiles');

// Cache for VectorTile class (ES module)
let VectorTile = null;

class SpatialService {
  constructor(tileServer) {
    this.tileServer = tileServer;
  }

  /**
   * Convert tile coordinates to geographic bounds
   */
  tileToBounds(z, x, y) {
    const n = Math.pow(2, z);
    const lonMin = (x / n) * 360 - 180;
    const lonMax = ((x + 1) / n) * 360 - 180;
    const latMin = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 1) / n))) * 180 / Math.PI;
    const latMax = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI;
    
    return {
      minLon: lonMin,
      minLat: latMin,
      maxLon: lonMax,
      maxLat: latMax
    };
  }

  /**
   * Get tile coordinates for a bounding box
   */
  getTilesForBounds(bounds, zoom) {
    const tiles = [];
    const n = Math.pow(2, zoom);
    
    const xMin = Math.floor((bounds.minLon + 180) / 360 * n);
    const xMax = Math.floor((bounds.maxLon + 180) / 360 * n);
    const yMin = Math.floor((1 - Math.log(Math.tan(bounds.minLat * Math.PI / 180) + 1 / Math.cos(bounds.minLat * Math.PI / 180)) / Math.PI) / 2 * n);
    const yMax = Math.floor((1 - Math.log(Math.tan(bounds.maxLat * Math.PI / 180) + 1 / Math.cos(bounds.maxLat * Math.PI / 180)) / Math.PI) / 2 * n);
    
    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        if (x >= 0 && x < n && y >= 0 && y < n) {
          tiles.push({ z: zoom, x, y });
        }
      }
    }
    
    return tiles;
  }

  /**
   * Check if a point is within bounds
   */
  isPointInBounds(point, bounds) {
    return point.lon >= bounds.minLon && 
           point.lon <= bounds.maxLon && 
           point.lat >= bounds.minLat && 
           point.lat <= bounds.maxLat;
  }

  /**
   * Check if a geometry intersects bounds
   */
  geometryIntersectsBounds(geometry, bounds) {
    if (!geometry || !geometry.coordinates) return false;
    
    // For points
    if (geometry.type === 'Point') {
      return this.isPointInBounds(
        { lon: geometry.coordinates[0], lat: geometry.coordinates[1] },
        bounds
      );
    }
    
    // For LineString and MultiLineString
    if (geometry.type === 'LineString' || geometry.type === 'MultiLineString') {
      const coords = geometry.type === 'LineString' 
        ? geometry.coordinates 
        : geometry.coordinates.flat();
      
      return coords.some(coord => 
        this.isPointInBounds({ lon: coord[0], lat: coord[1] }, bounds)
      );
    }
    
    // For Polygon and MultiPolygon
    if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
      const polygons = geometry.type === 'Polygon' 
        ? [geometry.coordinates] 
        : geometry.coordinates;
      
      return polygons.some(polygon => {
        // Check if any vertex is in bounds
        return polygon[0].some(coord => 
          this.isPointInBounds({ lon: coord[0], lat: coord[1] }, bounds)
        );
      });
    }
    
    return false;
  }

  /**
   * Convert vector tile feature to GeoJSON
   */
  featureToGeoJSON(feature, layerName, tile) {
    // vector-tile-js expects (x, y, z) tile coordinates and returns WGS84 GeoJSON
    const geometry = feature.toGeoJSON(tile.x, tile.y, tile.z);

    const properties = feature.properties || {};
    
    return {
      type: 'Feature',
      geometry: geometry,
      properties: {
        ...properties,
        _layer: layerName,
        _tile: `${tile.z}/${tile.x}/${tile.y}`
      }
    };
  }

  /**
   * Decompress tile data
   */
  async decompressTile(tileBuffer) {
    return new Promise((resolve, reject) => {
      zlib.gunzip(tileBuffer, (err, decompressed) => {
        if (err) {
          // Try uncompressed
          resolve(tileBuffer);
        } else {
          resolve(decompressed);
        }
      });
    });
  }

  /**
   * Get OSM features from vector tiles
   * @param {Object} options - Query options
   * @param {string} options.source - MBTiles source name
   * @param {string} options.layer - Layer name (points, lines, multipolygons, poi, place, etc.)
   * @param {Object} options.bounds - Bounding box {minLon, minLat, maxLon, maxLat}
   * @param {number} options.zoom - Zoom level (default: 14)
   * @param {Object} options.filter - Optional filter function or properties to match
   * @param {string} options.summaryBy - When provided, returns counts grouped by this property instead of features
   */
  async get_osm_features(options = {}) {
    // Ensure VectorTile is loaded
    if (!VectorTile) {
      const vectorTileModule = await import('@mapbox/vector-tile');
      VectorTile = vectorTileModule.VectorTile;
    }
    const { source, layer, bounds, zoom = 14, filter, summaryBy } = options;
    
    if (!source) {
      throw new Error('Source is required');
    }
    
    if (!layer) {
      throw new Error('Layer is required');
    }
    
    if (!bounds) {
      throw new Error('Bounds are required');
    }
    
    // Get tiles that cover the bounds
    const tiles = this.getTilesForBounds(bounds, zoom);
    const features = [];
    const summaryCounts = summaryBy ? Object.create(null) : null;
    let total = 0;
    
    // Process each tile
    for (const tile of tiles) {
      try {
        // Get tile data
        const result = await this.tileServer.getTile(source, tile.z, tile.x, tile.y);
        
        if (!result || !result.tile) {
          continue;
        }
        
        // Decompress if needed
        const tileData = await this.decompressTile(result.tile);
        
        // Parse vector tile
        const vectorTile = new VectorTile(new Pbf(tileData));
        
        // Get the requested layer
        const tileLayer = vectorTile.layers[layer];
        
        if (!tileLayer) {
          // Layer doesn't exist in this tile, skip
          continue;
        }
        
        // Extract features from the layer
        for (let i = 0; i < tileLayer.length; i++) {
          const feature = tileLayer.feature(i);
          
          // Convert to GeoJSON
          const geoJSON = this.featureToGeoJSON(feature, layer, tile);
          
          // Filter by bounds (more precise check)
          if (!this.geometryIntersectsBounds(geoJSON.geometry, bounds)) {
            continue;
          }
          
          // Apply custom filter if provided
          if (filter) {
            if (typeof filter === 'function') {
              if (!filter(geoJSON)) {
                continue;
              }
            } else if (typeof filter === 'object') {
              // Filter by properties
              const matches = Object.keys(filter).every(key => {
                return geoJSON.properties[key] === filter[key];
              });
              if (!matches) {
                continue;
              }
            }
          }

          if (summaryBy) {
            const key = geoJSON.properties?.[summaryBy];
            if (key != null && key !== '') {
              summaryCounts[key] = (summaryCounts[key] || 0) + 1;
              total += 1;
            }
          } else {
            features.push(geoJSON);
          }
        }
      } catch (error) {
        console.warn(`Error processing tile ${tile.z}/${tile.x}/${tile.y}:`, error.message);
        continue;
      }
    }

    if (summaryBy) {
      return {
        summaryBy,
        counts: summaryCounts,
        total
      };
    }

    return {
      type: 'FeatureCollection',
      features: features
    };
  }
}

module.exports = SpatialService;

