import React, { useState, useMemo, useCallback } from 'react';
import {
  Server, AlertTriangle, Shield, Activity,
  CheckCircle, XCircle, Search, Terminal,
  ChevronUp, ChevronDown, ArrowUpDown,
  Wifi, WifiOff, Eye,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useWazuh } from '../hooks/useWazuh';
import { getRefreshInterval } from '../hooks/useAutoRefresh';
import { useDataSource } from '../context/DataSourceContext';
import KpiCard from '../components/KpiCard';
import GrafanaPanel from '../components/GrafanaPanel';
import EmptyState from '../components/EmptyState';
import SshModal from '../components/dashboard/SshModal';
import { chartTooltipStyle } from '../utils/chartTheme';
import {
  aggregateProblemsByHost,
  countAlertsBySeverity,
  searchFilter,
  paginate,
} from '../utils/dashboardHelpers';
import { formatDate } from '../utils/formatters';

const STATUS_COLORS = {
  ok: '#10B981',
  warning: '#F59E0B',
  down: '#EF4444',
  critical: '#EF4444',
  unknown: '#6B7280',
};

const DONUT_LABEL = ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`;

// ─── KPI helpers ────────────────────────────────────────────
function classifyAgents(agents = []) {
  let up = 0;
  let warning = 0;
  let down = 0;
  const list = Array.isArray(agents) ? agents : [];
  list.forEach((a) => {
    const s = (a.status || a.state || '').toLowerCase();
    if (['active', 'up', 'online', 'connected'].includes(s)) up += 1;
    else if (['warning', 'degraded', 'pending'].includes(s)) warning += 1;
    else if (['down', 'disconnected', 'offline', 'never_connected'].includes(s)) down += 1;
    else up += 1; // default to up
  });
  return { total: list.length, up, warning, down };
}

function countUnchecked(alerts = []) {
  const list = Array.isArray(alerts) ? alerts : [];
  return list.filter((a) => a.acknowledged === false || a.ack === false).length;
}

// ─── Main component ────────────────────────────────────────
export default function Dashboard() {
  const interval = getRefreshInterval('dashboard', 15000);

  const { data: agentsData, loading: agentsLoading } = useWazuh('/agents', { refreshInterval: interval });
  const { data: alertsRaw, loading: alertsLoading } = useWazuh('/alerts', { refreshInterval: interval });
  const { data: servicesData, loading: servicesLoading } = useWazuh('/services', { refreshInterval: interval });
  const { wazuhConnected, isMock } = useDataSource();

  // State
  const [sshHost, setSshHost] = useState(null);
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);
  const [sortDir, setSortDir] = useState('desc');
  const perPage = 10;

  // ─── Derived data ──────────────────────────────────────────
  const agents = useMemo(() => {
    if (Array.isArray(agentsData)) return agentsData;
    if (agentsData?.data && Array.isArray(agentsData.data)) return agentsData.data;
    return [];
  }, [agentsData]);

  const alerts = useMemo(() => {
    if (Array.isArray(alertsRaw)) return alertsRaw;
    if (alertsRaw?.data && Array.isArray(alertsRaw.data)) return alertsRaw.data;
    return [];
  }, [alertsRaw]);

  const services = useMemo(() => {
    if (Array.isArray(servicesData)) return servicesData;
    if (servicesData?.data && Array.isArray(servicesData.data)) return servicesData.data;
    return null; // null = endpoint may not exist
  }, [servicesData]);

  const agentStats = useMemo(() => classifyAgents(agents), [agents]);
  const alertStats = useMemo(() => countAlertsBySeverity(alerts), [alerts]);
  const unchecked = useMemo(() => countUnchecked(alerts), [alerts]);

  const pct = (val, total) => total > 0 ? `${((val / total) * 100).toFixed(1)}%` : '0%';

  // ─── Donut data ───────────────────────────────────────────
  const hostDonut = useMemo(() => [
    { name: 'OK', value: agentStats.up, fill: STATUS_COLORS.ok },
    { name: 'Warning', value: agentStats.warning, fill: STATUS_COLORS.warning },
    { name: 'Down', value: agentStats.down, fill: STATUS_COLORS.down },
  ].filter((d) => d.value > 0), [agentStats]);

  const serviceDonut = useMemo(() => {
    if (!services) return [];
    let ok = 0, warn = 0, crit = 0, unk = 0;
    services.forEach((s) => {
      const st = (s.status || s.state || '').toLowerCase();
      if (['ok', 'active', 'running', 'up'].includes(st)) ok += 1;
      else if (['warning', 'degraded'].includes(st)) warn += 1;
      else if (['critical', 'down', 'error', 'stopped'].includes(st)) crit += 1;
      else unk += 1;
    });
    return [
      { name: 'OK', value: ok, fill: STATUS_COLORS.ok },
      { name: 'Warning', value: warn, fill: STATUS_COLORS.warning },
      { name: 'Critical', value: crit, fill: STATUS_COLORS.critical },
      { name: 'Unknown', value: unk, fill: STATUS_COLORS.unknown },
    ].filter((d) => d.value > 0);
  }, [services]);

  // ─── Problem hosts table ──────────────────────────────────
  const problemHosts = useMemo(() => aggregateProblemsByHost(alerts), [alerts]);

  const filteredHosts = useMemo(
    () => searchFilter(problemHosts, searchQ, ['host']),
    [problemHosts, searchQ]
  );

  const sortedHosts = useMemo(() => {
    const sorted = [...filteredHosts];
    sorted.sort((a, b) => sortDir === 'desc' ? b.count - a.count : a.count - b.count);
    return sorted;
  }, [filteredHosts, sortDir]);

  const paginatedHosts = useMemo(
    () => paginate(sortedHosts, page, perPage),
    [sortedHosts, page]
  );

  const toggleSort = useCallback(() => {
    setSortDir((d) => d === 'desc' ? 'asc' : 'desc');
    setPage(1);
  }, []);

  // ─── Pivot matrices ──────────────────────────────────────
  const hostPivot = useMemo(() => {
    const withProblems = problemHosts.filter((h) => h.count > 0);
    const total = withProblems.length || 1;
    const critHosts = withProblems.filter((h) => h.criticals > 0).length;
    const warnHosts = withProblems.filter((h) => h.warnings > 0).length;
    const unkHosts = withProblems.filter((h) => h.unknowns > 0).length;
    return [
      { label: 'Critical', count: critHosts, pct: pct(critHosts, total), color: STATUS_COLORS.critical },
      { label: 'Warning', count: warnHosts, pct: pct(warnHosts, total), color: STATUS_COLORS.warning },
      { label: 'Unknown', count: unkHosts, pct: pct(unkHosts, total), color: STATUS_COLORS.unknown },
    ];
  }, [problemHosts]);

  const servicePivot = useMemo(() => {
    if (!services || !services.length) return null;
    let crit = 0, warn = 0, unk = 0;
    services.forEach((s) => {
      const st = (s.status || s.state || '').toLowerCase();
      if (['critical', 'down', 'error', 'stopped'].includes(st)) crit += 1;
      else if (['warning', 'degraded'].includes(st)) warn += 1;
      else if (!['ok', 'active', 'running', 'up'].includes(st)) unk += 1;
    });
    const total = crit + warn + unk || 1;
    return [
      { label: 'Critical', count: crit, pct: pct(crit, total), color: STATUS_COLORS.critical },
      { label: 'Warning', count: warn, pct: pct(warn, total), color: STATUS_COLORS.warning },
      { label: 'Unknown', count: unk, pct: pct(unk, total), color: STATUS_COLORS.unknown },
    ];
  }, [services]);

  const loading = agentsLoading || alertsLoading;
  const connected = wazuhConnected && !isMock;

  // ─── Loading skeleton ─────────────────────────────────────
  if (!agentsData && !alertsRaw && loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-10 w-48 rounded-lg" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[...Array(7)].map((_, i) => (
            <KpiCard key={i} loading hero />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="card skeleton h-[300px]" />
          <div className="card skeleton h-[300px]" />
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Cruscotto SOC</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Panoramica operativa della postura di sicurezza</p>
        </div>
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
            connected
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-500'
          }`}
        >
          {connected ? <Wifi size={16} /> : <WifiOff size={16} />}
          <span>Wazuh {connected ? 'connesso' : 'modalità demo'}</span>
        </div>
      </div>

      {/* ── 4.1 KPI Row (7 metriche) ───────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <KpiCard
          hero label="Total Hosts" value={agentStats.total}
          icon={Server} variant="info" loading={loading}
        />
        <KpiCard
          hero label="Up Hosts" value={agentStats.up}
          sub={pct(agentStats.up, agentStats.total)}
          icon={CheckCircle} variant="ok" loading={loading}
        />
        <KpiCard
          hero label="Warning Hosts" value={agentStats.warning}
          sub={pct(agentStats.warning, agentStats.total)}
          icon={AlertTriangle} variant="warning" loading={loading}
        />
        <KpiCard
          hero label="Down Hosts" value={agentStats.down}
          sub={pct(agentStats.down, agentStats.total)}
          icon={XCircle} variant="critical" loading={loading}
        />
        <KpiCard
          hero label="Total Services"
          value={services ? services.length : '--'}
          icon={Activity} variant="info" loading={servicesLoading}
        />
        <KpiCard
          hero label="Problems"
          value={alertStats.critical + alertStats.warning}
          icon={Shield} variant="warning" loading={loading}
        />
        <KpiCard
          hero label="Unchecked" value={unchecked}
          icon={Eye} variant="accent" loading={loading}
        />
      </div>

      {/* ── 4.2 Donut Charts ───────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-4">
        <GrafanaPanel title="Host Status Distribution">
          {loading ? (
            <div className="skeleton h-[280px] w-full rounded-md" />
          ) : hostDonut.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={hostDonut}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={3}
                  label={DONUT_LABEL}
                >
                  {hostDonut.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  formatter={(value) => <span className="text-xs text-[var(--text-secondary)]">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-[var(--text-muted)] py-16 text-sm">Nessun dato disponibile</p>
          )}
        </GrafanaPanel>

        <GrafanaPanel title="Service Status Distribution">
          {servicesLoading ? (
            <div className="skeleton h-[280px] w-full rounded-md" />
          ) : serviceDonut.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={serviceDonut}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={3}
                  label={DONUT_LABEL}
                >
                  {serviceDonut.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  formatter={(value) => <span className="text-xs text-[var(--text-secondary)]">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-[var(--text-muted)] py-16 text-sm">--</p>
          )}
        </GrafanaPanel>
      </div>

      {/* ── 4.3 Top Problem Hosts Table ────────────────────── */}
      <GrafanaPanel title="Top Problem Hosts">
        {/* Search */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQ}
              onChange={(e) => { setSearchQ(e.target.value); setPage(1); }}
              className="input w-full pl-8 !min-h-[36px] !py-1.5 text-sm"
              placeholder="Search hosts…"
              id="dashboard-search-hosts"
            />
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Host</th>
                <th>Status</th>
                <th>
                  <button
                    type="button"
                    onClick={toggleSort}
                    className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors"
                  >
                    Problems
                    {sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                  </button>
                </th>
                <th>Last Change</th>
                <th className="text-center">Terminal</th>
              </tr>
            </thead>
            <tbody>
              {paginatedHosts.data.length > 0 ? (
                paginatedHosts.data.map((h) => {
                  const statusClass = h.criticals > 0 ? 'badge-critical' : h.warnings > 0 ? 'badge-warning' : 'badge-ok';
                  const statusLabel = h.criticals > 0 ? 'Critical' : h.warnings > 0 ? 'Warning' : 'OK';
                  // Find original agent for last change
                  const agent = agents.find((a) => (a.name || a.id) === h.host || a.id === h.agentId);
                  const lastChange = agent?.lastKeepAlive || agent?.lastChange || agent?.updatedAt || '--';

                  return (
                    <tr key={h.host}>
                      <td className="font-medium">{h.host}</td>
                      <td>
                        <span className={`badge ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="font-mono text-sm">{h.count}</td>
                      <td className="text-[var(--text-secondary)] text-sm">
                        {lastChange !== '--' ? formatDate(lastChange) : '--'}
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          onClick={() => setSshHost(agent?.ip || agent?.host || h.host)}
                          className="p-1.5 rounded hover:bg-[var(--accent-light)] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
                          title={`SSH to ${h.host}`}
                          aria-label={`Open SSH terminal for ${h.host}`}
                        >
                          <Terminal size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="text-center text-[var(--text-muted)] py-8 text-sm">
                    {searchQ ? 'Nessun risultato' : 'Nessun host con problemi'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 4.5 Pagination */}
        {paginatedHosts.totalPages > 1 && (
          <div className="flex items-center justify-between mt-3 text-sm">
            <span className="text-[var(--text-secondary)]">
              Showing {((page - 1) * perPage) + 1} to {Math.min(page * perPage, paginatedHosts.total)} of {paginatedHosts.total}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="pagination-btn"
              >
                ‹
              </button>
              {[...Array(paginatedHosts.totalPages)].map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPage(i + 1)}
                  className={`pagination-btn ${page === i + 1 ? 'active' : ''}`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(paginatedHosts.totalPages, p + 1))}
                disabled={page === paginatedHosts.totalPages}
                className="pagination-btn"
              >
                ›
              </button>
            </div>
          </div>
        )}
      </GrafanaPanel>

      {/* ── 4.4 Pivot Matrices ─────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Host Problems by State */}
        <GrafanaPanel title="Host Problems by State">
          <div className="pivot-matrix grid-cols-3">
            <div className="pivot-header">State</div>
            <div className="pivot-header">Hosts</div>
            <div className="pivot-header">%</div>
            {hostPivot.map((row) => (
              <React.Fragment key={row.label}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: row.color }} />
                  <span className="text-sm font-medium text-[var(--text-primary)]">{row.label}</span>
                </div>
                <div className="font-mono text-sm text-[var(--text-primary)]">{row.count}</div>
                <div className="font-mono text-sm text-[var(--text-secondary)]">{row.pct}</div>
              </React.Fragment>
            ))}
          </div>
        </GrafanaPanel>

        {/* Service Problems by State */}
        <GrafanaPanel title="Service Problems by State">
          {servicePivot ? (
            <div className="pivot-matrix grid-cols-3">
              <div className="pivot-header">State</div>
              <div className="pivot-header">Services</div>
              <div className="pivot-header">%</div>
              {servicePivot.map((row) => (
                <React.Fragment key={row.label}>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: row.color }} />
                    <span className="text-sm font-medium text-[var(--text-primary)]">{row.label}</span>
                  </div>
                  <div className="font-mono text-sm text-[var(--text-primary)]">{row.count}</div>
                  <div className="font-mono text-sm text-[var(--text-secondary)]">{row.pct}</div>
                </React.Fragment>
              ))}
            </div>
          ) : (
            <p className="text-center text-[var(--text-muted)] py-8 text-sm">--</p>
          )}
        </GrafanaPanel>
      </div>

      {/* ── SSH Modal ──────────────────────────────────────── */}
      {sshHost && (
        <SshModal host={sshHost} onClose={() => setSshHost(null)} />
      )}
    </div>
  );
}
