const mock = require('../mock/mockData');
const wazuh = require('./wazuhClient');
const glancesService = require('./glancesService');
const {
  getThresholds,
  normalizeGlancesAgentMetrics,
  evaluateThresholds,
  metricsToLegacyStats,
} = require('./metricsNormalizer');

const cooldownState = new Map();

function getCooldownMs() {
  return parseInt(process.env.METRICS_ALERT_COOLDOWN_SECONDS || '600', 10) * 1000;
}

async function buildAgentMetricsFromGlances(agentMeta) {
  const hostIp = agentMeta.ip;

  const [metrics, historyBundle] = await Promise.all([
    glancesService.getAgentMetrics(agentMeta.id, hostIp),
    glancesService.getHistory(hostIp, 60).catch(() => ({ history: [], cpu: [], ram: [] })),
  ]);

  const normalized = normalizeGlancesAgentMetrics(
    agentMeta,
    hostIp,
    metrics || glancesService.emptyMetrics(),
    historyBundle
  );
  const thresholds = getThresholds();
  const thresholdAlerts = normalized.reachable
    ? evaluateThresholds(normalized, thresholds, cooldownState, getCooldownMs())
    : [];

  return { ...normalized, thresholdAlerts };
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
        summary: {
          totalAgents: 0,
          agentsOverThreshold: 0,
          lastPollAt: new Date().toISOString(),
          glancesUnreachable: true,
        },
        error: 'Glances unreachable',
        source: 'glances',
      };
    }
    agents = [{ id: found.id, name: found.name, ip: found.ip }];
  } else {
    const active = await wazuh.getAgents({ status: 'active' });
    agents = (active.data || []).map((a) => ({ id: a.id, name: a.name, ip: a.ip }));
  }

  const agentMetrics = await Promise.all(agents.map((a) => buildAgentMetricsFromGlances(a)));
  const alerts = agentMetrics.flatMap((m) => m.thresholdAlerts || []);
  const agentsOverThreshold = agentMetrics.filter((m) => m.thresholdAlerts?.length > 0).length;
  const allUnreachable =
    agentMetrics.length > 0 && agentMetrics.every((m) => !m.reachable);

  return {
    thresholds,
    agents: agentMetrics,
    alerts,
    summary: {
      totalAgents: agentMetrics.length,
      agentsOverThreshold,
      lastPollAt: new Date().toISOString(),
      glancesUnreachable: allUnreachable,
    },
    error: allUnreachable ? 'Glances unreachable' : undefined,
    source: 'glances',
  };
}

async function getAgentStatsLegacy(id) {
  if (wazuh.isMockMode()) {
    return { data: mock.getAgentStats(id), source: 'mock' };
  }

  const payload = await getMetrics(id);
  const metrics = payload.agents?.[0];
  if (!metrics) {
    return { data: {}, source: 'glances' };
  }

  return {
    data: metricsToLegacyStats(metrics),
    source: 'glances',
  };
}

module.exports = {
  getMetrics,
  getAgentStatsLegacy,
  getThresholds,
  buildAgentMetricsFromGlances,
};
