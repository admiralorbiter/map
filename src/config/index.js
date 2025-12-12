/**
 * Centralized configuration management
 * Loads and exports all configuration modules
 */

const database = require('./database');
const dataSources = require('./data-sources');
const simulation = require('./simulation');

const env = process.env.NODE_ENV || 'development';

module.exports = {
  env,
  port: parseInt(process.env.PORT || '8080', 10),
  database: database[env] || database.development,
  dataSources,
  simulation,
  cache: {
    type: process.env.CACHE_TYPE || 'memory', // 'memory' or 'redis'
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || ''
    },
    memory: {
      maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000', 10),
      ttl: parseInt(process.env.CACHE_TTL || '3600000', 10) // 1 hour
    }
  },
  tiles: {
    cacheEnabled: process.env.TILE_CACHE_ENABLED !== 'false',
    cacheMaxSize: parseInt(process.env.TILE_CACHE_MAX_SIZE || '1000', 10),
    cacheTTL: parseInt(process.env.TILE_CACHE_TTL || '3600000', 10)
  }
};

