const express = require('express');
const wazuh = require('../services/wazuhClient');
const glancesService = require('../services/glancesService');
const indexer = require('../services/wazuhIndexer');
const { sendData } = require('../utils/response');

const router = express.Router();

router.get('/agents', async (req, res, next) => {
  try {
    const wazuhResult = await wazuh.getAgents({ status: 'active' });
    const agents = wazuhResult.data || [];

    await Promise.allSettled(
      agents.map((a) => glancesService.isGlancesAvailable(wazuh.formatAgentId(a.id), a.ip))
    );

    const discovery = glancesService.getDiscoveryStatus();
    const indexerStatus = indexer.getStatus();

    const data = agents.map((a) => {
      const agentKey = wazuh.formatAgentId(a.id);
      const disc = discovery[agentKey];
      return {
        id: agentKey,
        name: a.name,
        ip: a.ip,
        status: a.status,
        liveMetricsAvailable: disc?.liveMetricsAvailable ?? false,
        lastGlancesCheck: disc?.lastChecked ?? null,
      };
    });

    sendData(res, {
      data: {
        agents: data,
        glancesEnabled: glancesService.config.enabled,
        indexerConfigured: indexer.isConfigured(),
        indexerLastError: indexerStatus.lastError || null,
      },
      source: wazuhResult.source,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
