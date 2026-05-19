const express = require('express');
const metricsService = require('../services/metricsService');
const realtimeMetricsService = require('../services/realtimeMetricsService');
const { withCache, getCacheKey } = require('../middleware/cache');

const router = express.Router();
const metricsTtl = parseInt(process.env.METRICS_CACHE_TTL_SECONDS || '30', 10);

router.get('/realtime/:agentId', async (req, res, next) => {
  try {
    const result = await realtimeMetricsService.getRealtimeMetricsForAgent(req.params.agentId);
    if (result.notFound || !result.data) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.set('X-Data-Source', result.source || 'netdata');
    res.json(result.data);
  } catch (err) {
    next(err);
  }
});

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
