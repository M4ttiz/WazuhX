const express = require('express');
const pdfService = require('../services/pdfService');

const router = express.Router();

router.post('/generate', async (req, res, next) => {
  try {
    const {
      period = '7 giorni',
      sections = ['overview', 'alerts', 'agents', 'vulnerabilities', 'compliance'],
      agents = 'all',
      language = 'it',
      format = 'pdf',
    } = req.body;

    const result = await pdfService.generateReport({
      period,
      sections,
      agents,
      language,
      format,
    });

    const ext = result.contentType === 'application/pdf' ? 'pdf' : 'html';
    const filename = `wazuhx-report-${Date.now()}.${ext}`;

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(result.buffer);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
