const express = require('express');
const wazuh = require('../services/wazuhClient');
const glancesService = require('../services/glancesService');
const { sendData } = require('../utils/response');
const { withCache, getCacheKey, liveTtl } = require('../middleware/cache');

const router = express.Router();
const statsCacheTtl = 15;

function enrichAgentsWithGlances(agents) {
  const discovery = glancesService.getDiscoveryStatus();
  return agents.map((a) => {
    const agentKey = wazuh.formatAgentId(a.id);
    return {
      ...a,
      liveMetricsAvailable: discovery[agentKey]?.liveMetricsAvailable ?? false,
    };
  });
}

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
        agents.map((a) => glancesService.isGlancesAvailable(wazuh.formatAgentId(a.id), a.ip))
      );

      return { ...wazuhResult, data: enrichAgentsWithGlances(agents) };
    });

    if (result?.data?.length) {
      result.data = enrichAgentsWithGlances(result.data);
    }
    sendData(res, result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const key = getCacheKey('agent', { id: req.params.id });
    const result = await withCache(req, res, key, liveTtl, async () => {
      const agentResult = await wazuh.getAgent(req.params.id);
      if (!agentResult.data) return agentResult;

      const agent = agentResult.data;
      await glancesService.isGlancesAvailable(wazuh.formatAgentId(agent.id), agent.ip);
      const discovery = glancesService.getDiscoveryStatus();
      const agentKey = wazuh.formatAgentId(agent.id);

      return {
        ...agentResult,
        data: {
          ...agent,
          liveMetricsAvailable: discovery[agentKey]?.liveMetricsAvailable ?? false,
        },
      };
    });
    if (!result.data) return res.status(404).json({ error: 'Agent not found' });

    const agentKey = wazuh.formatAgentId(result.data.id);
    const discovery = glancesService.getDiscoveryStatus();
    result.data = {
      ...result.data,
      liveMetricsAvailable: discovery[agentKey]?.liveMetricsAvailable ?? result.data.liveMetricsAvailable ?? false,
    };
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
        return { data: null, source: 'glances', notFound: true };
      }

      const agent = agentResult.data;
      const metrics = await glancesService.getAgentMetrics(agent.id, agent.ip);
      const data = metrics || glancesService.emptyMetrics();
      return { data, source: 'glances' };
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
