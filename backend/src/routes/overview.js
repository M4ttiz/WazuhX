const express = require('express');
const wazuh = require('../services/wazuhClient');
const { sendData } = require('../utils/response');
const { withCache, getCacheKey, liveTtl } = require('../middleware/cache');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const key = getCacheKey('overview', {});
    const result = await withCache(req, res, key, liveTtl, () => wazuh.getOverview());
    sendData(res, result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
