const axios = require('axios');
const http = require('http');
const https = require('https');

const config = {
  port: parseInt(process.env.NETDATA_PORT || '19999', 10),
  scheme: process.env.NETDATA_SCHEME || 'http',
  timeout: parseInt(process.env.NETDATA_TIMEOUT_MS || '3000', 10),
  enabled: process.env.NETDATA_ENABLED !== 'false',
};

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50 });
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0',
});

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

async function fetchChartsList(hostIp) {
  const base = buildBaseUrl(hostIp);
  const { data } = await axios.get(`${base}/api/v1/charts`, {
    timeout: config.timeout,
    ...getAxiosAgentOptions(),
    validateStatus: (s) => s < 500,
  });
  return data?.charts || {};
}

function lastRow(data) {
  const rows = data?.data;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[rows.length - 1];
}

function parseCpuPercent(data) {
  const row = lastRow(data);
  const labels = data?.labels || [];
  if (!row) return null;

  const idleIdx = labels.indexOf('idle');
  if (idleIdx >= 0 && row[idleIdx] != null) {
    return Math.round(Math.min(100, Math.max(0, 100 - Number(row[idleIdx]))));
  }

  const nonIdle = labels
    .map((label, i) => (label !== 'idle' ? Number(row[i]) || 0 : 0))
    .reduce((a, b) => a + b, 0);
  return Math.round(Math.min(100, Math.max(0, nonIdle)));
}

function parseRamPercent(data) {
  const row = lastRow(data);
  const labels = data?.labels || [];
  if (!row) return null;

  const get = (name) => {
    const idx = labels.indexOf(name);
    return idx >= 0 ? Number(row[idx]) || 0 : 0;
  };

  const used = get('used');
  const free = get('free');
  const cached = get('cached');
  const buffers = get('buffers');
  const total = used + free + cached + buffers;
  if (total <= 0) return null;
  return Math.round(Math.min(100, Math.max(0, (used / total) * 100)));
}

function parseDiskFromChartData(data) {
  const row = lastRow(data);
  const labels = data?.labels || [];
  if (!row) return null;

  const get = (name) => {
    const idx = labels.indexOf(name);
    return idx >= 0 ? Number(row[idx]) || 0 : 0;
  };

  const used = get('used');
  const avail = get('avail') || get('available');
  const total = used + avail;
  if (total <= 0) return null;
  return Math.round(Math.min(100, Math.max(0, (used / total) * 100)));
}

async function resolveDiskPercent(hostIp) {
  const candidates = ['disk_space./', 'disk_space._var', 'disk_space._'];

  for (const chart of candidates) {
    try {
      const data = await fetchChart(hostIp, chart);
      const pct = parseDiskFromChartData(data);
      if (pct != null) return pct;
    } catch {
      // try next chart
    }
  }

  try {
    const charts = await fetchChartsList(hostIp);
    const diskChart = Object.keys(charts).find((id) => id.startsWith('disk_space.'));
    if (diskChart) {
      const data = await fetchChart(hostIp, diskChart);
      const pct = parseDiskFromChartData(data);
      if (pct != null) return pct;
    }
  } catch {
    // fall through
  }

  return null;
}

async function getRealtimeMetrics(hostIp) {
  const ip = String(hostIp || '').trim();
  const timestamp = Date.now();
  const base = { hostIp: ip, timestamp, cpu: null, ram: null, disk: null, reachable: false };

  if (!config.enabled) {
    return { ...base, error: 'disabled' };
  }

  if (!ip || ip === '0.0.0.0') {
    return { ...base, error: 'invalid_host_ip' };
  }

  try {
    const [cpuData, ramData] = await Promise.all([
      fetchChart(hostIp, 'system.cpu', { options: 'percentage,unaligned' }),
      fetchChart(hostIp, 'system.ram'),
    ]);

    const cpu = parseCpuPercent(cpuData);
    const ram = parseRamPercent(ramData);
    const disk = await resolveDiskPercent(hostIp);

    const hasAny = cpu != null || ram != null || disk != null;
    return {
      hostIp: ip,
      timestamp,
      cpu,
      ram,
      disk,
      reachable: hasAny,
      error: hasAny ? undefined : 'invalid_response',
    };
  } catch (err) {
    console.warn(`Netdata [${ip}]:`, err.message);
    return {
      ...base,
      error: classifyError(err),
    };
  }
}

module.exports = {
  isEnabled,
  buildBaseUrl,
  fetchChart,
  parseCpuPercent,
  parseRamPercent,
  parseDiskFromChartData,
  getRealtimeMetrics,
  config,
};
