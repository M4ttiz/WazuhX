require('dotenv').config();

const express = require('express');
const cors = require('cors');
const wazuh = require('./services/wazuhClient');
const { apiLimiter } = require('./middleware/rateLimit');
const { getCacheStats, clearCache } = require('./middleware/cache');

const agentsRouter = require('./routes/agents');
const alertsRouter = require('./routes/alerts');
const vulnerabilitiesRouter = require('./routes/vulnerabilities');
const fimRouter = require('./routes/fim');
const complianceRouter = require('./routes/compliance');
const overviewRouter = require('./routes/overview');
const aiRouter = require('./routes/ai');
const reportsRouter = require('./routes/reports');
const metricsRouter = require('./routes/metrics');

const app = express();
const PORT = process.env.PORT || 3001;

if (process.env.USE_MOCK === 'true') {
  wazuh.forceMock(true);
}

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/api', apiLimiter);

app.get('/api/health', async (req, res, next) => {
  try {
    const status = await wazuh.checkHealth();
    res.json({
      status: 'ok',
      wazuh: status.wazuh,
      indexer: status.indexer,
      useMock: status.useMock,
      cache: getCacheStats(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

app.post('/api/settings/test-connection', async (req, res) => {
  const result = await wazuh.testConnection();
  res.json(result);
});

app.delete('/api/cache', (_req, res) => {
  clearCache();
  res.json({ success: true, message: 'Cache cleared' });
});

app.use('/api/metrics', metricsRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/vulnerabilities', vulnerabilitiesRouter);
app.use('/api/fim', fimRouter);
app.use('/api/compliance', complianceRouter);
app.use('/api/overview', overviewRouter);
app.use('/api/ai', aiRouter);
app.use('/api/reports', reportsRouter);

app.use((err, req, res, _next) => {
  console.error(err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`WazuhX backend listening on port ${PORT}`);
    if (process.env.USE_MOCK === 'true') {
      console.log('Running in MOCK mode');
    }
  });
}

module.exports = app;
