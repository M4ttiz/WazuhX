const request = require('supertest');
const app = require('../src/index');

describe('WazuhX API', () => {
  it('GET /api/health returns ok with mock wazuh status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.wazuh).toBe('mock');
    expect(res.body.indexer).toBeDefined();
  });

  it('GET /api/metrics returns fleet metrics with thresholds', async () => {
    const res = await request(app).get('/api/metrics');
    expect(res.status).toBe(200);
    expect(res.body.data.thresholds).toBeDefined();
    expect(res.body.data.thresholds.cpu).toBe(90);
    expect(Array.isArray(res.body.data.agents)).toBe(true);
    expect(res.body.data.agents.length).toBeGreaterThan(0);
    expect(res.body.data.summary.totalAgents).toBeGreaterThan(0);
    expect(res.headers['x-data-source']).toBe('mock');
  });

  it('GET /api/metrics/realtime/001 returns netdata metrics in mock mode', async () => {
    const res = await request(app).get('/api/metrics/realtime/001');
    expect(res.status).toBe(200);
    expect(res.body.data.agentId).toBe('001');
    expect(typeof res.body.data.cpu).toBe('number');
    expect(typeof res.body.data.ram).toBe('number');
    expect(typeof res.body.data.disk).toBe('number');
    expect(res.body.data.diskMetric).toBe('io');
    expect(res.body.data.diskUnit).toBe('KiB/s');
    expect(res.body.data.source).toBe('netdata');
    expect(res.body.data.partial).toBe(false);
    expect(res.body.data.reachable).toBe(true);
    expect(res.body.data.timestamp).toBeDefined();
    expect(res.headers['x-data-source']).toBe('mock');
  });

  it('GET /api/metrics/realtime/999 returns 404', async () => {
    const res = await request(app).get('/api/metrics/realtime/999');
    expect(res.status).toBe(404);
  });

  it('GET /api/metrics?agentId=001 returns single agent metrics', async () => {
    const res = await request(app).get('/api/metrics?agentId=001');
    expect(res.status).toBe(200);
    expect(res.body.data.agents).toHaveLength(1);
    expect(res.body.data.agents[0].agentId).toBe('001');
    expect(res.body.data.agents[0].cpuPercent).toBeDefined();
  });

  it('GET /api/agents returns agents with mock source', async () => {
    const res = await request(app).get('/api/agents');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.headers['x-data-source']).toBe('mock');
  });

  it('GET /api/agents/:id returns agent detail', async () => {
    const res = await request(app).get('/api/agents/001');
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('001');
  });

  it('GET /api/agents/:id/stats returns stats', async () => {
    const res = await request(app).get('/api/agents/001/stats');
    expect(res.status).toBe(200);
    expect(res.body.data.cpuUsage).toBeDefined();
  });

  it('GET /api/agents/:id/processes returns processes', async () => {
    const res = await request(app).get('/api/agents/001/processes');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/alerts returns paginated alerts', async () => {
    const res = await request(app).get('/api/alerts?page=1&limit=25');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.pagination).toBeDefined();
  });

  it('GET /api/vulnerabilities returns data and stats', async () => {
    const res = await request(app).get('/api/vulnerabilities');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.stats.total).toBeGreaterThan(0);
  });

  it('GET /api/fim returns fim events', async () => {
    const res = await request(app).get('/api/fim');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/compliance returns compliance data', async () => {
    const res = await request(app).get('/api/compliance?benchmark=cis');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/overview returns dashboard data', async () => {
    const res = await request(app).get('/api/overview');
    expect(res.status).toBe(200);
    expect(res.body.data.kpis).toBeDefined();
    expect(res.body.data.severityTrend).toBeDefined();
  });

  it('POST /api/ai/briefing returns briefing', async () => {
    const res = await request(app).post('/api/ai/briefing');
    expect(res.status).toBeLessThanOrEqual(503);
    const briefing = res.body.data?.briefing ?? res.body.briefing;
    expect(briefing).toBeDefined();
  });

  it('POST /api/ai/chat requires message', async () => {
    const res = await request(app).post('/api/ai/chat').send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/ai/chat returns reply', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .send({ message: 'Qual è lo stato?', messages: [] });
    expect(res.status).toBe(200);
    expect(res.body.data.reply).toBeDefined();
  });

  it('GET /api/alerts/live-count returns 0 without indexer', async () => {
    const res = await request(app).get('/api/alerts/live-count');
    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(0);
  });

  it('DELETE /api/cache clears cache', async () => {
    const res = await request(app).delete('/api/cache');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/reports/generate returns HTML when no puppeteer', async () => {
    const res = await request(app)
      .post('/api/reports/generate')
      .send({ format: 'html', period: '7 giorni' });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html|pdf/);
    expect(res.text?.length || res.body?.length || 0).toBeGreaterThan(0);
  });
});
