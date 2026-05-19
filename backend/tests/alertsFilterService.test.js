const {
  deduplicateAlerts,
  filterNoise,
  processAlerts,
  extractSrcIp,
  DEFAULT_NOISE_RULE_IDS,
} = require('../src/services/alertsFilterService');

describe('alertsFilterService', () => {
  const base = (id, ruleId, agentId, srcip, ts) => ({
    id,
    ruleId,
    agentId,
    timestamp: ts,
    rawLog: JSON.stringify({ data: { srcip } }),
  });

  it('extractSrcIp from rawLog JSON', () => {
    expect(extractSrcIp({ rawLog: '{"data":{"srcip":"1.2.3.4"}}' })).toBe('1.2.3.4');
  });

  it('deduplicateAlerts groups by rule, agent, srcip', () => {
    const alerts = [
      base('a1', '100', '001', '10.0.0.1', '2024-01-02T10:00:00Z'),
      base('a2', '100', '001', '10.0.0.1', '2024-01-02T11:00:00Z'),
      base('a3', '200', '001', '10.0.0.1', '2024-01-02T09:00:00Z'),
    ];
    const out = deduplicateAlerts(alerts);
    expect(out).toHaveLength(2);
    const grouped = out.find((a) => a.ruleId === '100');
    expect(grouped.count).toBe(2);
    expect(grouped.first_seen).toBe('2024-01-02T10:00:00Z');
    expect(grouped.timestamp).toBe('2024-01-02T11:00:00Z');
  });

  it('filterNoise hides default noise rules unless showNoise', () => {
    const alerts = [
      { id: '1', ruleId: '5710' },
      { id: '2', ruleId: '9999' },
    ];
    expect(filterNoise(alerts, false)).toHaveLength(1);
    expect(filterNoise(alerts, true)).toHaveLength(2);
    expect(DEFAULT_NOISE_RULE_IDS).toContain('5710');
  });

  it('processAlerts returns meta counts', () => {
    const alerts = [
      base('a1', '5710', '001', '10.0.0.1', '2024-01-01T00:00:00Z'),
      base('a2', '5710', '001', '10.0.0.1', '2024-01-01T01:00:00Z'),
      base('a3', '100', '002', '10.0.0.2', '2024-01-01T02:00:00Z'),
    ];
    const { alerts: visible, meta } = processAlerts(alerts, { showNoise: false });
    expect(meta.hiddenNoise).toBe(2);
    expect(meta.totalRaw).toBe(3);
    expect(visible).toHaveLength(1);
    expect(visible[0].count).toBe(1);
  });

  it('processAlerts with showNoise keeps noise and dedupes', () => {
    const alerts = [
      base('a1', '5710', '001', '10.0.0.1', '2024-01-01T00:00:00Z'),
      base('a2', '5710', '001', '10.0.0.1', '2024-01-01T01:00:00Z'),
    ];
    const { alerts: visible, meta } = processAlerts(alerts, { showNoise: true });
    expect(meta.hiddenNoise).toBe(0);
    expect(visible).toHaveLength(1);
    expect(visible[0].count).toBe(2);
  });
});
