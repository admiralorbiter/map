/**
 * Tile serving system
 * Handles MBTiles file access and tile serving
 */

const MBTiles = require('@mapbox/mbtiles');
const fs = require('fs');
const path = require('path');
const config = require('../../../config');

class TileServer {
  constructor(options = {}) {
    this.tileCache = new Map();
    this.cacheMaxSize = options.cacheMaxSize || config.tiles.cacheMaxSize;
    this.cacheTTL = options.cacheTTL || config.tiles.cacheTTL;
    this.mbtilesFiles = new Map(); // Cache opened MBTiles instances
    this.dataPath = options.dataPath || config.dataSources.osm.dataPath;
    
    // Discover available MBTiles files
    this.discoverMbtilesFiles();
  }

  /**
   * Discover available MBTiles files in the data directory
   */
  discoverMbtilesFiles() {
    // Check multiple locations for backward compatibility
    const searchPaths = [
      path.resolve(this.dataPath), // New location: data/processed/tiles
      path.resolve('./data/processed/tiles'), // Alternative new location
      path.resolve('./data'), // Old location: data/
      path.resolve(this.dataPath, '..', '..') // Parent of processed/tiles
    ];

    const checkedFiles = new Set(); // Avoid duplicates

    for (const searchPath of searchPaths) {
      if (!fs.existsSync(searchPath)) {
        continue;
      }

      // Check for common MBTiles files
      const files = [
        { name: 'kc-enhanced', file: 'kc-enhanced.mbtiles' },
        { name: 'ks-mo', file: 'ks-mo.mbtiles' }
      ];

      for (const { name, file } of files) {
        const filePath = path.join(searchPath, file);
        if (fs.existsSync(filePath) && !checkedFiles.has(name)) {
          this.mbtilesFiles.set(name, filePath);
          checkedFiles.add(name);
          console.log(`✓ Found MBTiles: ${name} at ${filePath}`);
        }
      }
    }
  }

  /**
   * Get MBTiles instance for a source (with caching)
   */
  getMbtiles(source) {
    // Determine which file to use
    let filePath = null;
    
    if (this.mbtilesFiles.has(source)) {
      filePath = this.mbtilesFiles.get(source);
    } else if (this.mbtilesFiles.has('kc-enhanced')) {
      filePath = this.mbtilesFiles.get('kc-enhanced');
    } else if (this.mbtilesFiles.has('ks-mo')) {
      filePath = this.mbtilesFiles.get('ks-mo');
    }

    if (!filePath) {
      return null;
    }

    // Return cached instance if available
    if (this.mbtilesInstances && this.mbtilesInstances.has(filePath)) {
      return this.mbtilesInstances.get(filePath);
    }

    // Cache instance (we'll create it on demand)
    if (!this.mbtilesInstances) {
      this.mbtilesInstances = new Map();
    }

    return filePath;
  }

  /**
   * Get tile from MBTiles file
   */
  async getTile(source, z, x, y) {
    return new Promise((resolve, reject) => {
      // Check cache first
      const cacheKey = `${source}-${z}-${x}-${y}`;
      const cached = this.tileCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
        return resolve({
          tile: cached.tile,
          headers: cached.headers
        });
      }

      // Get file path
      const filePath = this.getMbtiles(source);
      if (!filePath) {
        return reject(new Error('MBTiles file not found'));
      }

      // Open MBTiles file
      new MBTiles(filePath, (err, mbtiles) => {
        if (err) {
          return reject(err);
        }

        // Get tile
        mbtiles.getTile(parseInt(z), parseInt(x), parseInt(y), (err, tile, headers) => {
          if (err) {
            if (err.message === 'Tile does not exist') {
              return resolve(null); // No tile available
            }
            return reject(err);
          }

          // Prepare response headers
          const responseHeaders = {
            'Content-Type': 'application/x-protobuf',
            'Content-Encoding': headers['Content-Encoding'] || 'gzip',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=3600'
          };

          // Cache the tile
          if (config.tiles.cacheEnabled) {
            if (this.tileCache.size >= this.cacheMaxSize) {
              // Remove oldest entry (simple FIFO)
              const firstKey = this.tileCache.keys().next().value;
              this.tileCache.delete(firstKey);
            }
            this.tileCache.set(cacheKey, {
              tile: tile,
              headers: responseHeaders,
              timestamp: Date.now()
            });
          }

          resolve({
            tile: tile,
            headers: responseHeaders
          });
        });
      });
    });
  }

  /**
   * Get metadata for a source
   */
  async getMetadata(source) {
    return new Promise((resolve, reject) => {
      const filePath = this.getMbtiles(source);
      if (!filePath) {
        return reject(new Error('MBTiles file not found'));
      }

      new MBTiles(filePath, (err, mbtiles) => {
        if (err) {
          return reject(err);
        }

        mbtiles.getInfo((err, info) => {
          if (err) {
            return reject(err);
          }

          resolve(info);
        });
      });
    });
  }

  /**
   * Get available sources
   */
  getAvailableSources() {
    return Array.from(this.mbtilesFiles.keys());
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.tileCache.size,
      maxSize: this.cacheMaxSize,
      ttl: this.cacheTTL
    };
  }
}

module.exports = TileServer;

