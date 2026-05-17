const express = require('express');
const wazuh = require('../services/wazuhClient');
const { sendData } = require('../utils/response');
const { withCache, getCacheKey, liveTtl } = require('../middleware/cache');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const key = getCacheKey('vulnerabilities', req.query);
    const result = await withCache(req, res, key, liveTtl, () => wazuh.getVulnerabilities());
    res.set('X-Data-Source', result.source || 'mock');
    res.json({ data: result.data, stats: result.stats });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
