const NodeCache = require('node-cache');

const liveTtl = parseInt(process.env.CACHE_TTL_SECONDS || '60', 10);
const historicTtl = 300;

const cache = new NodeCache({ stdTTL: liveTtl, checkperiod: 120 });

function getCacheKey(prefix, params = {}) {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return `${prefix}:${sorted}`;
}

async function withCache(req, res, key, ttl, fetchFn) {
  const cached = cache.get(key);
  if (cached !== undefined) {
    res.set('X-Cache-Hit', 'true');
    return cached;
  }

  const data = await fetchFn();
  cache.set(key, data, ttl || liveTtl);
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
