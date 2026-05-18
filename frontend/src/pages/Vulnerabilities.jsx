import { useWazuh } from '../hooks/useWazuh';
import KpiCard from '../components/KpiCard';
import SeverityBadge from '../components/SeverityBadge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { chartTooltipStyle, chartAxisProps, chartGridProps } from '../utils/chartTheme';

export default function Vulnerabilities() {
  const { data, loading } = useWazuh('/vulnerabilities');
  const vulns = data?.data || [];
  const stats = data?.stats || {};

  const byAgent = {};
  vulns.forEach((v) => {
    byAgent[v.agentName] = (byAgent[v.agentName] || 0) + 1;
  });
  const chartData = Object.entries(byAgent)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard label="Totale CVE" value={stats.total} variant="info" loading={loading} />
        <KpiCard label="Critical" value={stats.critical} variant="critical" loading={loading} />
        <KpiCard label="High" value={stats.high} variant="warning" loading={loading} />
        <KpiCard label="Medium" value={stats.medium} variant="accent" loading={loading} />
        <KpiCard label="Low" value={stats.low} variant="ok" loading={loading} />
        <KpiCard label="Con fix" value={stats.withFix} variant="ok" loading={loading} />
      </div>

      <div className="card">
        <p className="card-title">CVE per agente</p>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid {...chartGridProps} />
            <XAxis dataKey="name" {...chartAxisProps} />
            <YAxis {...chartAxisProps} />
            <Tooltip contentStyle={chartTooltipStyle} />
            <Bar dataKey="count" fill="#dc2626" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="table-wrap border-0 rounded-none">
          <table>
            <thead>
              <tr>
                <th>CVE</th>
                <th>Agente</th>
                <th>Pacchetto</th>
                <th>Versione</th>
                <th>Fix</th>
                <th>CVSS</th>
                <th>Severità</th>
              </tr>
            </thead>
            <tbody>
              {vulns
                .sort((a, b) => b.cvss - a.cvss)
                .map((v) => (
                  <tr key={v.id}>
                    <td>
                      <a
                        href={`https://nvd.nist.gov/vuln/detail/${v.cve}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent hover:underline font-mono text-xs"
                      >
                        {v.cve}
                      </a>
                    </td>
                    <td>{v.agentName}</td>
                    <td>{v.package}</td>
                    <td className="font-mono text-xs">{v.version}</td>
                    <td className="font-mono text-xs text-success">{v.fixVersion}</td>
                    <td className="font-mono font-semibold">{v.cvss}</td>
                    <td>
                      <SeverityBadge
                        label={v.severity}
                        level={v.severity === 'critical' ? 15 : v.severity === 'high' ? 10 : 5}
                      />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
