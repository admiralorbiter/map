# Data Processing Guide

## MBTiles Generation

### Using Planetiler (Recommended)

Place your OSM PBF files in `data/raw/osm/` and generate MBTiles:

```powershell
cd data
java -jar planetiler.jar --osm-path=raw/osm/ks-mo.osm.pbf --output=processed/tiles/ks-mo.mbtiles --download --maxzoom=15
```

For Kansas City enhanced tiles:

```powershell
java -jar planetiler.jar --osm-path=raw/osm/ks-mo.osm.pbf --output=processed/tiles/kc-enhanced.mbtiles --bounds=-94.8,39.0,-94.4,39.2 --download --maxzoom=16
```

Or use the batch script:
```powershell
.\process-kc.bat
```

### File Locations

The tile server automatically checks these locations for MBTiles files:
1. `data/processed/tiles/` (preferred)
2. `data/` (backward compatible)

## Data Organization

```
data/
├── raw/              # Raw data files (gitignored)
│   ├── census/       # Census data
│   ├── economic/     # Economic data
│   ├── osm/          # OSM PBF files
│   ├── transport/    # Transportation data
│   └── weather/      # Weather data
├── processed/        # Processed data (gitignored)
│   └── tiles/        # MBTiles files
├── cache/            # Cached data (gitignored)
└── tmp/              # Temporary files (gitignored)
```

## Extracting Specific Areas

To extract a specific area (e.g., Kansas City) from a larger PBF file:

### Option 1: Using Planetiler with bounds (Recommended)

```powershell
cd data
java -jar planetiler.jar --osm-path=raw/osm/ks-mo.osm.pbf --output=processed/tiles/kc-enhanced.mbtiles --bounds=-94.8,39.0,-94.4,39.2 --download --maxzoom=16
```

### Option 2: Using osmium-tool

1. Install osmium-tool:
   - Windows: Download from https://osmcode.org/osmium-tool/
   - Or use: `choco install osmium-tool` (if you have Chocolatey)

2. Extract area:
```powershell
osmium extract -b -94.8,39.0,-94.4,39.2 data/raw/osm/ks-mo.osm.pbf -o data/raw/osm/kc-extract.osm.pbf
```

Then process with Planetiler as usual.

## Scripts

- `scripts/extract-kc.js` - Extract Kansas City area from PBF
- `scripts/process-kc-planetiler.js` - Generate Planetiler commands
- `scripts/enhance-buildings.js` - Building enhancement documentation

## Configuration

Planetiler configuration is in `config/planetiler-kc-config.json`.

