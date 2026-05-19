const express = require('express');
const metricsService = require('../services/metricsService');
const realtimeMetricsService = require('../services/realtimeMetricsService');
const { sendData } = require('../utils/response');
const { withCache, getCacheKey } = require('../middleware/cache');

const router = express.Router();
const metricsTtl = parseInt(process.env.METRICS_CACHE_TTL_SECONDS || '30', 10);

const realtimeCacheTtlMs = Math.min(
  5000,
  Math.max(0, parseInt(process.env.REALTIME_METRICS_CACHE_TTL_MS || '2000', 10))
);
const realtimeCacheTtlSec = Math.max(realtimeCacheTtlMs / 1000, 0.001);

router.get('/realtime/:agentId', async (req, res, next) => {
  try {
    const key = getCacheKey('metrics-realtime', { id: req.params.agentId });
    const result = await withCache(req, res, key, realtimeCacheTtlSec, () =>
      realtimeMetricsService.getRealtimeMetricsForAgent(req.params.agentId)
    );
    if (result.notFound || !result.data) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    sendData(res, {
      data: result.data,
      source: result.source === 'mock' ? 'mock' : result.data.source || result.source || 'netdata',
    });
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
    const source = result.source || 'wazuh';
    const { source: _s, ...payload } = result;
    sendData(res, { data: payload, source });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
