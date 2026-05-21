const axios = require('axios');
const http = require('http');
const https = require('https');
const wazuh = require('./wazuhClient');
const mock = require('../mock/mockData');

const config = {
  port: parseInt(process.env.NETDATA_PORT || '19999', 10),
  scheme: process.env.NETDATA_SCHEME || 'http',
  timeout: parseInt(process.env.NETDATA_TIMEOUT_MS || '2500', 10),
  enabled: process.env.NETDATA_ENABLED !== 'false',
};

const DISCOVERY_TTL_MS = 60 * 1000;
const discoveryCache = new Map();

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50 });
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0',
});

function getAxiosAgentOptions() {
  return config.scheme === 'https' ? { httpsAgent } : { httpAgent };
}

function buildBaseUrl(agentIp) {
  const ip = String(agentIp || '').trim();
  return `${config.scheme}://${ip}:${config.port}`;
}

function isValidAgentIp(agentIp) {
  const ip = String(agentIp || '').trim();
  if (!ip || ip === '127.0.0.1' || ip === '0.0.0.0') return false;
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(ip) || ip.includes(':');
}

function getDimensionNames(chartResponse) {
  return chartResponse?.dimension_names || chartResponse?.labels || [];
}

function getDataRow(chartResponse) {
  const rows = chartResponse?.data;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0];
}

function dimIndex(names, ...candidates) {
  const lower = names.map((n) => String(n).toLowerCase());
  for (const name of candidates) {
    const idx = lower.indexOf(name.toLowerCase());
    if (idx >= 0) return idx;
  }
  return -1;
}

function dimValue(row, names, ...candidates) {
  const idx = dimIndex(names, ...candidates);
  if (idx < 0 || row[idx] == null) return null;
  return Number(row[idx]) || 0;
}

function parseCpuPercent(chartResponse) {
  const names = getDimensionNames(chartResponse);
  const row = getDataRow(chartResponse);
  if (!row || !names.length) return null;

  const idleIdx = dimIndex(names, 'idle');
  if (idleIdx < 0 || row[idleIdx] == null) return null;

  let sum = 0;
  for (let i = 0; i < names.length; i++) {
    if (String(names[i]).toLowerCase() === 'time') continue;
    sum += Number(row[i]) || 0;
  }
  if (sum <= 0) return null;

  const idle = Number(row[idleIdx]) || 0;
  return Math.round(Math.min(100, Math.max(0, (1 - idle / sum) * 100)));
}

function parseRamMetrics(chartResponse) {
  const names = getDimensionNames(chartResponse);
  const row = getDataRow(chartResponse);
  if (!row || !names.length) return { percent: null, usedMB: null, totalMB: null };

  const get = (...candidates) => dimValue(row, names, ...candidates) ?? 0;

  const used = get('used');
  const free = get('free');
  const cached = get('cached');
  const buffers = get('buffers');
  const avail = get('avail', 'available');

  const availableMem = avail > 0 ? avail : free;
  const total = used + availableMem + cached + buffers;
  const percent = total > 0
    ? Math.round(Math.min(100, Math.max(0, (used / total) * 100)))
    : null;

  const totalMB = total > 0 ? Math.round(total / 1024) : null;
  const usedMB = used > 0 ? Math.round(used / 1024) : null;

  return { percent, usedMB, totalMB };
}

function parseDiskPercent(chartResponse) {
  const names = getDimensionNames(chartResponse);
  const row = getDataRow(chartResponse);
  if (!row || !names.length) return null;

  const used = dimValue(row, names, 'used');
  const avail = dimValue(row, names, 'avail', 'available');
  if (used == null || avail == null) return null;
  const total = used + avail;
  if (total <= 0) return null;

  return Math.round(Math.min(100, Math.max(0, (used / total) * 100)));
}

function parseNetworkKbps(chartResponse) {
  const names = getDimensionNames(chartResponse);
  const row = getDataRow(chartResponse);
  if (!row || !names.length) return { recvKbps: null, sentKbps: null };

  const recv = dimValue(row, names, 'received', 'recv', 'rx');
  const sent = dimValue(row, names, 'sent', 'tx');
  if (recv == null && sent == null) return { recvKbps: null, sentKbps: null };

  return {
    recvKbps: recv != null ? Math.round(Math.abs(recv)) : null,
    sentKbps: sent != null ? Math.round(Math.abs(sent)) : null,
  };
}

async function netdataGet(agentIp, path, params = {}) {
  const base = buildBaseUrl(agentIp);
  const { data } = await axios.get(`${base}${path}`, {
    params,
    timeout: config.timeout,
    ...getAxiosAgentOptions(),
    validateStatus: (s) => s < 500,
  });
  return data;
}

async function probeNetdata(agentIp) {
  const data = await netdataGet(agentIp, '/api/v1/info');
  return Boolean(data && (data.version || data.hostname));
}

function getCachedDiscovery(agentId) {
  const entry = discoveryCache.get(String(agentId));
  if (!entry) return null;
  if (Date.now() - entry.checkedAt > DISCOVERY_TTL_MS) return null;
  return entry;
}

async function isNetdataAvailable(agentId, agentIp) {
  if (!config.enabled) return false;
  if (!isValidAgentIp(agentIp)) return false;

  if (wazuh.isMockMode()) {
    return mockNetdataAvailable(agentId, agentIp);
  }

  const id = String(agentId);
  const cached = getCachedDiscovery(id);
  if (cached) return cached.available;

  let available = false;
  try {
    available = await probeNetdata(agentIp);
    if (available) {
      console.log(`[Netdata] ✅ Discovered on agent ${id} @ ${agentIp}`);
    }
  } catch {
    available = false;
  }

  discoveryCache.set(id, { available, checkedAt: Date.now() });
  return available;
}

function invalidateDiscovery(agentId) {
  discoveryCache.delete(String(agentId));
}

function findCharts(chartsPayload) {
  const charts = chartsPayload?.charts || chartsPayload || {};
  const ids = typeof charts === 'object' ? Object.keys(charts) : [];

  const diskChart = ids.find((id) => id.startsWith('disk_space.')) || null;
  const netChart = ids.find(
    (id) => id.startsWith('net.') && !id.includes('net_packets')
  ) || null;

  return { diskChart, netChart };
}

async function fetchChartData(agentIp, chart) {
  if (!chart) return null;
  try {
    const data = await netdataGet(agentIp, '/api/v1/data', {
      chart,
      points: 1,
      format: 'json',
      options: 'absolute',
    });
    if (!data || data.result !== 'success') return null;
    return data;
  } catch {
    return null;
  }
}

async function getMetrics(agentIp) {
  const chartsPayload = await netdataGet(agentIp, '/api/v1/charts');
  const { diskChart, netChart } = findCharts(chartsPayload);

  const fetches = [
    fetchChartData(agentIp, 'system.cpu'),
    fetchChartData(agentIp, 'system.ram'),
    fetchChartData(agentIp, diskChart),
    fetchChartData(agentIp, netChart),
    netdataGet(agentIp, '/api/v1/info').catch(() => null),
  ];

  const [cpuRes, ramRes, diskRes, netRes, infoRes] = await Promise.allSettled(fetches);

  const cpuData = cpuRes.status === 'fulfilled' ? cpuRes.value : null;
  const ramData = ramRes.status === 'fulfilled' ? ramRes.value : null;
  const diskData = diskRes.status === 'fulfilled' ? diskRes.value : null;
  const netData = netRes.status === 'fulfilled' ? netRes.value : null;
  const info = infoRes.status === 'fulfilled' ? infoRes.value : null;

  const ram = parseRamMetrics(ramData);
  const network = parseNetworkKbps(netData);

  return {
    source: 'netdata',
    reachable: true,
    timestamp: new Date().toISOString(),
    cpu: { percent: parseCpuPercent(cpuData) },
    ram,
    disk: { percent: parseDiskPercent(diskData), chart: diskChart },
    network: {
      recvKbps: network.recvKbps,
      sentKbps: network.sentKbps,
      chart: netChart,
    },
    netdataInfo: info
      ? {
          version: info.version || null,
          os: info.os?.name || info.os_name || info.hostname || null,
        }
      : null,
  };
}

function emptyMetrics() {
  return {
    source: 'netdata',
    reachable: false,
    timestamp: new Date().toISOString(),
    cpu: { percent: null },
    ram: { percent: null, usedMB: null, totalMB: null },
    disk: { percent: null, chart: null },
    network: { recvKbps: null, sentKbps: null, chart: null },
    netdataInfo: null,
  };
}

function mockMetrics(agentId) {
  const stats = mock.getAgentStats(agentId);
  if (!stats) return null;

  const agent = mock.getAgentById(agentId);
  const diskUsed = stats.disks?.[0]?.used ?? null;

  return {
    source: 'netdata',
    reachable: true,
    timestamp: new Date().toISOString(),
    cpu: { percent: stats.cpuUsage != null ? Math.round(stats.cpuUsage) : null },
    ram: {
      percent: stats.ramUsage != null ? Math.round(stats.ramUsage) : null,
      usedMB: agent?.ramTotal
        ? Math.round((agent.ramTotal * (stats.ramUsage || 0)) / 100)
        : null,
      totalMB: agent?.ramTotal ?? null,
    },
    disk: {
      percent: diskUsed != null ? Math.round(diskUsed) : null,
      chart: 'disk_space.mock',
    },
    network: {
      recvKbps: stats.network?.rx
        ? Math.round(stats.network.rx / 1024)
        : null,
      sentKbps: stats.network?.tx
        ? Math.round(stats.network.tx / 1024)
        : null,
      chart: 'net.mock',
    },
    netdataInfo: { version: 'mock', os: agent?.os || null },
  };
}

async function mockNetdataAvailable(agentId, agentIp) {
  if (!isValidAgentIp(agentIp)) return false;
  const id = String(agentId);
  const cached = getCachedDiscovery(id);
  if (cached) return cached.available;

  const agent = mock.getAgentById(agentId);
  const available = Boolean(agent && agent.status === 'active');
  discoveryCache.set(id, { available, checkedAt: Date.now() });
  return available;
}

async function getAgentMetrics(agentId, agentIp) {
  if (!config.enabled) return null;
  if (!isValidAgentIp(agentIp)) return null;

  if (wazuh.isMockMode()) {
    const available = await mockNetdataAvailable(agentId, agentIp);
    if (!available) return null;
    return mockMetrics(agentId);
  }

  const available = await isNetdataAvailable(agentId, agentIp);
  if (!available) return null;

  try {
    return await getMetrics(agentIp);
  } catch {
    invalidateDiscovery(agentId);
    return null;
  }
}

function getDiscoveryStatus() {
  const out = {};
  for (const [agentId, entry] of discoveryCache.entries()) {
    out[agentId] = {
      netdataAvailable: entry.available,
      lastChecked: new Date(entry.checkedAt).toISOString(),
    };
  }
  return out;
}

module.exports = {
  getAgentMetrics,
  isNetdataAvailable,
  getDiscoveryStatus,
  emptyMetrics,
  invalidateDiscovery,
  parseCpuPercent,
  parseRamMetrics,
  parseDiskPercent,
  parseNetworkKbps,
  findCharts,
  isValidAgentIp,
  config,
  DISCOVERY_TTL_MS,
};
