/**
 * Extract Kansas City area from OSM PBF file
 * 
 * This script provides instructions and can be used with osmium-tool
 * Kansas City bounding box: -94.8°W to -94.4°W, 39.0°N to 39.2°N
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const KC_BOUNDS = {
  minLon: -94.8,
  maxLon: -94.4,
  minLat: 39.0,
  maxLat: 39.2
};

const inputFile = path.join(__dirname, '..', 'data', 'ks-mo.osm.pbf');
const outputFile = path.join(__dirname, '..', 'data', 'kc-extract.osm.pbf');

console.log('Kansas City Area Extraction');
console.log('===========================');
console.log(`Input: ${inputFile}`);
console.log(`Output: ${outputFile}`);
console.log(`Bounds: ${KC_BOUNDS.minLon}, ${KC_BOUNDS.minLat} to ${KC_BOUNDS.maxLon}, ${KC_BOUNDS.maxLat}`);
console.log('');

// Check if input file exists
if (!fs.existsSync(inputFile)) {
  console.error(`Error: Input file not found: ${inputFile}`);
  process.exit(1);
}

// Check if osmium-tool is available
try {
  execSync('osmium --version', { stdio: 'ignore' });
  console.log('✓ osmium-tool found');
  
  // Extract using osmium
  const command = `osmium extract -b ${KC_BOUNDS.minLon},${KC_BOUNDS.minLat},${KC_BOUNDS.maxLon},${KC_BOUNDS.maxLat} ${inputFile} -o ${outputFile}`;
  console.log(`Running: ${command}`);
  
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`\n✓ Successfully extracted Kansas City area to: ${outputFile}`);
    
    const stats = fs.statSync(outputFile);
    const inputStats = fs.statSync(inputFile);
    const reduction = ((1 - stats.size / inputStats.size) * 100).toFixed(1);
    console.log(`\nFile size reduction: ${reduction}%`);
    console.log(`Original: ${(inputStats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Extracted: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  } catch (error) {
    console.error('Error running osmium:', error.message);
    process.exit(1);
  }
} catch (error) {
  console.log('⚠ osmium-tool not found');
  console.log('\nTo extract the Kansas City area, you have two options:');
  console.log('\nOption 1: Install osmium-tool');
  console.log('  Windows: Download from https://osmcode.org/osmium-tool/');
  console.log('  Or use WSL: sudo apt-get install osmium-tool');
  console.log('\nOption 2: Use Planetiler with bounds');
  console.log('  Planetiler can filter by bounds during conversion');
  console.log('\nFor now, we will proceed with the full dataset.');
  console.log('You can manually extract using:');
  console.log(`  osmium extract -b ${KC_BOUNDS.minLon},${KC_BOUNDS.minLat},${KC_BOUNDS.maxLon},${KC_BOUNDS.maxLat} ${inputFile} -o ${outputFile}`);
  
  // Create a placeholder file with instructions
  const instructions = `# Kansas City Extraction Instructions

To extract the Kansas City area from ks-mo.osm.pbf:

1. Install osmium-tool:
   - Windows: Download from https://osmcode.org/osmium-tool/
   - Or use: choco install osmium-tool (if you have Chocolatey)

2. Run:
   osmium extract -b ${KC_BOUNDS.minLon},${KC_BOUNDS.minLat},${KC_BOUNDS.maxLon},${KC_BOUNDS.maxLat} data/ks-mo.osm.pbf -o data/kc-extract.osm.pbf

3. Or use Planetiler with bounds during conversion (see scripts/process-kc-planetiler.js)
`;

  fs.writeFileSync(path.join(__dirname, '..', 'data', 'KC_EXTRACTION_INSTRUCTIONS.txt'), instructions);
  console.log('\n✓ Created extraction instructions in data/KC_EXTRACTION_INSTRUCTIONS.txt');
}

