const express = require('express');
const metricsService = require('../services/metricsService');
const realtimeMetricsService = require('../services/realtimeMetricsService');
const wazuh = require('../services/wazuhClient');
const glancesService = require('../services/glancesService');
const { sendData } = require('../utils/response');
const { withCache, getCacheKey } = require('../middleware/cache');

const router = express.Router();
const metricsTtl = parseInt(process.env.METRICS_CACHE_TTL_SECONDS || '5', 10);

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
      source: result.source === 'mock' ? 'mock' : 'glances',
    });
  } catch (err) {
    next(err);
  }
});

router.get('/glances/series', async (req, res, next) => {
  try {
    const agentId = req.query.agentId;
    const points = Math.min(parseInt(req.query.points, 10) || 60, 120);

    const agentResult = await wazuh.getAgent(agentId);
    if (!agentResult?.data?.ip) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const hostIp = agentResult.data.ip;
    if (!glancesService.isValidAgentIp(hostIp)) {
      return res.status(503).json({ error: 'Glances unreachable' });
    }

    const historyBundle = await glancesService.getHistory(hostIp, points);
    const reachable = (historyBundle.cpu?.length || 0) > 0
      || (historyBundle.ram?.length || 0) > 0;

    if (!reachable) {
      return res.status(503).json({ error: 'Glances unreachable' });
    }

    sendData(res, {
      data: { agentId, points, series: historyBundle, reachable },
      source: 'glances',
    });
  } catch (err) {
    next(err);
  }
});

/** @deprecated use /metrics/glances/series */
router.get('/netdata/series', (req, res) => {
  const qs = new URLSearchParams(req.query).toString();
  res.redirect(307, `glances/series${qs ? `?${qs}` : ''}`);
});

router.get('/', async (req, res, next) => {
  try {
    const agentId = req.query.agentId;
    const key = getCacheKey('metrics', { agentId: agentId || '' });
    const result = await withCache(req, res, key, metricsTtl, () =>
      metricsService.getMetrics(agentId)
    );
    const source = result.source || 'glances';
    const { source: _s, ...payload } = result;
    sendData(res, { data: payload, source });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
