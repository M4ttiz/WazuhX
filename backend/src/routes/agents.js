const express = require('express');
const wazuh = require('../services/wazuhClient');
const { sendData } = require('../utils/response');
const { withCache, getCacheKey, liveTtl } = require('../middleware/cache');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      os: req.query.os,
      group: req.query.group,
      search: req.query.search,
    };
    const key = getCacheKey('agents', filters);
    const result = await withCache(req, res, key, liveTtl, () => wazuh.getAgents(filters));
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
    const result = await withCache(req, res, key, liveTtl, () => wazuh.getAgentStats(req.params.id));
    if (!result.data) return res.status(404).json({ error: 'Agent not found' });
    sendData(res, result);
  } catch (err) {
    next(err);
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
