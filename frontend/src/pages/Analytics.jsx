import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useWazuh } from '../hooks/useWazuh';
import PageHeader from '../components/PageHeader';
import GrafanaPanel from '../components/GrafanaPanel';
import { buildAlertSeverityBars } from '../utils/dashboardHelpers';
import { chartTooltipStyle, chartAxisProps, chartGridProps } from '../utils/chartTheme';

const SEV_COLORS = {
  Critical: '#ef4444',
  Warning: '#f59e0b',
  Unknown: '#5a6278',
};

function fmtPct(value) {
  return value == null || Number.isNaN(value) ? '--' : `${Math.round(value)}%`;
}

export default function Analytics() {
  const { data: alertsData, loading: alertsLoading } = useWazuh('/alerts', {
    params: { limit: 500, page: 1 },
  });
  const { data: vulnData, loading: vulnLoading } = useWazuh('/vulnerabilities');
  const { data: complianceData, loading: complianceLoading } = useWazuh('/compliance', {
    params: { benchmark: 'cis' },
  });
  const { data: metricsData, loading: metricsLoading } = useWazuh('/metrics');

  const alerts = useMemo(() => {
    const d = alertsData;
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.data)) return d.data;
    return [];
  }, [alertsData]);

  const severityBars = useMemo(() => buildAlertSeverityBars(alerts), [alerts]);

  const topCve = useMemo(() => {
    const vulns = vulnData?.data || (Array.isArray(vulnData) ? vulnData : []);
    return [...vulns]
      .sort((a, b) => (b.cvss ?? 0) - (a.cvss ?? 0))
      .slice(0, 5);
  }, [vulnData]);

  const compliancePct = useMemo(() => {
    const rows = complianceData?.data || (Array.isArray(complianceData) ? complianceData : []);
    const scores = rows.map((r) => r.score).filter((s) => s > 0);
    if (!scores.length) return null;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }, [complianceData]);

  const avgMetrics = useMemo(() => {
    const agents = metricsData?.agents || [];
    const reachable = agents.filter((a) => a.reachable);
    if (!reachable.length) return { cpu: null, ram: null };
    const cpu =
      reachable.reduce((s, a) => s + (a.cpuPercent ?? 0), 0) / reachable.length;
    const ram =
      reachable.reduce((s, a) => s + (a.ramPercent ?? 0), 0) / reachable.length;
    return { cpu, ram };
  }, [metricsData]);

  const loading = alertsLoading || vulnLoading || complianceLoading || metricsLoading;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Analytics"
        subtitle="Severity, CVE, compliance, and resource averages"
      />

      <div className="grid grid-cols-12 gap-3">
        <GrafanaPanel title="Alert severity distribution" className="col-span-12 lg:col-span-6">
          {loading ? (
            <div className="skeleton h-[220px]" />
          ) : severityBars.length === 0 ? (
            <p className="text-center text-[var(--text-muted)] py-12 text-sm">--</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={severityBars}>
                <CartesianGrid {...chartGridProps} />
                <XAxis dataKey="name" {...chartAxisProps} />
                <YAxis {...chartAxisProps} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {severityBars.map((entry) => (
                    <Cell key={entry.name} fill={SEV_COLORS[entry.name]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </GrafanaPanel>

        <GrafanaPanel title="Compliance average" className="col-span-12 sm:col-span-6 lg:col-span-3">
          <p className="text-3xl font-bold font-mono text-[var(--text-primary)]">
            {fmtPct(compliancePct)}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-2">CIS benchmark agents</p>
        </GrafanaPanel>

        <GrafanaPanel title="Avg CPU / RAM" className="col-span-12 sm:col-span-6 lg:col-span-3">
          <p className="text-lg font-mono text-[var(--text-primary)]">
            CPU: {avgMetrics.cpu != null ? `${avgMetrics.cpu.toFixed(1)}%` : '--'}
          </p>
          <p className="text-lg font-mono text-[var(--text-primary)] mt-2">
            RAM: {avgMetrics.ram != null ? `${avgMetrics.ram.toFixed(1)}%` : '--'}
          </p>
        </GrafanaPanel>
      </div>

      <GrafanaPanel title="Top 5 CVE">
        {loading ? (
          <div className="skeleton h-32" />
        ) : topCve.length === 0 ? (
          <p className="text-center text-[var(--text-muted)] py-8 text-sm">--</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>CVE</th>
                  <th>Package</th>
                  <th>CVSS</th>
                  <th>Agent</th>
                </tr>
              </thead>
              <tbody>
                {topCve.map((v) => (
                  <tr key={v.id || `${v.cveId}-${v.agentId}`}>
                    <td className="font-mono text-sm">{v.id || v.cveId || '--'}</td>
                    <td>{v.package || '--'}</td>
                    <td className="font-mono">{v.cvss ?? '--'}</td>
                    <td>{v.agentName || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GrafanaPanel>
    </div>
  );
}
