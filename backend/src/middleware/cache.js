const NodeCache = require('node-cache');

const liveTtl = parseInt(process.env.CACHE_TTL_SECONDS || '60', 10);
const historicTtl = 300;

const cache = new NodeCache({ stdTTL: liveTtl, checkperiod: 120 });

function getCacheKey(prefix, params = {}) {
  const sorted = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== '')
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return `${prefix}:${sorted}`;
}

function isEmptyCacheValue(data) {
  if (data === null || data === undefined) return true;
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data === 'object' && data.data !== undefined) {
    if (data.data === null || data.data === undefined) return true;
    if (Array.isArray(data.data) && data.data.length === 0) return true;
  }
  return false;
}

async function withCache(req, res, key, ttl, fetchFn) {
  const cached = cache.get(key);
  if (cached !== undefined) {
    res.set('X-Cache-Hit', 'true');
    return cached;
  }

  const data = await fetchFn();

  if (!isEmptyCacheValue(data)) {
    cache.set(key, data, ttl || liveTtl);
  }

  res.set('X-Cache-Hit', 'false');
  return data;
}

function clearCache() {
  cache.flushAll();
}

function getCacheStats() {
  return cache.getStats();
}

module.exports = {
  cache,
  liveTtl,
  historicTtl,
  getCacheKey,
  withCache,
  clearCache,
  getCacheStats,
};
