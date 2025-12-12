/**
 * Process Kansas City area with Planetiler
 * This script generates the command to run Planetiler with KC bounds
 */

const path = require('path');
const fs = require('fs');

const KC_BOUNDS = {
  minLon: -94.8,
  maxLon: -94.4,
  minLat: 39.0,
  maxLat: 39.2
};

const inputFile = path.join(__dirname, '..', 'data', 'ks-mo.osm.pbf');
const outputFile = path.join(__dirname, '..', 'data', 'kc-enhanced.mbtiles');
const planetilerJar = path.join(__dirname, '..', 'data', 'planetiler.jar');

console.log('Kansas City Planetiler Processing');
console.log('==================================');
console.log(`Input: ${inputFile}`);
console.log(`Output: ${outputFile}`);
console.log(`Bounds: ${KC_BOUNDS.minLon}, ${KC_BOUNDS.minLat} to ${KC_BOUNDS.maxLon}, ${KC_BOUNDS.maxLat}`);
console.log('');

if (!fs.existsSync(inputFile)) {
  console.error(`Error: Input file not found: ${inputFile}`);
  process.exit(1);
}

if (!fs.existsSync(planetilerJar)) {
  console.error(`Error: Planetiler JAR not found: ${planetilerJar}`);
  process.exit(1);
}

// Generate the command
const boundsArg = `--bounds=${KC_BOUNDS.minLon},${KC_BOUNDS.minLat},${KC_BOUNDS.maxLon},${KC_BOUNDS.maxLat}`;
const command = `java -jar "${planetilerJar}" --osm-path="${inputFile}" --output="${outputFile}" ${boundsArg} --download --maxzoom=15`;

console.log('Run this command to process Kansas City area:');
console.log('');
console.log(command);
console.log('');
console.log('This will:');
console.log('  - Extract Kansas City area from the PBF file');
console.log('  - Process with Planetiler to create enhanced MBTiles');
console.log('  - Include building height data');
console.log('  - Download required additional data files');
console.log('  - Generate tiles up to zoom level 15 for detail');

// Also create a batch/shell script
const scriptContent = `@echo off
REM Process Kansas City area with Planetiler
cd /d "%~dp0\\.."
java -jar "data\\planetiler.jar" --osm-path="data\\ks-mo.osm.pbf" --output="data\\kc-enhanced.mbtiles" --bounds=${KC_BOUNDS.minLon},${KC_BOUNDS.minLat},${KC_BOUNDS.maxLon},${KC_BOUNDS.maxLat} --download --maxzoom=15
pause
`;

const scriptPath = path.join(__dirname, '..', 'process-kc.bat');
fs.writeFileSync(scriptPath, scriptContent);
console.log(`\n✓ Created batch script: process-kc.bat`);
console.log('  You can double-click this file to run the processing');

