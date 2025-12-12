# MapLibre OSM Map - Scalable Architecture

A scalable monolithic application for displaying and simulating geographic data using MapLibre GL JS, with support for multiple data sources and simulation capabilities.

## Overview

A scalable monolithic application for displaying and simulating geographic data using MapLibre GL JS. The project is organized as **modular monolithic** architecture - everything is in one codebase but organized into clear, independent systems that can be extracted to microservices later if needed.

## Features

- **3D Map Visualization**: Interactive 3D map with building heights, terrain, and multiple layers
- **Vector Tiles**: Efficient serving of OSM data as vector tiles
- **Data Pipeline**: Framework for ingesting and processing data from multiple sources (census, economic, transport, weather)
- **Simulation Engine**: Core framework for economic, demographic, and transport simulations
- **REST API**: Versioned API for data access and simulation control

## Project Structure

```
map/
├── src/                          # Main application source
│   ├── server/                   # Express server and API routes
│   ├── systems/                  # Modular systems
│   │   ├── data-pipeline/       # Data ingestion and ETL
│   │   ├── simulation/          # Simulation engine
│   │   └── map/                 # Map rendering system
│   ├── shared/                  # Shared utilities
│   └── config/                  # Configuration management
├── client/                       # Frontend application
│   └── public/                  # Static assets (HTML, CSS, JS)
├── data/                         # Data files
│   ├── raw/                     # Raw data files
│   ├── processed/               # Processed data (MBTiles)
│   └── cache/                   # Cached data
├── scripts/                      # Processing scripts
└── docs/                         # Documentation
```

## Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)
- **MBTiles file**: Convert your PBF file to MBTiles format (see below)

## Installation

1. Install dependencies:
```bash
npm install
```

2. (Optional) Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

## Running the Application

1. Start the server:
```bash
npm start
```

The server will start on `http://localhost:8080` (or the port specified in your `.env` file).

2. Open your web browser and navigate to:
```
http://localhost:8080/index.html
```

## API Endpoints

### Tiles
- `GET /data/:source/:z/:x/:y.pbf` - Get vector tile
- `GET /data/:source.json` - Get tile metadata

### Health
- `GET /health` - System health check

### Data API (v1)
- `GET /api/v1/data/location?bounds=...` - Get data by location
- `GET /api/v1/data/aggregate?bounds=...` - Get aggregated data

### Simulation API (v1)
- `GET /api/v1/simulation/status` - Get simulation status
- `POST /api/v1/simulation/start` - Start simulation
- `POST /api/v1/simulation/stop` - Stop simulation
- `GET /api/v1/simulation/state` - Get simulation state

## Converting PBF to MBTiles

The server requires MBTiles format. See [docs/DATA_PROCESSING.md](docs/DATA_PROCESSING.md) for detailed instructions.

**Quick Start:**
```powershell
cd data
java -jar planetiler.jar --osm-path=raw/osm/ks-mo.osm.pbf --output=processed/tiles/ks-mo.mbtiles --download --maxzoom=15
```

**File Locations:**
The tile server automatically checks these locations for MBTiles files:
- `data/processed/tiles/` (preferred)
- `data/` (backward compatible)

## Configuration

Configuration is managed through:
- Environment variables (`.env` file)
- Configuration files in `src/config/`

See `.env.example` for available configuration options.

## Development

The project is organized into modular systems:

- **Map System**: Tile serving and map rendering
- **Data Pipeline**: Data ingestion and processing (Phase 2)
- **Simulation**: Simulation engine (Phase 3)

Each system can be developed and tested independently.

## Documentation

- [Architecture](docs/architecture.md) - System architecture and design patterns
- [Data Processing](docs/DATA_PROCESSING.md) - Guide for processing and generating MBTiles

## License

ISC
