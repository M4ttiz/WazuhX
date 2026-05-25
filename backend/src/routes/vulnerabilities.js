const express = require('express');
const wazuh = require('../services/wazuhClient');
const { sendData } = require('../utils/response');
const { withCache, getCacheKey } = require('../middleware/cache');

const router = express.Router();
const vulnTtl = 3600;

router.get('/summary', async (req, res, next) => {
  try {
    const agentId = req.query.agentId;
    const key = getCacheKey('vulnerabilities-summary', { agentId: agentId || '' });
    const result = await withCache(req, res, key, vulnTtl, async () => {
      const vulnResult = await wazuh.getVulnerabilities(agentId);
      const vulns = vulnResult?.data || [];
      const byAgent = {};
      vulns.forEach((v) => {
        const id = v.agentId || v.agentName;
        if (!byAgent[id]) {
          byAgent[id] = { agentId: id, agentName: v.agentName, count: 0, lastScanned: null };
        }
        byAgent[id].count += 1;
        const ts = v.detectedAt ? new Date(v.detectedAt).getTime() : 0;
        if (!byAgent[id].lastScanned || ts > byAgent[id].lastScanned) {
          byAgent[id].lastScanned = v.detectedAt;
        }
      });
      return {
        data: {
          stats: vulnResult?.stats || {},
          agents: Object.values(byAgent),
        },
        source: vulnResult?.source,
      };
    });
    sendData(res, result);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const agentId = req.query.agentId;
    const key = getCacheKey('vulnerabilities', { agentId: agentId || '' });
    const result = await withCache(req, res, key, vulnTtl, () =>
      wazuh.getVulnerabilities(agentId)
    );
    sendData(res, result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
