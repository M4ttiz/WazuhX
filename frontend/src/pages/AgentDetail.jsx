import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useWazuh } from '../hooks/useWazuh';
import { getRefreshInterval } from '../hooks/useAutoRefresh';
import GaugeChart from '../components/GaugeChart';
import AlertTable from '../components/AlertTable';
import SeverityBadge from '../components/SeverityBadge';
import { useAI } from '../hooks/useAI';
import { formatBytes, formatUptime, formatDate } from '../utils/formatters';

const TABS = ['Overview', 'Risorse', 'Alert', 'Vulnerabilità', 'FIM', 'Compliance', 'AI Analysis'];

export default function AgentDetail() {
  const { id } = useParams();
  const [tab, setTab] = useState('Overview');
  const [analysis, setAnalysis] = useState('');
  const { analyzeAgent, loading: aiLoading } = useAI();
  const statsInterval = getRefreshInterval('agent-stats', 30000);

  const { data: agent, loading } = useWazuh(`/agents/${id}`);
  const { data: stats, refetch: refetchStats } = useWazuh(`/agents/${id}/stats`, {
    refreshInterval: tab === 'Risorse' ? statsInterval : null,
    skip: tab !== 'Risorse',
  });
  const { data: processes } = useWazuh(`/agents/${id}/processes`, { skip: tab !== 'Risorse' });
  const { data: alertsData } = useWazuh('/alerts', {
    params: { agentId: id, limit: 50 },
    skip: tab !== 'Alert',
  });
  const { data: vulnData } = useWazuh('/vulnerabilities', { skip: tab !== 'Vulnerabilità' });
  const { data: fimData } = useWazuh('/fim', { params: { agentId: id }, skip: tab !== 'FIM' });
  const { data: complianceData } = useWazuh('/compliance', { skip: tab !== 'Compliance' });

  const agentVulns = vulnData?.data?.filter((v) => v.agentId === id) || [];
  const agentCompliance = complianceData?.find((c) => c.agentId === id);

  const handleAnalyze = async () => {
    const result = await analyzeAgent(id);
    setAnalysis(result);
  };

  if (loading) return <div className="skeleton h-64 card" />;
  if (!agent) return <p className="text-danger text-sm">Agente non trovato</p>;

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-lg font-semibold text-primary">{agent.name}</h2>
        <p className="text-secondary text-sm font-mono mt-1">{agent.ip} · {agent.os}</p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border pb-0">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-t-md text-sm font-medium transition-colors duration-150 ${
              tab === t ? 'tab-active' : 'text-secondary hover:text-primary hover:bg-hover'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ['Hostname', agent.hostname],
            ['OS', agent.os],
            ['Kernel', agent.kernel],
            ['Architettura', agent.architecture],
            ['RAM totale', `${agent.ramTotal} MB`],
            ['CPU', agent.cpuModel],
            ['Gruppo', agent.group],
            ['Ultimo contatto', formatDate(agent.lastKeepAlive)],
          ].map(([k, v]) => (
            <div key={k} className="card py-4">
              <p className="card-title mb-1">{k}</p>
              <p className="text-sm text-primary">{v}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'Risorse' && stats && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button type="button" className="btn-secondary text-sm" onClick={refetchStats}>
              Aggiorna
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card flex justify-center">
              <GaugeChart value={stats.cpuUsage} label="CPU" />
            </div>
            <div className="card flex justify-center">
              <GaugeChart value={stats.ramUsage} label="RAM" />
            </div>
          </div>
          <div className="card">
            <p className="card-title">Disk</p>
            {stats.disks?.map((d) => (
              <div key={d.mount} className="mb-3">
                <div className="flex justify-between text-xs text-secondary mb-1">
                  <span className="font-mono">{d.mount}</span>
                  <span>{d.used}% / {d.total} GB</span>
                </div>
                <div className="h-1.5 bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-accent transition-all duration-150" style={{ width: `${d.used}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="card grid md:grid-cols-3 gap-4 text-sm text-secondary">
            <p>RX: <span className="font-mono text-primary">{formatBytes(stats.network?.rx)}/s</span></p>
            <p>TX: <span className="font-mono text-primary">{formatBytes(stats.network?.tx)}/s</span></p>
            <p>Uptime: <span className="font-mono text-primary">{formatUptime(stats.uptime)}</span></p>
          </div>
          <div className="card p-0 overflow-hidden">
            <p className="card-title px-5 pt-5">Top processi</p>
            <div className="table-wrap border-0 border-t border-border rounded-none">
              <table>
                <thead>
                  <tr>
                    <th>PID</th>
                    <th>Nome</th>
                    <th>CPU%</th>
                    <th>MEM</th>
                  </tr>
                </thead>
                <tbody>
                  {processes?.map((p) => (
                    <tr key={p.pid}>
                      <td className="font-mono text-xs">{p.pid}</td>
                      <td>{p.name}</td>
                      <td>{p.cpu}%</td>
                      <td className="font-mono text-xs">{p.memory}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'Alert' && (
        <div className="card p-0 overflow-hidden">
          <AlertTable alerts={alertsData?.data || []} />
        </div>
      )}

      {tab === 'Vulnerabilità' && (
        <div className="card p-0 overflow-hidden">
          <div className="table-wrap border-0 rounded-none">
            <table>
              <thead>
                <tr>
                  <th>CVE</th>
                  <th>CVSS</th>
                  <th>Severità</th>
                  <th>Pacchetto</th>
                </tr>
              </thead>
              <tbody>
                {agentVulns.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <a href={`https://nvd.nist.gov/vuln/detail/${v.cve}`} target="_blank" rel="noreferrer" className="text-accent hover:underline font-mono text-xs">
                        {v.cve}
                      </a>
                    </td>
                    <td className="font-mono">{v.cvss}</td>
                    <td><SeverityBadge label={v.severity} level={v.severity === 'critical' ? 15 : 8} /></td>
                    <td>{v.package}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'FIM' && (
        <div className="card p-0 overflow-hidden">
          <div className="table-wrap border-0 rounded-none">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Path</th>
                  <th>Tipo</th>
                </tr>
              </thead>
              <tbody>
                {(fimData || []).map((e) => (
                  <tr key={e.id} className={e.critical ? 'bg-[rgba(220,38,38,0.08)]' : ''}>
                    <td className="text-xs text-secondary">{formatDate(e.timestamp)}</td>
                    <td className="font-mono text-xs">{e.path}</td>
                    <td>{e.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Compliance' && agentCompliance && (
        <div className="card">
          <p className="text-2xl font-bold text-success mb-4">{agentCompliance.score}%</p>
          <div className="h-2 bg-border rounded-full overflow-hidden mb-4">
            <div className="h-full bg-success transition-all duration-150" style={{ width: `${agentCompliance.score}%` }} />
          </div>
          <div className="table-wrap">
            <table>
              <tbody>
                {agentCompliance.checks?.map((c) => (
                  <tr key={c.id}>
                    <td className="font-mono text-xs">{c.id}</td>
                    <td>{c.description}</td>
                    <td className={c.result === 'passed' ? 'text-success' : 'text-danger'}>{c.result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'AI Analysis' && (
        <div className="card">
          <button type="button" className="btn-primary mb-4" onClick={handleAnalyze} disabled={aiLoading}>
            {aiLoading ? 'Analisi in corso...' : 'Analizza endpoint'}
          </button>
          {analysis && <pre className="whitespace-pre-wrap text-sm text-secondary leading-relaxed">{analysis}</pre>}
        </div>
      )}
    </div>
  );
}
