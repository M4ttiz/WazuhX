/**
 * Dashboard aggregation helpers.
 * All functions operate on real API data — never produce mock values.
 * If a field is missing → returns '--'.
 */

// ─── Alert helpers ──────────────────────────────────────────────

/**
 * Group alerts by host (agent).
 * Returns Map<agentName, { count, criticals, warnings, unknowns }>.
 */
export function aggregateProblemsByHost(alerts = []) {
  const map = new Map();
  (Array.isArray(alerts) ? alerts : []).forEach((a) => {
    const name = a.agentName || a.agent?.name || a.agentId || 'Unknown';
    if (!map.has(name)) {
      map.set(name, { host: name, agentId: a.agentId, count: 0, criticals: 0, warnings: 0, unknowns: 0 });
    }
    const entry = map.get(name);
    entry.count += 1;
    const level = a.rule?.level ?? a.severity ?? 0;
    if (level >= 12) entry.criticals += 1;
    else if (level >= 8) entry.warnings += 1;
    else entry.unknowns += 1;
  });
  return [...map.values()].sort((a, b) => b.count - a.count);
}

/**
 * Count alerts by severity bucket.
 * Returns { critical, warning, unknown, total }.
 */
export function countAlertsBySeverity(alerts = []) {
  const list = Array.isArray(alerts) ? alerts : [];
  let critical = 0;
  let warning = 0;
  let unknown = 0;

  list.forEach((a) => {
    const level = a.rule?.level ?? a.severity ?? 0;
    if (level >= 12) critical += 1;
    else if (level >= 8) warning += 1;
    else unknown += 1;
  });

  return { critical, warning, unknown, total: list.length };
}

/**
 * Build distribution array for bar chart.
 */
export function buildSeverityDistribution(alerts = []) {
  const { critical, warning, unknown } = countAlertsBySeverity(alerts);
  return [
    { name: 'Critical', value: critical, fill: '#EF4444' },
    { name: 'Warning', value: warning, fill: '#F59E0B' },
    { name: 'Unknown', value: unknown, fill: '#6B7280' },
  ];
}

// ─── CVE helpers ────────────────────────────────────────────────

/**
 * Return top N CVE entries sorted by severity (CVSS score descending).
 */
export function getTopCVEs(cves = [], limit = 5) {
  const list = Array.isArray(cves) ? cves : [];
  return [...list]
    .sort((a, b) => (b.cvss ?? b.score ?? 0) - (a.cvss ?? a.score ?? 0))
    .slice(0, limit);
}

// ─── Metrics helpers ────────────────────────────────────────────

/**
 * Compute average CPU and RAM across hosts.
 * Returns { avgCpu, avgRam } or '--' for unavailable.
 */
export function computeAverageMetrics(agents = []) {
  const list = Array.isArray(agents) ? agents : [];
  const withMetrics = list.filter(
    (a) => a.cpu != null || a.ram != null || a.memory != null
  );
  if (!withMetrics.length) return { avgCpu: '--', avgRam: '--' };

  let cpuSum = 0;
  let cpuCount = 0;
  let ramSum = 0;
  let ramCount = 0;

  withMetrics.forEach((a) => {
    const cpu = a.cpu ?? a.cpuUsage;
    const ram = a.ram ?? a.memory ?? a.memoryUsage;
    if (cpu != null) {
      cpuSum += Number(cpu);
      cpuCount += 1;
    }
    if (ram != null) {
      ramSum += Number(ram);
      ramCount += 1;
    }
  });

  return {
    avgCpu: cpuCount ? `${(cpuSum / cpuCount).toFixed(1)}%` : '--',
    avgRam: ramCount ? `${(ramSum / ramCount).toFixed(1)}%` : '--',
  };
}

// ─── Trends helpers ─────────────────────────────────────────────

/**
 * Group alerts by day for trend analysis.
 * Returns array of { date, count, hostDown }.
 */
export function groupAlertsByDay(alerts = [], days = 7) {
  const list = Array.isArray(alerts) ? alerts : [];
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);

  const dayMap = new Map();

  // Pre-fill days
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    dayMap.set(key, { date: key, count: 0, hostDown: 0 });
  }

  list.forEach((a) => {
    const ts = a.timestamp || a._source?.timestamp || a.date;
    if (!ts) return;
    const d = new Date(ts);
    if (d < cutoff) return;
    const key = d.toISOString().split('T')[0];
    if (dayMap.has(key)) {
      dayMap.get(key).count += 1;
      const level = a.rule?.level ?? a.severity ?? 0;
      if (level >= 12) dayMap.get(key).hostDown += 1;
    }
  });

  return [...dayMap.values()];
}

/**
 * Filter alerts by time range.
 */
export function filterAlertsByRange(alerts = [], range = '7d') {
  const list = Array.isArray(alerts) ? alerts : [];
  const now = Date.now();
  const ranges = { '24h': 1, '7d': 7, '30d': 30 };
  const days = ranges[range] || 7;
  const cutoff = now - days * 86400000;

  return list.filter((a) => {
    const ts = a.timestamp || a._source?.timestamp || a.date;
    if (!ts) return false;
    return new Date(ts).getTime() >= cutoff;
  });
}

// ─── Search helper ──────────────────────────────────────────────

/**
 * Local search filter on table rows.
 */
export function searchFilter(rows, query, keys = ['host', 'name']) {
  if (!query?.trim()) return rows;
  const q = query.toLowerCase();
  return rows.filter((row) =>
    keys.some((k) => String(row[k] || '').toLowerCase().includes(q))
  );
}

/**
 * Paginate an array.
 */
export function paginate(rows, page = 1, perPage = 10) {
  const start = (page - 1) * perPage;
  return {
    data: rows.slice(start, start + perPage),
    total: rows.length,
    totalPages: Math.ceil(rows.length / perPage),
    page,
  };
}
