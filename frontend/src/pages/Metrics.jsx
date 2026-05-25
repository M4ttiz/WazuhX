import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useWazuh } from '../hooks/useWazuh';
import { getRefreshInterval } from '../hooks/useAutoRefresh';
import PageHeader from '../components/PageHeader';
import GrafanaPanel from '../components/GrafanaPanel';
import SegmentBar from '../components/SegmentBar';
import ThresholdAlertBanner from '../components/ThresholdAlertBanner';

const GLANCES_ERROR_BANNER =
  'Glances non raggiungibile - verifica che Glances sia in esecuzione sull\'host (porta 61208)';

function StatValue({ loading, children }) {
  if (loading) return <div className="skeleton h-8 w-16" />;
  return (
    <p className="text-2xl font-semibold font-mono text-[var(--text-primary)]">{children}</p>
  );
}

export default function Metrics() {
  const interval = getRefreshInterval('metrics', 10000);
  const { data, loading, error } = useWazuh('/metrics', { refreshInterval: interval });
  const { data: agentsData } = useWazuh('/agents');
  const { data: overview } = useWazuh('/overview', { refreshInterval: interval });

  const agentsById = useMemo(() => {
    const list = Array.isArray(agentsData) ? agentsData : [];
    return Object.fromEntries(list.map((a) => [String(a.id), a]));
  }, [agentsData]);

  const thresholds = data?.thresholds || { cpu: 90, ram: 90, disk: 85 };
  const metricAgents = data?.agents || [];
  const alerts = data?.alerts || [];
  const summary = data?.summary || {};

  const rows = useMemo(
    () =>
      metricAgents.map((m) => {
        const meta = agentsById[String(m.agentId)] || {};
        return {
          ...m,
          os: meta.os || '-',
          kernel: meta.kernel || '-',
          version: meta.version || '-',
          status: meta.status || (m.reachable ? 'active' : 'unreachable'),
        };
      }),
    [metricAgents, agentsById]
  );

  const reachable = rows.filter((r) => r.reachable);
  const avgCpu =
    reachable.length > 0
      ? reachable.reduce((s, r) => s + (r.cpuPercent || 0), 0) / reachable.length
      : 0;
  const avgRam =
    reachable.length > 0
      ? reachable.reduce((s, r) => s + (r.ramPercent || 0), 0) / reachable.length
      : 0;

  const alertsLastHour = overview?.kpis?.criticalAlerts ?? summary.agentsOverThreshold ?? '-';

  const showGlobalBanner =
    error ||
    data?.error === 'Glances unreachable' ||
    summary.glancesUnreachable;

  if (loading && !data) {
    return <div className="skeleton h-64 card" />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Services"
        subtitle="Live resource metrics from Glances — cluster-style service table"
      />

      {showGlobalBanner && <MetricsBanner error={error} />}

      <ThresholdAlertBanner alerts={alerts} />

      <div className="grid grid-cols-12 gap-3">
        <GrafanaPanel title="Agenti online" className="col-span-12 sm:col-span-6 lg:col-span-3">
          <StatValue loading={loading}>{reachable.length}</StatValue>
          <p className="text-xs text-[var(--text-muted)]">su {rows.length} monitorati</p>
        </GrafanaPanel>
        <GrafanaPanel title="CPU media" className="col-span-12 sm:col-span-6 lg:col-span-3">
          <StatValue loading={loading}>{avgCpu.toFixed(1)}%</StatValue>
        </GrafanaPanel>
        <GrafanaPanel title="RAM media" className="col-span-12 sm:col-span-6 lg:col-span-3">
          <StatValue loading={loading}>{avgRam.toFixed(1)}%</StatValue>
        </GrafanaPanel>
        <GrafanaPanel title="Alert critici (overview)" className="col-span-12 sm:col-span-6 lg:col-span-3">
          <StatValue loading={loading}>{alertsLastHour}</StatValue>
        </GrafanaPanel>

        <GrafanaPanel title="Agenti" subtitle="Aggiornamento ogni 10s" className="col-span-12">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Agent name</th>
                  <th>Memory</th>
                  <th>CPU</th>
                  <th>OS</th>
                  <th>Kernel</th>
                  <th>Wazuh version</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.agentId}
                    className={!row.reachable ? 'opacity-60' : undefined}
                  >
                    <td>
                      <Link
                        to={`/agents/${row.agentId}`}
                        className="font-medium text-[var(--accent)] hover:underline"
                      >
                        {row.agentName}
                      </Link>
                      {!row.reachable && (
                        <p className="text-xs text-[var(--red)] mt-0.5">
                          {row.error || 'Glances unreachable'}
                        </p>
                      )}
                    </td>
                    <td>
                      {row.reachable ? (
                        <SegmentBar value={row.ramPercent} />
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">-</span>
                      )}
                    </td>
                    <td>
                      {row.reachable ? (
                        <SegmentBar value={row.cpuPercent} />
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">-</span>
                      )}
                    </td>
                    <td className="text-[var(--text-secondary)]">{row.os}</td>
                    <td className="font-mono text-xs text-[var(--text-muted)]">{row.kernel}</td>
                    <td className="font-mono text-xs">{row.version}</td>
                    <td>
                      <StatusBadge status={row.status} reachable={row.reachable} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && rows.length === 0 && (
              <p className="text-center text-[var(--text-secondary)] py-8 text-sm">
                Nessun agente attivo con metriche disponibili.
              </p>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-3">
            Soglie: CPU {thresholds.cpu}% / RAM {thresholds.ram}%
          </p>
        </GrafanaPanel>
      </div>
    </div>
  );
}

function MetricsBanner({ error }) {
  return (
    <div className="p-4 rounded-md bg-red-500/10 border border-red-500/30 text-[var(--red)] text-sm">
      {GLANCES_ERROR_BANNER}
      {error ? ` (${error})` : ''}
    </div>
  );
}

function StatusBadge({ status, reachable }) {
  const active = reachable && status === 'active';
  const label = active ? 'active' : status || 'unreachable';
  const cls = active
    ? 'bg-[rgba(115,191,105,0.15)] text-[var(--green)]'
    : 'bg-[rgba(242,73,92,0.12)] text-[var(--red)]';
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${cls}`}>{label}</span>
  );
}

