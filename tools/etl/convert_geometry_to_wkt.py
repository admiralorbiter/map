"""
Helper script to convert GPKG geometry to WKT for easier access in Node.js
This is optional - if spatialite is available in Node.js, this isn't needed
"""

import geopandas as gpd
from pathlib import Path
from config import OUTPUT_GPKG

def convert_geometry_to_wkt():
    """Add WKT geometry column to zipcodes layer"""
    print("Converting geometry to WKT...")
    
    if not OUTPUT_GPKG.exists():
        print(f"Error: GPKG file not found at {OUTPUT_GPKG}")
        return False
    
    try:
        # Read zipcodes layer
        gdf = gpd.read_file(OUTPUT_GPKG, layer='zipcodes')
        
        # Convert geometry to WKT
        gdf['geometry_wkt'] = gdf.geometry.apply(lambda x: x.wkt if x else None)
        
        # Save back to GPKG with WKT column
        gdf.to_file(OUTPUT_GPKG, layer='zipcodes', driver='GPKG', if_exists='replace')
        
        print(f"✓ Geometry converted to WKT in {OUTPUT_GPKG}")
        return True
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    convert_geometry_to_wkt()

