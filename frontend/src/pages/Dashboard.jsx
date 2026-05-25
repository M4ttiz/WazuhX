import { useMemo, useState, useEffect } from 'react';
import { AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { useWazuh } from '../hooks/useWazuh';
import { getRefreshInterval } from '../hooks/useAutoRefresh';
import { useDataSource } from '../context/DataSourceContext';
import { useToast } from '../context/ToastContext';
import EmptyState from '../components/EmptyState';
import GrafanaPanel from '../components/GrafanaPanel';
import KpiRow from '../components/dashboard/KpiRow';
import DonutChart from '../components/dashboard/DonutChart';
import ProblemHostsTable from '../components/dashboard/ProblemHostsTable';
import ProblemsMatrix from '../components/dashboard/ProblemsMatrix';
import SshModal from '../components/dashboard/SshModal';
import {
  buildKpiRow,
  buildSyntheticServices,
  buildHostDonut,
  buildServiceDonut,
  buildHostProblemsMatrix,
  buildServiceProblemsMatrix,
  aggregateProblemsByHost,
  HOST_STATUS_COLORS,
  SERVICE_STATUS_COLORS,
} from '../utils/dashboardHelpers';

function normalizeAlertsList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export default function Dashboard() {
  const interval = getRefreshInterval('dashboard', 15000);
  const { toast } = useToast();
  const { data, loading, error } = useWazuh('/overview', { refreshInterval: interval });
  const { data: agentsData, loading: agentsLoading, error: agentsError } = useWazuh('/agents', {
    refreshInterval: interval,
  });
  const { data: alertsData, loading: alertsLoading, error: alertsError } = useWazuh('/alerts', {
    params: { limit: 500, page: 1 },
    refreshInterval: interval,
  });
  const { wazuhConnected, isMock } = useDataSource();
  const [selectedHost, setSelectedHost] = useState(null);

  const agents = useMemo(
    () => (Array.isArray(agentsData) ? agentsData : []),
    [agentsData]
  );
  const alerts = useMemo(() => normalizeAlertsList(alertsData), [alertsData]);

  const services = useMemo(() => buildSyntheticServices(agents), [agents]);
  const overviewKpis = useMemo(() => buildKpiRow(agents, data, alerts), [agents, data, alerts]);
  const hostDistribution = useMemo(() => buildHostDonut(agents), [agents]);
  const serviceDistribution = useMemo(() => buildServiceDonut(services), [services]);
  const problemHosts = useMemo(
    () => aggregateProblemsByHost(agents, alerts),
    [agents, alerts]
  );
  const hostPivot = useMemo(() => buildHostProblemsMatrix(agents), [agents]);
  const servicePivot = useMemo(() => buildServiceProblemsMatrix(services), [services]);

  const pageLoading = loading || agentsLoading || alertsLoading;
  const pageError = error || agentsError || alertsError;
  const { hasCriticalIncident } = data || {};
  const connected = wazuhConnected && !isMock;

  useEffect(() => {
    if (pageError) toast(pageError, 'error');
  }, [pageError, toast]);

  if (pageError && !data && !agents.length) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Unable to load Dashboard"
        message={pageError}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">MISAT Monitor — hosts and services</p>
        </div>
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors duration-150 ${
            connected
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          }`}
        >
          {connected ? <Wifi size={16} /> : <WifiOff size={16} />}
          <span>Wazuh {connected ? 'connected' : 'demo mode'}</span>
        </div>
      </div>

      {hasCriticalIncident && (
        <div className="banner-critical text-center">
          Critical incidents active — immediate attention required
        </div>
      )}

      <KpiRow kpis={overviewKpis} loading={pageLoading} />

      <div className="grid grid-cols-12 gap-3">
        <GrafanaPanel title="Host Status Distribution" className="col-span-12 lg:col-span-6">
          <DonutChart data={hostDistribution} colors={HOST_STATUS_COLORS} loading={pageLoading} />
        </GrafanaPanel>
        <GrafanaPanel title="Service Status Distribution" className="col-span-12 lg:col-span-6">
          <DonutChart data={serviceDistribution} colors={SERVICE_STATUS_COLORS} loading={pageLoading} />
        </GrafanaPanel>
      </div>

      <GrafanaPanel title="Top Problem Hosts">
        <ProblemHostsTable
          rows={problemHosts}
          loading={pageLoading}
          onOpenTerminal={(row) => setSelectedHost(row)}
        />
      </GrafanaPanel>

      <div className="grid grid-cols-12 gap-3">
        <GrafanaPanel title="Host Problems by State" className="col-span-12 lg:col-span-6">
          <ProblemsMatrix rows={hostPivot} loading={pageLoading} />
        </GrafanaPanel>
        <GrafanaPanel title="Service Problems by State" className="col-span-12 lg:col-span-6">
          <ProblemsMatrix rows={servicePivot} loading={pageLoading} />
        </GrafanaPanel>
      </div>

      {selectedHost && (
        <SshModal host={selectedHost} onClose={() => setSelectedHost(null)} />
      )}
    </div>
  );
}
