const {
  parseCpuPercent,
  parseRamMetrics,
  parseDiskPercent,
  parseNetworkKbps,
  findCharts,
  isValidAgentIp,
  isNetdataAvailable,
  getDiscoveryStatus,
  invalidateDiscovery,
  getAgentMetrics,
} = require('../src/services/netdataService');

describe('netdataService parsers', () => {
  it('parseCpuPercent computes from idle dimension', () => {
    const data = {
      dimension_names: ['time', 'user', 'system', 'idle'],
      data: [[1, 10, 12, 78]],
    };
    expect(parseCpuPercent(data)).toBe(22);
  });

  it('parseRamMetrics returns percent and MB values', () => {
    const data = {
      dimension_names: ['time', 'used', 'free', 'cached', 'buffers'],
      data: [[1, 600, 200, 100, 100]],
    };
    const ram = parseRamMetrics(data);
    expect(ram.percent).toBe(60);
    expect(ram.usedMB).toBe(Math.round(600 / 1024));
    expect(ram.totalMB).toBe(Math.round(1000 / 1024));
  });

  it('parseDiskPercent uses used and avail', () => {
    const data = {
      dimension_names: ['time', 'used', 'avail'],
      data: [[1, 30, 70]],
    };
    expect(parseDiskPercent(data)).toBe(30);
  });

  it('parseNetworkKbps reads received and sent', () => {
    const data = {
      dimension_names: ['time', 'received', 'sent'],
      data: [[1, -1200, 800]],
    };
    expect(parseNetworkKbps(data)).toEqual({ recvKbps: 1200, sentKbps: 800 });
  });

  it('findCharts picks disk_space and net excluding net_packets', () => {
    const charts = {
      charts: {
        'disk_space._': {},
        'net.eth0': {},
        'net_packets.eth0': {},
      },
    };
    expect(findCharts(charts)).toEqual({
      diskChart: 'disk_space._',
      netChart: 'net.eth0',
    });
  });
});

describe('netdataService discovery', () => {
  beforeEach(() => {
    invalidateDiscovery('001');
    invalidateDiscovery('002');
  });

  it('isValidAgentIp rejects loopback and empty', () => {
    expect(isValidAgentIp('10.0.0.5')).toBe(true);
    expect(isValidAgentIp('127.0.0.1')).toBe(false);
    expect(isValidAgentIp('')).toBe(false);
  });

  it('mock mode marks active agents as netdata available', async () => {
    const available = await isNetdataAvailable('001', '10.0.1.10');
    expect(available).toBe(true);
    const status = getDiscoveryStatus();
    expect(status['001']?.netdataAvailable).toBe(true);
  });

  it('getAgentMetrics returns metrics for mock active agent', async () => {
    const metrics = await getAgentMetrics('001', '10.0.1.10');
    expect(metrics).not.toBeNull();
    expect(metrics.source).toBe('netdata');
    expect(metrics.reachable).toBe(true);
    expect(metrics.cpu.percent).toBeGreaterThanOrEqual(0);
  });

  it('getAgentMetrics returns null for invalid IP', async () => {
    const metrics = await getAgentMetrics('001', '127.0.0.1');
    expect(metrics).toBeNull();
  });
});
