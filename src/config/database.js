/**
 * Database configuration
 * Supports SQLite for development, PostgreSQL for production
 */

module.exports = {
  development: {
    type: 'sqlite',
    database: './data/cache/app.db',
    logging: false
  },
  production: {
    type: 'postgresql',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'mapdb',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    logging: false,
    pool: {
      max: 10,
      min: 2
    }
  }
};

