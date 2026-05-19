const wazuh = require('./wazuhClient');
const netdata = require('./netdataClient');
const mock = require('../mock/mockData');

/**
 * @returns {Promise<{ data: object|null, source: string, notFound?: boolean }>}
 */
async function getRealtimeMetricsForAgent(agentId) {
  if (wazuh.isMockMode()) {
    const data = mock.getRealtimeMetrics(agentId);
    if (!data) return { data: null, source: 'mock', notFound: true };
    return { data, source: 'mock' };
  }

  const agentResult = await wazuh.getAgent(agentId);
  const agent = agentResult?.data;
  if (!agent) {
    return { data: null, source: 'netdata', notFound: true };
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
    diskUnit: null,
    diskMetric: 'io',
    timestamp: Date.now(),
    reachable: false,
    partial: false,
    source: 'netdata',
    ...overrides,
  });

  if (!netdata.isValidHostIp(hostIp)) {
    return {
      data: basePayload({
        error: 'Netdata unreachable',
        source: 'netdata',
      }),
      source: 'netdata',
    };
  }

  const nd = await netdata.getRealtimeMetrics(hostIp);
  const reachable = Boolean(nd.reachable);

  const data = basePayload({
    timestamp: nd.timestamp || Date.now(),
    cpu: nd.cpu,
    ram: nd.ram,
    disk: nd.disk,
    diskUnit: nd.diskUnit,
    diskMetric: nd.disk != null ? 'io' : null,
    reachable,
    partial: Boolean(nd.partial && reachable),
    error: reachable ? undefined : 'Netdata unreachable',
    source: 'netdata',
  });

  return { data, source: 'netdata' };
}

module.exports = {
  getRealtimeMetricsForAgent,
};
