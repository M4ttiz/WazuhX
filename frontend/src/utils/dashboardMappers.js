import { isStale } from './formatters';

export const HOST_STATUS = {
  OK: 'OK',
  WARNING: 'Warning',
  DOWN: 'Down',
};

export const SERVICE_STATUS = {
  OK: 'OK',
  WARNING: 'Warning',
  CRITICAL: 'Critical',
  UNKNOWN: 'Unknown',
};

const SERVICES_PER_HOST = 3;

export function getHostStatus(agent) {
  if (!agent) return HOST_STATUS.DOWN;
  if (agent.status === 'disconnected' || agent.status === 'never_connected') {
    return HOST_STATUS.DOWN;
  }
  if (agent.status === 'active') {
    if (agent.compromised || (agent.criticalCount ?? 0) > 0) {
      return HOST_STATUS.WARNING;
    }
    return HOST_STATUS.OK;
  }
  return HOST_STATUS.DOWN;
}

export function getHostProblemState(agent) {
  if (agent?.compromised) return 'Critical';
  const hostStatus = getHostStatus(agent);
  if (hostStatus === HOST_STATUS.WARNING) return 'Warning';
  if (hostStatus === HOST_STATUS.DOWN) return 'Unknown';
  return null;
}

function getAlertServiceStatus(agent) {
  if (!agent || agent.status !== 'active') return SERVICE_STATUS.UNKNOWN;
  if (agent.compromised) return SERVICE_STATUS.CRITICAL;
  if ((agent.criticalCount ?? 0) > 0) return SERVICE_STATUS.WARNING;
  return SERVICE_STATUS.OK;
}

function getCveServiceStatus(agent) {
  if (!agent || agent.status !== 'active') return SERVICE_STATUS.UNKNOWN;
  const alerts = agent.alertCount ?? 0;
  if (alerts > 60) return SERVICE_STATUS.CRITICAL;
  if (alerts > 30) return SERVICE_STATUS.WARNING;
  return SERVICE_STATUS.OK;
}

function getComplianceServiceStatus(agent) {
  if (!agent || agent.status !== 'active') return SERVICE_STATUS.UNKNOWN;
  const score = agent.complianceScore;
  if (score == null) return SERVICE_STATUS.UNKNOWN;
  if (score < 60) return SERVICE_STATUS.CRITICAL;
  if (score < 80) return SERVICE_STATUS.WARNING;
  return SERVICE_STATUS.OK;
}

export function buildSyntheticServices(agents = []) {
  const list = Array.isArray(agents) ? agents : [];
  const services = [];
  list.forEach((agent) => {
    services.push(
      { id: `${agent.id}-alert`, hostId: agent.id, hostName: agent.name, name: 'Alert', status: getAlertServiceStatus(agent) },
      { id: `${agent.id}-cve`, hostId: agent.id, hostName: agent.name, name: 'CVE', status: getCveServiceStatus(agent) },
      { id: `${agent.id}-compliance`, hostId: agent.id, hostName: agent.name, name: 'Compliance', status: getComplianceServiceStatus(agent) }
    );
  });
  return services;
}

function countByKey(items, keyFn) {
  const counts = {};
  items.forEach((item) => {
    const key = keyFn(item);
    if (!key) return;
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}

function toDistribution(counts, order) {
  return order
    .filter((name) => (counts[name] ?? 0) > 0)
    .map((name) => ({ name, value: counts[name] }));
}

export function buildHostStatusDistribution(agents = []) {
  const list = Array.isArray(agents) ? agents : [];
  const counts = countByKey(list, getHostStatus);
  return toDistribution(counts, [HOST_STATUS.OK, HOST_STATUS.WARNING, HOST_STATUS.DOWN]);
}

export function buildServiceStatusDistribution(services = []) {
  const counts = countByKey(services, (s) => s.status);
  return toDistribution(counts, [
    SERVICE_STATUS.OK,
    SERVICE_STATUS.WARNING,
    SERVICE_STATUS.CRITICAL,
    SERVICE_STATUS.UNKNOWN,
  ]);
}

export function buildOverviewKpis(agents = [], overview = null) {
  const list = Array.isArray(agents) ? agents : [];
  const kpis = overview?.kpis || {};

  let up = 0;
  let warning = 0;
  let critical = 0;
  let down = 0;

  list.forEach((agent) => {
    const status = getHostStatus(agent);
    if (status === HOST_STATUS.OK) up += 1;
    else if (status === HOST_STATUS.WARNING) warning += 1;
    else down += 1;
    if (agent.compromised || ((agent.criticalCount ?? 0) > 0 && agent.status === 'active')) {
      critical += 1;
    }
  });

  const neverConnected = list.filter((a) => a.status === 'never_connected').length;
  const staleActive = list.filter(
    (a) => a.status === 'active' && isStale(a.lastKeepAlive)
  ).length;
  const unchecked = neverConnected + staleActive;

  const problemsFromAgents = list.reduce((sum, a) => sum + (a.criticalCount ?? 0), 0);
  const problems = kpis.criticalAlerts ?? problemsFromAgents;

  return {
    totalHosts: list.length,
    upHosts: up,
    warningHosts: warning,
    criticalHosts: critical,
    downHosts: down,
    totalServices: list.length * SERVICES_PER_HOST,
    problems,
    unchecked,
  };
}

export function buildTopProblemHosts(agents = [], limit = 10) {
  const list = Array.isArray(agents) ? agents : [];
  return [...list]
    .map((agent) => ({
      id: agent.id,
      host: agent.name,
      status: getHostStatus(agent),
      problems: (agent.criticalCount ?? 0) + (agent.alertCount ?? 0),
      lastChange: agent.lastKeepAlive,
    }))
    .sort((a, b) => b.problems - a.problems)
    .slice(0, limit);
}

export function buildProblemsPivot(items = [], stateFn, states) {
  const list = Array.isArray(items) ? items : [];
  const total = list.length || 1;
  const counts = {};
  states.forEach((s) => {
    counts[s] = 0;
  });

  list.forEach((item) => {
    const state = stateFn(item);
    if (state && counts[state] !== undefined) counts[state] += 1;
  });

  return states.map((state) => ({
    state,
    count: counts[state],
    percent: list.length ? Math.round((counts[state] / total) * 100) : 0,
  }));
}

export function buildHostProblemsPivot(agents = []) {
  return buildProblemsPivot(agents, getHostProblemState, ['Critical', 'Warning', 'Unknown']);
}

export function buildServiceProblemsPivot(services = []) {
  const problemStates = ['Critical', 'Warning', 'Unknown'];
  const counts = { Critical: 0, Warning: 0, Unknown: 0 };
  const list = Array.isArray(services) ? services : [];
  const total = list.length || 1;

  list.forEach((s) => {
    if (s.status === SERVICE_STATUS.CRITICAL) counts.Critical += 1;
    else if (s.status === SERVICE_STATUS.WARNING) counts.Warning += 1;
    else if (s.status === SERVICE_STATUS.UNKNOWN) counts.Unknown += 1;
  });

  return problemStates.map((state) => ({
    state,
    count: counts[state],
    percent: list.length ? Math.round((counts[state] / total) * 100) : 0,
  }));
}

export const HOST_STATUS_COLORS = {
  OK: '#73bf69',
  Warning: '#f5a623',
  Down: '#f2495c',
};

export const SERVICE_STATUS_COLORS = {
  OK: '#73bf69',
  Warning: '#f5a623',
  Critical: '#f2495c',
  Unknown: '#5a5f72',
};
