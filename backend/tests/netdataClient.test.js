const {
  parseCpuPercent,
  parseRamPercent,
  parseDiskFromChartData,
} = require('../src/services/netdataClient');

describe('netdataClient parsers', () => {
  it('parseCpuPercent uses idle dimension', () => {
    const data = {
      labels: ['user', 'system', 'idle'],
      data: [[10, 15, 75]],
    };
    expect(parseCpuPercent(data)).toBe(25);
  });

  it('parseRamPercent computes used ratio', () => {
    const data = {
      labels: ['free', 'used', 'cached', 'buffers'],
      data: [[200, 600, 100, 100]],
    };
    expect(parseRamPercent(data)).toBe(60);
  });

  it('parseDiskFromChartData computes used vs avail', () => {
    const data = {
      labels: ['avail', 'used'],
      data: [[400, 600]],
    };
    expect(parseDiskFromChartData(data)).toBe(60);
  });
});
