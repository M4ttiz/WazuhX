import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { AlertTriangle, Cpu, HardDrive, ShieldAlert, TrendingUp } from 'lucide-react';
import { useWazuh } from '../hooks/useWazuh';
import { getRefreshInterval } from '../hooks/useAutoRefresh';
import EmptyState from '../components/EmptyState';
import GrafanaPanel from '../components/GrafanaPanel';
import DataTable from '../components/dashboard/DataTable';
import {
  buildSeverityDistribution,
  getTopCVEs,
  computeAverageMetrics,
} from '../utils/dashboardHelpers';
import { chartTooltipStyle, chartAxisProps, chartGridProps } from '../utils/chartTheme';

export default function Analytics() {
  const interval = getRefreshInterval('analytics', 30000);

  const { data: alertsData, loading: alertsLoading, error: alertsError } = useWazuh('/alerts', {
    refreshInterval: interval,
  });
  const { data: cveData, loading: cveLoading } = useWazuh('/cve', {
    refreshInterval: interval,
  });
  const { data: complianceData, loading: compLoading } = useWazuh('/compliance', {
    refreshInterval: interval,
  });
  const { data: agentsData, loading: agentsLoading } = useWazuh('/agents', {
    refreshInterval: interval,
  });

  const alerts = useMemo(() => {
    if (Array.isArray(alertsData)) return alertsData;
    if (alertsData?.data && Array.isArray(alertsData.data)) return alertsData.data;
    return [];
  }, [alertsData]);

  const cves = useMemo(() => {
    if (Array.isArray(cveData)) return cveData;
    if (cveData?.data && Array.isArray(cveData.data)) return cveData.data;
    return [];
  }, [cveData]);

  const agents = useMemo(() => {
    if (Array.isArray(agentsData)) return agentsData;
    return [];
  }, [agentsData]);

  const severityDist = useMemo(() => buildSeverityDistribution(alerts), [alerts]);
  const topCves = useMemo(() => getTopCVEs(cves, 5), [cves]);
  const metrics = useMemo(() => computeAverageMetrics(agents), [agents]);

  const compliancePercent = useMemo(() => {
    if (!complianceData) return '--';
    if (typeof complianceData.score === 'number') return `${complianceData.score}%`;
    if (typeof complianceData.percentage === 'number') return `${complianceData.percentage}%`;
    if (complianceData?.data?.score != null) return `${complianceData.data.score}%`;
    return '--';
  }, [complianceData]);

  const pageLoading = alertsLoading || cveLoading || compLoading || agentsLoading;

  if (alertsError && !alerts.length) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Cannot load Analytics"
        message={alertsError}
      />
    );
  }

  const cveColumns = [
    { key: 'id', label: 'CVE ID', className: 'font-mono text-sm text-[#00A8FF]' },
    {
      key: 'severity',
      label: 'Severity',
      render: (row) => {
        const score = row.cvss ?? row.score ?? 0;
        let color = '#10B981';
        let label = 'Low';
        if (score >= 9) { color = '#EF4444'; label = 'Critical'; }
        else if (score >= 7) { color = '#F59E0B'; label = 'High'; }
        else if (score >= 4) { color = '#00A8FF'; label = 'Medium'; }
        return (
          <span
            className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full border"
            style={{
              color,
              backgroundColor: `${color}20`,
              borderColor: `${color}50`,
            }}
          >
            {label} ({score})
          </span>
        );
      },
    },
    {
      key: 'name',
      label: 'Name',
      className: 'max-w-xs truncate text-sm',
      render: (row) => row.name || row.title || row.cve || row.id || '--',
    },
    {
      key: 'affected',
      label: 'Affected Hosts',
      className: 'font-mono text-sm',
      render: (row) => row.affectedHosts ?? row.agents?.length ?? row.count ?? '--',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Analytics</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Statistiche, distribuzioni e overview compliance
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card border-l-[3px] border-l-[#EF4444]">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert size={16} className="text-[#EF4444]" />
            <span className="text-xs text-[#8B92A8] uppercase tracking-wide font-semibold">Compliance</span>
          </div>
          {pageLoading ? (
            <div className="skeleton h-8 w-20 rounded" />
          ) : (
            <p className="text-2xl font-bold text-[#E0E4F0]">{compliancePercent}</p>
          )}
        </div>

        <div className="card border-l-[3px] border-l-[#00A8FF]">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-[#00A8FF]" />
            <span className="text-xs text-[#8B92A8] uppercase tracking-wide font-semibold">Total Alerts</span>
          </div>
          {pageLoading ? (
            <div className="skeleton h-8 w-20 rounded" />
          ) : (
            <p className="text-2xl font-bold text-[#E0E4F0]">{alerts.length}</p>
          )}
        </div>

        <div className="card border-l-[3px] border-l-[#10B981]">
          <div className="flex items-center gap-2 mb-2">
            <Cpu size={16} className="text-[#10B981]" />
            <span className="text-xs text-[#8B92A8] uppercase tracking-wide font-semibold">Avg CPU</span>
          </div>
          {pageLoading ? (
            <div className="skeleton h-8 w-20 rounded" />
          ) : (
            <p className="text-2xl font-bold text-[#E0E4F0]">{metrics.avgCpu}</p>
          )}
        </div>

        <div className="card border-l-[3px] border-l-[#F59E0B]">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive size={16} className="text-[#F59E0B]" />
            <span className="text-xs text-[#8B92A8] uppercase tracking-wide font-semibold">Avg RAM</span>
          </div>
          {pageLoading ? (
            <div className="skeleton h-8 w-20 rounded" />
          ) : (
            <p className="text-2xl font-bold text-[#E0E4F0]">{metrics.avgRam}</p>
          )}
        </div>
      </div>

      {/* Severity distribution bar chart */}
      <GrafanaPanel title="Alert Severity Distribution">
        {pageLoading ? (
          <div className="skeleton h-[260px] w-full rounded-md" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={severityDist} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid {...chartGridProps} />
              <XAxis dataKey="name" {...chartAxisProps} />
              <YAxis {...chartAxisProps} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
                {severityDist.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </GrafanaPanel>

      {/* Top 5 CVE */}
      <GrafanaPanel title="Top 5 CVE">
        {cveLoading ? (
          <div className="skeleton h-48 w-full rounded-md" />
        ) : topCves.length > 0 ? (
          <DataTable
            columns={cveColumns}
            rows={topCves.map((c, i) => ({ ...c, id: c.cve || c.id || i }))}
            emptyMessage="No CVE data available"
          />
        ) : (
          <p className="text-center text-[var(--text-muted)] py-8 text-sm">--</p>
        )}
      </GrafanaPanel>
    </div>
  );
}
