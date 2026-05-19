const express = require('express');
const metricsService = require('../services/metricsService');
const realtimeMetricsService = require('../services/realtimeMetricsService');
const wazuh = require('../services/wazuhClient');
const netdata = require('../services/netdataClient');
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

const RANGE_SECONDS = { '5m': 300, '15m': 900, '1h': 3600, '6h': 21600, '24h': 86400 };

router.get('/netdata/series', async (req, res, next) => {
  try {
    const agentId = req.query.agentId;
    const range = req.query.range || '1h';
    const afterSec = RANGE_SECONDS[range] || parseInt(req.query.after, 10) || 3600;
    const charts = (req.query.charts || 'system.cpu,system.ram,system.net').split(',');

    const agentResult = await wazuh.getAgent(agentId);
    if (!agentResult?.data?.ip) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const hostIp = agentResult.data.ip;
    const points = Math.min(parseInt(req.query.points, 10) || 60, 120);
    const series = {};

    for (const chart of charts) {
      series[chart] = await netdata.getChartSeries(hostIp, chart.trim(), {
        after: -afterSec,
        points,
      });
    }

    const reachable = Object.values(series).some((s) => s.ok);
    sendData(res, {
      data: { agentId, range, series, reachable },
      source: reachable ? 'netdata' : 'wazuh',
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
