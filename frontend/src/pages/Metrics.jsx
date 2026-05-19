import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useWazuh } from '../hooks/useWazuh';
import { getRefreshInterval } from '../hooks/useAutoRefresh';
import ResourceMetricCard from '../components/ResourceMetricCard';
import ThresholdAlertBanner from '../components/ThresholdAlertBanner';
import KpiCard from '../components/KpiCard';
import PageHeader from '../components/PageHeader';
import { formatLoadAverage } from '../utils/formatters';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { chartTooltipStyle, chartAxisProps, chartGridProps } from '../utils/chartTheme';

const NETDATA_ERROR_BANNER =
  'Netdata not reachable — check that Netdata is running on the target host (port 19999)';

function buildChartRows(agent) {
  const cpu = agent.series?.cpu || [];
  if (!cpu.length) return agent.history || [];

  return cpu.map((p, i) => ({
    t:
      typeof p.time === 'number'
        ? new Date(p.time * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
        : String(p.time ?? i),
    cpu: p.value ?? 0,
    ram: agent.series?.ram?.[i]?.value ?? 0,
  }));
}

function AgentNetdataCard({ agent, thresholds }) {
  const hasAlert = (agent.thresholdAlerts?.length || 0) > 0;
  const chartRows = useMemo(() => buildChartRows(agent), [agent]);
  const unreachable = !agent.reachable;

  return (
    <div className={`card ${hasAlert ? 'border-danger' : ''} ${unreachable ? 'opacity-75' : ''}`}>
      <div className="flex justify-between items-start mb-4">
          <div>
            <Link to={`/agents/${agent.agentId}`} className="font-semibold text-primary hover:text-accent">
              {agent.agentName}
            </Link>
            <p className="text-xs text-muted mt-1 font-mono">{agent.hostIp || '—'}</p>
            {unreachable && (
              <p className="text-xs text-danger mt-1">{agent.error || 'Netdata unreachable'}</p>
            )}
          </div>
          {hasAlert && (
            <span className="text-xs font-medium text-danger bg-[rgba(220,38,38,0.12)] px-2 py-1 rounded">
              {agent.thresholdAlerts.length} alert
            </span>
          )}
      </div>

      {!unreachable && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
            <ResourceMetricCard label="CPU" value={agent.cpuPercent} threshold={thresholds?.cpu ?? 90} />
            <ResourceMetricCard label="RAM" value={agent.ramPercent} threshold={thresholds?.ram ?? 90} />
            <ResourceMetricCard
              label="Disk I/O"
              value={agent.diskIo}
              threshold={thresholds?.disk ?? 85}
              unit={agent.diskUnit || 'KiB/s'}
              showBar={false}
            />
            <ResourceMetricCard
              label="Network"
              value={agent.netTraffic}
              threshold={100}
              unit=""
              showBar={false}
            />
            <div className="text-sm text-secondary">
              <p className="text-xs text-muted mb-1">Load avg</p>
              <p className="font-mono text-primary">{formatLoadAverage(agent.loadAverage)}</p>
            </div>
          </div>

          {chartRows.length > 1 && (
            <div>
              <p className="card-title">Trend (ultimi 60 campioni)</p>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={chartRows}>
                  <CartesianGrid {...chartGridProps} />
                  <XAxis dataKey="t" hide />
                  <YAxis domain={[0, 100]} {...chartAxisProps} width={32} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Area type="monotone" dataKey="cpu" stroke="#2563eb" fill="#2563eb" fillOpacity={0.15} name="CPU %" />
                  <Area type="monotone" dataKey="ram" stroke="#16a34a" fill="#16a34a" fillOpacity={0.1} name="RAM %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function Metrics() {
  const interval = getRefreshInterval('metrics', 5000);
  const { data, loading, error } = useWazuh('/metrics', { refreshInterval: interval });

  const thresholds = data?.thresholds || { cpu: 90, ram: 90, disk: 85 };
  const agents = data?.agents || [];
  const alerts = data?.alerts || [];
  const summary = data?.summary || {};

  const showGlobalBanner =
    error ||
    data?.error === 'Netdata unreachable' ||
    summary.netdataUnreachable;

  if (loading && !data) {
    return <div className="skeleton h-64 card" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Metriche risorse"
        subtitle="Prestazioni live da Netdata per ogni endpoint"
      />

      {showGlobalBanner && (
        <div className="p-4 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {NETDATA_ERROR_BANNER}
          {error ? ` (${error})` : ''}
        </div>
      )}

      <ThresholdAlertBanner alerts={alerts} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Agenti monitorati" value={summary.totalAgents} variant="info" loading={loading} />
        <KpiCard label="Soglie superate" value={summary.agentsOverThreshold} variant="warning" loading={loading} />
        <KpiCard label="Soglia CPU" value={`${thresholds.cpu}%`} variant="ok" loading={loading} />
        <KpiCard label="Soglia RAM" value={`${thresholds.ram}%`} variant="ok" loading={loading} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {agents.map((agent) => (
          <AgentNetdataCard key={agent.agentId} agent={agent} thresholds={thresholds} />
        ))}
      </div>

      {!loading && agents.length === 0 && (
        <div className="card text-center py-12 text-secondary">
          Nessun agente attivo con metriche disponibili.
        </div>
      )}
    </div>
  );
}
