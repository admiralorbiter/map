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
│   ├── census/       # Census data (TIGER downloads)
│   ├── economic/     # Economic data
│   ├── osm/          # OSM PBF files
│   ├── transport/    # Transportation data
│   └── weather/      # Weather data
├── processed/        # Processed data (gitignored)
│   ├── census/       # Census GPKG files
│   │   └── census_zipcode_data.gpkg
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

## Census Data Import

### Overview

The system imports census data from the U.S. Census Bureau for zipcode-level analysis in the Kansas City metro area. Data includes ACS (American Community Survey) 5-year estimates and TIGER boundary files.

### Prerequisites

1. **Python 3.8+** with required packages:
   ```powershell
   cd tools/etl
   pip install -r requirements.txt
   ```

2. **Census API Key**: Get a free API key from https://api.census.gov/data/key_signup.html

3. **Environment Setup**: Add your API key to `.env` file:
   ```
   CENSUS_API_KEY=your_api_key_here
   ```

### Import Process

#### Step 1: Download TIGER Boundaries

Download and process zipcode (ZCTA) boundaries:

```powershell
cd tools/etl
python load_tiger_zipcode_boundaries.py
```

This will:
- Download TIGER ZCTA5 boundary files from the Census Bureau
- Filter to Kansas City metro area (8 counties)
- Save to `data/processed/census/census_zipcode_data.gpkg`

#### Step 2: Fetch ACS Data

Fetch ACS 5-year estimates for all zipcodes:

```powershell
python load_acs_zipcode_data.py
```

This will:
- Fetch ACS data from Census API for all configured variables
- Merge with zipcode boundaries
- Save to `data/processed/census/census_zipcode_data.gpkg`

**Note**: This process may take 10-30 minutes depending on API rate limits and data volume.

### Data Categories

The following ACS data categories are imported:

1. **Core Demographics** - Population, age, race/ethnicity
2. **Housing** - Occupancy, tenure, values, rent
3. **Income** - Median household income, per capita income
4. **Education** - Educational attainment levels
5. **Employment** - Labor force participation, employment status
6. **Commuting** - Transportation modes to work
7. **Health Insurance** - Coverage rates
8. **Disability** - Disability status
9. **Veteran Status** - Veteran population
10. **Language** - Languages spoken at home

### Data Access

Once imported, census data is available via the API:

- **Get zipcode data**: `GET /api/v1/data/zipcode?zipcode=64108`
- **List all zipcodes**: `GET /api/v1/data/zipcodes`
- **Get metadata**: `GET /api/v1/data/metadata?source=census`
- **Query by bounds**: `GET /api/v1/data/location?bounds=minLon,minLat,maxLon,maxLat&source=census`

See [tools/etl/README.md](../tools/etl/README.md) for detailed documentation.

### Updating Data

To refresh census data with the latest year:

1. Update `ACS_YEAR` in `tools/etl/config.py`
2. Update `TIGER_YEAR` in `tools/etl/config.py`
3. Re-run both import scripts

## Configuration

Planetiler configuration is in `config/planetiler-kc-config.json`.

