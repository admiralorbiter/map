"""
Configuration for Census Data ETL
Kansas City Metro Area - 8 Counties
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Project root (assuming this script is in tools/etl/)
PROJECT_ROOT = Path(__file__).parent.parent.parent

# Data directories
DATA_RAW = PROJECT_ROOT / "data" / "raw" / "census"
DATA_PROCESSED = PROJECT_ROOT / "data" / "processed" / "census"

# Ensure directories exist
DATA_RAW.mkdir(parents=True, exist_ok=True)
DATA_PROCESSED.mkdir(parents=True, exist_ok=True)

# Census API Configuration
CENSUS_API_KEY = os.getenv("CENSUS_API_KEY", "")
CENSUS_BASE_URL = "https://api.census.gov"
ACS_YEAR = 2023
ACS_DATASET = "acs/acs5"  # 5-year estimates

# TIGER Boundaries Configuration
TIGER_BASE_URL = "https://www2.census.gov/geo/tiger"
TIGER_YEAR = 2025

# Kansas City Metro Area - 8 Counties
KC_METRO_COUNTIES = {
    # Missouri counties
    "Missouri": {
        "state_fips": "29",
        "counties": {
            "Cass": "037",
            "Clay": "047",
            "Jackson": "095",
            "Platte": "165"
        }
    },
    # Kansas counties
    "Kansas": {
        "state_fips": "20",
        "counties": {
            "Johnson": "091",
            "Leavenworth": "103",
            "Wyandotte": "209",
            "Miami": "121"
        }
    }
}

# Geographic level for data
GEO_LEVEL_ZIPCODE = "zip code tabulation area"  # ZCTA
GEO_LEVEL_BLOCK_GROUP = "block group"

# Rate limiting (milliseconds between requests)
API_RATE_LIMIT_MS = 200

# Output file
OUTPUT_GPKG = DATA_PROCESSED / "census_zipcode_data.gpkg"

# ACS Data Categories to Import
ACS_CATEGORIES = {
    "demographics": {
        "name": "Core Demographics",
        "variables": [
            "B01001_001E",  # Total population
            "B01001_002E",  # Male population
            "B01001_026E",  # Female population
            "B01002_001E",  # Median age
        ]
    },
    "race_ethnicity": {
        "name": "Race and Ethnicity",
        "variables": [
            "B02001_001E",  # Total population
            "B02001_002E",  # White alone
            "B02001_003E",  # Black or African American alone
            "B02001_004E",  # American Indian and Alaska Native alone
            "B02001_005E",  # Asian alone
            "B02001_006E",  # Native Hawaiian and Other Pacific Islander alone
            "B03003_001E",  # Total population (Hispanic/Latino)
            "B03003_002E",  # Not Hispanic or Latino
            "B03003_003E",  # Hispanic or Latino
        ]
    },
    "housing": {
        "name": "Housing",
        "variables": [
            "B25001_001E",  # Total housing units
            "B25002_001E",  # Total housing units (occupancy)
            "B25002_002E",  # Occupied housing units
            "B25002_003E",  # Vacant housing units
            "B25003_001E",  # Total housing units (tenure)
            "B25003_002E",  # Owner-occupied
            "B25003_003E",  # Renter-occupied
            "B25077_001E",  # Median home value
            "B25064_001E",  # Median gross rent
        ]
    },
    "income": {
        "name": "Income",
        "variables": [
            "B19013_001E",  # Median household income
            "B19301_001E",  # Per capita income
        ]
    },
    "education": {
        "name": "Education",
        "variables": [
            "B15003_001E",  # Total population 25 years and over
            "B15003_022E",  # Bachelor's degree
            "B15003_023E",  # Master's degree
            "B15003_024E",  # Professional degree
            "B15003_025E",  # Doctorate degree
        ]
    },
    "employment": {
        "name": "Employment",
        "variables": [
            "B23025_001E",  # Population 16 years and over
            "B23025_002E",  # In labor force
            "B23025_003E",  # Not in labor force
            "B23025_004E",  # Civilian labor force
            "B23025_005E",  # Employed
            "B23025_006E",  # Unemployed
        ]
    },
    "commuting": {
        "name": "Commuting",
        "variables": [
            "B08301_001E",  # Total workers 16 years and over
            "B08301_003E",  # Car, truck, or van
            "B08301_010E",  # Public transportation
            "B08301_016E",  # Walked
            "B08301_017E",  # Other means
            "B08301_018E",  # Worked from home
        ]
    },
    "health_insurance": {
        "name": "Health Insurance",
        "variables": [
            "B27001_001E",  # Total civilian noninstitutionalized population
            "B27001_002E",  # With health insurance coverage
            "B27001_003E",  # Without health insurance coverage
        ]
    },
    "disability": {
        "name": "Disability",
        "variables": [
            "B18101_001E",  # Total civilian noninstitutionalized population
            "B18101_002E",  # With a disability
        ]
    },
    "veteran": {
        "name": "Veteran Status",
        "variables": [
            "B21001_001E",  # Total population 18 years and over
            "B21001_002E",  # Veteran
        ]
    },
    "language": {
        "name": "Language",
        "variables": [
            "B16001_001E",  # Total population 5 years and over
            "B16001_002E",  # English only
            "B16001_003E",  # Spanish
        ]
    }
}

def get_all_acs_variables():
    """Get all ACS variables from all categories"""
    all_vars = []
    for category in ACS_CATEGORIES.values():
        all_vars.extend(category["variables"])
    return list(set(all_vars))  # Remove duplicates

def get_state_fips_list():
    """Get list of state FIPS codes for KC metro"""
    return [KC_METRO_COUNTIES["Missouri"]["state_fips"], 
            KC_METRO_COUNTIES["Kansas"]["state_fips"]]

