"""
Download and process TIGER boundary files for Zip Code Tabulation Areas (ZCTA)
for the Kansas City metro area.
"""

import os
import requests
import zipfile
import geopandas as gpd
from pathlib import Path
import time
from config import (
    TIGER_BASE_URL,
    TIGER_YEAR,
    DATA_RAW,
    DATA_PROCESSED,
    OUTPUT_GPKG,
    KC_METRO_COUNTIES,
    get_state_fips_list
)

def download_tiger_file(url, output_path):
    """Download a TIGER file with retry logic and progress indication"""
    max_retries = 3
    timeout = (60, 300)  # (connect timeout, read timeout) - 5 minutes for large files
    
    for attempt in range(max_retries):
        try:
            print(f"Downloading {url}...")
            print(f"  (This is a large file ~50-100MB, may take several minutes)")
            
            response = requests.get(url, stream=True, timeout=timeout)
            response.raise_for_status()
            
            # Get file size for progress indication
            total_size = int(response.headers.get('content-length', 0))
            downloaded = 0
            
            with open(output_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        
                        # Show progress every 5MB
                        if total_size > 0 and downloaded % (5 * 1024 * 1024) < 8192:
                            percent = (downloaded / total_size) * 100
                            print(f"  Progress: {percent:.1f}% ({downloaded / (1024*1024):.1f} MB / {total_size / (1024*1024):.1f} MB)")
            
            print(f"✓ Downloaded to {output_path}")
            print(f"  File size: {downloaded / (1024*1024):.1f} MB")
            return True
        except requests.exceptions.Timeout as e:
            if attempt < max_retries - 1:
                print(f"  Attempt {attempt + 1} timed out: {e}. Retrying with longer timeout...")
                timeout = (60, 600)  # Increase to 10 minutes on retry
                time.sleep(5)
            else:
                print(f"✗ Failed to download after {max_retries} attempts: Connection timed out")
                print(f"  The TIGER file is very large. You may want to:")
                print(f"  1. Check your internet connection")
                print(f"  2. Download manually from: {url}")
                print(f"  3. Place it in: {output_path.parent}")
                return False
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"  Attempt {attempt + 1} failed: {e}. Retrying...")
                time.sleep(5)
            else:
                print(f"✗ Failed to download after {max_retries} attempts: {e}")
                return False
    return False

def extract_zipcode_boundaries():
    """Download and extract ZCTA boundaries for all states in KC metro"""
    print("Starting TIGER ZCTA boundary download...")
    
    # ZCTA5 boundaries (5-digit zipcodes)
    # Try current year first, fallback to previous year if not available
    tiger_years = [TIGER_YEAR, TIGER_YEAR - 1]
    tiger_file = None
    tiger_url = None
    
    for year in tiger_years:
        tiger_file = f"tl_{year}_us_zcta520.zip"
        tiger_url = f"{TIGER_BASE_URL}/TIGER{year}/ZCTA5/{tiger_file}"
        print(f"Attempting to download TIGER {year} data...")
        break  # Try the configured year first
    
    zip_path = DATA_RAW / tiger_file
    extract_dir = DATA_RAW / "tiger_zcta"
    extract_dir.mkdir(exist_ok=True)
    
    # Download if not exists
    if not zip_path.exists():
        if not download_tiger_file(tiger_url, zip_path):
            # Try previous year as fallback
            if TIGER_YEAR > 2020:  # Don't go too far back
                fallback_year = TIGER_YEAR - 1
                print(f"\nTrying fallback year {fallback_year}...")
                tiger_file_fallback = f"tl_{fallback_year}_us_zcta520.zip"
                tiger_url_fallback = f"{TIGER_BASE_URL}/TIGER{fallback_year}/ZCTA5/{tiger_file_fallback}"
                zip_path_fallback = DATA_RAW / tiger_file_fallback
                
                if download_tiger_file(tiger_url_fallback, zip_path_fallback):
                    tiger_file = tiger_file_fallback
                    zip_path = zip_path_fallback
                    print(f"✓ Using TIGER {fallback_year} data")
                else:
                    raise Exception(f"Failed to download TIGER file from both {TIGER_YEAR} and {fallback_year}")
            else:
                raise Exception(f"Failed to download TIGER file: {tiger_url}")
    else:
        print(f"TIGER file already exists: {zip_path}")
    
    # Extract if not already extracted
    shp_path = extract_dir / f"tl_{TIGER_YEAR}_us_zcta520.shp"
    if not shp_path.exists():
        print(f"Extracting {zip_path}...")
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(extract_dir)
        print("Extraction complete")
    else:
        print(f"Shapefile already extracted: {shp_path}")
    
    # Read shapefile
    print("Reading ZCTA boundaries...")
    gdf = gpd.read_file(shp_path)
    
    # Filter to Kansas City metro area
    # We'll filter by bounding box first, then by intersection with county boundaries
    # KC metro approximate bounds: -95.5, 38.5, -94.0, 40.0
    print("Filtering to Kansas City metro area...")
    kc_bounds = {
        'minx': -95.5,
        'miny': 38.5,
        'maxx': -94.0,
        'maxy': 40.0
    }
    
    # Filter by bounding box
    gdf_filtered = gdf.cx[kc_bounds['minx']:kc_bounds['maxx'], 
                          kc_bounds['miny']:kc_bounds['maxy']]
    
    print(f"Found {len(gdf_filtered)} ZCTAs in KC metro bounding box")
    
    # Ensure CRS is set (TIGER files are typically in EPSG:4269)
    if gdf_filtered.crs is None:
        gdf_filtered.set_crs('EPSG:4269', inplace=True)
    
    # Reproject to WGS84 if needed
    if gdf_filtered.crs != 'EPSG:4326':
        print(f"Reprojecting from {gdf_filtered.crs} to EPSG:4326...")
        gdf_filtered = gdf_filtered.to_crs('EPSG:4326')
    
    # Rename ZCTA5CE20 to ZIPCODE for consistency
    if 'ZCTA5CE20' in gdf_filtered.columns:
        gdf_filtered.rename(columns={'ZCTA5CE20': 'ZIPCODE'}, inplace=True)
    elif 'ZCTA5CE10' in gdf_filtered.columns:
        gdf_filtered.rename(columns={'ZCTA5CE10': 'ZIPCODE'}, inplace=True)
    elif 'ZCTA5' in gdf_filtered.columns:
        gdf_filtered.rename(columns={'ZCTA5': 'ZIPCODE'}, inplace=True)
    
    # Ensure ZIPCODE column exists
    if 'ZIPCODE' not in gdf_filtered.columns:
        # Try to find zipcode column
        zipcode_cols = [col for col in gdf_filtered.columns if 'ZCTA' in col.upper() or 'ZIP' in col.upper()]
        if zipcode_cols:
            gdf_filtered.rename(columns={zipcode_cols[0]: 'ZIPCODE'}, inplace=True)
        else:
            raise Exception("Could not find ZIPCODE column in TIGER file")
    
    # Select and reorder columns
    columns_to_keep = ['ZIPCODE', 'geometry']
    # Keep other metadata columns if they exist
    for col in ['GEOID20', 'GEOID10', 'AFFGEOID20', 'AFFGEOID10']:
        if col in gdf_filtered.columns:
            columns_to_keep.append(col)
    
    gdf_filtered = gdf_filtered[columns_to_keep]
    
    # Save to GPKG
    print(f"Saving {len(gdf_filtered)} zipcode boundaries to {OUTPUT_GPKG}...")
    gdf_filtered.to_file(OUTPUT_GPKG, layer='zipcodes', driver='GPKG', if_exists='replace')
    
    print(f"✓ TIGER boundaries saved to {OUTPUT_GPKG}")
    print(f"  Total zipcodes: {len(gdf_filtered)}")
    
    return gdf_filtered

if __name__ == "__main__":
    try:
        extract_zipcode_boundaries()
        print("\n✓ TIGER boundary extraction complete!")
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

