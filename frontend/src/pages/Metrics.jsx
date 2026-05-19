import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useWazuh } from '../hooks/useWazuh';
import { getRefreshInterval } from '../hooks/useAutoRefresh';
import ResourceMetricCard, { metricBarColor } from '../components/ResourceMetricCard';
import ThresholdAlertBanner from '../components/ThresholdAlertBanner';
import KpiCard from '../components/KpiCard';
import PageHeader from '../components/PageHeader';
import { formatUptime, formatLoadAverage, formatMetricsSource } from '../utils/formatters';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { chartTooltipStyle, chartAxisProps, chartGridProps } from '../utils/chartTheme';

const FLEET_STAGGER_MS = 200;
const NETDATA_RANGES = [
  { id: '5m', label: '5 min' },
  { id: '15m', label: '15 min' },
  { id: '1h', label: '1 ora' },
  { id: '6h', label: '6 ore' },
  { id: '24h', label: '24 ore' },
];
const NETDATA_CHARTS = [
  { key: 'system.cpu', label: 'CPU %', color: '#2563eb' },
  { key: 'system.ram', label: 'RAM %', color: '#16a34a' },
  { key: 'system.net', label: 'Network', color: '#0891b2' },
];

function NetdataTimeSeriesPanel({ agents }) {
  const [agentId, setAgentId] = useState('');
  const [range, setRange] = useState('1h');

  useEffect(() => {
    if (!agentId && agents?.length) setAgentId(agents[0].agentId);
  }, [agents, agentId]);

  const refreshMs = getRefreshInterval('realtime', 5000);
  const { data, error, loading } = useWazuh('/metrics/netdata/series', {
    params: {
      agentId,
      range,
      charts: NETDATA_CHARTS.map((c) => c.key).join(','),
    },
    skip: !agentId,
    refreshInterval: agentId ? refreshMs : null,
  });

  const series = data?.series || {};
  const unreachable = error || (data && data.reachable === false);

  const chartData = useMemo(() => {
    const cpu = series['system.cpu'];
    if (!cpu?.labels?.length) return [];
    return cpu.labels.map((label, i) => {
      const point = { t: label };
      NETDATA_CHARTS.forEach((c) => {
        const s = series[c.key];
        point[c.key] = s?.data?.[0]?.[i] ?? null;
      });
      return point;
    });
  }, [series]);

  if (!agents?.length) return null;

  return (
    <div className="space-y-4">
      <div className="card">
        <NetdataPanelHeader
          agents={agents}
          agentId={agentId}
          setAgentId={setAgentId}
          range={range}
          setRange={setRange}
        />
        {unreachable && (
          <div className="mb-4 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            Netdata non raggiungibile per questo agente. Verifica che la porta 19999 sia aperta e NETDATA_* configurato.
            {error ? ` (${error})` : ''}
          </div>
        )}
        {loading && !chartData.length ? (
          <div className="skeleton h-48" />
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData}>
              <CartesianGrid {...chartGridProps} />
              <XAxis dataKey="t" hide />
              <YAxis domain={[0, 100]} {...chartAxisProps} width={36} />
              <Tooltip contentStyle={chartTooltipStyle} />
              {NETDATA_CHARTS.map((c) => (
                <Area
                  key={c.key}
                  type="monotone"
                  dataKey={c.key}
                  stroke={c.color}
                  fill={c.color}
                  fillOpacity={0.12}
                  name={c.label}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted">Nessuna serie temporale disponibile.</p>
        )}
      </div>
    </div>
  );
}

function NetdataPanelHeader({ agents, agentId, setAgentId, range, setRange }) {
  return (
    <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
      <p className="card-title mb-0">Serie temporali Netdata</p>
      <div className="flex flex-wrap gap-2">
        <select className="select text-sm" value={agentId} onChange={(e) => setAgentId(e.target.value)}>
          {agents.map((a) => (
            <option key={a.agentId} value={a.agentId}>{a.agentName}</option>
          ))}
        </select>
        <select className="select text-sm" value={range} onChange={(e) => setRange(e.target.value)}>
          {NETDATA_RANGES.map((r) => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function AgentMetricsCard({ agent, thresholds, staggerIndex }) {
  const [rtEnabled, setRtEnabled] = useState(false);
  const rtInterval = getRefreshInterval('realtime', 2500);

  useEffect(() => {
    const t = setTimeout(() => setRtEnabled(true), staggerIndex * FLEET_STAGGER_MS);
    return () => clearTimeout(t);
  }, [staggerIndex]);

  const {
    data: rt,
    error: rtError,
  } = useWazuh(`/metrics/realtime/${agent.agentId}`, {
    skip: !rtEnabled,
    refreshInterval: rtEnabled ? rtInterval : null,
  });

  const hasAlert = (agent.thresholdAlerts?.length || 0) > 0;
  const diskIo = rt?.diskMetric === 'io';
  const diskUnit = rt?.diskUnit || (diskIo ? 'KiB/s' : '%');

  const cpuVal = rt?.cpu ?? null;
  const ramVal = rt?.ram ?? null;
  const diskVal = rt?.disk ?? null;

  return (
    <div className={`card ${hasAlert ? 'border-danger' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <Link to={`/agents/${agent.agentId}`} className="font-semibold text-primary hover:text-accent">
            {agent.agentName}
          </Link>
          <p className="text-xs text-muted mt-1">{formatMetricsSource(agent.source, agent.scanTime)}</p>
          {rtEnabled && rt && (
            <p className="text-xs text-muted mt-0.5">
              Live: {rt.source === 'wazuh' ? 'Syscollector' : rt.source}
              {rt.partial ? ' · parziale' : ''}
            </p>
          )}
          {rtEnabled && rtError && (
            <p className="text-xs text-danger mt-0.5">Live: {String(rtError)}</p>
          )}
        </div>
        {hasAlert && (
          <span className="text-xs font-medium text-danger bg-[rgba(220,38,38,0.12)] px-2 py-1 rounded">
            {agent.thresholdAlerts.length} alert
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <ResourceMetricCard
          label="CPU"
          value={cpuVal != null ? cpuVal : agent.cpuPercent}
          threshold={thresholds?.cpu ?? 90}
        />
        <ResourceMetricCard
          label="RAM"
          value={ramVal != null ? ramVal : agent.ramPercent}
          threshold={thresholds?.ram ?? 90}
        />
        <ResourceMetricCard
          label={diskIo ? 'Disk I/O' : 'Disco (max)'}
          value={diskVal != null ? diskVal : agent.maxDiskPercent}
          threshold={thresholds?.disk ?? 85}
          unit={diskIo ? diskUnit : '%'}
          showBar={!diskIo}
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
          <p className="card-title">Trend recente (syscollector)</p>
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
      <PageHeader
        title="Metriche risorse"
        subtitle="Prestazioni live (Netdata) e capacità da syscollector per ogni endpoint"
      />

      <ThresholdAlertBanner alerts={alerts} />

      <NetdataTimeSeriesPanel agents={agents} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Agenti monitorati" value={summary.totalAgents} variant="info" loading={loading} />
        <KpiCard label="Soglie superate" value={summary.agentsOverThreshold} variant="warning" loading={loading} />
        <KpiCard label="Soglia CPU" value={`${thresholds.cpu}%`} variant="ok" loading={loading} />
        <KpiCard label="Soglia disco" value={`${thresholds.disk}%`} variant="ok" loading={loading} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {agents.map((agent, index) => (
          <AgentMetricsCard
            key={agent.agentId}
            agent={agent}
            thresholds={thresholds}
            staggerIndex={index}
          />
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
