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
