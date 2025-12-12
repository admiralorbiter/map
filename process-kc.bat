@echo off
REM Process Kansas City area with Planetiler
cd /d "%~dp0\.."
java -jar "data\planetiler.jar" --osm-path="data\ks-mo.osm.pbf" --output="data\kc-enhanced.mbtiles" --bounds=-94.8,39,-94.4,39.2 --download --maxzoom=15
pause
