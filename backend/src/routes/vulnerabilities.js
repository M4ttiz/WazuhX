const express = require('express');
const wazuh = require('../services/wazuhClient');
const { sendData } = require('../utils/response');
const { withCache, getCacheKey, liveTtl } = require('../middleware/cache');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const agentId = req.query.agentId;
    const key = getCacheKey('vulnerabilities', { agentId: agentId || '' });
    const result = await withCache(req, res, key, liveTtl, () =>
      wazuh.getVulnerabilities(agentId)
    );
    sendData(res, result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
