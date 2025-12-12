/**
 * Data source configurations
 * Defines available data sources and their settings
 */

module.exports = {
  census: {
    enabled: process.env.CENSUS_ENABLED !== 'false',
    apiKey: process.env.CENSUS_API_KEY || '',
    baseUrl: process.env.CENSUS_BASE_URL || 'https://api.census.gov',
    dataPath: process.env.CENSUS_DATA_PATH || './data/processed/census/census_zipcode_data.gpkg',
    cacheTTL: 3600000 // 1 hour
  },
  economic: {
    enabled: process.env.ECONOMIC_ENABLED !== 'false',
    apiKey: process.env.ECONOMIC_API_KEY || '',
    baseUrl: process.env.ECONOMIC_BASE_URL || '',
    cacheTTL: 3600000
  },
  transport: {
    enabled: process.env.TRANSPORT_ENABLED !== 'false',
    apiKey: process.env.TRANSPORT_API_KEY || '',
    baseUrl: process.env.TRANSPORT_BASE_URL || '',
    cacheTTL: 1800000 // 30 minutes
  },
  weather: {
    enabled: process.env.WEATHER_ENABLED !== 'false',
    apiKey: process.env.WEATHER_API_KEY || '',
    baseUrl: process.env.WEATHER_BASE_URL || 'https://api.openweathermap.org',
    cacheTTL: 600000 // 10 minutes
  },
  osm: {
    enabled: true,
    dataPath: process.env.OSM_DATA_PATH || './data/processed/tiles',
    cacheTTL: 3600000
  }
};

