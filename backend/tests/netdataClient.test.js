const {
  parseCpuBusySum,
  parseRamPercent,
  parseDiskIoSum,
  getDefaultNetdataBase,
  buildBaseUrl,
  isValidHostIp,
} = require('../src/services/netdataClient');

describe('netdataClient parsers', () => {
  it('parseCpuBusySum sums busy dimensions', () => {
    const data = {
      labels: ['user', 'nice', 'system', 'idle', 'iowait', 'irq', 'softirq', 'steal', 'guest', 'guest_nice'],
      data: [[10, 0, 12, 70, 3, 1, 1, 0, 0, 0]],
    };
    expect(parseCpuBusySum(data)).toBe(24);
  });

  it('parseCpuBusySum falls back from idle when busy sum is zero', () => {
    const data = {
      labels: ['user', 'system', 'idle'],
      data: [[0, 0, 78]],
    };
    expect(parseCpuBusySum(data)).toBe(22);
  });

  it('parseRamPercent uses used over used+available+cached+buffers', () => {
    const data = {
      labels: ['available', 'used', 'cached', 'buffers'],
      data: [[400, 600, 100, 100]],
    };
    expect(parseRamPercent(data)).toBe(50);
  });

  it('parseRamPercent supports free when available missing', () => {
    const data = {
      labels: ['free', 'used', 'cached', 'buffers'],
      data: [[200, 600, 100, 100]],
    };
    expect(parseRamPercent(data)).toBe(60);
  });

  it('parseDiskIoSum adds reads and writes', () => {
    const data = {
      labels: ['time', 'reads', 'writes'],
      data: [[1, 120, 80]],
    };
    expect(parseDiskIoSum(data)).toBe(200);
  });

  it('parseDiskIoSum supports in/out', () => {
    const data = {
      labels: ['in', 'out'],
      data: [[50, 30]],
    };
    expect(parseDiskIoSum(data)).toBe(80);
  });
});

describe('netdataClient host resolution', () => {
  const prev = process.env.NETDATA_HOST;

  afterEach(() => {
    if (prev === undefined) delete process.env.NETDATA_HOST;
    else process.env.NETDATA_HOST = prev;
  });

  it('getDefaultNetdataBase uses NETDATA_HOST', () => {
    process.env.NETDATA_HOST = 'http://192.168.50.136:19999';
    expect(getDefaultNetdataBase()).toBe('http://192.168.50.136:19999');
  });

  it('buildBaseUrl uses agent IP when valid', () => {
    expect(buildBaseUrl('10.0.0.5')).toBe('http://10.0.0.5:19999');
  });

  it('buildBaseUrl falls back to NETDATA_HOST for invalid IP', () => {
    process.env.NETDATA_HOST = 'http://192.168.50.136:19999';
    expect(buildBaseUrl('0.0.0.0')).toBe('http://192.168.50.136:19999');
  });

  it('isValidHostIp rejects empty and 0.0.0.0', () => {
    expect(isValidHostIp('192.168.1.1')).toBe(true);
    expect(isValidHostIp('0.0.0.0')).toBe(false);
    expect(isValidHostIp('')).toBe(false);
  });
});
