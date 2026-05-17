export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelative(iso) {
  if (!iso) return 'Mai connesso';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Adesso';
  if (mins < 60) return `${mins} min fa`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h fa`;
  return `${Math.floor(hours / 24)}g fa`;
}

export function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  return `${d}g ${h}h`;
}

export function severityColor(level) {
  if (level >= 12) return 'critical';
  if (level >= 8) return 'warning';
  if (level >= 5) return 'accent';
  return 'safe';
}

export function isStale(lastKeepAlive, minutes = 5) {
  if (!lastKeepAlive) return true;
  return Date.now() - new Date(lastKeepAlive).getTime() > minutes * 60000;
}

export function exportCsv(rows, columns, filename) {
  const header = columns.map((c) => c.label).join(',');
  const body = rows
    .map((row) =>
      columns
        .map((c) => {
          const val = c.get(row);
          const str = String(val ?? '').replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(',')
    )
    .join('\n');
  const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function filterAlerts(alerts, filters) {
  return alerts.filter((a) => {
    if (filters.severityMin && a.severity < filters.severityMin) return false;
    if (filters.severityMax && a.severity > filters.severityMax) return false;
    if (filters.agentId && a.agentId !== filters.agentId) return false;
    if (filters.mitreTactic && a.mitreTactic !== filters.mitreTactic) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (
        !a.description?.toLowerCase().includes(q) &&
        !a.agentName?.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });
}

export function computeKpis(overview) {
  if (!overview?.kpis) return {};
  return overview.kpis;
}
