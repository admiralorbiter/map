/**
 * Inspect MBTiles file to see what layers are available
 */

const MBTiles = require('@mapbox/mbtiles');
const path = require('path');
const { VectorTile } = require('@mapbox/vector-tile');
const Pbf = require('pbf');
const zlib = require('zlib');

async function inspectMBTiles(filePath) {
  return new Promise((resolve, reject) => {
    new MBTiles(filePath, async (err, mbtiles) => {
      if (err) {
        return reject(err);
      }

      // Get metadata
      mbtiles.getInfo((err, info) => {
        if (err) {
          return reject(err);
        }

        console.log('\n=== MBTiles Metadata ===');
        console.log(JSON.stringify(info, null, 2));

        // Try to get a sample tile to see what layers it contains
        // Get a tile at zoom 10, roughly in the middle
        const z = 10;
        const x = 300;
        const y = 400;

        mbtiles.getTile(z, x, y, async (err, tile, headers) => {
          if (err) {
            console.log(`\n⚠️  Could not read sample tile ${z}/${x}/${y}: ${err.message}`);
            console.log('   This might be normal if the tile is outside the data bounds.');
            return resolve(info);
          }

          try {
            // Decompress tile
            const tileData = await new Promise((resolve, reject) => {
              zlib.gunzip(tile, (err, decompressed) => {
                if (err) {
                  resolve(tile); // Try uncompressed
                } else {
                  resolve(decompressed);
                }
              });
            });

            // Parse vector tile
            const vectorTile = new VectorTile(new Pbf(tileData));

            console.log(`\n=== Layers in sample tile ${z}/${x}/${y} ===`);
            const layers = Object.keys(vectorTile.layers);
            
            if (layers.length === 0) {
              console.log('   No layers found in this tile (might be outside data bounds)');
              console.log('   Trying a different tile...');
              
              // Try a few more tiles
              const testTiles = [
                { z: 12, x: 1200, y: 1600 },
                { z: 14, x: 4800, y: 6400 }
              ];
              
              for (const testTile of testTiles) {
                mbtiles.getTile(testTile.z, testTile.x, testTile.y, async (err, tile) => {
                  if (!err && tile) {
                    try {
                      const tileData = await new Promise((resolve) => {
                        zlib.gunzip(tile, (err, decompressed) => {
                          resolve(err ? tile : decompressed);
                        });
                      });
                      const vt = new VectorTile(new Pbf(tileData));
                      const layers = Object.keys(vt.layers);
                      if (layers.length > 0) {
                        console.log(`\n✓ Found layers in tile ${testTile.z}/${testTile.x}/${testTile.y}:`);
                        layers.forEach(layer => {
                          const layerObj = vt.layers[layer];
                          console.log(`   - ${layer}: ${layerObj.length} features`);
                        });
                      }
                    } catch (e) {
                      // Skip
                    }
                  }
                });
              }
            } else {
              layers.forEach(layer => {
                const layerObj = vectorTile.layers[layer];
                console.log(`   - ${layer}: ${layerObj.length} features`);
                
                // Show sample feature properties
                if (layerObj.length > 0) {
                  const sampleFeature = layerObj.feature(0);
                  const props = Object.keys(sampleFeature.properties).slice(0, 5);
                  console.log(`     Sample properties: ${props.join(', ')}`);
                }
              });
            }

            resolve({ info, layers });
          } catch (error) {
            console.log(`\n⚠️  Error parsing tile: ${error.message}`);
            resolve(info);
          }
        });
      });
    });
  });
}

// Main
const args = process.argv.slice(2);
const filePath = args[0] || path.join(__dirname, '..', 'data', 'processed', 'tiles', 'kc-enhanced.mbtiles');

console.log(`Inspecting MBTiles: ${filePath}`);

inspectMBTiles(filePath)
  .then(() => {
    console.log('\n✓ Inspection complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n✗ Error:', err.message);
    process.exit(1);
  });

