const axios = require('axios');
const http = require('http');
const https = require('https');
const wazuh = require('./wazuhClient');
const mock = require('../mock/mockData');

const config = {
  port: parseInt(process.env.GLANCES_PORT || '61208', 10),
  scheme: process.env.GLANCES_SCHEME || 'http',
  timeout: parseInt(process.env.GLANCES_TIMEOUT_MS || '2500', 10),
  enabled: process.env.GLANCES_ENABLED !== 'false',
  user: process.env.GLANCES_USER || '',
  password: process.env.GLANCES_PASSWORD || '',
};

const API_VERSIONS = ['/api/4', '/api/3'];
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

function getAuthConfig() {
  if (config.user && config.password) {
    return { auth: { username: config.user, password: config.password } };
  }
  return {};
}

async function glancesGet(agentIp, path) {
  const base = buildBaseUrl(agentIp);
  const { data, status } = await axios.get(`${base}${path}`, {
    timeout: config.timeout,
    ...getAxiosAgentOptions(),
    ...getAuthConfig(),
    validateStatus: (s) => s < 500,
  });
  if (status === 404) return null;
  return data;
}

async function glancesFetch(agentIp, endpoint) {
  for (const version of API_VERSIONS) {
    try {
      const data = await glancesGet(agentIp, `${version}${endpoint}`);
      if (data != null) return { data, apiVersion: version };
    } catch {
      /* try next version */
    }
  }
  return null;
}

function parseQuicklook(quicklook) {
  if (!quicklook || typeof quicklook !== 'object') {
    return { cpuPercent: null, ramPercent: null, load: null };
  }
  const cpu = quicklook.cpu != null ? Math.round(Number(quicklook.cpu)) : null;
  const ram = quicklook.mem != null ? Math.round(Number(quicklook.mem)) : null;
  const load = quicklook.load != null ? Number(quicklook.load) : null;
  return { cpuPercent: cpu, ramPercent: ram, load };
}

function parseMem(mem) {
  if (!mem || typeof mem !== 'object') {
    return { percent: null, usedMB: null, totalMB: null };
  }
  const percent = mem.percent != null
    ? Math.round(Number(mem.percent))
    : mem.total > 0 && mem.used != null
      ? Math.round((Number(mem.used) / Number(mem.total)) * 100)
      : null;
  const usedMB = mem.used != null ? Math.round(Number(mem.used) / 1024 / 1024) : null;
  const totalMB = mem.total != null ? Math.round(Number(mem.total) / 1024 / 1024) : null;
  return { percent, usedMB, totalMB };
}

function parseFsList(fsList) {
  if (!Array.isArray(fsList) || fsList.length === 0) return null;
  let max = 0;
  for (const fs of fsList) {
    const pct = fs.percent != null ? Math.round(Number(fs.percent)) : null;
    if (pct != null && pct > max) max = pct;
  }
  return max || null;
}

function parseNetworkList(networkList) {
  if (!Array.isArray(networkList) || networkList.length === 0) {
    return { recvKbps: null, sentKbps: null };
  }

  let recvBps = 0;
  let sentBps = 0;
  let hasRecv = false;
  let hasSent = false;

  for (const iface of networkList) {
    if (iface.bytes_recv_rate_per_sec != null) {
      recvBps += Number(iface.bytes_recv_rate_per_sec) || 0;
      hasRecv = true;
    }
    if (iface.bytes_sent_rate_per_sec != null) {
      sentBps += Number(iface.bytes_sent_rate_per_sec) || 0;
      hasSent = true;
    }
  }

  return {
    recvKbps: hasRecv ? Math.round((recvBps * 8) / 1000) : null,
    sentKbps: hasSent ? Math.round((sentBps * 8) / 1000) : null,
  };
}

function historyFromGlances(historyPayload, field = 'total') {
  if (!historyPayload || typeof historyPayload !== 'object') return [];
  const series = historyPayload[field] || historyPayload.system || Object.values(historyPayload)[0];
  if (!Array.isArray(series)) return [];
  return series.map((point) => ({
    time: point[0],
    value: Math.round(Number(point[1]) || 0),
  }));
}

async function probeGlances(agentIp) {
  const res = await glancesFetch(agentIp, '/quicklook');
  return Boolean(res?.data && res.data.cpu != null);
}

function getCachedDiscovery(agentId) {
  const entry = discoveryCache.get(String(agentId));
  if (!entry) return null;
  if (Date.now() - entry.checkedAt > DISCOVERY_TTL_MS) return null;
  return entry;
}

async function mockGlancesAvailable(agentId, agentIp) {
  if (!isValidAgentIp(agentIp)) return false;
  const id = String(agentId);
  const cached = getCachedDiscovery(id);
  if (cached) return cached.available;

  const agent = mock.getAgentById(agentId);
  const available = Boolean(agent && agent.status === 'active');
  discoveryCache.set(id, { available, checkedAt: Date.now(), apiVersion: '/api/4' });
  return available;
}

async function isGlancesAvailable(agentId, agentIp) {
  if (!config.enabled) return false;
  if (!isValidAgentIp(agentIp)) return false;

  if (wazuh.isMockMode()) {
    return mockGlancesAvailable(agentId, agentIp);
  }

  const id = String(agentId);
  const cached = getCachedDiscovery(id);
  if (cached) return cached.available;

  let available = false;
  let apiVersion = null;
  try {
    for (const version of API_VERSIONS) {
      const data = await glancesGet(agentIp, `${version}/quicklook`);
      if (data && data.cpu != null) {
        available = true;
        apiVersion = version;
        console.log(`[Glances] Discovered on agent ${id} @ ${agentIp}`);
        break;
      }
    }
  } catch {
    available = false;
  }

  discoveryCache.set(id, { available, checkedAt: Date.now(), apiVersion });
  return available;
}

function invalidateDiscovery(agentId) {
  discoveryCache.delete(String(agentId));
}

async function getMetrics(agentIp) {
  const [qlRes, memRes, fsRes, netRes] = await Promise.allSettled([
    glancesFetch(agentIp, '/quicklook'),
    glancesFetch(agentIp, '/mem'),
    glancesFetch(agentIp, '/fs'),
    glancesFetch(agentIp, '/network'),
  ]);

  const quicklook = qlRes.status === 'fulfilled' ? qlRes.value?.data : null;
  const memData = memRes.status === 'fulfilled' ? memRes.value?.data : null;
  const fsData = fsRes.status === 'fulfilled' ? fsRes.value?.data : null;
  const netData = netRes.status === 'fulfilled' ? netRes.value?.data : null;
  const apiVersion = qlRes.status === 'fulfilled' ? qlRes.value?.apiVersion : '/api/4';

  const ql = parseQuicklook(quicklook);
  const mem = parseMem(memData);
  const ramPercent = mem.percent ?? ql.ramPercent;
  const network = parseNetworkList(netData);

  return {
    source: 'glances',
    reachable: true,
    timestamp: new Date().toISOString(),
    cpu: { percent: ql.cpuPercent },
    ram: {
      percent: ramPercent,
      usedMB: mem.usedMB,
      totalMB: mem.totalMB,
    },
    disk: { percent: parseFsList(fsData), mount: null },
    network: {
      recvKbps: network.recvKbps,
      sentKbps: network.sentKbps,
    },
    agentInfo: {
      version: apiVersion,
      cpuName: quicklook?.cpu_name || null,
    },
    load: ql.load,
  };
}

async function getHistory(agentIp, points = 60) {
  const limit = Math.min(points, 120);
  const [cpuRes, memRes] = await Promise.allSettled([
    glancesFetch(agentIp, `/cpu/history/${limit}`),
    glancesFetch(agentIp, `/mem/history/${limit}`),
  ]);

  const cpuHist = cpuRes.status === 'fulfilled' ? cpuRes.value?.data : null;
  const memHist = memRes.status === 'fulfilled' ? memRes.value?.data : null;

  const cpuPoints = historyFromGlances(cpuHist, 'total');
  const ramPoints = historyFromGlances(memHist, 'percent');

  const len = Math.max(cpuPoints.length, ramPoints.length);
  const history = [];
  for (let i = 0; i < len; i++) {
    history.push({
      t: cpuPoints[i]?.time || ramPoints[i]?.time || new Date().toISOString(),
      cpu: cpuPoints[i]?.value ?? 0,
      ram: ramPoints[i]?.value ?? 0,
      diskMax: 0,
    });
  }

  return {
    cpu: cpuPoints,
    ram: ramPoints,
    history,
  };
}

function emptyMetrics() {
  return {
    source: 'glances',
    reachable: false,
    timestamp: new Date().toISOString(),
    cpu: { percent: null },
    ram: { percent: null, usedMB: null, totalMB: null },
    disk: { percent: null, mount: null },
    network: { recvKbps: null, sentKbps: null },
    agentInfo: null,
  };
}

function mockMetrics(agentId) {
  const stats = mock.getAgentStats(agentId);
  if (!stats) return null;

  const agent = mock.getAgentById(agentId);
  const diskUsed = stats.disks?.[0]?.used ?? null;

  return {
    source: 'glances',
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
    disk: { percent: diskUsed != null ? Math.round(diskUsed) : null, mount: '/' },
    network: {
      recvKbps: stats.network?.rx
        ? Math.round((stats.network.rx * 8) / 1000)
        : null,
      sentKbps: stats.network?.tx
        ? Math.round((stats.network.tx * 8) / 1000)
        : null,
    },
    agentInfo: { version: 'mock', cpuName: agent?.cpuModel || null },
  };
}

async function getAgentMetrics(agentId, agentIp) {
  if (!config.enabled) return null;
  if (!isValidAgentIp(agentIp)) return null;

  if (wazuh.isMockMode()) {
    const available = await mockGlancesAvailable(agentId, agentIp);
    if (!available) return null;
    return mockMetrics(agentId);
  }

  const available = await isGlancesAvailable(agentId, agentIp);
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
      liveMetricsAvailable: entry.available,
      lastChecked: new Date(entry.checkedAt).toISOString(),
    };
  }
  return out;
}

module.exports = {
  getAgentMetrics,
  isGlancesAvailable,
  getDiscoveryStatus,
  getMetrics,
  getHistory,
  emptyMetrics,
  invalidateDiscovery,
  parseQuicklook,
  parseMem,
  parseFsList,
  parseNetworkList,
  isValidAgentIp,
  config,
  DISCOVERY_TTL_MS,
};
