"""
Fetch ACS (American Community Survey) 5-year estimates for zipcode level
and merge with TIGER boundaries.
"""

import requests
import pandas as pd
import geopandas as gpd
import time
from pathlib import Path
from config import (
    CENSUS_API_KEY,
    CENSUS_BASE_URL,
    ACS_YEAR,
    ACS_DATASET,
    GEO_LEVEL_ZIPCODE,
    API_RATE_LIMIT_MS,
    OUTPUT_GPKG,
    DATA_PROCESSED,
    get_all_acs_variables,
    ACS_CATEGORIES
)

def build_census_api_url(variables, geo_level="zip code tabulation area"):
    """Build Census API URL for ACS data"""
    # Census API format:
    # https://api.census.gov/data/{year}/{dataset}?get={variables}&for={geography}:{codes}&key={key}
    
    # For zipcode level, we use "zip code tabulation area" and "*" for all
    # Note: ZCTA is a special geography, we need to use "zip code tabulation area:*"
    
    vars_str = ",".join(variables)
    
    # For ZCTA, we fetch all zipcodes and filter later
    if geo_level == "zip code tabulation area":
        geo_param = "zip code tabulation area:*"
    else:
        geo_param = f"{geo_level}:*"
    
    url = f"{CENSUS_BASE_URL}/data/{ACS_YEAR}/{ACS_DATASET}"
    params = {
        "get": vars_str,
        "for": geo_param,
        "key": CENSUS_API_KEY
    }
    
    return url, params

def fetch_acs_data(variables, max_vars_per_request=50):
    """
    Fetch ACS data from Census API
    Splits large variable lists into multiple requests
    """
    all_data = []
    
    # Split variables into chunks to avoid URL length issues
    for i in range(0, len(variables), max_vars_per_request):
        chunk = variables[i:i + max_vars_per_request]
        url, params = build_census_api_url(chunk, GEO_LEVEL_ZIPCODE)
        
        print(f"Fetching ACS data (variables {i+1}-{min(i+max_vars_per_request, len(variables))} of {len(variables)})...")
        
        try:
            response = requests.get(url, params=params, timeout=60)
            response.raise_for_status()
            
            # Census API returns JSON array: first row is headers, rest is data
            data = response.json()
            
            if not data or len(data) < 2:
                print(f"Warning: No data returned for chunk {i//max_vars_per_request + 1}")
                continue
            
            # Convert to DataFrame
            df_chunk = pd.DataFrame(data[1:], columns=data[0])
            all_data.append(df_chunk)
            
            # Rate limiting
            time.sleep(API_RATE_LIMIT_MS / 1000.0)
            
        except requests.exceptions.RequestException as e:
            print(f"Error fetching chunk {i//max_vars_per_request + 1}: {e}")
            if hasattr(e.response, 'text'):
                print(f"Response: {e.response.text}")
            continue
    
    if not all_data:
        raise Exception("No data was successfully fetched from Census API")
    
    # Merge all chunks
    print("Merging data chunks...")
    df = all_data[0]
    for chunk in all_data[1:]:
        # Merge on zipcode (ZCTA identifier)
        zipcode_col = None
        for col in ['zip code tabulation area', 'ZCTA5', 'ZIPCODE']:
            if col in df.columns and col in chunk.columns:
                zipcode_col = col
                break
        
        if zipcode_col:
            df = df.merge(chunk, on=zipcode_col, how='outer', suffixes=('', '_dup'))
            # Remove duplicate columns
            df = df.loc[:, ~df.columns.str.endswith('_dup')]
        else:
            # If no zipcode column, just concatenate (shouldn't happen)
            df = pd.concat([df, chunk], axis=1)
    
    return df

def clean_acs_data(df):
    """Clean and prepare ACS data"""
    print("Cleaning ACS data...")
    
    # Find zipcode column
    zipcode_col = None
    for col in ['zip code tabulation area', 'ZCTA5', 'ZIPCODE']:
        if col in df.columns:
            zipcode_col = col
            break
    
    if not zipcode_col:
        raise Exception("Could not find zipcode column in ACS data")
    
    # Rename to ZIPCODE
    if zipcode_col != 'ZIPCODE':
        df.rename(columns={zipcode_col: 'ZIPCODE'}, inplace=True)
    
    # Remove any other geography columns we don't need
    cols_to_remove = [col for col in df.columns if col.lower() in 
                     ['state', 'county', 'tract', 'block group', 'name']]
    for col in cols_to_remove:
        if col != 'ZIPCODE':
            df.drop(columns=[col], inplace=True, errors='ignore')
    
    # Convert numeric columns (all variable columns should be numeric)
    # Variable columns are those that match pattern like "B01001_001E"
    for col in df.columns:
        if col != 'ZIPCODE' and col.startswith('B') and '_' in col:
            # Try to convert to numeric, coerce errors to NaN
            df[col] = pd.to_numeric(df[col], errors='coerce')
    
    # Remove rows where ZIPCODE is missing
    df = df.dropna(subset=['ZIPCODE'])
    
    # Ensure ZIPCODE is string with leading zeros
    df['ZIPCODE'] = df['ZIPCODE'].astype(str).str.zfill(5)
    
    return df

def load_existing_zipcodes():
    """Load existing zipcode boundaries to filter ACS data"""
    if not OUTPUT_GPKG.exists():
        print("Warning: No existing zipcode boundaries found. Will fetch all zipcodes.")
        return None
    
    try:
        gdf = gpd.read_file(OUTPUT_GPKG, layer='zipcodes')
        if 'ZIPCODE' in gdf.columns:
            return set(gdf['ZIPCODE'].astype(str).str.zfill(5))
        return None
    except Exception as e:
        print(f"Warning: Could not load existing zipcodes: {e}")
        return None

def merge_with_boundaries(acs_df):
    """Merge ACS data with zipcode boundaries"""
    print("Merging ACS data with zipcode boundaries...")
    
    if not OUTPUT_GPKG.exists():
        raise Exception(f"Zipcode boundaries not found at {OUTPUT_GPKG}. Run load_tiger_zipcode_boundaries.py first.")
    
    # Load boundaries
    boundaries = gpd.read_file(OUTPUT_GPKG, layer='zipcodes')
    
    # Ensure ZIPCODE is string with leading zeros
    boundaries['ZIPCODE'] = boundaries['ZIPCODE'].astype(str).str.zfill(5)
    acs_df['ZIPCODE'] = acs_df['ZIPCODE'].astype(str).str.zfill(5)
    
    # Merge
    merged = boundaries.merge(acs_df, on='ZIPCODE', how='left')
    
    return merged

def save_acs_data(acs_df, merged_gdf):
    """Save ACS data to GPKG"""
    print(f"Saving ACS data to {OUTPUT_GPKG}...")
    
    # Save merged data with geometry
    merged_gdf.to_file(OUTPUT_GPKG, layer='acs_data', driver='GPKG', if_exists='replace')
    
    # Also save as separate table without geometry (for faster queries)
    acs_df_no_geom = acs_df.copy()
    # Convert to GeoDataFrame for GPKG (add dummy geometry)
    from shapely.geometry import Point
    acs_df_no_geom['geometry'] = Point(0, 0)  # Dummy geometry
    acs_gdf = gpd.GeoDataFrame(acs_df_no_geom, crs='EPSG:4326')
    acs_gdf.to_file(OUTPUT_GPKG, layer='acs_data_table', driver='GPKG', if_exists='replace')
    
    print(f"✓ ACS data saved to {OUTPUT_GPKG}")
    print(f"  Total zipcodes with data: {len(merged_gdf)}")
    print(f"  Total variables: {len([c for c in acs_df.columns if c != 'ZIPCODE'])}")

def main():
    """Main function to load ACS data"""
    print("=" * 60)
    print("ACS Zipcode Data Import")
    print("=" * 60)
    
    if not CENSUS_API_KEY:
        raise Exception("CENSUS_API_KEY not found in environment. Please set it in .env file.")
    
    # Get all variables to fetch
    all_variables = get_all_acs_variables()
    print(f"Total variables to fetch: {len(all_variables)}")
    print(f"Categories: {len(ACS_CATEGORIES)}")
    
    # Load existing zipcodes to filter (if boundaries already exist)
    existing_zipcodes = load_existing_zipcodes()
    if existing_zipcodes:
        print(f"Found {len(existing_zipcodes)} existing zipcodes to match against")
    
    # Fetch ACS data
    acs_df = fetch_acs_data(all_variables)
    print(f"Fetched data for {len(acs_df)} zipcodes")
    
    # Clean data
    acs_df = clean_acs_data(acs_df)
    
    # Filter to existing zipcodes if boundaries exist
    if existing_zipcodes:
        before_count = len(acs_df)
        acs_df = acs_df[acs_df['ZIPCODE'].isin(existing_zipcodes)]
        print(f"Filtered to {len(acs_df)} zipcodes matching boundaries (from {before_count})")
    
    # Merge with boundaries
    merged_gdf = merge_with_boundaries(acs_df)
    
    # Save
    save_acs_data(acs_df, merged_gdf)
    
    print("\n" + "=" * 60)
    print("✓ ACS data import complete!")
    print("=" * 60)

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

