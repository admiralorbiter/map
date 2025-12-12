# MapLibre MVP with OSM PBF Data

A minimal MVP for displaying OpenStreetMap PBF data using MapLibre GL JS.

## Overview

This project serves the `ks-mo.osm.pbf` file (Kansas-Missouri region) as vector tiles and displays them in a web browser using MapLibre GL JS.

## Prerequisites

- Node.js (v14 or higher) - **Note**: Node 22+ works fine with this setup
- npm (comes with Node.js)
- **MBTiles file**: You need to convert your PBF file to MBTiles format first (see conversion instructions below)

## Installation

1. Install dependencies (no native compilation required):
```bash
npm install
```

This will install only pure JavaScript dependencies - no native compilation needed!

## Running the Application

1. Start the tile server:
```bash
npm start
```

The server will start on `http://localhost:8080`

2. Open your web browser and navigate to:
```
http://localhost:8080/index.html
```

## Project Structure

```
.
├── data/
│   └── ks-mo.osm.pbf          # OSM PBF data file
├── server.js                   # Tile server startup script
├── tileserver-config.json      # Tileserver GL configuration
├── index.html                  # Frontend map display page
├── package.json                # Node.js dependencies
└── README.md                   # This file
```

## How It Works

1. **Tile Server**: The Node.js server uses `@mapbox/mbtiles` (pure JavaScript) to read MBTiles files and serve vector tiles
2. **Frontend**: The HTML page uses MapLibre GL JS to request tiles from the local server and render them
3. **Map Style**: A basic style is configured to display roads, water, landuse, and buildings
4. **No Native Dependencies**: Everything is pure JavaScript - no compilation required!

## Configuration

- **Server Port**: Default is 8080. Change by setting the `PORT` environment variable
- **PBF File**: Currently configured to use `data/ks-mo.osm.pbf`
- **Map Center**: Set to Kansas-Missouri region ([-94.5, 38.5])
- **Zoom Levels**: Configured for zoom levels 0-14

## Notes

- **Pure JavaScript**: This solution uses only pure JavaScript libraries - no native compilation required
- **MBTiles Required**: The server requires MBTiles format (not raw PBF). Convert your PBF file first (see instructions above)
- **Fast Serving**: MBTiles files are served directly - no on-the-fly processing needed
- The conversion from PBF to MBTiles is a one-time process
- Once converted, tiles are served instantly from the MBTiles file

## Converting PBF to MBTiles (Required)

**Important**: This server requires MBTiles format, not raw PBF files. You must convert your PBF file first.

### Option 1: Using Tippecanoe (Recommended)

1. **Download Tippecanoe**:
   - Windows: Download from [Tippecanoe releases](https://github.com/felt/tippecanoe/releases) or use WSL
   - Or use the pre-built Windows binary if available

2. **Convert PBF to MBTiles**:
   ```bash
   tippecanoe -o data/ks-mo.mbtiles -z14 -Z0 data/ks-mo.osm.pbf
   ```

### Option 2: Using Planetiler (Java-based, no native compilation)

**You need Java installed for this option.**

1. **Install Java** (if not already installed):
   - Download Java from [Adoptium](https://adoptium.net/) (recommended) or [Oracle](https://www.oracle.com/java/technologies/downloads/)
   - Choose "Temurin" (OpenJDK) - version 17 or higher
   - Download the Windows x64 installer (.msi)
   - Run the installer and follow the prompts
   - Verify installation: Open PowerShell and run `java -version`

2. **Convert using Planetiler** (you already have planetiler.jar in the data folder):
   
   **Option A: Download required data files automatically** (recommended):
   ```powershell
   cd data
   java -jar planetiler.jar --osm-path=ks-mo.osm.pbf --output=ks-mo.mbtiles --download --maxzoom=15
   ```
   
   **To regenerate with higher zoom (overwrite existing file):**
   ```powershell
   cd data
   java -jar planetiler.jar --osm-path=ks-mo.osm.pbf --output=ks-mo.mbtiles --download --maxzoom=15 --force
   ```
   
   This will automatically download the required lake centerlines, water polygons, and Natural Earth data files (first run only).
   
   **Option B: Use from project root with full paths**:
   ```powershell
   java -jar data/planetiler.jar --osm-path=data/ks-mo.osm.pbf --output=data/ks-mo.mbtiles --download
   ```
   
   **Note**: The `--download` flag will fetch additional data files needed for the OpenMapTiles profile. These will be saved in `data/sources/` and only need to be downloaded once.

### Option 3: Using Online Tools (No Installation Required)

If you don't want to install Java or other tools, you can use online conversion services:

- **MapTiler Cloud**: Upload your PBF file and download as MBTiles (may require account)
- **OSM2VectorTiles**: Some online services offer conversion
- **Note**: For large files (272MB), online conversion may have size limits

### Option 4: Using WSL (Windows Subsystem for Linux)

If you have WSL installed, you can use Linux tools:

```bash
# In WSL terminal
sudo apt-get update
sudo apt-get install tippecanoe
tippecanoe -o /mnt/c/Users/admir/Github/map/data/ks-mo.mbtiles -z14 /mnt/c/Users/admir/Github/map/data/ks-mo.osm.pbf
```

### After Conversion

Once you have `data/ks-mo.mbtiles`, the server will automatically detect and serve it. No configuration changes needed!

## Troubleshooting

- **Map not loading**: Ensure the server is running and check the browser console for errors
- **Tiles not appearing**: Verify the PBF file path in `tileserver-config.json` is correct
- **CORS errors**: The server is configured with CORS enabled, but if issues persist, check browser console

## License

ISC

