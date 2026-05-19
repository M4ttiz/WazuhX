const mock = require('../mock/mockData');
const wazuh = require('./wazuhClient');
const indexer = require('./wazuhIndexer');
const {
  getThresholds,
  normalizeAgentMetrics,
  evaluateThresholds,
  metricsToLegacyStats,
  appendHistory,
} = require('./metricsNormalizer');

const cooldownState = new Map();
const historyStore = new Map();

function getCooldownMs() {
  return parseInt(process.env.METRICS_ALERT_COOLDOWN_SECONDS || '600', 10) * 1000;
}

async function fetchAgentSyscollector(agentRef) {
  const [hardware, osInfo, processes] = await Promise.all([
    wazuh.wazuhRequest(`/syscollector/${agentRef}/hardware`),
    wazuh.wazuhRequest(`/syscollector/${agentRef}/os`),
    wazuh.wazuhRequest(`/syscollector/${agentRef}/processes`, {
      limit: 50,
      sort: '-cpu_usage_percent',
    }),
  ]);
  return { hardware, osInfo, processes };
}

async function buildAgentMetrics(agentMeta) {
  const agentRef = wazuh.formatAgentId(agentMeta.id);
  const customSnapshot = indexer.isConfigured()
    ? await indexer.getLatestCustomMetrics(agentRef)
    : null;

  const { hardware, osInfo, processes } = await fetchAgentSyscollector(agentRef);
  const metrics = normalizeAgentMetrics(
    agentMeta,
    hardware,
    osInfo,
    processes,
    customSnapshot
  );

  const thresholds = getThresholds();
  const thresholdAlerts = evaluateThresholds(
    metrics,
    thresholds,
    cooldownState,
    getCooldownMs()
  );

  const history = appendHistory(historyStore, metrics.agentId, {
    t: new Date().toISOString(),
    cpu: metrics.cpuPercent,
    ram: metrics.ramPercent,
    diskMax: metrics.maxDiskPercent,
  });

  return { ...metrics, thresholdAlerts, history };
}

async function getMetrics(agentId) {
  const thresholds = getThresholds();

  if (wazuh.isMockMode()) {
    const payload = mock.getMetrics(agentId);
    return { ...payload, thresholds, source: 'mock' };
  }

  let agents = [];
  if (agentId) {
    const result = await wazuh.getAgents({});
    const found = (result.data || []).find(
      (a) => wazuh.formatAgentId(a.id) === wazuh.formatAgentId(agentId)
    );
    if (!found) {
      return {
        thresholds,
        agents: [],
        alerts: [],
        summary: { totalAgents: 0, agentsOverThreshold: 0, lastPollAt: new Date().toISOString() },
        source: 'wazuh',
      };
    }
    agents = [{ id: found.id, name: found.name }];
  } else {
    const active = await wazuh.getAgents({ status: 'active' });
    agents = (active.data || []).map((a) => ({ id: a.id, name: a.name }));
  }

  const agentMetrics = await Promise.all(agents.map((a) => buildAgentMetrics(a)));
  const alerts = agentMetrics.flatMap((m) => m.thresholdAlerts || []);
  const agentsOverThreshold = agentMetrics.filter((m) => m.thresholdAlerts?.length > 0).length;

  return {
    thresholds,
    agents: agentMetrics,
    alerts,
    summary: {
      totalAgents: agentMetrics.length,
      agentsOverThreshold,
      lastPollAt: new Date().toISOString(),
    },
    source: 'wazuh',
  };
}

async function getAgentStatsLegacy(id) {
  if (wazuh.isMockMode()) {
    return { data: mock.getAgentStats(id), source: 'mock' };
  }

  const realtimeMetricsService = require('./realtimeMetricsService');
  const [payload, rt] = await Promise.all([
    getMetrics(id),
    realtimeMetricsService.getRealtimeMetricsForAgent(id),
  ]);

  const metrics = payload.agents?.[0];
  if (!metrics) {
    return { data: {}, source: 'wazuh' };
  }

  const legacy = metricsToLegacyStats(metrics);
  if (rt.data && !rt.notFound) {
    if (rt.data.cpu != null) legacy.cpuUsage = rt.data.cpu;
    if (rt.data.ram != null) legacy.ramUsage = rt.data.ram;
  }

  return {
    data: legacy,
    source: rt.data?.source || payload.source || 'wazuh',
  };
}

module.exports = {
  getMetrics,
  getAgentStatsLegacy,
  getThresholds,
  fetchAgentSyscollector,
  normalizeAgentMetrics,
};
