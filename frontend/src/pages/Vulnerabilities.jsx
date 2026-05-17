import { useWazuh } from '../hooks/useWazuh';
import KpiCard from '../components/KpiCard';
import SeverityBadge from '../components/SeverityBadge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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
        <KpiCard label="Totale CVE" value={stats.total} loading={loading} />
        <KpiCard label="Critical" value={stats.critical} color="critical" loading={loading} />
        <KpiCard label="High" value={stats.high} color="warning" loading={loading} />
        <KpiCard label="Medium" value={stats.medium} color="accent" loading={loading} />
        <KpiCard label="Low" value={stats.low} color="safe" loading={loading} />
        <KpiCard label="Con fix" value={stats.withFix} color="safe" loading={loading} />
      </div>

      <div className="card">
        <h2 className="font-bold text-accent mb-4">CVE per agente</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" tick={{ fill: '#4a5568', fontSize: 10 }} />
            <YAxis tick={{ fill: '#4a5568', fontSize: 10 }} />
            <Tooltip contentStyle={{ background: '#0d1220', border: '1px solid #1a2540' }} />
            <Bar dataKey="count" fill="#ff3860" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted border-b border-border text-left">
              <th className="py-2 px-3">CVE</th>
              <th className="py-2 px-3">Agente</th>
              <th className="py-2 px-3">Pacchetto</th>
              <th className="py-2 px-3">Versione</th>
              <th className="py-2 px-3">Fix</th>
              <th className="py-2 px-3">CVSS</th>
              <th className="py-2 px-3">Severità</th>
            </tr>
          </thead>
          <tbody>
            {vulns
              .sort((a, b) => b.cvss - a.cvss)
              .map((v) => (
                <tr key={v.id} className="border-b border-border/30 hover:bg-border/20">
                  <td className="py-2 px-3">
                    <a
                      href={`https://nvd.nist.gov/vuln/detail/${v.cve}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:underline font-mono"
                    >
                      {v.cve}
                    </a>
                  </td>
                  <td className="py-2 px-3">{v.agentName}</td>
                  <td className="py-2 px-3">{v.package}</td>
                  <td className="py-2 px-3 font-mono">{v.version}</td>
                  <td className="py-2 px-3 font-mono text-safe">{v.fixVersion}</td>
                  <td className="py-2 px-3 font-mono font-bold">{v.cvss}</td>
                  <td className="py-2 px-3">
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
  );
}
