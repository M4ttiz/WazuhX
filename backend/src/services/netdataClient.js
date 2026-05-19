const axios = require('axios');
const http = require('http');
const https = require('https');

const config = {
  port: parseInt(process.env.NETDATA_PORT || '19999', 10),
  scheme: process.env.NETDATA_SCHEME || 'http',
  timeout: parseInt(process.env.NETDATA_TIMEOUT_MS || '2500', 10),
  enabled: process.env.NETDATA_ENABLED !== 'false',
};

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
  const ip = String(hostIp).trim();
  return `${config.scheme}://${ip}:${config.port}`;
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

  if (!ip || ip === '0.0.0.0') {
    return { ...base, error: 'invalid_host_ip' };
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
    error: hasAny ? undefined : errors.join(';') || 'invalid_response',
  };
}

module.exports = {
  isEnabled,
  buildBaseUrl,
  fetchChart,
  fetchChartSafe,
  parseCpuBusySum,
  parseRamPercent,
  parseDiskIoSum,
  getRealtimeMetrics,
  config,
};
