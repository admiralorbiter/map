/**
 * Shared utility functions
 * Common utilities used across systems
 */

/**
 * Parse bounds string to object
 */
function parseBounds(boundsString) {
  const [minLon, minLat, maxLon, maxLat] = boundsString.split(',').map(parseFloat);
  return { minLon, minLat, maxLon, maxLat };
}

/**
 * Format bounds object to string
 */
function formatBounds(bounds) {
  return `${bounds.minLon},${bounds.minLat},${bounds.maxLon},${bounds.maxLat}`;
}

/**
 * Check if point is within bounds
 */
function isPointInBounds(point, bounds) {
  return (
    point.lon >= bounds.minLon &&
    point.lon <= bounds.maxLon &&
    point.lat >= bounds.minLat &&
    point.lat <= bounds.maxLat
  );
}

/**
 * Calculate distance between two points (Haversine formula)
 */
function calculateDistance(point1, point2) {
  const R = 6371; // Earth's radius in km
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLon = (point2.lon - point1.lon) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(point1.lat * Math.PI / 180) *
    Math.cos(point2.lat * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Sleep/delay utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
async function retry(fn, maxRetries = 3, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(delay * Math.pow(2, i));
    }
  }
}

module.exports = {
  parseBounds,
  formatBounds,
  isPointInBounds,
  calculateDistance,
  sleep,
  retry
};

