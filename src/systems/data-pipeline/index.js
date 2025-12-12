/**
 * Data Pipeline System
 * Orchestrates data ingestion, processing, and storage
 */

class DataPipeline {
  constructor(options = {}) {
    this.db = options.db;
    this.cache = options.cache;
    this.sources = new Map();
    this.processors = [];
  }

  /**
   * Register a data source
   */
  registerSource(name, source) {
    this.sources.set(name, source);
    console.log(`Registered data source: ${name}`);
  }

  /**
   * Initialize all registered sources
   */
  async initialize() {
    const initPromises = [];
    for (const [name, source] of this.sources.entries()) {
      if (source && typeof source.initialize === 'function') {
        initPromises.push(
          source.initialize().then(initialized => {
            if (initialized) {
              console.log(`✓ Initialized data source: ${name}`);
            } else {
              console.log(`⚠ Data source ${name} not available`);
            }
          }).catch(error => {
            console.error(`✗ Failed to initialize ${name}:`, error.message);
          })
        );
      }
    }
    await Promise.all(initPromises);
  }

  /**
   * Ingest data from a source
   */
  async ingest(sourceName, data) {
    const source = this.sources.get(sourceName);
    if (!source) {
      throw new Error(`Source ${sourceName} not found`);
    }
    
    if (typeof source.ingest === 'function') {
      return await source.ingest(data);
    }
    
    throw new Error(`Source ${sourceName} does not support ingestion`);
  }

  /**
   * Process data
   */
  async process(data) {
    let processed = data;
    for (const processor of this.processors) {
      if (typeof processor.process === 'function') {
        processed = await processor.process(processed);
      }
    }
    return processed;
  }

  /**
   * Query data from a source
   */
  async query(filters) {
    const { source, ...queryFilters } = filters;
    
    // If source is specified, query that source
    if (source) {
      const sourceInstance = this.sources.get(source);
      if (!sourceInstance) {
        return { data: [], error: `Source ${source} not found` };
      }
      
      try {
        // Handle different query types
        if (queryFilters.zipcode) {
          const data = await sourceInstance.getZipcodeData(queryFilters.zipcode);
          return { data: data ? [data] : [], source };
        } else if (queryFilters.bounds) {
          const data = await sourceInstance.queryByBounds(queryFilters.bounds);
          return { data, source };
        } else if (Object.keys(queryFilters).length > 0) {
          const data = await sourceInstance.queryByAttributes(queryFilters);
          return { data, source };
        } else {
          return { data: [], error: 'No query filters provided' };
        }
      } catch (error) {
        return { data: [], error: error.message, source };
      }
    }
    
    // If no source specified, try to query all sources
    const results = [];
    for (const [name, sourceInstance] of this.sources.entries()) {
      try {
        if (queryFilters.bounds && typeof sourceInstance.queryByBounds === 'function') {
          const data = await sourceInstance.queryByBounds(queryFilters.bounds);
          results.push(...data.map(item => ({ ...item, _source: name })));
        }
      } catch (error) {
        console.error(`Error querying source ${name}:`, error.message);
      }
    }
    
    return { data: results };
  }

  /**
   * Aggregate data
   */
  async aggregate(filters) {
    const { source, aggregation, ...queryFilters } = filters;
    
    // Query data first
    const queryResult = await this.query({ source, ...queryFilters });
    
    if (queryResult.error || !queryResult.data || queryResult.data.length === 0) {
      return { data: [], error: queryResult.error || 'No data to aggregate' };
    }
    
    // Simple aggregation (can be extended)
    const data = queryResult.data;
    let aggregated = {};
    
    if (aggregation === 'count') {
      aggregated = { count: data.length };
    } else if (aggregation === 'sum') {
      // Sum numeric fields
      aggregated = {};
      if (data.length > 0) {
        Object.keys(data[0]).forEach(key => {
          if (typeof data[0][key] === 'number') {
            aggregated[key] = data.reduce((sum, item) => sum + (item[key] || 0), 0);
          }
        });
      }
    } else if (aggregation === 'average' || aggregation === 'mean') {
      // Average numeric fields
      aggregated = {};
      if (data.length > 0) {
        Object.keys(data[0]).forEach(key => {
          if (typeof data[0][key] === 'number') {
            const sum = data.reduce((sum, item) => sum + (item[key] || 0), 0);
            aggregated[key] = sum / data.length;
          }
        });
      }
    } else {
      aggregated = { count: data.length, data };
    }
    
    return { data: aggregated, source: queryResult.source };
  }

  /**
   * Get available sources
   */
  getAvailableSources() {
    return Array.from(this.sources.keys());
  }
}

// Factory function for dependency injection
module.exports = function createDataPipeline(options = {}) {
  return new DataPipeline(options);
};

