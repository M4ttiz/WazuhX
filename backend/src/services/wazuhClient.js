const axios = require('axios');
const mock = require('../mock/mockData');
const indexer = require('./wazuhIndexer');

const BENCHMARK_KEYWORDS = {
  cis: ['cis'],
  pci: ['pci'],
  gdpr: ['gdpr'],
  hipaa: ['hipaa'],
  nist: ['nist'],
};

function formatAgentId(id) {
  const stripped = String(id).replace(/^0+/, '') || '0';
  const num = parseInt(stripped, 10);
  if (Number.isNaN(num)) return String(id).padStart(3, '0');
  return String(num).padStart(3, '0');
}

let token = null;
let tokenExpiry = null;
let _tokenPromise = null;
let useMock = process.env.USE_MOCK === 'true';
let connectionStatus = 'unknown';
let lastError = null;

const baseURL = process.env.WAZUH_API_URL || 'https://localhost:55000';

const client = axios.create({
  baseURL,
  timeout: 15000,
  httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
});

async function authenticate() {
  const user = process.env.WAZUH_USER;
  const password = process.env.WAZUH_PASSWORD;

  if (!user || !password) {
    throw new Error('Wazuh credentials not configured. Set WAZUH_USER and WAZUH_PASSWORD.');
  }

  const { data } = await axios.post(
    `${baseURL}/security/user/authenticate?raw=true`,
    {},
    {
      auth: { username: user, password },
      httpsAgent: client.defaults.httpsAgent,
      timeout: 10000,
    }
  );
  if (typeof data === 'string') {
    token = data.trim();
  } else {
    token = data.data?.token || data.token;
  }
  if (!token) throw new Error('No token received from Wazuh API');
  tokenExpiry = Date.now() + 15 * 60 * 1000;
  connectionStatus = 'connected';
  useMock = false;
  return token;
}

async function getToken() {
  if (token && Date.now() < tokenExpiry) {
    if (!useMock && connectionStatus === 'unknown') {
      connectionStatus = 'connected';
    }
    return token;
  }

  if (_tokenPromise) return _tokenPromise;

  _tokenPromise = authenticate()
    .catch((err) => {
      lastError = err.response?.data?.message || err.message;
      if (err.response?.status === 401) {
        throw new Error('Invalid Wazuh credentials. Check WAZUH_USER and WAZUH_PASSWORD.');
      }
      connectionStatus = 'error';
      throw err;
    })
    .finally(() => {
      _tokenPromise = null;
    });

  return _tokenPromise;
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
      _tokenPromise = null;
      try {
        const t = await getToken();
        original.headers.Authorization = `Bearer ${t}`;
        return client(original);
      } catch {
        // auth refresh failed — reject original error
      }
    }
    return Promise.reject(error);
  }
);

async function wazuhRequest(path, params = {}) {
  if (useMock) return null;
  try {
    const { data } = await client.get(path, { params });
    if (!useMock) connectionStatus = 'connected';
    return data.data !== undefined ? data.data : data;
  } catch (err) {
    const status = err.response?.status;
    const msg = err.response?.data?.message || err.message;
    lastError = `[${path}] ${status || 'network'}: ${msg}`;
    console.warn('Wazuh API:', lastError);
    return null;
  }
}

async function getActiveAgents() {
  const raw = await wazuhRequest('/agents', { status: 'active', limit: 500 });
  if (!raw?.affected_items?.length) return [];
  return raw.affected_items.map((a) => ({
    id: formatAgentId(a.id),
    name: a.name || `agent-${a.id}`,
  }));
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
    group: a.group?.[0] || a.group || 'default',
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

function normalizeVulnerability(v, agentId, agentName) {
  const severity = v.severity
    ? v.severity.toLowerCase()
    : v.cvss3_score >= 9
      ? 'critical'
      : v.cvss3_score >= 7
        ? 'high'
        : v.cvss3_score >= 4
          ? 'medium'
          : 'low';
  return {
    id: `${v.cve || v.vulnerability_id}-${agentId}`,
    cve: v.cve || v.vulnerability_id || 'UNKNOWN',
    agentId: String(agentId),
    agentName,
    package: v.package || v.name || 'unknown',
    version: v.version || 'N/A',
    fixVersion: v.fix_version || v.patch || null,
    cvss: v.cvss3_score || v.cvss2_score || v.cvss || 0,
    severity,
    hasFix: Boolean(v.fix_version || v.patch),
    detectedAt: v.detected_at || v.published || new Date().toISOString(),
    description: v.description || v.title || '',
  };
}

function normalizeFimEvent(item, agentId, agentName) {
  const path = item.file || item.path || '';
  const typeMap = { added: 'added', modified: 'modified', deleted: 'deleted', read: 'modified' };
  return {
    id: `fim-${agentId}-${path}-${item.date || Date.now()}`,
    timestamp: item.date || item.mtime || new Date().toISOString(),
    agentId: String(agentId),
    agentName,
    path,
    type: typeMap[item.type] || item.type || 'modified',
    size: item.size || 0,
    permissions: item.perm || item.permissions || null,
    user: item.uname_after || item.user || 'unknown',
    critical: ['/etc/passwd', '/etc/shadow', '/etc/sudoers'].some((p) => path.includes(p)),
    md5Before: item.md5_before || null,
    md5After: item.md5_after || null,
    sha256Before: item.sha256_before || null,
    sha256After: item.sha256_after || null,
  };
}

function normalizeScaCheck(c, policyId, index) {
  const result = (c.result || '').toLowerCase();
  return {
    id: c.id || `${policyId}-${index}`,
    description: c.description || c.title || `Check ${index + 1}`,
    result: result === 'passed' ? 'passed' : 'failed',
    remediation: c.remediation || null,
    reference: c.reason || null,
  };
}

function normalizeScaPolicy(policy, agentId, agentName, benchmark, checks = []) {
  const total = policy.total_checks || 0;
  const passed = policy.pass ?? 0;
  const score =
    policy.score != null
      ? Math.round(Number(policy.score))
      : total > 0
        ? Math.round((passed / total) * 100)
        : 0;
  const normalizedChecks = checks.slice(0, 20).map((c, i) => normalizeScaCheck(c, policy.policy_id, i));

  return {
    agentId: String(agentId),
    agentName,
    benchmark,
    benchmarkName: policy.name || benchmark.toUpperCase(),
    score,
    passed,
    failed: policy.fail ?? 0,
    total: total || passed + (policy.fail ?? 0),
    checks: normalizedChecks.length ? normalizedChecks : undefined,
  };
}

function pickScaPolicy(policies, benchmark) {
  const needles = BENCHMARK_KEYWORDS[benchmark.toLowerCase()] || [benchmark.toLowerCase()];
  return (
    policies.find((p) => {
      const hay = `${p.name || ''} ${p.policy_id || ''}`.toLowerCase();
      return needles.some((n) => hay.includes(n));
    }) || policies[0]
  );
}

function computeVulnStats(vulnerabilities) {
  return {
    total: vulnerabilities.length,
    critical: vulnerabilities.filter((v) => v.severity === 'critical').length,
    high: vulnerabilities.filter((v) => v.severity === 'high').length,
    medium: vulnerabilities.filter((v) => v.severity === 'medium').length,
    low: vulnerabilities.filter((v) => v.severity === 'low').length,
    withFix: vulnerabilities.filter((v) => v.hasFix).length,
  };
}

async function getAgentsFromWazuh(filters = {}) {
  if (useMock) return { data: mock.filterAgents(filters), source: 'mock' };

  const params = { limit: 500 };
  if (filters.status) params.status = filters.status;

  const raw = await wazuhRequest('/agents', params);
  if (!raw?.affected_items) {
    return { data: [], source: 'wazuh' };
  }

  let items = raw.affected_items.map(normalizeAgent);
  if (filters.status) items = items.filter((a) => a.status === filters.status);
  if (filters.os) items = items.filter((a) => a.os.toLowerCase().includes(filters.os.toLowerCase()));
  if (filters.group) items = items.filter((a) => a.group === filters.group);
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

  const raw = await wazuhRequest('/agents', { agents_list: formatAgentId(id), limit: 1 });
  const item = raw?.affected_items?.[0];
  if (!item) {
    return { data: null, source: 'wazuh' };
  }

  const base = normalizeAgent(item);
  const agentRef = formatAgentId(id);
  const osInfo = await wazuhRequest(`/syscollector/${agentRef}/os`);
  const hardware = await wazuhRequest(`/syscollector/${agentRef}/hardware`);

  if (osInfo?.affected_items?.[0]) {
    const os = osInfo.affected_items[0];
    base.os = os.os?.name || os.name || base.os;
    base.kernel = os.version || os.release || base.kernel;
    base.architecture = os.architecture || base.architecture;
    base.hostname = os.hostname || base.hostname;
  }
  if (hardware?.affected_items?.[0]) {
    const hw = hardware.affected_items[0];
    base.ramTotal = parseInt(hw.ram?.total || hw.ram_total || 0, 10);
    base.cpuModel = hw.cpu?.name || hw.cpu_name || base.cpuModel;
  }

  return { data: base, source: 'wazuh' };
}

async function getAgentStats(id) {
  const metricsService = require('./metricsService');
  return metricsService.getAgentStatsLegacy(id);
}

async function getAgentProcesses(id) {
  if (useMock) return { data: mock.getAgentProcesses(id), source: 'mock' };

  const agentRef = formatAgentId(id);
  const raw = await wazuhRequest(`/syscollector/${agentRef}/processes`, {
    limit: 10,
    sort: '-cpu_usage_percent',
  });

  if (!raw?.affected_items) {
    const fallback = await wazuhRequest(`/syscollector/${agentRef}/processes`, { limit: 10 });
    if (!fallback?.affected_items) {
      return { data: [], source: 'wazuh' };
    }
    const procs = fallback.affected_items
      .map((p) => ({
        pid: p.pid,
        name: p.name,
        cpu: p.cpu_usage_percent || p.cpu || 0,
        memory: p.vm_size || p.rss || 0,
        user: p.euser || p.user || 'unknown',
      }))
      .sort((a, b) => b.cpu - a.cpu)
      .slice(0, 10);
    return { data: procs, source: 'wazuh' };
  }

  const procs = raw.affected_items
    .map((p) => ({
      pid: p.pid,
      name: p.name,
      cpu: p.cpu_usage_percent || p.cpu || 0,
      memory: p.vm_size || p.rss || 0,
      user: p.euser || p.user || 'unknown',
    }))
    .slice(0, 10);

  return { data: procs, source: 'wazuh' };
}

async function getAlerts(filters = {}) {
  if (useMock) {
    const filtered = mock.filterAlerts(filters);
    return { data: filtered, source: 'mock' };
  }

  const page = parseInt(filters.page, 10) || 1;
  const limit = parseInt(filters.limit, 10) || 25;

  if (indexer.isConfigured()) {
    const fromIndexer = await indexer.getAlerts(filters);
    if (fromIndexer) {
      return { ...fromIndexer, source: 'wazuh' };
    }
  }

  return {
    data: [],
    pagination: { page, limit, total: 0, totalPages: 0 },
    source: 'wazuh',
  };
}

async function getAlertsTimeline(filters = {}) {
  if (useMock) {
    const buckets = {};
    mock.alerts.forEach((a) => {
      const day = a.timestamp.slice(0, 10);
      buckets[day] = (buckets[day] || 0) + 1;
    });
    return {
      data: Object.entries(buckets).map(([date, count]) => ({ date, count })),
      source: 'mock',
    };
  }
  if (indexer.isConfigured()) {
    const timeline = await indexer.getAlertsTimeline(filters);
    if (timeline) return { ...timeline, source: 'wazuh' };
  }
  return { data: [], source: 'wazuh' };
}

async function getVulnerabilities(agentId) {
  if (useMock) {
    let vulns = mock.vulnerabilities;
    if (agentId) vulns = vulns.filter((v) => v.agentId === String(agentId));
    return { data: vulns, stats: mock.getVulnStats(), source: 'mock' };
  }

  if (indexer.isConfigured()) {
    const fromIndexer = await indexer.getVulnerabilities(agentId);
    if (fromIndexer?.length) {
      return { data: fromIndexer, stats: computeVulnStats(fromIndexer), source: 'wazuh' };
    }
  }

  const allVulns = [];
  const agents = agentId
    ? [{ id: String(agentId), name: `agent-${agentId}` }]
    : await getActiveAgents();

  for (const agent of agents) {
    const raw = await wazuhRequest(`/vulnerability/${formatAgentId(agent.id)}`);
    const items = raw?.affected_items || [];
    if (!items.length) {
      console.warn(`Wazuh API: [/vulnerability/${agent.id}] empty affected_items`);
    }
    items.forEach((v) => allVulns.push(normalizeVulnerability(v, agent.id, agent.name)));
  }

  if (allVulns.length === 0 && agents.length === 0) {
    return { data: mock.vulnerabilities, stats: mock.getVulnStats(), source: 'mock' };
  }

  return { data: allVulns, stats: computeVulnStats(allVulns), source: 'wazuh' };
}

async function getFim(filters = {}) {
  if (useMock) {
    let events = [...mock.fimEvents];
    if (filters.agentId) events = events.filter((e) => e.agentId === String(filters.agentId));
    return { data: events, source: 'mock' };
  }

  const allEvents = [];
  const agents = filters.agentId
    ? [{ id: String(filters.agentId), name: `agent-${filters.agentId}` }]
    : await getActiveAgents();

  for (const agent of agents) {
    const raw = await wazuhRequest(`/syscheck/${formatAgentId(agent.id)}`);
    const items = raw?.affected_items || raw?.items || [];
    items.forEach((item) => allEvents.push(normalizeFimEvent(item, agent.id, agent.name)));
  }

  if (allEvents.length === 0 && indexer.isConfigured()) {
    const fromIndexer = await indexer.getFimEvents(filters.agentId);
    if (fromIndexer?.length) {
      return { data: fromIndexer, source: 'wazuh' };
    }
  }

  if (allEvents.length === 0) {
    return { data: [], source: 'wazuh' };
  }

  return { data: allEvents, source: 'wazuh' };
}

async function getCompliance(benchmark = 'cis') {
  if (useMock) {
    return { data: mock.generateCompliance(benchmark), source: 'mock' };
  }

  const agents = await getActiveAgents();
  const results = [];

  for (const agent of agents) {
    const agentRef = formatAgentId(agent.id);
    const raw = await wazuhRequest(`/sca/${agentRef}`);
    const policies = raw?.affected_items || [];
    if (policies.length === 0) continue;

    const policy = pickScaPolicy(policies, benchmark);
    let checks = [];
    if (policy.policy_id) {
      const checksRaw = await wazuhRequest(`/sca/${agentRef}/checks/${policy.policy_id}`, {
        limit: 50,
      });
      checks = checksRaw?.affected_items || [];
    }

    results.push(normalizeScaPolicy(policy, agent.id, agent.name, benchmark, checks));
  }

  if (results.length === 0) {
    return { data: [], source: 'wazuh' };
  }

  return { data: results, source: 'wazuh' };
}

async function getOverview() {
  if (useMock) return { data: mock.getOverview(), source: 'mock' };

  try {
    await getToken();
  } catch {
    return { data: mock.getOverview(), source: 'mock' };
  }

  const [summary, vulnResult, complianceResult, alertOverview] = await Promise.all([
    wazuhRequest('/agents/summary/status'),
    getVulnerabilities(),
    getCompliance('cis'),
    indexer.isConfigured() ? indexer.getAlertOverview() : Promise.resolve(null),
  ]);

  const active = summary?.connection?.active ?? summary?.active ?? 0;
  const disconnected = summary?.connection?.disconnected ?? summary?.disconnected ?? 0;
  const never = summary?.connection?.never_connected ?? summary?.never_connected ?? 0;

  const vulnStats = vulnResult?.stats || { total: 0 };
  const complianceScores = (complianceResult?.data || [])
    .map((c) => c.score)
    .filter((s) => s > 0);
  const avgCompliance = complianceScores.length
    ? Math.round(complianceScores.reduce((a, b) => a + b, 0) / complianceScores.length)
    : 0;

  const emptyTrend = [];
  for (let d = 6; d >= 0; d--) {
    const day = new Date();
    day.setDate(day.getDate() - d);
    emptyTrend.push({
      date: day.toISOString().split('T')[0],
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    });
  }

  const alertKpis = alertOverview?.kpis || { totalAlerts: 0, criticalAlerts: 0 };

  return {
    data: {
      kpis: {
        totalAlerts: alertKpis.totalAlerts,
        criticalAlerts: alertKpis.criticalAlerts,
        agentsOnline: active,
        agentsOffline: disconnected,
        agentsCompromised: 0,
        threatsBlocked: alertKpis.totalAlerts,
        totalCve: vulnStats.total || 0,
        avgCompliance,
      },
      severityTrend: alertOverview?.severityTrend || emptyTrend,
      severityDist: alertOverview?.severityDist || { critical: 0, high: 0, medium: 0, low: 0 },
      topRules: alertOverview?.topRules || [],
      mitreHeatmap: [],
      recentActivity: alertOverview?.recentActivity || [],
      hasCriticalIncident: alertOverview?.hasCriticalIncident || false,
      agentsNeverConnected: never,
    },
    source: 'wazuh',
  };
}

async function testConnection() {
  try {
    useMock = false;
    token = null;
    tokenExpiry = null;
    _tokenPromise = null;
    await getToken();
    const agents = await wazuhRequest('/agents', { limit: 1 });
    return {
      success: true,
      message: 'Connection successful',
      agentCount: agents?.total_affected_items ?? agents?.affected_items?.length ?? 0,
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function getIndexerHealthStatus() {
  const idx = indexer.getStatus();
  return idx.configured ? (idx.lastError ? 'error' : 'configured') : 'not_configured';
}

function getStatus() {
  return {
    wazuh: useMock ? 'mock' : connectionStatus,
    indexer: getIndexerHealthStatus(),
    lastError,
    indexerError: indexer.getStatus().lastError,
    useMock,
  };
}

async function checkHealth() {
  const indexerStatus = getIndexerHealthStatus();

  if (useMock) {
    return {
      wazuh: 'mock',
      indexer: indexerStatus,
      lastError,
      indexerError: indexer.getStatus().lastError,
      useMock: true,
    };
  }

  try {
    await getToken();
    await wazuhRequest('/agents', { limit: 1 });
    connectionStatus = 'connected';
  } catch (err) {
    lastError = err.response?.data?.message || err.message;
    connectionStatus = 'error';
  }

  return {
    wazuh: connectionStatus,
    indexer: indexerStatus,
    lastError,
    indexerError: indexer.getStatus().lastError,
    useMock: false,
  };
}

function forceMock(enabled) {
  useMock = enabled;
  connectionStatus = enabled ? 'mock' : 'unknown';
}

function isMockMode() {
  return useMock;
}

module.exports = {
  getAgents: getAgentsFromWazuh,
  getAgent,
  getAgentStats,
  getAgentProcesses,
  getAlerts,
  getAlertsTimeline,
  getVulnerabilities,
  getFim,
  getCompliance,
  getOverview,
  testConnection,
  getStatus,
  checkHealth,
  forceMock,
  isMockMode,
  formatAgentId,
  wazuhRequest,
  getAIContext: () => mock.getAIContext(),
};
