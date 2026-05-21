const wazuh = require('./wazuhClient');
const glancesService = require('./glancesService');
const mock = require('../mock/mockData');

/**
 * @returns {Promise<{ data: object|null, source: string, notFound?: boolean }>}
 */
async function getRealtimeMetricsForAgent(agentId) {
  if (wazuh.isMockMode()) {
    const data = mock.getRealtimeMetrics(agentId);
    if (!data) return { data: null, source: 'mock', notFound: true };
    return { data: { ...data, source: 'glances' }, source: 'mock' };
  }

  const agentResult = await wazuh.getAgent(agentId);
  const agent = agentResult?.data;
  if (!agent) {
    return { data: null, source: 'glances', notFound: true };
  }

  const agentIdStr = String(agent.id);
  const hostIp = agent.ip;

  const basePayload = (overrides = {}) => ({
    agentId: agentIdStr,
    agentName: agent.name,
    hostIp: hostIp || 'unknown',
    cpu: null,
    ram: null,
    disk: null,
    diskUnit: '%',
    diskMetric: 'percent',
    timestamp: Date.now(),
    reachable: false,
    partial: false,
    source: 'glances',
    ...overrides,
  });

  if (!glancesService.isValidAgentIp(hostIp)) {
    return {
      data: basePayload({
        error: 'Glances unreachable',
        source: 'glances',
      }),
      source: 'glances',
    };
  }

  const metrics = await glancesService.getAgentMetrics(agentId, hostIp);
  const reachable = Boolean(metrics?.reachable);

  const data = basePayload({
    timestamp: metrics?.timestamp ? new Date(metrics.timestamp).getTime() : Date.now(),
    cpu: metrics?.cpu?.percent ?? null,
    ram: metrics?.ram?.percent ?? null,
    disk: metrics?.disk?.percent ?? null,
    diskUnit: '%',
    diskMetric: 'percent',
    reachable,
    partial: false,
    error: reachable ? undefined : 'Glances unreachable',
    source: 'glances',
  });

  return { data, source: 'glances' };
}

module.exports = {
  getRealtimeMetricsForAgent,
};
