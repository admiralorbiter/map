# Census Data ETL Scripts

Python scripts for importing census data (ACS and TIGER boundaries) for zipcode-level analysis in the Kansas City metro area.

## Setup

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

Required packages:
- `requests` - HTTP requests to Census API
- `geopandas` - Geospatial data handling
- `pandas` - Data manipulation
- `python-dotenv` - Environment variable loading
- `fiona` - Geospatial file I/O
- `shapely` - Geometric operations

### 2. Configure Environment

Create a `.env` file in the project root (if it doesn't exist) and add your Census API key:

```
CENSUS_API_KEY=your_api_key_here
```

Get a free API key from: https://api.census.gov/data/key_signup.html

### 3. Configure Target Area

Edit `config.py` to modify:
- Target counties (currently set to 8-county KC metro)
- Data year (currently 2023 ACS, 2025 TIGER)
- Output paths
- ACS variables to import

## Usage

### Import TIGER Boundaries

Download and process zipcode (ZCTA) boundaries:

```bash
python load_tiger_zipcode_boundaries.py
```

**What it does:**
- Downloads TIGER ZCTA5 boundary shapefile from Census Bureau
- Filters to Kansas City metro bounding box
- Reprojects to WGS84 (EPSG:4326)
- Saves to `data/processed/census/census_zipcode_data.gpkg` (layer: `zipcodes`)

**Output:**
- GPKG file with zipcode boundaries
- Approximately 200-300 zipcodes in KC metro area

### Import ACS Data

Fetch ACS 5-year estimates for all zipcodes:

```bash
python load_acs_zipcode_data.py
```

**What it does:**
- Fetches ACS data from Census API for all configured variables
- Splits large variable lists into multiple API requests (rate-limited)
- Cleans and normalizes data
- Merges with existing zipcode boundaries
- Saves to `data/processed/census/census_zipcode_data.gpkg` (layers: `acs_data`, `acs_data_table`)

**Output:**
- GPKG file with ACS data joined to zipcodes
- ~100+ demographic and economic variables per zipcode

**Time:** 10-30 minutes depending on API rate limits

**Note:** Run `load_tiger_zipcode_boundaries.py` first, as ACS script filters to existing boundaries.

### Convert Geometry to WKT (Optional but Recommended)

For better compatibility with Node.js GeoJSON export, convert geometry to WKT:

```bash
python convert_geometry_to_wkt.py
```

**What it does:**
- Adds a `geometry_wkt` column to the zipcodes layer
- Makes geometry accessible without spatialite extension
- Required for GeoJSON API endpoint to work properly

**Note:** If you have spatialite extension available in Node.js, this step is optional.

## Data Schema

### GPKG Structure

The output GPKG file (`census_zipcode_data.gpkg`) contains:

#### Layer: `zipcodes`
- **ZIPCODE** (text) - 5-digit zipcode
- **geometry** (geometry) - Polygon boundary
- Other TIGER metadata columns

#### Layer: `acs_data`
- **ZIPCODE** (text) - 5-digit zipcode
- **geometry** (geometry) - Polygon boundary (from boundaries)
- All ACS variables (numeric)

#### Layer: `acs_data_table`
- **ZIPCODE** (text) - 5-digit zipcode
- All ACS variables (numeric)
- No geometry (faster for queries)

### ACS Variables

Variables follow Census naming convention: `B{TableID}_{Sequence}E`

Example variables:
- `B01001_001E` - Total population
- `B19013_001E` - Median household income
- `B25077_001E` - Median home value

See `config.py` for complete list of imported variables by category.

## Kansas City Metro Configuration

The system is configured for the 8-county Kansas City metro area:

**Missouri:**
- Cass (FIPS: 037)
- Clay (FIPS: 047)
- Jackson (FIPS: 095)
- Platte (FIPS: 165)

**Kansas:**
- Johnson (FIPS: 091)
- Leavenworth (FIPS: 103)
- Wyandotte (FIPS: 209)
- Miami (FIPS: 121)

## Troubleshooting

### API Rate Limits

The scripts include rate limiting (200ms between requests). If you encounter rate limit errors:
- Increase `API_RATE_LIMIT_MS` in `config.py`
- Run scripts during off-peak hours

### Missing Data

If some zipcodes are missing data:
- Check that TIGER boundaries were downloaded successfully
- Verify API key is valid and has proper permissions
- Check Census API status: https://api.census.gov/data/2023/acs/acs5

### File Not Found Errors

Ensure directories exist:
```bash
mkdir -p data/raw/census
mkdir -p data/processed/census
```

### Geometry Errors

If you encounter geometry/projection errors:
- Ensure `geopandas` and `fiona` are properly installed
- Check that TIGER files downloaded completely
- Verify CRS settings in `load_tiger_zipcode_boundaries.py`

## Updating Data

To refresh with new data year:

1. Update `ACS_YEAR` in `config.py` (e.g., `2024`)
2. Update `TIGER_YEAR` in `config.py` (e.g., `2026`)
3. Re-run both scripts

**Note:** ACS 5-year estimates are released annually in December. TIGER boundaries are updated annually.

## Data Sources

- **ACS Data**: https://api.census.gov/data/2023/acs/acs5
- **TIGER Boundaries**: https://www2.census.gov/geo/tiger/TIGER2025/
- **Census API Documentation**: https://www.census.gov/data/developers/data-sets.html

## Next Steps

After importing data:
1. Verify data in GPKG using QGIS or similar tool
2. Start Node.js server - census data will be automatically loaded
3. Test API endpoints: `/api/v1/data/zipcode?zipcode=64108`
4. Integrate with map visualization

