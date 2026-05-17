const express = require('express');
const wazuh = require('../services/wazuhClient');
const { sendData } = require('../utils/response');

const router = express.Router();

router.get('/:id/os', async (req, res, next) => {
  try {
    const result = await wazuh.getAgent(req.params.id);
    if (!result.data) return res.status(404).json({ error: 'Agent not found' });
    sendData(res, {
      source: result.source,
      data: {
        os: result.data.os,
        kernel: result.data.kernel,
        architecture: result.data.architecture,
        hostname: result.data.hostname,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
