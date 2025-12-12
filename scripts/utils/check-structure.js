/**
 * Check project structure
 * Validates that all required directories and files exist
 */

const fs = require('fs');
const path = require('path');

const requiredDirs = [
  'src/server',
  'src/systems',
  'src/shared',
  'src/config',
  'client/public',
  'data/raw',
  'data/processed',
  'data/cache',
  'scripts/data',
  'scripts/simulation',
  'tests/unit',
  'docs'
];

const requiredFiles = [
  'src/server/index.js',
  'src/config/index.js',
  'package.json'
];

console.log('Checking project structure...\n');

let allGood = true;

// Check directories
console.log('Directories:');
for (const dir of requiredDirs) {
  const dirPath = path.join(__dirname, '../..', dir);
  if (fs.existsSync(dirPath)) {
    console.log(`  ✓ ${dir}`);
  } else {
    console.log(`  ✗ ${dir} (missing)`);
    allGood = false;
  }
}

console.log('\nFiles:');
for (const file of requiredFiles) {
  const filePath = path.join(__dirname, '../..', file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✓ ${file}`);
  } else {
    console.log(`  ✗ ${file} (missing)`);
    allGood = false;
  }
}

// Check for MBTiles files
console.log('\nMBTiles files:');
const dataPaths = [
  path.join(__dirname, '../..', 'data/processed/tiles'),
  path.join(__dirname, '../..', 'data')
];

let foundTiles = false;
for (const dataPath of dataPaths) {
  if (fs.existsSync(dataPath)) {
    const files = fs.readdirSync(dataPath);
    const mbtiles = files.filter(f => f.endsWith('.mbtiles'));
    if (mbtiles.length > 0) {
      mbtiles.forEach(file => {
        console.log(`  ✓ ${path.relative(process.cwd(), path.join(dataPath, file))}`);
        foundTiles = true;
      });
    }
  }
}

if (!foundTiles) {
  console.log('  ⚠ No MBTiles files found');
  console.log('  → Convert PBF to MBTiles and place in data/processed/tiles/ or data/');
}

console.log('\n' + (allGood ? '✅ Structure looks good!' : '⚠️  Some items are missing'));
process.exit(allGood ? 0 : 1);

