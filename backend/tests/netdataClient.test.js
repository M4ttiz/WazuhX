const {
  parseCpuBusySum,
  parseRamPercent,
  parseDiskIoSum,
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
