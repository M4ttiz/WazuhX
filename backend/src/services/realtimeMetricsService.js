const wazuh = require('./wazuhClient');
const netdata = require('./netdataClient');
const mock = require('../mock/mockData');
const { fetchAgentSyscollector, normalizeAgentMetrics } = require('./metricsService');

function isValidIp(ip) {
  if (!ip || ip === '0.0.0.0') return false;
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(ip) || ip.includes(':');
}

function computeSource(netUsed, scUsed) {
  if (netUsed && !scUsed) return 'netdata';
  if (!netUsed && scUsed) return 'wazuh';
  if (netUsed && scUsed) return 'mixed';
  return 'netdata';
}

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
    return { data: null, source: 'wazuh', notFound: true };
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
    diskMetric: null,
    timestamp: Date.now(),
    reachable: false,
    partial: false,
    source: 'netdata',
    ...overrides,
  });

  if (!isValidIp(hostIp)) {
    return {
      data: basePayload({
        timestamp: Date.now(),
        reachable: false,
        error: 'invalid_host_ip',
        source: 'netdata',
      }),
      source: 'netdata',
    };
  }

  const nd = await netdata.getRealtimeMetrics(hostIp);

  let cpu = nd.cpu;
  let ram = nd.ram;
  let disk = nd.disk;
  let diskUnit = nd.diskUnit;
  let diskMetric = disk != null ? 'io' : null;
  let partial = Boolean(nd.partial);
  let error = nd.error;
  let syscollectorUsed = false;

  const netdataContributed = {
    cpu: nd.cpu != null,
    ram: nd.ram != null,
    disk: nd.disk != null,
  };

  const needsSyscollector =
    !nd.reachable ||
    cpu == null ||
    ram == null ||
    disk == null;

  if (needsSyscollector) {
    try {
      const agentRef = wazuh.formatAgentId(agent.id);
      const sc = await fetchAgentSyscollector(agentRef);
      const nm = normalizeAgentMetrics(agent, sc.hardware, sc.osInfo, sc.processes, null);
      syscollectorUsed = true;

      if (cpu == null && nm.cpuPercent != null) cpu = nm.cpuPercent;
      if (ram == null && nm.ramPercent != null) ram = nm.ramPercent;
      if (disk == null && nm.maxDiskPercent != null) {
        disk = nm.maxDiskPercent;
        diskUnit = '%';
        diskMetric = 'capacity';
      }
    } catch (e) {
      if (!error) error = e.message || 'syscollector_fallback_failed';
    }
  }

  const reachable = cpu != null || ram != null || disk != null;
  const source = computeSource(
    netdataContributed.cpu || netdataContributed.ram || netdataContributed.disk,
    syscollectorUsed
  );

  partial = nd.partial || source === 'mixed';

  const data = basePayload({
    timestamp: nd.timestamp || Date.now(),
    cpu,
    ram,
    disk,
    diskUnit,
    diskMetric,
    reachable,
    partial: partial && reachable,
    error: reachable ? undefined : error,
    source,
  });

  return { data, source };
}

module.exports = {
  getRealtimeMetricsForAgent,
};
