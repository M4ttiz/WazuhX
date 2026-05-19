import { Link } from 'react-router-dom';
import { useWazuh } from '../hooks/useWazuh';
import { getRefreshInterval } from '../hooks/useAutoRefresh';
import ResourceMetricCard, { metricBarColor } from '../components/ResourceMetricCard';
import ThresholdAlertBanner from '../components/ThresholdAlertBanner';
import KpiCard from '../components/KpiCard';
import { formatUptime, formatLoadAverage, formatMetricsSource } from '../utils/formatters';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { chartTooltipStyle, chartAxisProps, chartGridProps } from '../utils/chartTheme';

function AgentMetricsCard({ agent, thresholds }) {
  const hasAlert = (agent.thresholdAlerts?.length || 0) > 0;

  return (
    <div className={`card ${hasAlert ? 'border-danger' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <Link to={`/agents/${agent.agentId}`} className="font-semibold text-primary hover:text-accent">
            {agent.agentName}
          </Link>
          <p className="text-xs text-muted mt-1">{formatMetricsSource(agent.source, agent.scanTime)}</p>
        </div>
        {hasAlert && (
          <span className="text-xs font-medium text-danger bg-[rgba(220,38,38,0.12)] px-2 py-1 rounded">
            {agent.thresholdAlerts.length} alert
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <ResourceMetricCard label="CPU" value={agent.cpuPercent} threshold={thresholds?.cpu ?? 90} />
        <ResourceMetricCard label="RAM" value={agent.ramPercent} threshold={thresholds?.ram ?? 90} />
        <ResourceMetricCard
          label="Disco (max)"
          value={agent.maxDiskPercent}
          threshold={thresholds?.disk ?? 85}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm text-secondary mb-4">
        <p>
          Uptime: <span className="font-mono text-primary">{formatUptime(agent.uptimeSeconds)}</span>
        </p>
        <p>
          Load avg: <span className="font-mono text-primary">{formatLoadAverage(agent.loadAverage)}</span>
        </p>
      </div>

      {agent.disks?.length > 0 && (
        <div className="space-y-2 mb-4">
          {agent.disks.map((d) => (
            <div key={d.mount}>
              <div className="flex justify-between text-xs text-secondary mb-1">
                <span className="font-mono">{d.mount}</span>
                <span>{d.usedPercent}%</span>
              </div>
              <div className="h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className={`h-full ${metricBarColor(d.usedPercent, thresholds?.disk ?? 85)}`}
                  style={{ width: `${d.usedPercent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {agent.history?.length > 1 && (
        <div>
          <p className="card-title">Trend recente</p>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={agent.history}>
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
    </div>
  );
}

export default function Metrics() {
  const interval = getRefreshInterval('metrics', 15000);
  const { data, loading } = useWazuh('/metrics', { refreshInterval: interval });

  const thresholds = data?.thresholds || { cpu: 90, ram: 90, disk: 85 };
  const agents = data?.agents || [];
  const alerts = data?.alerts || [];
  const summary = data?.summary || {};

  if (loading && !data) {
    return <div className="skeleton h-64 card" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-primary">Metriche risorse</h1>
        <p className="text-secondary text-sm mt-1">
          CPU, RAM e disco per agente — syscollector Wazuh e script opzionale per dati in tempo reale.
        </p>
      </div>

      <ThresholdAlertBanner alerts={alerts} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Agenti monitorati" value={summary.totalAgents} variant="info" loading={loading} />
        <KpiCard label="Soglie superate" value={summary.agentsOverThreshold} variant="warning" loading={loading} />
        <KpiCard label="Soglia CPU" value={`${thresholds.cpu}%`} variant="ok" loading={loading} />
        <KpiCard label="Soglia disco" value={`${thresholds.disk}%`} variant="ok" loading={loading} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {agents.map((agent) => (
          <AgentMetricsCard key={agent.agentId} agent={agent} thresholds={thresholds} />
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
