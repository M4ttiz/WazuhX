const axios = require('axios');
const mock = require('../mock/mockData');

let token = null;
let tokenExpiry = null;
let useMock = process.env.USE_MOCK === 'true';
let connectionStatus = 'unknown';
let lastError = null;

const baseURL = process.env.WAZUH_API_URL || 'https://localhost:55000';

const client = axios.create({
  baseURL,
  timeout: 15000,
  httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
});

async function getToken() {
  if (token && Date.now() < tokenExpiry) return token;

  const user = process.env.WAZUH_USER;
  const password = process.env.WAZUH_PASSWORD;

  if (!user || !password) {
    throw new Error('Wazuh credentials not configured. Set WAZUH_USER and WAZUH_PASSWORD.');
  }

  try {
    const { data } = await axios.post(
      `${baseURL}/security/user/authenticate`,
      {},
      {
        auth: { username: user, password },
        httpsAgent: client.defaults.httpsAgent,
        timeout: 10000,
      }
    );
    token = data.data?.token || data.token;
    if (!token) throw new Error('No token received from Wazuh API');
    tokenExpiry = Date.now() + 15 * 60 * 1000;
    connectionStatus = 'connected';
    useMock = false;
    return token;
  } catch (err) {
    lastError = err.response?.data?.message || err.message;
    if (err.response?.status === 401) {
      throw new Error('Invalid Wazuh credentials. Check WAZUH_USER and WAZUH_PASSWORD.');
    }
    connectionStatus = 'error';
    useMock = true;
    throw err;
  }
}

client.interceptors.request.use(async (config) => {
  if (useMock) return config;
  const t = await getToken();
  config.headers.Authorization = `Bearer ${t}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && !useMock) {
      original._retry = true;
      token = null;
      tokenExpiry = null;
      try {
        const t = await getToken();
        original.headers.Authorization = `Bearer ${t}`;
        return client(original);
      } catch {
        useMock = true;
        connectionStatus = 'mock';
      }
    }
    return Promise.reject(error);
  }
);

async function wazuhRequest(path, params = {}) {
  if (useMock) return null;
  try {
    const { data } = await client.get(path, { params });
    return data.data || data;
  } catch (err) {
    lastError = err.message;
    useMock = true;
    connectionStatus = 'mock';
    return null;
  }
}

function normalizeAgent(a) {
  return {
    id: String(a.id || a.agent?.id),
    name: a.name || a.agent?.name,
    ip: a.ip || a.registerIP || '0.0.0.0',
    status: a.status || 'unknown',
    os: a.os?.name || a.os?.platform || 'Unknown',
    osPlatform: a.os?.platform || 'linux',
    osIcon: (a.os?.platform || 'linux').includes('win') ? 'windows' : 'linux',
    group: a.group?.[0] || 'default',
    version: a.version || 'N/A',
    lastKeepAlive: a.lastKeepAlive || a.dateAdd,
    dateAdd: a.dateAdd,
    alertCount: 0,
    criticalCount: 0,
    compromised: false,
    hostname: a.name,
    architecture: 'x86_64',
    kernel: 'N/A',
    ramTotal: 0,
    cpuModel: 'N/A',
    cpuUsage: 0,
    ramUsage: 0,
    disks: [],
    network: { rx: 0, tx: 0 },
    uptime: 0,
    complianceScore: 0,
  };
}

async function getAgents(filters = {}) {
  if (useMock) return { data: mock.filterAgents(filters), source: 'mock' };
  const raw = await wazuhRequest('/agents', { limit: 500 });
  if (!raw) return { data: mock.filterAgents(filters), source: 'mock' };
  const items = (raw.affected_items || raw).map(normalizeAgent);
  return { data: mock.filterAgents.call(null, { ...filters }) || items, source: 'wazuh' };
}

async function getAgentsFromWazuh(filters = {}) {
  if (useMock) return { data: mock.filterAgents(filters), source: 'mock' };
  const raw = await wazuhRequest('/agents', { limit: 500 });
  if (!raw?.affected_items) return { data: mock.filterAgents(filters), source: 'mock' };
  let items = raw.affected_items.map(normalizeAgent);
  if (filters.status) items = items.filter((a) => a.status === filters.status);
  if (filters.search) {
    const q = filters.search.toLowerCase();
    items = items.filter((a) => a.name?.toLowerCase().includes(q) || a.ip?.includes(q));
  }
  return { data: items, source: 'wazuh' };
}

async function getAgent(id) {
  if (useMock) {
    const agent = mock.getAgentById(id);
    return { data: agent, source: 'mock' };
  }
  const raw = await wazuhRequest(`/agents/${id}`);
  if (!raw?.affected_items?.[0] && !raw?.id) {
    const agent = mock.getAgentById(id);
    return { data: agent, source: 'mock' };
  }
  const item = raw.affected_items?.[0] || raw;
  const base = normalizeAgent(item);
  const osInfo = await wazuhRequest(`/syscollector/${id}/os`);
  const hardware = await wazuhRequest(`/syscollector/${id}/hardware`);
  if (osInfo?.affected_items?.[0]) {
    const os = osInfo.affected_items[0];
    base.os = os.os?.name || os.name || base.os;
    base.kernel = os.version || base.kernel;
    base.architecture = os.architecture || base.architecture;
    base.hostname = os.hostname || base.hostname;
  }
  if (hardware?.affected_items?.[0]) {
    const hw = hardware.affected_items[0];
    base.ramTotal = parseInt(hw.ram?.total || 0, 10);
    base.cpuModel = hw.cpu?.name || base.cpuModel;
  }
  return { data: { ...mock.getAgentById(id), ...base }, source: 'wazuh' };
}

async function getAgentStats(id) {
  if (useMock) return { data: mock.getAgentStats(id), source: 'mock' };
  return { data: mock.getAgentStats(id), source: 'mock' };
}

async function getAgentProcesses(id) {
  if (useMock) return { data: mock.getAgentProcesses(id), source: 'mock' };
  const raw = await wazuhRequest(`/syscollector/${id}/processes`, { limit: 10, sort: '-cpu' });
  if (!raw?.affected_items) return { data: mock.getAgentProcesses(id), source: 'mock' };
  const procs = raw.affected_items.map((p) => ({
    pid: p.pid,
    name: p.name,
    cpu: p.cpu || 0,
    memory: p.vm_size || 0,
    user: p.euser || 'unknown',
  }));
  return { data: procs.slice(0, 10), source: 'wazuh' };
}

async function getAlerts(filters = {}) {
  if (useMock) {
    const filtered = mock.filterAlerts(filters);
    return { ...mock.paginate(filtered, filters.page, filters.limit), source: 'mock' };
  }
  const filtered = mock.filterAlerts(filters);
  return { ...mock.paginate(filtered, filters.page, filters.limit), source: 'mock' };
}

async function getVulnerabilities() {
  if (useMock) return { data: mock.vulnerabilities, stats: mock.getVulnStats(), source: 'mock' };
  return { data: mock.vulnerabilities, stats: mock.getVulnStats(), source: 'mock' };
}

async function getFim(filters = {}) {
  let events = [...mock.fimEvents];
  if (filters.agentId) events = events.filter((e) => e.agentId === filters.agentId);
  return { data: events, source: useMock ? 'mock' : 'mock' };
}

async function getCompliance(benchmark = 'cis') {
  return { data: mock.generateCompliance(benchmark), source: 'mock' };
}

async function getOverview() {
  if (useMock) return { data: mock.getOverview(), source: 'mock' };
  try {
    await getToken();
    return { data: mock.getOverview(), source: 'wazuh' };
  } catch {
    return { data: mock.getOverview(), source: 'mock' };
  }
}

async function testConnection() {
  try {
    useMock = false;
    token = null;
    tokenExpiry = null;
    await getToken();
    const agents = await wazuhRequest('/agents', { limit: 1 });
    return {
      success: true,
      message: 'Connection successful',
      agentCount: agents?.total_affected_items || agents?.affected_items?.length || 0,
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function getStatus() {
  return {
    wazuh: useMock ? 'mock' : connectionStatus,
    lastError,
    useMock,
  };
}

function forceMock(enabled) {
  useMock = enabled;
  connectionStatus = enabled ? 'mock' : 'unknown';
}

module.exports = {
  getAgents: getAgentsFromWazuh,
  getAgent,
  getAgentStats,
  getAgentProcesses,
  getAlerts,
  getVulnerabilities,
  getFim,
  getCompliance,
  getOverview,
  testConnection,
  getStatus,
  forceMock,
  getAIContext: () => mock.getAIContext(),
};
