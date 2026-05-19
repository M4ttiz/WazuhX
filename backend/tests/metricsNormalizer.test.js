const {
  evaluateThresholds,
  normalizeAgentMetrics,
} = require('../src/services/metricsNormalizer');

describe('metricsNormalizer', () => {
  it('evaluateThresholds fires when value exceeds threshold', () => {
    const cooldown = new Map();
    const thresholds = { cpu: 90, ram: 90, disk: 85 };
    const metrics = {
      agentId: '001',
      agentName: 'host-1',
      cpuPercent: 91,
      ramPercent: 50,
      maxDiskPercent: 40,
      disks: [],
    };
    const alerts = evaluateThresholds(metrics, thresholds, cooldown, 0);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].metric).toBe('cpu');
    expect(alerts[0].value).toBe(91);
  });

  it('evaluateThresholds does not fire at threshold boundary', () => {
    const cooldown = new Map();
    const thresholds = { cpu: 90, ram: 90, disk: 85 };
    const metrics = {
      agentId: '001',
      agentName: 'host-1',
      cpuPercent: 89,
      ramPercent: 90,
      maxDiskPercent: 85,
      disks: [],
    };
    const alerts = evaluateThresholds(metrics, thresholds, cooldown, 0);
    expect(alerts).toHaveLength(0);
  });

  it('normalizeAgentMetrics uses ram.usage from syscollector', () => {
    const metrics = normalizeAgentMetrics(
      { id: '001', name: 'endpoint-001' },
      {
        affected_items: [
          {
            ram: { total: 32000000000, free: 12000000000, usage: 63 },
            scan: { time: '2025-01-01T00:00:00Z' },
          },
        ],
      },
      { affected_items: [{ hostname: 'host1' }] },
      { affected_items: [{ cpu_usage_percent: 12 }, { cpu_usage_percent: 8 }] },
      null
    );
    expect(metrics.ramPercent).toBe(63);
    expect(metrics.cpuPercent).toBe(20);
    expect(metrics.source).toBe('syscollector');
  });
});
