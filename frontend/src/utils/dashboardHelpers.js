import { isStale } from './formatters';
import {
  getHostStatus,
  getHostProblemState,
  buildSyntheticServices,
  buildHostStatusDistribution,
  buildServiceStatusDistribution,
  buildHostProblemsPivot,
  buildServiceProblemsPivot,
  HOST_STATUS,
  SERVICE_STATUS,
  HOST_STATUS_COLORS,
  SERVICE_STATUS_COLORS,
} from './dashboardMappers';

export {
  getHostStatus,
  getHostProblemState,
  buildSyntheticServices,
  buildHostStatusDistribution,
  buildServiceStatusDistribution,
  buildHostProblemsPivot,
  buildServiceProblemsPivot,
  HOST_STATUS,
  SERVICE_STATUS,
  HOST_STATUS_COLORS,
  SERVICE_STATUS_COLORS,
};

const SERVICES_PER_HOST = 3;

function pct(part, total) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

export function getAlertSeverityBucket(alert) {
  const lvl = typeof alert?.severity === 'number' ? alert.severity : alert?.level ?? 0;
  if (lvl >= 12) return 'Critical';
  if (lvl >= 5) return 'Warning';
  return 'Unknown';
}

export function aggregateProblemsByHost(agents = [], alerts = []) {
  const agentList = Array.isArray(agents) ? agents : [];
  const alertList = Array.isArray(alerts) ? alerts : [];
  const byAgent = {};

  alertList.forEach((a) => {
    const id = String(a.agentId ?? '');
    if (!id) return;
    if (!byAgent[id]) byAgent[id] = { count: 0, lastTs: null };
    byAgent[id].count += 1;
    const ts = a.timestamp;
    if (ts && (!byAgent[id].lastTs || ts > byAgent[id].lastTs)) {
      byAgent[id].lastTs = ts;
    }
  });

  return agentList
    .map((agent) => {
      const agg = byAgent[String(agent.id)];
      const fallbackProblems = (agent.criticalCount ?? 0) + (agent.alertCount ?? 0);
      return {
        id: agent.id,
        host: agent.name ?? '--',
        ip: agent.ip ?? agent.hostname ?? '',
        status: getHostStatus(agent),
        problems: agg?.count ?? fallbackProblems,
        lastChange: agg?.lastTs ?? agent.lastKeepAlive ?? null,
        agent,
      };
    })
    .sort((a, b) => b.problems - a.problems);
}

export function buildKpiRow(agents = [], overview = null, _alerts = []) {
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
  const total = list.length;

  return {
    totalHosts: total,
    upHosts: up,
    upHostsPct: pct(up, total),
    warningHosts: warning,
    warningHostsPct: pct(warning, total),
    criticalHosts: critical,
    downHosts: down,
    downHostsPct: pct(down, total),
    totalServices: total * SERVICES_PER_HOST,
    problems,
    unchecked,
  };
}

export function buildHostDonut(agents) {
  return buildHostStatusDistribution(agents);
}

export function buildServiceDonut(services) {
  return buildServiceStatusDistribution(services);
}

export function buildHostProblemsMatrix(agents) {
  return buildHostProblemsPivot(agents);
}

export function buildServiceProblemsMatrix(services) {
  return buildServiceProblemsPivot(services);
}

export function buildAlertSeverityBars(alerts = []) {
  const counts = { Critical: 0, Warning: 0, Unknown: 0 };
  const list = Array.isArray(alerts) ? alerts : [];
  list.forEach((a) => {
    const bucket = getAlertSeverityBucket(a);
    counts[bucket] = (counts[bucket] || 0) + 1;
  });
  return ['Critical', 'Warning', 'Unknown'].map((name) => ({
    name,
    value: counts[name],
  }));
}

export function filterAndPaginate(rows = [], { search = '', page = 1, pageSize = 10 } = {}) {
  const q = search.trim().toLowerCase();
  let filtered = rows;
  if (q) {
    filtered = rows.filter(
      (r) =>
        String(r.host ?? '').toLowerCase().includes(q) ||
        String(r.ip ?? '').toLowerCase().includes(q)
    );
  }
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    rows: filtered.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

export function buildDailyBreakdown(timeline = [], agents = []) {
  const downCount = (Array.isArray(agents) ? agents : []).filter(
    (a) => a.status === 'disconnected' || a.status === 'never_connected'
  ).length;

  const list = Array.isArray(timeline) ? timeline : [];
  return list.map((point) => ({
    date: point.date ?? point.bucket ?? '--',
    alertCount: point.count ?? point.total ?? 0,
    hostsDown: downCount,
  }));
}
