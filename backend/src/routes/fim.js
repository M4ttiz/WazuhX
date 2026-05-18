const express = require('express');
const wazuh = require('../services/wazuhClient');
const { sendData } = require('../utils/response');
const { withCache, getCacheKey, liveTtl } = require('../middleware/cache');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const filters = {};
    if (req.query.agentId) {
      filters.agentId = req.query.agentId;
    }
    const key = getCacheKey('fim', filters);
    const result = await withCache(req, res, key, liveTtl, () => wazuh.getFim(filters));
    sendData(res, result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
