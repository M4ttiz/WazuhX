import { useWazuh } from '../hooks/useWazuh';
import { getRefreshInterval } from '../hooks/useAutoRefresh';
import KpiCard from '../components/KpiCard';
import MitreHeatmap from '../components/MitreHeatmap';
import SeverityBadge from '../components/SeverityBadge';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import { formatDate } from '../utils/formatters';

const COLORS = { critical: '#ff3860', high: '#ffd60a', medium: '#00d4ff', low: '#00ff88' };

export default function Dashboard() {
  const interval = getRefreshInterval('dashboard', 15000);
  const { data, loading, refetch } = useWazuh('/overview', { refreshInterval: interval });

  if (!data && loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        <div className="bg-critical/20 border border-critical text-critical px-4 py-3 rounded-lg blink-critical font-bold text-center">
          ⚠ INCIDENTI CRITICI ATTIVI — Richiede attenzione immediata
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Alert totali" value={kpis?.totalAlerts} color="accent" loading={loading} />
        <KpiCard label="Critical attivi" value={kpis?.criticalAlerts} color="critical" loading={loading} />
        <KpiCard label="Endpoint online" value={kpis?.agentsOnline} sub={`${kpis?.agentsOffline} offline`} color="safe" loading={loading} />
        <KpiCard label="Compromessi" value={kpis?.agentsCompromised} color="critical" loading={loading} />
        <KpiCard label="Minacce bloccate" value={kpis?.threatsBlocked?.toLocaleString()} color="accent" loading={loading} />
        <KpiCard label="CVE totali" value={kpis?.totalCve} color="warning" loading={loading} />
        <KpiCard label="Compliance media" value={`${kpis?.avgCompliance}%`} color="safe" loading={loading} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <h2 className="font-bold text-accent mb-4">Trend alert (7 giorni)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={severityTrend}>
              <XAxis dataKey="date" tick={{ fill: '#4a5568', fontSize: 10 }} />
              <YAxis tick={{ fill: '#4a5568', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#0d1220', border: '1px solid #1a2540' }} />
              <Area type="monotone" dataKey="critical" stackId="1" stroke={COLORS.critical} fill={COLORS.critical} fillOpacity={0.6} />
              <Area type="monotone" dataKey="high" stackId="1" stroke={COLORS.high} fill={COLORS.high} fillOpacity={0.5} />
              <Area type="monotone" dataKey="medium" stackId="1" stroke={COLORS.medium} fill={COLORS.medium} fillOpacity={0.4} />
              <Area type="monotone" dataKey="low" stackId="1" stroke={COLORS.low} fill={COLORS.low} fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="font-bold text-accent mb-4">Distribuzione severità</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                {donutData.map((entry) => (
                  <Cell key={entry.name} fill={COLORS[entry.name] || '#00d4ff'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#0d1220', border: '1px solid #1a2540' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-bold text-accent mb-4">Top 10 regole</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topRules} layout="vertical">
              <XAxis type="number" tick={{ fill: '#4a5568', fontSize: 10 }} />
              <YAxis type="category" dataKey="id" width={50} tick={{ fill: '#4a5568', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#0d1220', border: '1px solid #1a2540' }} />
              <Bar dataKey="count" fill="#00d4ff" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="font-bold text-accent mb-4">Activity feed</h2>
          <div className="space-y-2 max-h-[280px] overflow-y-auto">
            {recentActivity?.map((a) => (
              <div key={a.id} className="flex items-center gap-3 py-2 border-b border-border/30 text-sm">
                <SeverityBadge level={a.severity} label={a.severityLabel} />
                <span className="flex-1 truncate">{a.description}</span>
                <span className="text-muted font-mono text-xs">{formatDate(a.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="font-bold text-accent mb-4">MITRE ATT&CK Heatmap</h2>
        <MitreHeatmap data={mitreHeatmap} />
      </div>
    </div>
  );
}
