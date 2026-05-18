const request = require('supertest');
const app = require('../src/index');

describe('WazuhX API', () => {
  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.wazuh).toBeDefined();
  });

  it('GET /api/agents returns agents with mock source', async () => {
    const res = await request(app).get('/api/agents');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.headers['x-data-source']).toBe('mock');
  });

  it('GET /api/agents/:id returns agent detail', async () => {
    const res = await request(app).get('/api/agents/001');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('001');
  });

  it('GET /api/agents/:id/stats returns stats', async () => {
    const res = await request(app).get('/api/agents/001/stats');
    expect(res.status).toBe(200);
    expect(res.body.cpuUsage).toBeDefined();
  });

  it('GET /api/agents/:id/processes returns processes', async () => {
    const res = await request(app).get('/api/agents/001/processes');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
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
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/compliance returns compliance data', async () => {
    const res = await request(app).get('/api/compliance?benchmark=cis');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/overview returns dashboard data', async () => {
    const res = await request(app).get('/api/overview');
    expect(res.status).toBe(200);
    expect(res.body.kpis).toBeDefined();
    expect(res.body.severityTrend).toBeDefined();
  });

  it('POST /api/ai/briefing returns briefing', async () => {
    const res = await request(app).post('/api/ai/briefing');
    expect(res.status).toBeLessThanOrEqual(503);
    expect(res.body.briefing).toBeDefined();
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
    expect(res.body.reply).toBeDefined();
  });

  it('GET /api/alerts/live-count returns 0 without indexer', async () => {
    const res = await request(app).get('/api/alerts/live-count');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
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
