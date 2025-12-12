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

  return router;
}

module.exports = createDataRoutes;

