const express = require('express');
const wazuh = require('../services/wazuhClient');
const indexer = require('../services/wazuhIndexer');
const { processAlerts } = require('../services/alertsFilterService');
const { sendData } = require('../utils/response');
const { withCache, getCacheKey, liveTtl } = require('../middleware/cache');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const showNoise = req.query.showNoise === 'true';
    const filters = {
      agentId: req.query.agentId,
      severityMin: req.query.severityMin,
      severityMax: req.query.severityMax,
      mitreTactic: req.query.mitreTactic,
      ruleGroup: req.query.ruleGroup,
      severity: req.query.severity,
      search: req.query.search,
      from: req.query.from,
      to: req.query.to,
      page: req.query.page,
      limit: req.query.limit,
      showNoise,
    };
    const key = getCacheKey('alerts', filters);
    const result = await withCache(req, res, key, liveTtl, () => wazuh.getAlerts(filters));
    const raw = result.data || [];
    const { alerts: processed, meta } = processAlerts(raw, { showNoise });
    const page = parseInt(filters.page, 10) || 1;
    const limit = parseInt(filters.limit, 10) || 25;
    const start = (page - 1) * limit;
    const pageData = processed.slice(start, start + limit);
    sendData(res, {
      ...result,
      data: pageData,
      pagination: {
        page,
        limit,
        total: processed.length,
        totalPages: Math.max(1, Math.ceil(processed.length / limit)),
      },
      stats: {
        hiddenNoiseCount: meta.hiddenNoise,
        dedupedGroups: meta.dedupedGroups,
        totalRaw: meta.totalRaw,
        totalVisible: meta.totalVisible,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/overview', async (req, res, next) => {
  try {
    const key = getCacheKey('overview', {});
    const result = await withCache(req, res, key, liveTtl, () => wazuh.getOverview());
    sendData(res, result);
  } catch (err) {
    next(err);
  }
});

router.get('/timeline', async (req, res, next) => {
  try {
    const filters = {
      agentId: req.query.agentId,
      severity: req.query.severity,
      severityMin: req.query.severityMin,
      severityMax: req.query.severityMax,
      from: req.query.from,
      to: req.query.to,
      interval: req.query.interval,
    };
    const key = getCacheKey('alerts-timeline', filters);
    const result = await withCache(req, res, key, liveTtl, () => wazuh.getAlertsTimeline(filters));
    sendData(res, result);
  } catch (err) {
    next(err);
  }
});

router.get('/live-count', async (_req, res, next) => {
  try {
    let count = 0;
    let source = 'wazuh';
    if (indexer.isConfigured()) {
      const liveCount = await indexer.getLiveAlertCount();
      if (liveCount !== null) {
        count = liveCount;
        source = 'indexer';
      }
    }
    sendData(res, { data: { count }, source });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
