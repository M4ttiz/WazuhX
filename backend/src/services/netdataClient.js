const axios = require('axios');
const http = require('http');
const https = require('https');

const config = {
  port: parseInt(process.env.NETDATA_PORT || '19999', 10),
  scheme: process.env.NETDATA_SCHEME || 'http',
  timeout: parseInt(process.env.NETDATA_TIMEOUT_MS || '2500', 10),
  enabled: process.env.NETDATA_ENABLED !== 'false',
};

const STANDARD_CHARTS = ['system.cpu', 'system.ram', 'system.net', 'system.io', 'system.load'];

function getDefaultNetdataBase() {
  const raw = (process.env.NETDATA_HOST || `${config.scheme}://localhost:${config.port}`).trim();
  return raw.replace(/\/$/, '');
}

function isValidHostIp(hostIp) {
  const ip = String(hostIp || '').trim();
  if (!ip || ip === '0.0.0.0') return false;
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(ip) || ip.includes(':');
}

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50 });
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0',
});

const CPU_BUSY_DIMS = ['user', 'system', 'nice', 'irq', 'softirq', 'steal'];

function getAxiosAgentOptions() {
  return config.scheme === 'https' ? { httpsAgent } : { httpAgent };
}

function isEnabled() {
  return config.enabled;
}

function buildBaseUrl(hostIp) {
  if (isValidHostIp(hostIp)) {
    const ip = String(hostIp).trim();
    return `${config.scheme}://${ip}:${config.port}`;
  }
  return getDefaultNetdataBase();
}

function classifyError(err) {
  if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) return 'timeout';
  if (['ECONNREFUSED', 'EHOSTUNREACH', 'ENETUNREACH', 'ENOTFOUND'].includes(err.code)) {
    return 'connection_refused';
  }
  return 'invalid_response';
}

async function fetchChart(hostIp, chart, extraParams = {}) {
  const base = buildBaseUrl(hostIp);
  const params = {
    chart,
    format: 'json',
    points: 1,
    after: -5,
    group: 'average',
    options: 'unaligned',
    ...extraParams,
  };

  const { data } = await axios.get(`${base}/api/v1/data`, {
    params,
    timeout: config.timeout,
    ...getAxiosAgentOptions(),
    validateStatus: (s) => s < 500,
  });

  if (!data || data.result !== 'success') {
    throw new Error('invalid_response');
  }

  return data;
}

async function fetchChartSafe(hostIp, chart, extraParams = {}) {
  try {
    const data = await fetchChart(hostIp, chart, extraParams);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: classifyError(err), message: err.message };
  }
}

function lastRow(chartResponse) {
  const rows = chartResponse?.data;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[rows.length - 1];
}

/**
 * Sum busy CPU dimensions (0–100 scale as returned by Netdata without percentage option).
 */
function parseCpuBusySum(chartResponse) {
  const row = lastRow(chartResponse);
  const labels = chartResponse?.labels || [];
  if (!row || !labels.length) return null;

  const lower = labels.map((l) => String(l).toLowerCase());
  let sum = 0;
  for (const dim of CPU_BUSY_DIMS) {
    const idx = lower.indexOf(dim.toLowerCase());
    if (idx >= 0 && row[idx] != null) {
      sum += Number(row[idx]) || 0;
    }
  }

  if (sum <= 0) {
    const idleIdx = lower.indexOf('idle');
    if (idleIdx >= 0 && row[idleIdx] != null) {
      return Math.round(Math.min(100, Math.max(0, 100 - Number(row[idleIdx]))));
    }
    return null;
  }

  return Math.round(Math.min(100, Math.max(0, sum)));
}

function parseRamPercent(chartResponse) {
  const row = lastRow(chartResponse);
  const labels = chartResponse?.labels || [];
  if (!row) return null;

  const lower = labels.map((l) => String(l).toLowerCase());
  const get = (...names) => {
    for (const name of names) {
      const idx = lower.indexOf(name.toLowerCase());
      if (idx >= 0) return Number(row[idx]) || 0;
    }
    return 0;
  };

  const used = get('used');
  const avail = get('available', 'avail');
  const free = get('free');
  const cached = get('cached');
  const buffers = get('buffers');

  const availableMem = avail > 0 ? avail : free;
  const total = used + availableMem + cached + buffers;
  if (total <= 0) return null;
  return Math.round(Math.min(100, Math.max(0, (used / total) * 100)));
}

/**
 * Disk I/O: sum read + write activity (rate units from Netdata chart, e.g. KiB/s).
 * Uses exact dimension names first to avoid false matches (e.g. writeback).
 */
function parseDiskIoSum(chartResponse) {
  const row = lastRow(chartResponse);
  const labels = chartResponse?.labels || [];
  if (!row || !labels.length) return null;

  const lower = labels.map((l) => String(l).toLowerCase());
  const pickFirst = (names) => {
    for (const name of names) {
      const idx = lower.indexOf(name);
      if (idx >= 0 && row[idx] != null) return Number(row[idx]) || 0;
    }
    return null;
  };

  let readVal = pickFirst(['reads', 'read', 'received', 'rx', 'in']);
  let writeVal = pickFirst(['writes', 'write', 'sent', 'tx', 'out']);

  if (readVal == null && writeVal == null) return null;
  readVal = readVal ?? 0;
  writeVal = writeVal ?? 0;
  return readVal + writeVal;
}

function chartUnits(chartResponse) {
  return chartResponse?.units || chartResponse?.chart?.units || null;
}

async function getRealtimeMetrics(hostIp) {
  const ip = String(hostIp || '').trim();
  const timestamp = Date.now();
  const base = {
    hostIp: ip,
    timestamp,
    cpu: null,
    ram: null,
    disk: null,
    diskUnit: null,
    partial: false,
    reachable: false,
  };

  if (!config.enabled) {
    return { ...base, error: 'disabled' };
  }

  if (!isValidHostIp(ip)) {
    return { ...base, error: 'Netdata unreachable' };
  }

  const [cpuRes, ramRes, ioRes] = await Promise.all([
    fetchChartSafe(hostIp, 'system.cpu'),
    fetchChartSafe(hostIp, 'system.ram'),
    fetchChartSafe(hostIp, 'system.io'),
  ]);

  const errors = [];
  let cpu = null;
  let ram = null;
  let disk = null;
  let diskUnit = null;

  if (cpuRes.ok) {
    cpu = parseCpuBusySum(cpuRes.data);
  } else {
    errors.push(`cpu:${cpuRes.error}`);
  }

  if (ramRes.ok) {
    ram = parseRamPercent(ramRes.data);
  } else {
    errors.push(`ram:${ramRes.error}`);
  }

  if (ioRes.ok) {
    disk = parseDiskIoSum(ioRes.data);
    diskUnit = chartUnits(ioRes.data) || 'KiB/s';
  } else {
    errors.push(`io:${ioRes.error}`);
  }

  const partial = errors.length > 0 && (cpu != null || ram != null || disk != null);
  const hasAny = cpu != null || ram != null || disk != null;

  return {
    ...base,
    cpu,
    ram,
    disk,
    diskUnit,
    partial,
    reachable: hasAny,
    error: hasAny ? undefined : 'Netdata unreachable',
  };
}

async function fetchAllCharts(hostIp, { points = 60, after = -60 } = {}) {
  if (!config.enabled) {
    return { charts: {}, series: {}, reachable: false, error: 'Netdata unreachable' };
  }

  if (!isValidHostIp(hostIp)) {
    return { charts: {}, series: {}, reachable: false, error: 'Netdata unreachable' };
  }

  const results = await Promise.all(
    STANDARD_CHARTS.map((chart) => getChartSeries(hostIp, chart, { points, after }))
  );

  const charts = {};
  const series = {};
  let okCount = 0;

  STANDARD_CHARTS.forEach((chart, i) => {
    const res = results[i];
    const key = chart.replace('system.', '');
    if (res.ok) {
      okCount += 1;
      series[key] = res.data;
      charts[chart] = { ok: true, units: res.units };
    } else {
      charts[chart] = { ok: false, error: res.error };
      series[key] = [];
    }
  });

  const reachable = okCount > 0;
  return {
    charts,
    series,
    reachable,
    error: reachable ? undefined : 'Netdata unreachable',
  };
}

function parseSeriesFromChart(chartResponse, parser) {
  const rows = chartResponse?.data;
  const labels = chartResponse?.labels || [];
  if (!Array.isArray(rows) || rows.length === 0) return [];
  return rows.map((row, i) => ({
    time: row[0] != null ? row[0] : i,
    value: parser ? parser({ data: [row], labels }) : row[1],
  }));
}

async function getChartSeries(hostIp, chart, { after = -3600, points = 60 } = {}) {
  const res = await fetchChartSafe(hostIp, chart, {
    points,
    after,
    group: 'average',
  });
  if (!res.ok) return { ok: false, error: res.error, data: [] };

  const parsers = {
    'system.cpu': (r) => parseCpuBusySum(r),
    'system.ram': (r) => parseRamPercent(r),
    'system.io': (r) => parseDiskIoSum(r),
    'system.net': (r) => {
      const row = lastRow(r);
      const labels = r?.labels || [];
      if (!row) return 0;
      const lower = labels.map((l) => String(l).toLowerCase());
      const rx = lower.indexOf('received');
      const tx = lower.indexOf('sent');
      return (Number(row[rx]) || 0) + (Number(row[tx]) || 0);
    },
    'system.load': (r) => {
      const row = lastRow(r);
      return row ? Number(row[1]) || 0 : 0;
    },
  };

  const parser = parsers[chart];
  const rows = res.data?.data || [];
  const labels = res.data?.labels || [];
  const series = rows.map((row) => ({
    time: row[0],
    value: parser ? parser({ data: [row], labels }) : row[1],
  }));

  return { ok: true, data: series, units: chartUnits(res.data) };
}

module.exports = {
  isEnabled,
  isValidHostIp,
  getDefaultNetdataBase,
  buildBaseUrl,
  fetchChart,
  fetchChartSafe,
  parseCpuBusySum,
  parseRamPercent,
  parseDiskIoSum,
  getChartSeries,
  getRealtimeMetrics,
  fetchAllCharts,
  STANDARD_CHARTS,
  config,
};
