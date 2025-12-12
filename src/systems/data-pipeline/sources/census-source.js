/**
 * Census Data Source
 * Reads census zipcode data from GPKG files or JSON fallback
 */

let Database = null;
try {
  Database = require('better-sqlite3');
} catch (e) {
  console.warn('better-sqlite3 not available, will use JSON fallback');
}

const path = require('path');
const fs = require('fs');

class CensusSource {
  constructor(options = {}) {
    const basePath = path.join(__dirname, '../../../..', 'data/processed/census');
    this.dataPath = options.dataPath || path.join(basePath, 'census_zipcode_data.gpkg');
    this.jsonPath = path.join(basePath, 'census_zipcode_data.json');
    this.db = null;
    this.geojsonData = null;
    this.useJSON = false;
    this.cache = new Map();
    this.cacheTTL = options.cacheTTL || 3600000; // 1 hour
  }

  /**
   * Initialize the source - open database connection or load JSON
   */
  async initialize() {
    // Try JSON first (no native dependencies)
    if (fs.existsSync(this.jsonPath)) {
      try {
        const jsonData = fs.readFileSync(this.jsonPath, 'utf8');
        this.geojsonData = JSON.parse(jsonData);
        this.useJSON = true;
        console.log(`Census source initialized from JSON: ${this.jsonPath}`);
        return true;
      } catch (error) {
        console.warn(`Error loading JSON file: ${error.message}`);
      }
    }

    // Fallback to GPKG if better-sqlite3 is available
    if (Database && fs.existsSync(this.dataPath)) {
      try {
        this.db = new Database(this.dataPath, { readonly: true });
        console.log(`Census source initialized from GPKG: ${this.dataPath}`);
        return true;
      } catch (error) {
        console.error(`Error opening census database: ${error.message}`);
        console.warn('Tip: Run "python tools/etl/export_to_json.py" to create JSON fallback');
        return false;
      }
    }

    console.warn(`Census data file not found. Expected: ${this.dataPath} or ${this.jsonPath}`);
    console.warn('Tip: Run the ETL scripts to import census data, then run "python tools/etl/export_to_json.py"');
    return false;
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Get all available zipcodes
   */
  async getZipcodes() {
    const cacheKey = 'zipcodes_list';
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    // If using JSON, extract zipcodes from features
    if (this.useJSON && this.geojsonData) {
      const zipcodes = [...new Set(
        (this.geojsonData.features || [])
          .map(f => f.properties?.ZIPCODE)
          .filter(z => z)
      )].sort();
      this.cache.set(cacheKey, { data: zipcodes, timestamp: Date.now() });
      return zipcodes;
    }

    if (!this.db) {
      throw new Error('Census source not initialized');
    }

    try {
      const stmt = this.db.prepare(`
        SELECT DISTINCT ZIPCODE 
        FROM acs_data_table 
        WHERE ZIPCODE IS NOT NULL
        ORDER BY ZIPCODE
      `);
      const rows = stmt.all();
      const zipcodes = rows.map(row => row.ZIPCODE);

      this.cache.set(cacheKey, { data: zipcodes, timestamp: Date.now() });
      return zipcodes;
    } catch (error) {
      // Fallback to zipcodes layer if acs_data_table doesn't exist
      try {
        const stmt = this.db.prepare(`
          SELECT DISTINCT ZIPCODE 
          FROM zipcodes 
          WHERE ZIPCODE IS NOT NULL
          ORDER BY ZIPCODE
        `);
        const rows = stmt.all();
        const zipcodes = rows.map(row => row.ZIPCODE);
        this.cache.set(cacheKey, { data: zipcodes, timestamp: Date.now() });
        return zipcodes;
      } catch (fallbackError) {
        throw new Error(`Error fetching zipcodes: ${fallbackError.message}`);
      }
    }
  }

  /**
   * Get data for a specific zipcode
   */
  async getZipcodeData(zipcode) {
    const cacheKey = `zipcode_${zipcode}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    if (!this.db) {
      throw new Error('Census source not initialized');
    }

    // Normalize zipcode (ensure 5 digits with leading zeros)
    const normalizedZip = String(zipcode).padStart(5, '0');

    try {
      // Try to get data from acs_data_table first (no geometry, faster)
      let stmt = this.db.prepare(`
        SELECT * FROM acs_data_table WHERE ZIPCODE = ?
      `);
      let row = stmt.get(normalizedZip);

      if (!row) {
        // Fallback to acs_data layer (with geometry)
        stmt = this.db.prepare(`
          SELECT * FROM acs_data WHERE ZIPCODE = ?
        `);
        row = stmt.get(normalizedZip);
      }

      if (!row) {
        return null;
      }

      // Convert to plain object
      const data = { ...row };
      
      // Remove geometry if present (for JSON serialization)
      if (data.geometry) {
        // GPKG stores geometry as binary, we'll skip it for now
        // If needed, we can decode it using a library
        delete data.geometry;
      }

      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      throw new Error(`Error fetching zipcode data: ${error.message}`);
    }
  }

  /**
   * Query data by bounds (spatial query)
   */
  async queryByBounds(bounds) {
    const { minLon, minLat, maxLon, maxLat } = bounds;
    const cacheKey = `bounds_${minLon}_${minLat}_${maxLon}_${maxLat}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    if (!this.db) {
      throw new Error('Census source not initialized');
    }

    try {
      // Use spatial query on zipcodes layer
      // Note: This is a simplified bounding box query
      // For more accurate spatial queries, we'd need to use spatialite extensions
      const stmt = this.db.prepare(`
        SELECT 
          z.ZIPCODE,
          z.geometry,
          a.*
        FROM zipcodes z
        LEFT JOIN acs_data_table a ON z.ZIPCODE = a.ZIPCODE
        WHERE 
          z.ZIPCODE IS NOT NULL
        LIMIT 1000
      `);

      const rows = stmt.all();
      
      // Filter by bounds (simplified - would be better with spatial index)
      // For now, we'll return all and let the client filter, or use a more sophisticated approach
      const filtered = rows.filter(row => {
        // This is a placeholder - actual spatial filtering would require geometry parsing
        return true;
      });

      const data = filtered.map(row => {
        const result = { ...row };
        if (result.geometry) {
          delete result.geometry; // Skip binary geometry for JSON
        }
        return result;
      });

      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      // Fallback to non-spatial query
      try {
        const stmt = this.db.prepare(`
          SELECT * FROM acs_data_table LIMIT 1000
        `);
        const rows = stmt.all();
        const data = rows.map(row => ({ ...row }));
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      } catch (fallbackError) {
        throw new Error(`Error querying by bounds: ${fallbackError.message}`);
      }
    }
  }

  /**
   * Query data by attributes (filter)
   */
  async queryByAttributes(filters) {
    if (!this.db) {
      throw new Error('Census source not initialized');
    }

    try {
      let query = 'SELECT * FROM acs_data_table WHERE 1=1';
      const params = [];

      // Build WHERE clause from filters
      if (filters.zipcode) {
        query += ' AND ZIPCODE = ?';
        params.push(String(filters.zipcode).padStart(5, '0'));
      }

      // Add other filters as needed
      Object.keys(filters).forEach(key => {
        if (key !== 'zipcode' && filters[key] !== undefined) {
          query += ` AND ${key} = ?`;
          params.push(filters[key]);
        }
      });

      query += ' LIMIT 1000';

      const stmt = this.db.prepare(query);
      const rows = params.length > 0 ? stmt.all(...params) : stmt.all();
      
      return rows.map(row => ({ ...row }));
    } catch (error) {
      throw new Error(`Error querying by attributes: ${error.message}`);
    }
  }

  /**
   * Get metadata about available variables
   */
  async getMetadata() {
    if (!this.db) {
      throw new Error('Census source not initialized');
    }

    try {
      // Get column names from acs_data_table
      const stmt = this.db.prepare(`
        SELECT * FROM acs_data_table LIMIT 1
      `);
      const row = stmt.get();
      
      if (!row) {
        return { variables: [], zipcodeCount: 0 };
      }

      const variables = Object.keys(row).filter(key => key !== 'ZIPCODE' && key !== 'geometry');
      const zipcodeCount = await this.getZipcodes().then(z => z.length);

      return {
        variables,
        zipcodeCount,
        dataPath: this.dataPath
      };
    } catch (error) {
      return { variables: [], zipcodeCount: 0, error: error.message };
    }
  }

  /**
   * Get zipcode boundaries with census data as GeoJSON
   * @param {Object} options - Query options
   * @param {Object} options.bounds - Optional bounds {minLon, minLat, maxLon, maxLat}
   * @param {string} options.variable - Optional variable name to include
   * @returns {Object} GeoJSON FeatureCollection
   */
  async getZipcodesGeoJSON(options = {}) {
    const { bounds, variable } = options;
    const cacheKey = `geojson_${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    // If using JSON, return it directly (with optional filtering)
    if (this.useJSON && this.geojsonData) {
      let features = this.geojsonData.features || [];
      
      // Apply bounds filtering if provided
      if (bounds) {
        features = features.filter(feature => {
          if (!feature.geometry || !feature.geometry.coordinates) return false;
          // Simple bounding box check (could be more sophisticated)
          const coords = feature.geometry.coordinates[0]; // First ring of polygon
          const lons = coords.map(c => c[0]);
          const lats = coords.map(c => c[1]);
          const minLon = Math.min(...lons);
          const maxLon = Math.max(...lons);
          const minLat = Math.min(...lats);
          const maxLat = Math.max(...lats);
          
          // Check if feature overlaps with bounds
          return !(maxLon < bounds.minLon || minLon > bounds.maxLon || 
                   maxLat < bounds.minLat || minLat > bounds.maxLat);
        });
      }
      
      const geojson = {
        type: 'FeatureCollection',
        features: features
      };
      
      this.cache.set(cacheKey, { data: geojson, timestamp: Date.now() });
      return geojson;
    }

    if (!this.db) {
      throw new Error('Census source not initialized. Run "python tools/etl/export_to_json.py" to create JSON fallback.');
    }

    try {
      // Try multiple approaches to get geometry
      let query = '';
      let useWKT = false;
      
      // First, check if geometry_wkt column exists (from Python helper script)
      try {
        const checkStmt = this.db.prepare(`
          SELECT geometry_wkt FROM zipcodes LIMIT 1
        `);
        checkStmt.get();
        useWKT = true;
      } catch (e) {
        // geometry_wkt doesn't exist, try AsGeoJSON
        useWKT = false;
      }

      if (useWKT) {
        // Use WKT column if available
        query = `
          SELECT 
            z.ZIPCODE,
            z.geometry_wkt,
            a.*
          FROM zipcodes z
          LEFT JOIN acs_data_table a ON z.ZIPCODE = a.ZIPCODE
          WHERE z.ZIPCODE IS NOT NULL AND z.geometry_wkt IS NOT NULL
        `;
      } else {
        // Try to use spatialite's AsGeoJSON function
        query = `
          SELECT 
            z.ZIPCODE,
            AsGeoJSON(z.geometry) as geometry_json,
            a.*
          FROM zipcodes z
          LEFT JOIN acs_data_table a ON z.ZIPCODE = a.ZIPCODE
          WHERE z.ZIPCODE IS NOT NULL
        `;
      }

      const stmt = this.db.prepare(query);
      const rows = stmt.all();

      // Build GeoJSON FeatureCollection
      const features = [];
      
      for (const row of rows) {
        try {
          let geometry = null;
          
          if (useWKT && row.geometry_wkt) {
            // Convert WKT to GeoJSON using a simple parser
            geometry = this.wktToGeoJSON(row.geometry_wkt);
          } else if (row.geometry_json) {
            // Parse GeoJSON from spatialite
            try {
              geometry = typeof row.geometry_json === 'string' 
                ? JSON.parse(row.geometry_json) 
                : row.geometry_json;
            } catch (e) {
              console.warn(`Could not parse geometry for zipcode ${row.ZIPCODE}: ${e.message}`);
              continue;
            }
          } else {
            // Geometry not available - skip this feature
            continue;
          }

          // Build properties object
          const properties = {
            ZIPCODE: row.ZIPCODE
          };

          // Add all ACS variables to properties
          Object.keys(row).forEach(key => {
            if (key !== 'ZIPCODE' && key !== 'geometry' && key !== 'geometry_json' && key !== 'geometry_wkt') {
              const value = row[key];
              // Convert numeric strings to numbers
              if (value !== null && value !== undefined) {
                if (typeof value === 'string' && /^-?\d+\.?\d*$/.test(value.trim())) {
                  properties[key] = parseFloat(value);
                } else {
                  properties[key] = value;
                }
              }
            }
          });

          features.push({
            type: 'Feature',
            geometry: geometry,
            properties: properties
          });
        } catch (error) {
          console.warn(`Error processing zipcode ${row.ZIPCODE}: ${error.message}`);
          continue;
        }
      }

      const geojson = {
        type: 'FeatureCollection',
        features: features
      };

      this.cache.set(cacheKey, { data: geojson, timestamp: Date.now() });
      return geojson;
    } catch (error) {
      // If AsGeoJSON fails, suggest running the Python helper script
      if (error.message.includes('no such function: AsGeoJSON')) {
        throw new Error('Spatialite extension not available. Please run: python tools/etl/convert_geometry_to_wkt.py to convert geometry to WKT.');
      }
      throw new Error(`Error generating GeoJSON: ${error.message}`);
    }
  }

  /**
   * Simple WKT to GeoJSON converter for POLYGON geometries
   * This is a basic implementation - for complex geometries, use a proper library
   */
  wktToGeoJSON(wkt) {
    if (!wkt || typeof wkt !== 'string') {
      return null;
    }

    // Handle POLYGON((lon lat, lon lat, ...))
    const polygonMatch = wkt.match(/^POLYGON\s*\(\s*\(([^)]+)\)\s*\)$/i);
    if (polygonMatch) {
      const coordsStr = polygonMatch[1];
      const coords = coordsStr.split(',').map(coord => {
        const parts = coord.trim().split(/\s+/);
        return [parseFloat(parts[0]), parseFloat(parts[1])];
      });
      
      return {
        type: 'Polygon',
        coordinates: [coords]
      };
    }

    // Handle MULTIPOLYGON
    const multiPolygonMatch = wkt.match(/^MULTIPOLYGON\s*\(/i);
    if (multiPolygonMatch) {
      // For now, extract first polygon (can be enhanced)
      const firstPolygon = wkt.match(/\(\(([^)]+)\)\)/);
      if (firstPolygon) {
        return this.wktToGeoJSON(`POLYGON((${firstPolygon[1]}))`);
      }
    }

    // Fallback: return null if we can't parse
    console.warn(`Could not parse WKT: ${wkt.substring(0, 50)}...`);
    return null;
  }
}

module.exports = CensusSource;

