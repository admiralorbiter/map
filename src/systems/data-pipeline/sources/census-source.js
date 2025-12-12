/**
 * Census Data Source
 * Reads census zipcode data from GPKG files
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class CensusSource {
  constructor(options = {}) {
    this.dataPath = options.dataPath || path.join(__dirname, '../../../..', 'data/processed/census/census_zipcode_data.gpkg');
    this.db = null;
    this.cache = new Map();
    this.cacheTTL = options.cacheTTL || 3600000; // 1 hour
  }

  /**
   * Initialize the source - open database connection
   */
  async initialize() {
    if (!fs.existsSync(this.dataPath)) {
      console.warn(`Census data file not found: ${this.dataPath}`);
      return false;
    }

    try {
      this.db = new Database(this.dataPath, { readonly: true });
      console.log(`Census source initialized: ${this.dataPath}`);
      return true;
    } catch (error) {
      console.error(`Error opening census database: ${error.message}`);
      return false;
    }
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
}

module.exports = CensusSource;

