/**
 * Data API routes
 * Endpoints for accessing processed data
 */

const express = require('express');
const router = express.Router();

function createDataRoutes(dataPipeline) {
  // Get data by location
  router.get('/api/v1/data/location', async (req, res) => {
    try {
      const { bounds, source } = req.query;
      
      if (!bounds) {
        return res.status(400).json({ error: 'bounds parameter required' });
      }

      // Parse bounds: "minLon,minLat,maxLon,maxLat"
      const [minLon, minLat, maxLon, maxLat] = bounds.split(',').map(parseFloat);
      
      if (dataPipeline) {
        const data = await dataPipeline.query({
          bounds: { minLon, minLat, maxLon, maxLat },
          source
        });
        return res.json(data);
      }

      res.json({ message: 'Data pipeline not yet implemented' });
    } catch (error) {
      console.error('Error querying data:', error);
      res.status(500).json({ error: 'Failed to query data', message: error.message });
    }
  });

  // Get aggregated data
  router.get('/api/v1/data/aggregate', async (req, res) => {
    try {
      const { bounds, source, aggregation } = req.query;
      
      if (!bounds) {
        return res.status(400).json({ error: 'bounds parameter required' });
      }

      const [minLon, minLat, maxLon, maxLat] = bounds.split(',').map(parseFloat);
      
      if (dataPipeline) {
        const data = await dataPipeline.aggregate({
          bounds: { minLon, minLat, maxLon, maxLat },
          source,
          aggregation
        });
        return res.json(data);
      }

      res.json({ message: 'Data pipeline not yet implemented' });
    } catch (error) {
      console.error('Error aggregating data:', error);
      res.status(500).json({ error: 'Failed to aggregate data', message: error.message });
    }
  });

  // Get data for a specific zipcode
  router.get('/api/v1/data/zipcode', async (req, res) => {
    try {
      const { zipcode, source = 'census' } = req.query;
      
      if (!zipcode) {
        return res.status(400).json({ error: 'zipcode parameter required' });
      }

      if (dataPipeline) {
        const result = await dataPipeline.query({
          zipcode,
          source
        });
        
        if (result.error) {
          return res.status(404).json({ error: result.error });
        }
        
        if (result.data && result.data.length > 0) {
          return res.json({ zipcode, data: result.data[0], source: result.source });
        }
        
        return res.status(404).json({ error: `No data found for zipcode ${zipcode}` });
      }

      res.json({ message: 'Data pipeline not yet implemented' });
    } catch (error) {
      console.error('Error querying zipcode data:', error);
      res.status(500).json({ error: 'Failed to query zipcode data', message: error.message });
    }
  });

  // List all available zipcodes
  router.get('/api/v1/data/zipcodes', async (req, res) => {
    try {
      const { source = 'census' } = req.query;
      
      if (dataPipeline) {
        const sourceInstance = dataPipeline.sources.get(source);
        
        if (!sourceInstance) {
          return res.status(404).json({ error: `Source ${source} not found` });
        }
        
        if (typeof sourceInstance.getZipcodes === 'function') {
          const zipcodes = await sourceInstance.getZipcodes();
          return res.json({ 
            zipcodes, 
            count: zipcodes.length,
            source 
          });
        }
        
        return res.status(400).json({ error: `Source ${source} does not support zipcode listing` });
      }

      res.json({ message: 'Data pipeline not yet implemented' });
    } catch (error) {
      console.error('Error listing zipcodes:', error);
      res.status(500).json({ error: 'Failed to list zipcodes', message: error.message });
    }
  });

  // Get metadata about available data
  router.get('/api/v1/data/metadata', async (req, res) => {
    try {
      const { source = 'census' } = req.query;
      
      if (dataPipeline) {
        const sourceInstance = dataPipeline.sources.get(source);
        
        if (!sourceInstance) {
          return res.status(404).json({ error: `Source ${source} not found` });
        }
        
        if (typeof sourceInstance.getMetadata === 'function') {
          const metadata = await sourceInstance.getMetadata();
          return res.json({ 
            source,
            ...metadata
          });
        }
        
        return res.json({ 
          source,
          message: 'Metadata not available for this source'
        });
      }

      res.json({ message: 'Data pipeline not yet implemented' });
    } catch (error) {
      console.error('Error getting metadata:', error);
      res.status(500).json({ error: 'Failed to get metadata', message: error.message });
    }
  });

  // Get zipcode boundaries as GeoJSON
  router.get('/api/v1/data/census/geojson', async (req, res) => {
    try {
      const { bounds, variable } = req.query;
      
      if (dataPipeline) {
        const sourceInstance = dataPipeline.sources.get('census');
        
        if (!sourceInstance) {
          return res.status(404).json({ error: 'Census source not found' });
        }
        
        if (typeof sourceInstance.getZipcodesGeoJSON !== 'function') {
          return res.status(400).json({ error: 'Census source does not support GeoJSON export' });
        }

        // Parse bounds if provided
        let boundsObj = null;
        if (bounds) {
          const [minLon, minLat, maxLon, maxLat] = bounds.split(',').map(parseFloat);
          boundsObj = { minLon, minLat, maxLon, maxLat };
        }

        const geojson = await sourceInstance.getZipcodesGeoJSON({
          bounds: boundsObj,
          variable
        });

        // Set proper headers for GeoJSON
        res.setHeader('Content-Type', 'application/geo+json');
        return res.json(geojson);
      }

      res.status(503).json({ error: 'Data pipeline not available' });
    } catch (error) {
      console.error('Error getting GeoJSON:', error);
      res.status(500).json({ error: 'Failed to get GeoJSON', message: error.message });
    }
  });

  return router;
}

module.exports = createDataRoutes;

