import { useWazuh } from '../hooks/useWazuh';
import { getRefreshInterval } from '../hooks/useAutoRefresh';
import KpiCard from '../components/KpiCard';
import MitreHeatmap from '../components/MitreHeatmap';
import SeverityBadge from '../components/SeverityBadge';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, CartesianGrid,
} from 'recharts';
import { formatDate } from '../utils/formatters';
import { SEVERITY_COLORS, chartTooltipStyle, chartAxisProps, chartGridProps } from '../utils/chartTheme';

export default function Dashboard() {
  const interval = getRefreshInterval('dashboard', 15000);
  const { data, loading } = useWazuh('/overview', { refreshInterval: interval });

  if (!data && loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => <KpiCard key={i} loading />)}
      </div>
    );
  }

  const { kpis, severityTrend, severityDist, topRules, mitreHeatmap, recentActivity, hasCriticalIncident } = data || {};

  const donutData = severityDist
    ? Object.entries(severityDist).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="space-y-6">
      {hasCriticalIncident && (
        <div className="banner-critical text-center">
          Incidenti critici attivi — richiede attenzione immediata
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Alert totali" value={kpis?.totalAlerts} variant="info" loading={loading} />
        <KpiCard label="Critical attivi" value={kpis?.criticalAlerts} variant="critical" loading={loading} />
        <KpiCard label="Endpoint online" value={kpis?.agentsOnline} sub={`${kpis?.agentsOffline} offline`} variant="ok" loading={loading} />
        <KpiCard label="Compromessi" value={kpis?.agentsCompromised} variant="critical" loading={loading} />
        <KpiCard label="Minacce bloccate" value={kpis?.threatsBlocked?.toLocaleString()} variant="info" loading={loading} />
        <KpiCard label="CVE totali" value={kpis?.totalCve} variant="warning" loading={loading} />
        <KpiCard label="Compliance media" value={`${kpis?.avgCompliance}%`} variant="ok" loading={loading} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <p className="card-title">Trend alert (7 giorni)</p>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={severityTrend}>
              <CartesianGrid {...chartGridProps} />
              <XAxis dataKey="date" {...chartAxisProps} />
              <YAxis {...chartAxisProps} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Area type="monotone" dataKey="critical" stackId="1" stroke={SEVERITY_COLORS.critical} fill={SEVERITY_COLORS.critical} fillOpacity={0.5} />
              <Area type="monotone" dataKey="high" stackId="1" stroke={SEVERITY_COLORS.high} fill={SEVERITY_COLORS.high} fillOpacity={0.4} />
              <Area type="monotone" dataKey="medium" stackId="1" stroke={SEVERITY_COLORS.medium} fill={SEVERITY_COLORS.medium} fillOpacity={0.35} />
              <Area type="monotone" dataKey="low" stackId="1" stroke={SEVERITY_COLORS.low} fill={SEVERITY_COLORS.low} fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <p className="card-title">Distribuzione severità</p>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                {donutData.map((entry) => (
                  <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] || '#2563eb'} />
                ))}
              </Pie>
              <Tooltip contentStyle={chartTooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <p className="card-title">Top 10 regole</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topRules} layout="vertical">
              <CartesianGrid {...chartGridProps} />
              <XAxis type="number" {...chartAxisProps} />
              <YAxis type="category" dataKey="id" width={50} {...chartAxisProps} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <p className="card-title">Activity feed</p>
          <div className="space-y-1 max-h-[280px] overflow-y-auto">
            {recentActivity?.map((a) => (
              <div key={a.id} className="flex items-center gap-3 py-2 border-b border-border-subtle text-sm">
                <SeverityBadge level={a.severity} label={a.severityLabel} />
                <span className="flex-1 truncate text-secondary">{a.description}</span>
                <span className="text-muted text-xs">{formatDate(a.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <p className="card-title">MITRE ATT&CK Heatmap</p>
        <MitreHeatmap data={mitreHeatmap} />
      </div>
    </div>
  );
}
