const wazuh = require('./wazuhClient');
const netdata = require('./netdataClient');
const mock = require('../mock/mockData');

function isValidIp(ip) {
  if (!ip || ip === '0.0.0.0') return false;
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(ip) || ip.includes(':');
}

async function getRealtimeMetricsForAgent(agentId) {
  if (wazuh.isMockMode()) {
    const data = mock.getRealtimeMetrics(agentId);
    if (!data) return { data: null, source: 'mock', notFound: true };
    return { data, source: 'mock' };
  }

  const agentResult = await wazuh.getAgent(agentId);
  const agent = agentResult?.data;
  if (!agent) {
    return { data: null, source: 'wazuh', notFound: true };
  }

  const hostIp = agent.ip;
  if (!isValidIp(hostIp)) {
    return {
      data: {
        agentId: String(agent.id),
        agentName: agent.name,
        hostIp: hostIp || 'unknown',
        cpu: null,
        ram: null,
        disk: null,
        timestamp: Date.now(),
        reachable: false,
        error: 'invalid_host_ip',
        source: 'netdata',
      },
      source: 'netdata',
    };
  }

  const metrics = await netdata.getRealtimeMetrics(hostIp);

  return {
    data: {
      agentId: String(agent.id),
      agentName: agent.name,
      hostIp,
      cpu: metrics.cpu,
      ram: metrics.ram,
      disk: metrics.disk,
      timestamp: metrics.timestamp,
      reachable: metrics.reachable,
      error: metrics.error,
      source: 'netdata',
    },
    source: 'netdata',
  };
}

module.exports = {
  getRealtimeMetricsForAgent,
};
