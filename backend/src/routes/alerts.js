const express = require('express');
const wazuh = require('../services/wazuhClient');
const indexer = require('../services/wazuhIndexer');
const { sendData } = require('../utils/response');
const { withCache, getCacheKey, liveTtl } = require('../middleware/cache');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const filters = {
      agentId: req.query.agentId,
      severityMin: req.query.severityMin,
      severityMax: req.query.severityMax,
      mitreTactic: req.query.mitreTactic,
      search: req.query.search,
      from: req.query.from,
      to: req.query.to,
      page: req.query.page,
      limit: req.query.limit,
    };
    const key = getCacheKey('alerts', filters);
    const result = await withCache(req, res, key, liveTtl, () => wazuh.getAlerts(filters));
    sendData(res, result);
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

router.get('/live-count', async (_req, res, next) => {
  try {
    if (indexer.isConfigured()) {
      const count = await indexer.getLiveAlertCount();
      if (count !== null) return res.json({ count });
    }
    res.json({ count: 0 });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
