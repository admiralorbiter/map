@echo off
REM Process Kansas City metro area with Planetiler
REM Expanded bounds to cover full KC metro: -95.2,38.8,-94.0,39.5
REM Change to the directory where this batch file is located
cd /d "%~dp0"
echo Current directory: %CD%
echo Checking for planetiler.jar...
if not exist "data\planetiler.jar" (
    echo ERROR: planetiler.jar not found at data\planetiler.jar
    pause
    exit /b 1
)
echo Checking for OSM file...
if not exist "data\raw\osm\ks-mo.osm.pbf" (
    echo ERROR: OSM file not found at data\raw\osm\ks-mo.osm.pbf
    pause
    exit /b 1
)
echo Starting Planetiler...
echo This will overwrite the existing kc-enhanced.mbtiles file if it exists.
java -jar "data\planetiler.jar" --osm-path="data\raw\osm\ks-mo.osm.pbf" --output="data\processed\tiles\kc-enhanced.mbtiles" --bounds=-95.2,38.8,-94.0,39.5 --download --maxzoom=15 --force
pause
