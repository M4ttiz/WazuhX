const express = require('express');
const wazuh = require('../services/wazuhClient');
const netdataService = require('../services/netdataService');
const { sendData } = require('../utils/response');
const { withCache, getCacheKey, liveTtl } = require('../middleware/cache');

const router = express.Router();
const statsCacheTtl = 15;

router.get('/', async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      os: req.query.os,
      group: req.query.group,
      search: req.query.search,
    };
    const key = getCacheKey('agents', filters);
    const result = await withCache(req, res, key, liveTtl, async () => {
      const wazuhResult = await wazuh.getAgents(filters);
      const agents = wazuhResult.data || [];

      await Promise.allSettled(
        agents.map((a) => netdataService.isNetdataAvailable(a.id, a.ip))
      );

      const discovery = netdataService.getDiscoveryStatus();
      const enriched = agents.map((a) => ({
        ...a,
        netdataAvailable: discovery[String(a.id)]?.netdataAvailable ?? false,
      }));

      return { ...wazuhResult, data: enriched };
    });
    sendData(res, result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const key = getCacheKey('agent', { id: req.params.id });
    const result = await withCache(req, res, key, liveTtl, () => wazuh.getAgent(req.params.id));
    if (!result.data) return res.status(404).json({ error: 'Agent not found' });
    sendData(res, result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/stats', async (req, res, next) => {
  try {
    const key = getCacheKey('agent-stats', { id: req.params.id });
    const result = await withCache(req, res, key, statsCacheTtl, async () => {
      const agentResult = await wazuh.getAgent(req.params.id);
      if (!agentResult.data) {
        return { data: null, source: 'netdata', notFound: true };
      }

      const agent = agentResult.data;
      const metrics = await netdataService.getAgentMetrics(agent.id, agent.ip);
      const data = metrics || netdataService.emptyMetrics();
      return { data, source: 'netdata' };
    });

    if (result.notFound || !result.data) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    sendData(res, result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/processes', async (req, res, next) => {
  try {
    const key = getCacheKey('agent-procs', { id: req.params.id });
    const result = await withCache(req, res, key, liveTtl, () => wazuh.getAgentProcesses(req.params.id));
    sendData(res, result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
