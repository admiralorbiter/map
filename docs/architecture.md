# Architecture Documentation

## Overview

This project follows a **modular monolithic** architecture - everything is in one codebase but organized into clear, independent systems that can be extracted to microservices later if needed.

The architecture is designed for scalability both horizontally (adding new features) and vertically (performance optimization).

## Project Structure

```
map/
├── src/                    # Main application source
│   ├── server/            # Express server and API routes
│   ├── systems/           # Modular systems
│   ├── shared/            # Shared utilities
│   └── config/            # Configuration management
├── client/                # Frontend application
├── data/                  # Data files
├── scripts/               # Processing scripts
├── tests/                 # Test files
└── docs/                  # Documentation
```

## Systems

### 1. Map System (`src/systems/map/`)
Handles map rendering and tile serving.

- **Tiles**: MBTiles file access and tile serving
- **Layers**: Map layer management (to be implemented)
- **Styles**: Map style definitions (to be implemented)

### 2. Data Pipeline System (`src/systems/data-pipeline/`)
Orchestrates data ingestion, processing, and storage.

- **Sources**: Data source adapters (census, economic, transport, weather, OSM)
- **Processors**: Data transformation (normalization, validation, aggregation)
- **Storage**: Database and caching layer

### 3. Simulation System (`src/systems/simulation/`)
Core simulation engine for economic, demographic, and transport simulations.

- **Models**: Simulation models (economic, demographic, transport)
- **Engine**: Core simulation engine (scheduler, state, events)
- **Visualization**: Helpers to convert simulation data to map layers

## Design Patterns

### 1. System Interface Pattern
Each system exports a clean interface that can be used independently.

### 2. Dependency Injection
Systems are initialized with their dependencies, making them testable and flexible.

### 3. Event-Driven Communication
Systems communicate via events when appropriate, keeping them loosely coupled.

### 4. Repository Pattern
Data access is abstracted through repositories, making it easy to swap storage backends.

## API Structure

### REST API
- `/api/v1/data/*` - Data access endpoints
- `/api/v1/simulation/*` - Simulation control endpoints

### Tile API
- `/data/:source/:z/:x/:y.pbf` - Vector tiles
- `/data/:source.json` - Tile metadata

### Health
- `/health` - System health check

## Configuration

Configuration is centralized in `src/config/` and supports:
- Environment-based configuration (development/production)
- Environment variables via `.env` file
- Data source configurations
- Simulation settings

## Scalability

### Horizontal Scaling (Features)
- Plugin system for new data sources
- Model registry for simulation models
- Dynamic map layer registration
- Versioned API for new features

### Vertical Scaling (Performance)
- Database optimization (indexed queries, connection pooling)
- Multi-level caching (memory, Redis-ready)
- Async processing for heavy operations
- Tile caching and optimization

### Future Extraction Points
- Data pipeline → Separate ETL service
- Simulation engine → Microservice with queue
- Tile server → Standalone tile service
- API layer → API gateway pattern

