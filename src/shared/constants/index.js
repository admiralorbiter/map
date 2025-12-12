/**
 * Shared constants
 * Application-wide constants
 */

module.exports = {
  // Default map bounds (Kansas City area)
  DEFAULT_BOUNDS: {
    minLon: -94.8,
    minLat: 39.0,
    maxLon: -94.4,
    maxLat: 39.2
  },

  // Default map center (Kansas City)
  DEFAULT_CENTER: [-94.5786, 39.0997],

  // Default zoom levels
  DEFAULT_ZOOM: 13,
  MIN_ZOOM: 10,
  MAX_ZOOM: 22,

  // Tile constants
  TILE_SIZE: 256,
  DEFAULT_MAX_ZOOM: 15,

  // Cache constants
  DEFAULT_CACHE_TTL: 3600000, // 1 hour
  DEFAULT_CACHE_MAX_SIZE: 1000,

  // API constants
  API_VERSION: 'v1',
  API_PREFIX: '/api/v1',

  // Data source types
  DATA_SOURCE_TYPES: {
    CENSUS: 'census',
    ECONOMIC: 'economic',
    TRANSPORT: 'transport',
    WEATHER: 'weather',
    OSM: 'osm'
  }
};

