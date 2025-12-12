/**
 * Main server entry point
 * Sets up Express server with all routes and middleware
 */

// Load environment variables
require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const config = require('../config');
const TileServer = require('../systems/map/tiles');
const createTileRoutes = require('./routes/tiles');
const createHealthRoutes = require('./routes/health');
const createDataRoutes = require('./routes/data');
const createSimulationRoutes = require('./routes/simulation');
const errorHandler = require('./middleware/errorHandler');
const createDataPipeline = require('../systems/data-pipeline');
const CensusSource = require('../systems/data-pipeline/sources/census-source');
const SpatialService = require('../systems/api/spatial-service');

class Server {
  constructor() {
    this.app = express();
    this.port = config.port;
    this.tileServer = null;
    this.dataPipeline = null; // Will be initialized in Phase 2
    this.spatialService = null;
    this.simulation = null; // Will be initialized in Phase 3
  }

  /**
   * Initialize systems
   */
  async initialize() {
    // Initialize tile server
    this.tileServer = new TileServer({
      dataPath: config.dataSources.osm.dataPath,
      cacheMaxSize: config.tiles.cacheMaxSize,
      cacheTTL: config.tiles.cacheTTL
    });

    // Initialize data pipeline
    this.dataPipeline = createDataPipeline({
      cache: null // Cache can be added later if needed
    });

    // Register census source if enabled
    if (config.dataSources.census.enabled) {
      const censusSource = new CensusSource({
        dataPath: config.dataSources.census.dataPath,
        cacheTTL: config.dataSources.census.cacheTTL
      });
      this.dataPipeline.registerSource('census', censusSource);
    }

    // Initialize all sources
    await this.dataPipeline.initialize();

    // Initialize spatial service for OSM feature extraction
    this.spatialService = new SpatialService(this.tileServer);

    // TODO: Initialize simulation (Phase 3)
    // this.simulation = require('../systems/simulation')({ dataPipeline: this.dataPipeline });
  }

  /**
   * Setup middleware
   */
  setupMiddleware() {
    // Enable CORS
    this.app.use(cors());

    // Body parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Serve static files from client/public
    const publicPath = path.join(__dirname, '../../client/public');
    this.app.use(express.static(publicPath));

    // Also serve from root for backward compatibility
    this.app.use(express.static(path.join(__dirname, '../..')));
  }

  /**
   * Setup routes
   */
  setupRoutes() {
    // Tile routes
    this.app.use(createTileRoutes(this.tileServer, this.port));

    // Health check
    this.app.use(createHealthRoutes(this.tileServer));

    // Data API routes
    this.app.use(createDataRoutes(this.dataPipeline, this.spatialService));

    // Simulation API routes
    this.app.use(createSimulationRoutes(this.simulation));

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Not found' });
    });

    // Error handler (must be last)
    this.app.use(errorHandler);
  }

  /**
   * Start the server
   */
  async start() {
    try {
      await this.initialize();
      this.setupMiddleware();
      this.setupRoutes();

      this.app.listen(this.port, () => {
        console.log(`\n✅ Server running on http://localhost:${this.port}`);
        console.log(`📍 Map available at http://localhost:${this.port}/index.html`);
        console.log(`🗺️  Tiles endpoint: http://localhost:${this.port}/data/{source}/{z}/{x}/{y}.pbf`);
        console.log(`💚 Health check: http://localhost:${this.port}/health`);
        console.log(`📊 API: http://localhost:${this.port}/api/v1/\n`);

        if (this.tileServer && this.tileServer.getAvailableSources().length > 0) {
          console.log(`✅ MBTiles files found: ${this.tileServer.getAvailableSources().join(', ')}`);
          console.log('✅ Tile caching enabled for performance\n');
        } else {
          console.log('⚠️  No MBTiles files found - convert PBF to MBTiles first\n');
        }
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new Server();
  server.start();
}

module.exports = Server;

