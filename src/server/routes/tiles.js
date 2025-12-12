/**
 * Tile serving routes
 * Handles requests for vector tiles
 */

const express = require('express');
const router = express.Router();

function createTileRoutes(tileServer, port = 8080) {
  // Main tile endpoint: /data/:source/:z/:x/:y.pbf
  router.get('/data/:source/:z/:x/:y.pbf', async (req, res) => {
    const { source, z, x, y } = req.params;

    try {
      const result = await tileServer.getTile(source, z, x, y);
      
      if (!result) {
        return res.status(204).end(); // No content for missing tiles
      }

      res.set(result.headers);
      res.send(result.tile);
    } catch (error) {
      console.error('Error getting tile:', error);
      res.status(500).json({ error: 'Failed to get tile', message: error.message });
    }
  });

  // Legacy endpoint for backward compatibility: /data/ks-mo/:z/:x/:y.pbf
  router.get('/data/ks-mo/:z/:x/:y.pbf', async (req, res) => {
    const { z, x, y } = req.params;

    try {
      const result = await tileServer.getTile('ks-mo', z, x, y);
      
      if (!result) {
        return res.status(204).end();
      }

      res.set(result.headers);
      res.send(result.tile);
    } catch (error) {
      console.error('Error getting tile:', error);
      res.status(500).json({ error: 'Failed to get tile', message: error.message });
    }
  });

  // Get tile metadata: /data/:source.json
  router.get('/data/:source.json', async (req, res) => {
    const { source } = req.params;

    try {
      const metadata = await tileServer.getMetadata(source);
      
      const tilejson = {
        tilejson: '2.1.0',
        name: metadata.name || source,
        description: metadata.description || `${source} OSM Data`,
        version: metadata.version || '1.0.0',
        attribution: metadata.attribution || '',
        scheme: 'xyz',
        tiles: [`http://localhost:${port}/data/${source}/{z}/{x}/{y}.pbf`],
        minzoom: metadata.minzoom || 0,
        maxzoom: metadata.maxzoom || 14,
        bounds: metadata.bounds || [-102.0, 36.0, -89.0, 40.5],
        center: metadata.center || [-94.5, 38.5, 6]
      };

      res.json(tilejson);
    } catch (error) {
      console.error('Error getting metadata:', error);
      res.status(500).json({ error: 'Failed to get tile metadata', message: error.message });
    }
  });

  return router;
}

module.exports = createTileRoutes;

