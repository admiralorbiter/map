const express = require('express');
const path = require('path');
const cors = require('cors');
const MBTiles = require('@mapbox/mbtiles');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;

// Enable CORS
app.use(cors());

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

// MBTiles file paths - prefer KC enhanced, fallback to original
const kcEnhancedPath = path.join(__dirname, 'data', 'kc-enhanced.mbtiles');
const mbtilesPath = path.join(__dirname, 'data', 'ks-mo.mbtiles');

// Determine which MBTiles file to use
let activeMbtilesPath = null;
let activeMbtilesName = null;

if (fs.existsSync(kcEnhancedPath)) {
  activeMbtilesPath = kcEnhancedPath;
  activeMbtilesName = 'kc-enhanced';
  console.log('✅ Using Kansas City enhanced MBTiles file');
} else if (fs.existsSync(mbtilesPath)) {
  activeMbtilesPath = mbtilesPath;
  activeMbtilesName = 'ks-mo';
  console.log('✅ Using original MBTiles file');
} else {
  console.warn(`\n⚠️  Warning: No MBTiles file found`);
  console.warn('The server will start, but tiles will not be available.');
  console.warn('Please convert your PBF file to MBTiles format first.');
  console.warn('See README.md for conversion instructions.\n');
}

// Tile cache for performance
const tileCache = new Map();
const CACHE_MAX_SIZE = 1000; // Maximum number of tiles to cache
const CACHE_TTL = 3600000; // 1 hour in milliseconds

// Serve vector tiles from MBTiles (supports both ks-mo and kc-enhanced)
app.get('/data/:source/:z/:x/:y.pbf', (req, res) => {
  const { source, z, x, y } = req.params;
  
  // Determine which file to use based on source parameter
  let filePath = null;
  if (source === 'kc-enhanced' && fs.existsSync(kcEnhancedPath)) {
    filePath = kcEnhancedPath;
  } else if (source === 'ks-mo' && fs.existsSync(mbtilesPath)) {
    filePath = mbtilesPath;
  } else if (activeMbtilesPath) {
    // Fallback to active file
    filePath = activeMbtilesPath;
  } else {
    return res.status(404).json({ error: 'MBTiles file not found. Please convert PBF to MBTiles first.' });
  }

  // Check cache
  const cacheKey = `${source}-${z}-${x}-${y}`;
  const cached = tileCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    res.set(cached.headers);
    return res.send(cached.tile);
  }

  new MBTiles(filePath, (err, mbtiles) => {
    if (err) {
      console.error('Error opening MBTiles:', err);
      return res.status(500).json({ error: 'Failed to open MBTiles file' });
    }

    mbtiles.getTile(parseInt(z), parseInt(x), parseInt(y), (err, tile, headers) => {
      if (err) {
        if (err.message === 'Tile does not exist') {
          return res.status(204).end(); // No content for missing tiles
        }
        console.error('Error getting tile:', err);
        return res.status(500).json({ error: 'Failed to get tile' });
      }

      // Prepare headers
      const responseHeaders = {
        'Content-Type': 'application/x-protobuf',
        'Content-Encoding': headers['Content-Encoding'] || 'gzip',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      };

      // Cache the tile
      if (tileCache.size >= CACHE_MAX_SIZE) {
        // Remove oldest entry (simple FIFO)
        const firstKey = tileCache.keys().next().value;
        tileCache.delete(firstKey);
      }
      tileCache.set(cacheKey, {
        tile: tile,
        headers: responseHeaders,
        timestamp: Date.now()
      });

      res.set(responseHeaders);
      res.send(tile);
    });
  });
});

// Legacy endpoint for backward compatibility
app.get('/data/ks-mo/:z/:x/:y.pbf', (req, res) => {
  const { z, x, y } = req.params;
  const filePath = activeMbtilesPath || mbtilesPath;
  
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'MBTiles file not found. Please convert PBF to MBTiles first.' });
  }

  // Check cache
  const cacheKey = `ks-mo-${z}-${x}-${y}`;
  const cached = tileCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    res.set(cached.headers);
    return res.send(cached.tile);
  }

  new MBTiles(filePath, (err, mbtiles) => {
    if (err) {
      console.error('Error opening MBTiles:', err);
      return res.status(500).json({ error: 'Failed to open MBTiles file' });
    }

    mbtiles.getTile(parseInt(z), parseInt(x), parseInt(y), (err, tile, headers) => {
      if (err) {
        if (err.message === 'Tile does not exist') {
          return res.status(204).end();
        }
        console.error('Error getting tile:', err);
        return res.status(500).json({ error: 'Failed to get tile' });
      }

      const responseHeaders = {
        'Content-Type': 'application/x-protobuf',
        'Content-Encoding': headers['Content-Encoding'] || 'gzip',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600'
      };

      if (tileCache.size >= CACHE_MAX_SIZE) {
        const firstKey = tileCache.keys().next().value;
        tileCache.delete(firstKey);
      }
      tileCache.set(cacheKey, {
        tile: tile,
        headers: responseHeaders,
        timestamp: Date.now()
      });

      res.set(responseHeaders);
      res.send(tile);
    });
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    activeMbtiles: activeMbtilesName || 'none',
    cacheSize: tileCache.size,
    timestamp: new Date().toISOString()
  });
});

// Get tile metadata
app.get('/data/:source.json', (req, res) => {
  const { source } = req.params;
  
  let filePath = null;
  if (source === 'kc-enhanced' && fs.existsSync(kcEnhancedPath)) {
    filePath = kcEnhancedPath;
  } else if (source === 'ks-mo' && fs.existsSync(mbtilesPath)) {
    filePath = mbtilesPath;
  } else if (activeMbtilesPath) {
    filePath = activeMbtilesPath;
  } else {
    return res.status(404).json({ error: 'MBTiles file not found' });
  }

  new MBTiles(filePath, (err, mbtiles) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to open MBTiles file' });
    }

    mbtiles.getInfo((err, info) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to get tile info' });
      }

      const tilejson = {
        tilejson: '2.1.0',
        name: info.name || 'ks-mo',
        description: info.description || 'Kansas-Missouri OSM Data',
        version: info.version || '1.0.0',
        attribution: info.attribution || '',
        scheme: 'xyz',
        tiles: [`http://localhost:${PORT}/data/${req.params.source || activeMbtilesName || 'ks-mo'}/{z}/{x}/{y}.pbf`],
        minzoom: info.minzoom || 0,
        maxzoom: info.maxzoom || 14,
        bounds: info.bounds || [-102.0, 36.0, -89.0, 40.5],
        center: info.center || [-94.5, 38.5, 6]
      };

      res.json(tilejson);
    });
  });
});

// Start Express server
app.listen(PORT, () => {
  console.log(`\n✅ Server running on http://localhost:${PORT}`);
  console.log(`📍 Map available at http://localhost:${PORT}/index.html`);
  console.log(`🗺️  Tiles endpoint: http://localhost:${PORT}/data/${activeMbtilesName || 'ks-mo'}/{z}/{x}/{y}.pbf`);
  console.log(`💚 Health check: http://localhost:${PORT}/health\n`);
  
  if (activeMbtilesPath) {
    console.log(`✅ MBTiles file found: ${path.basename(activeMbtilesPath)}`);
    console.log('✅ Tile caching enabled for performance\n');
  } else {
    console.log('⚠️  MBTiles file not found - convert PBF to MBTiles first\n');
  }
});

