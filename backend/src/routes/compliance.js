const express = require('express');
const wazuh = require('../services/wazuhClient');
const { sendData } = require('../utils/response');
const { withCache, getCacheKey, historicTtl } = require('../middleware/cache');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const benchmark = req.query.benchmark || 'cis';
    const key = getCacheKey('compliance', { benchmark });
    const result = await withCache(req, res, key, historicTtl, () =>
      wazuh.getCompliance(benchmark)
    );
    sendData(res, result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
