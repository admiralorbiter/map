/**
 * Health check routes
 * Provides system health and status information
 */

const express = require('express');
const router = express.Router();

function createHealthRoutes(tileServer) {
  router.get('/health', (req, res) => {
    const cacheStats = tileServer ? tileServer.getCacheStats() : null;
    const availableSources = tileServer ? tileServer.getAvailableSources() : [];

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      tileServer: {
        available: !!tileServer,
        sources: availableSources,
        cache: cacheStats
      }
    });
  });

  return router;
}

module.exports = createHealthRoutes;

