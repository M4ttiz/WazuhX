import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { useWazuh } from '../hooks/useWazuh';
import { getRefreshInterval } from '../hooks/useAutoRefresh';
import { useDataSource } from '../context/DataSourceContext';
import EmptyState from '../components/EmptyState';
import GrafanaPanel from '../components/GrafanaPanel';
import SeverityBadge from '../components/SeverityBadge';
import OverviewKpiHeader from '../components/dashboard/OverviewKpiHeader';
import StatusDonutChart from '../components/dashboard/StatusDonutChart';
import TopProblemHostsTable from '../components/dashboard/TopProblemHostsTable';
import ProblemsPivotTable from '../components/dashboard/ProblemsPivotTable';
import {
  buildOverviewKpis,
  buildSyntheticServices,
  buildHostStatusDistribution,
  buildServiceStatusDistribution,
  buildTopProblemHosts,
  buildHostProblemsPivot,
  buildServiceProblemsPivot,
  HOST_STATUS_COLORS,
  SERVICE_STATUS_COLORS,
} from '../utils/dashboardMappers';
import { formatDate } from '../utils/formatters';

export default function Dashboard() {
  const interval = getRefreshInterval('dashboard', 15000);
  const { data, loading, error } = useWazuh('/overview', { refreshInterval: interval });
  const { data: agentsData, loading: agentsLoading, error: agentsError } = useWazuh('/agents', {
    refreshInterval: interval,
  });
  const { wazuhConnected, isMock } = useDataSource();

  const agents = useMemo(
    () => (Array.isArray(agentsData) ? agentsData : []),
    [agentsData]
  );

  const services = useMemo(() => buildSyntheticServices(agents), [agents]);
  const overviewKpis = useMemo(() => buildOverviewKpis(agents, data), [agents, data]);
  const hostDistribution = useMemo(() => buildHostStatusDistribution(agents), [agents]);
  const serviceDistribution = useMemo(() => buildServiceStatusDistribution(services), [services]);
  const topHosts = useMemo(() => buildTopProblemHosts(agents, 10), [agents]);
  const hostPivot = useMemo(() => buildHostProblemsPivot(agents), [agents]);
  const servicePivot = useMemo(() => buildServiceProblemsPivot(services), [services]);

  const pageLoading = loading || agentsLoading;
  const pageError = error || agentsError;
  const { recentActivity, hasCriticalIncident } = data || {};
  const connected = wazuhConnected && !isMock;

  if (pageError && !data && !agents.length) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Impossibile caricare Overview"
        message={pageError}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Overview</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">MISAT Monitor — postura host e servizi</p>
        </div>
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
            connected
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          }`}
        >
          {connected ? <Wifi size={16} /> : <WifiOff size={16} />}
          <span>Wazuh {connected ? 'connesso' : 'modalità demo'}</span>
        </div>
      </div>

      {hasCriticalIncident && (
        <div className="banner-critical text-center">
          Incidenti critici attivi — richiede attenzione immediata
        </div>
      )}

      <OverviewKpiHeader kpis={overviewKpis} loading={pageLoading} />

      <div className="grid grid-cols-12 gap-3">
        <GrafanaPanel title="Host Status Distribution" className="col-span-12 lg:col-span-6">
          <StatusDonutChart
            data={hostDistribution}
            colors={HOST_STATUS_COLORS}
            loading={pageLoading}
          />
        </GrafanaPanel>
        <GrafanaPanel title="Service Status Distribution" className="col-span-12 lg:col-span-6">
          <StatusDonutChart
            data={serviceDistribution}
            colors={SERVICE_STATUS_COLORS}
            loading={pageLoading}
          />
        </GrafanaPanel>
      </div>

      <GrafanaPanel title="Top Problem Hosts">
        <TopProblemHostsTable rows={topHosts} loading={pageLoading} />
      </GrafanaPanel>

      <div className="grid grid-cols-12 gap-3">
        <GrafanaPanel title="Host Problems by State" className="col-span-12 lg:col-span-6">
          <ProblemsPivotTable rows={hostPivot} loading={pageLoading} />
        </GrafanaPanel>
        <GrafanaPanel title="Service Problems by State" className="col-span-12 lg:col-span-6">
          <ProblemsPivotTable rows={servicePivot} loading={pageLoading} />
        </GrafanaPanel>
      </div>

      {(recentActivity?.length > 0 || pageLoading) && (
        <GrafanaPanel title="Recent Alerts">
          <div className="flex justify-end -mt-1 mb-2">
            <Link to="/alerts" className="text-sm text-[var(--accent)] hover:underline font-medium">
              View all alerts
            </Link>
          </div>
          {pageLoading ? (
            <div className="skeleton h-32 w-full rounded-md" />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Rule</th>
                    <th>Agent</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(recentActivity || []).slice(0, 5).map((a) => (
                    <tr key={a.id}>
                      <td>
                        <SeverityBadge level={a.severity} label={a.severityLabel} />
                      </td>
                      <td className="max-w-xs truncate">{a.ruleDescription || a.ruleId}</td>
                      <td>{a.agentName || a.agentId}</td>
                      <td className="text-[var(--text-secondary)]">{formatDate(a.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GrafanaPanel>
      )}
    </div>
  );
}
