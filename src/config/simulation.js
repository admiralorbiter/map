/**
 * Simulation configuration
 * Settings for simulation engine and models
 */

module.exports = {
  enabled: process.env.SIMULATION_ENABLED !== 'false',
  tickInterval: parseInt(process.env.SIMULATION_TICK_INTERVAL || '1000', 10), // milliseconds
  maxHistory: parseInt(process.env.SIMULATION_MAX_HISTORY || '1000', 10), // number of states to keep
  autoStart: process.env.SIMULATION_AUTO_START === 'true',
  models: {
    economic: {
      enabled: true,
      updateInterval: 5000 // 5 seconds
    },
    demographic: {
      enabled: true,
      updateInterval: 10000 // 10 seconds
    },
    transport: {
      enabled: true,
      updateInterval: 2000 // 2 seconds
    }
  }
};

