const mock = require('../mock/mockData');
const wazuh = require('./wazuhClient');
const netdata = require('./netdataClient');
const {
  getThresholds,
  normalizeNetdataAgentMetrics,
  evaluateThresholds,
  metricsToLegacyStats,
} = require('./metricsNormalizer');

const cooldownState = new Map();

function getCooldownMs() {
  return parseInt(process.env.METRICS_ALERT_COOLDOWN_SECONDS || '600', 10) * 1000;
}

async function buildAgentMetricsFromNetdata(agentMeta) {
  const hostIp = agentMeta.ip;

  const [realtime, chartBundle] = await Promise.all([
    netdata.getRealtimeMetrics(hostIp),
    netdata.fetchAllCharts(hostIp, { points: 60, after: -60 }),
  ]);

  const metrics = normalizeNetdataAgentMetrics(agentMeta, hostIp, realtime, chartBundle);
  const thresholds = getThresholds();
  const thresholdAlerts = metrics.reachable
    ? evaluateThresholds(metrics, thresholds, cooldownState, getCooldownMs())
    : [];

  return { ...metrics, thresholdAlerts };
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
          netdataUnreachable: true,
        },
        error: 'Netdata unreachable',
        source: 'netdata',
      };
    }
    agents = [{ id: found.id, name: found.name, ip: found.ip }];
  } else {
    const active = await wazuh.getAgents({ status: 'active' });
    agents = (active.data || []).map((a) => ({ id: a.id, name: a.name, ip: a.ip }));
  }

  const agentMetrics = await Promise.all(agents.map((a) => buildAgentMetricsFromNetdata(a)));
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
      netdataUnreachable: allUnreachable,
    },
    error: allUnreachable ? 'Netdata unreachable' : undefined,
    source: 'netdata',
  };
}

async function getAgentStatsLegacy(id) {
  if (wazuh.isMockMode()) {
    return { data: mock.getAgentStats(id), source: 'mock' };
  }

  const payload = await getMetrics(id);
  const metrics = payload.agents?.[0];
  if (!metrics) {
    return { data: {}, source: 'netdata' };
  }

  return {
    data: metricsToLegacyStats(metrics),
    source: 'netdata',
  };
}

module.exports = {
  getMetrics,
  getAgentStatsLegacy,
  getThresholds,
  buildAgentMetricsFromNetdata,
};
