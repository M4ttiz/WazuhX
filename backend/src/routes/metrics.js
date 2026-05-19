const express = require('express');
const metricsService = require('../services/metricsService');
const { withCache, getCacheKey } = require('../middleware/cache');

const router = express.Router();
const metricsTtl = parseInt(process.env.METRICS_CACHE_TTL_SECONDS || '30', 10);

router.get('/', async (req, res, next) => {
  try {
    const agentId = req.query.agentId;
    const key = getCacheKey('metrics', { agentId: agentId || '' });
    const result = await withCache(req, res, key, metricsTtl, () =>
      metricsService.getMetrics(agentId)
    );
    res.set('X-Data-Source', result.source || 'wazuh');
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
