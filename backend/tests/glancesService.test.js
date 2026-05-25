const {
  parseQuicklook,
  parseMem,
  parseFsList,
  parseNetworkList,
  isValidAgentIp,
  isGlancesAvailable,
  getDiscoveryStatus,
  invalidateDiscovery,
  getAgentMetrics,
} = require('../src/services/glancesService');

describe('glancesService parsers', () => {
  it('parseQuicklook extracts cpu and mem percent', () => {
    expect(parseQuicklook({ cpu: 5.8, mem: 63.7, load: 4.3 })).toEqual({
      cpuPercent: 6,
      ramPercent: 64,
      load: 4.3,
    });
  });

  it('parseMem returns percent and MB', () => {
    const mem = parseMem({
      total: 16421220352,
      used: 10460996632,
      percent: 63.7,
    });
    expect(mem.percent).toBe(64);
    expect(mem.totalMB).toBe(Math.round(16421220352 / 1024 / 1024));
    expect(mem.usedMB).toBe(Math.round(10460996632 / 1024 / 1024));
  });

  it('parseFsList returns max filesystem percent', () => {
    const pct = parseFsList([
      { mnt_point: '/', percent: 43 },
      { mnt_point: '/var', percent: 80 },
    ]);
    expect(pct).toBe(80);
  });

  it('parseNetworkList sums interface rates to kbps', () => {
    const net = parseNetworkList([
      { bytes_recv_rate_per_sec: 1000, bytes_sent_rate_per_sec: 500 },
      { bytes_recv_rate_per_sec: 2000, bytes_sent_rate_per_sec: 0 },
    ]);
    expect(net.recvKbps).toBe(Math.round((3000 * 8) / 1000));
    expect(net.sentKbps).toBe(Math.round((500 * 8) / 1000));
  });
});

describe('glancesService discovery', () => {
  beforeEach(() => {
    invalidateDiscovery('001');
  });

  it('isValidAgentIp rejects loopback', () => {
    expect(isValidAgentIp('10.0.0.5')).toBe(true);
    expect(isValidAgentIp('127.0.0.1')).toBe(false);
  });

  it('mock mode marks active agents as available', async () => {
    const available = await isGlancesAvailable('001', '10.0.1.10');
    expect(available).toBe(true);
    expect(getDiscoveryStatus()['001']?.liveMetricsAvailable).toBe(true);
  });

  it('getAgentMetrics returns glances metrics in mock mode', async () => {
    const metrics = await getAgentMetrics('001', '10.0.1.10');
    expect(metrics).not.toBeNull();
    expect(metrics.source).toBe('glances');
    expect(metrics.reachable).toBe(true);
    expect(metrics.cpu.percent).toBeGreaterThanOrEqual(0);
  });
});
