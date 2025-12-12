/**
 * Simulation API routes
 * Endpoints for simulation control and data
 */

const express = require('express');
const router = express.Router();

function createSimulationRoutes(simulation) {
  // Get simulation status
  router.get('/api/v1/simulation/status', (req, res) => {
    if (simulation) {
      const status = simulation.getStatus();
      return res.json(status);
    }
    res.json({ 
      running: false, 
      message: 'Simulation system not yet implemented' 
    });
  });

  // Start simulation
  router.post('/api/v1/simulation/start', async (req, res) => {
    try {
      if (simulation) {
        await simulation.start();
        return res.json({ status: 'started' });
      }
      res.status(501).json({ error: 'Simulation system not yet implemented' });
    } catch (error) {
      console.error('Error starting simulation:', error);
      res.status(500).json({ error: 'Failed to start simulation', message: error.message });
    }
  });

  // Stop simulation
  router.post('/api/v1/simulation/stop', async (req, res) => {
    try {
      if (simulation) {
        await simulation.stop();
        return res.json({ status: 'stopped' });
      }
      res.status(501).json({ error: 'Simulation system not yet implemented' });
    } catch (error) {
      console.error('Error stopping simulation:', error);
      res.status(500).json({ error: 'Failed to stop simulation', message: error.message });
    }
  });

  // Get simulation state
  router.get('/api/v1/simulation/state', async (req, res) => {
    try {
      if (simulation) {
        const state = await simulation.getState();
        return res.json(state);
      }
      res.status(501).json({ error: 'Simulation system not yet implemented' });
    } catch (error) {
      console.error('Error getting simulation state:', error);
      res.status(500).json({ error: 'Failed to get simulation state', message: error.message });
    }
  });

  return router;
}

module.exports = createSimulationRoutes;

