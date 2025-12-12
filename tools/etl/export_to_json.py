"""
Export census data to JSON format for easier access in Node.js
This avoids the need for native SQLite compilation
"""

import json
import geopandas as gpd
from pathlib import Path
from config import OUTPUT_GPKG, DATA_PROCESSED

def export_to_json():
    """Export zipcode boundaries and ACS data to JSON"""
    print("Exporting census data to JSON...")
    
    if not OUTPUT_GPKG.exists():
        print(f"Error: GPKG file not found at {OUTPUT_GPKG}")
        return False
    
    try:
        # Read zipcodes with geometry
        gdf = gpd.read_file(OUTPUT_GPKG, layer='zipcodes')
        
        # Read ACS data
        try:
            acs_gdf = gpd.read_file(OUTPUT_GPKG, layer='acs_data')
        except:
            # Fallback to acs_data_table if acs_data doesn't exist
            import pandas as pd
            acs_df = pd.read_sql_query(
                f"SELECT * FROM acs_data_table",
                f"sqlite:///{OUTPUT_GPKG}"
            )
            # Merge with geometry from zipcodes
            gdf_merged = gdf.merge(acs_df, on='ZIPCODE', how='left')
            acs_gdf = gdf_merged
        
        # Convert to GeoJSON
        geojson = acs_gdf.to_json()
        
        # Save to JSON file
        json_path = DATA_PROCESSED / "census_zipcode_data.json"
        with open(json_path, 'w', encoding='utf-8') as f:
            f.write(geojson)
        
        print(f"Exported to {json_path}")
        print(f"  Total features: {len(acs_gdf)}")
        return True
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    export_to_json()

