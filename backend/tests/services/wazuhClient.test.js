const wazuh = require('../../src/services/wazuhClient');

describe('wazuhClient (mock mode)', () => {
  beforeAll(() => {
    wazuh.forceMock(true);
  });

  it('getAgent returns agent when found', async () => {
    const result = await wazuh.getAgent('001');
    expect(result.source).toBe('mock');
    expect(result.data).toBeDefined();
    expect(result.data.id).toBe('001');
  });

  it('getAgent returns null data when not found', async () => {
    const result = await wazuh.getAgent('99999');
    expect(result.data).toBeNull();
  });

  it('getVulnerabilities returns vulnerabilities and stats', async () => {
    const result = await wazuh.getVulnerabilities();
    expect(result.source).toBe('mock');
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.stats).toBeDefined();
    expect(result.stats.total).toBeGreaterThan(0);
  });

  it('getVulnerabilities filters by agentId', async () => {
    const result = await wazuh.getVulnerabilities('001');
    expect(result.data.every((v) => v.agentId === '001')).toBe(true);
  });

  it('getAlerts returns paginated alerts in mock mode', async () => {
    const result = await wazuh.getAlerts({ page: 1, limit: 5 });
    expect(result.source).toBe('mock');
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.pagination).toBeDefined();
    expect(result.pagination.page).toBe(1);
  });

  it('getAlerts returns empty fallback when indexer is not configured', async () => {
    const indexer = require('../../src/services/wazuhIndexer');
    jest.spyOn(indexer, 'isConfigured').mockReturnValue(false);
    wazuh.forceMock(false);

    const result = await wazuh.getAlerts({ page: 1, limit: 10 });
    expect(result.data).toEqual([]);
    expect(result.pagination.total).toBe(0);
    expect(result.source).toBe('wazuh');

    indexer.isConfigured.mockRestore();
    wazuh.forceMock(true);
  });
});
