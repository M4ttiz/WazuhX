import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Server, AlertTriangle, Shield, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import { useWazuh } from '../hooks/useWazuh';
import { getRefreshInterval } from '../hooks/useAutoRefresh';
import { useDataSource } from '../context/DataSourceContext';
import KpiCard from '../components/KpiCard';
import MitreHeatmap from '../components/MitreHeatmap';
import SeverityBadge from '../components/SeverityBadge';
import EmptyState from '../components/EmptyState';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, CartesianGrid,
} from 'recharts';
import { formatDate } from '../utils/formatters';
import { SEVERITY_COLORS, chartTooltipStyle, chartAxisProps, chartGridProps } from '../utils/chartTheme';

export default function Dashboard() {
  const interval = getRefreshInterval('dashboard', 15000);
  const { data, loading, error } = useWazuh('/overview', { refreshInterval: interval });
  const { wazuhConnected, isMock } = useDataSource();

  const donutData = useMemo(
    () => (data?.severityDist ? Object.entries(data.severityDist).map(([name, value]) => ({ name, value })) : []),
    [data?.severityDist]
  );

  if (error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Impossibile caricare la dashboard"
        message={error}
      />
    );
  }

  if (!data && loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-10 w-48 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <KpiCard key={i} loading hero />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card skeleton h-[280px]" />
          <div className="card skeleton h-[280px]" />
        </div>
      </div>
    );
  }

  const { kpis, severityTrend, topRules, mitreHeatmap, recentActivity, hasCriticalIncident } = data || {};
  const connected = wazuhConnected && !isMock;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#f1f5f9]">Cruscotto SOC</h1>
          <p className="text-sm text-[#94a3b8] mt-1">Panoramica operativa della postura di sicurezza</p>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          hero
          label="Agenti attivi"
          value={kpis?.agentsOnline}
          sub={`${kpis?.agentsOffline ?? 0} offline`}
          trend="+2%"
          variant="ok"
          icon={Server}
          loading={loading}
        />
        <KpiCard
          hero
          label="Alert critici"
          value={kpis?.criticalAlerts}
          trend={kpis?.criticalAlerts > 0 ? '+12%' : '-5%'}
          variant="critical"
          icon={AlertTriangle}
          loading={loading}
        />
        <KpiCard
          hero
          label="Vulnerabilità"
          value={kpis?.totalCve}
          variant="warning"
          icon={Shield}
          loading={loading}
        />
        <KpiCard
          hero
          label="Compliance media"
          value={`${kpis?.avgCompliance ?? 0}%`}
          trend="+3%"
          variant="ok"
          icon={CheckCircle}
          loading={loading}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <p className="card-title">Trend severità (7 giorni)</p>
          <ResponsiveContainer width="100%" height={280} className="h-[200px] lg:h-[300px] min-h-[200px]">
            <AreaChart data={severityTrend || []}>
              <defs>
                <linearGradient id="gradCritical" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...chartGridProps} />
              <XAxis dataKey="date" {...chartAxisProps} />
              <YAxis {...chartAxisProps} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Area type="monotone" dataKey="critical" stackId="1" stroke={SEVERITY_COLORS.critical} fill="url(#gradCritical)" />
              <Area type="monotone" dataKey="high" stackId="1" stroke={SEVERITY_COLORS.high} fill={SEVERITY_COLORS.high} fillOpacity={0.35} />
              <Area type="monotone" dataKey="medium" stackId="1" stroke={SEVERITY_COLORS.medium} fill={SEVERITY_COLORS.medium} fillOpacity={0.3} />
              <Area type="monotone" dataKey="low" stackId="1" stroke={SEVERITY_COLORS.low} fill={SEVERITY_COLORS.low} fillOpacity={0.25} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <p className="card-title">Distribuzione severità</p>
          <ResponsiveContainer width="100%" height={280} className="h-[200px] lg:h-[300px] min-h-[200px]">
            <PieChart>
              <Pie
                data={donutData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {donutData.map((entry) => (
                  <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] || '#3b82f6'} />
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
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topRules || []} layout="vertical">
              <CartesianGrid {...chartGridProps} />
              <XAxis type="number" {...chartAxisProps} />
              <YAxis type="category" dataKey="id" width={50} {...chartAxisProps} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <p className="card-title">MITRE ATT&CK</p>
          <MitreHeatmap data={mitreHeatmap || []} />
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <p className="card-title mb-0">Ultimi alert</p>
          <Link to="/alerts" className="text-sm text-[#f59e0b] hover:underline font-medium">
            Vedi tutti →
          </Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Severità</th>
                <th>Regola</th>
                <th>Agente</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {(recentActivity || []).slice(0, 8).map((a) => (
                <tr key={a.id}>
                  <td>
                    <SeverityBadge level={a.severity} label={a.severityLabel} />
                  </td>
                  <td className="max-w-xs truncate">{a.ruleDescription || a.ruleId}</td>
                  <td>{a.agentName || a.agentId}</td>
                  <td className="text-[#94a3b8]">{formatDate(a.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!recentActivity || recentActivity.length === 0) && (
            <p className="text-center text-[#94a3b8] py-8 text-sm">Nessun alert recente</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Alert totali" value={kpis?.totalAlerts} variant="info" loading={loading} />
        <KpiCard label="Minacce bloccate" value={kpis?.threatsBlocked?.toLocaleString()} variant="info" loading={loading} />
        <KpiCard label="Compromessi" value={kpis?.agentsCompromised} variant="critical" loading={loading} />
        <KpiCard label="Endpoint totali" value={(kpis?.agentsOnline || 0) + (kpis?.agentsOffline || 0)} variant="accent" loading={loading} />
      </div>
    </div>
  );
}

