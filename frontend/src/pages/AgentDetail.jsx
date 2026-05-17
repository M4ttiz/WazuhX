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
  if (!agent) return <p className="text-critical">Agente non trovato</p>;

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-bold">{agent.name}</h2>
        <p className="text-muted font-mono">{agent.ip} · {agent.os}</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded text-sm font-semibold transition-all duration-300 ${
              tab === t ? 'bg-accent/20 text-accent' : 'text-muted hover:text-text'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="grid md:grid-cols-2 gap-4">
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
            <div key={k} className="card">
              <p className="text-muted text-xs uppercase">{k}</p>
              <p className="font-mono">{v}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'Risorse' && stats && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button type="button" className="btn-ghost text-sm" onClick={refetchStats}>↻ Aggiorna</button>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card flex justify-center">
              <GaugeChart value={stats.cpuUsage} label="CPU" color="#00d4ff" />
            </div>
            <div className="card flex justify-center">
              <GaugeChart value={stats.ramUsage} label="RAM" color="#00ff88" />
            </div>
          </div>
          <div className="card">
            <h3 className="font-bold mb-3">Disk</h3>
            {stats.disks?.map((d) => (
              <div key={d.mount} className="mb-2">
                <div className="flex justify-between text-sm font-mono mb-1">
                  <span>{d.mount}</span>
                  <span>{d.used}% / {d.total} GB</span>
                </div>
                <div className="h-2 bg-border rounded overflow-hidden">
                  <div className="h-full bg-accent transition-all duration-300" style={{ width: `${d.used}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="card grid md:grid-cols-2 gap-4">
            <p className="font-mono text-sm">RX: {formatBytes(stats.network?.rx)}/s</p>
            <p className="font-mono text-sm">TX: {formatBytes(stats.network?.tx)}/s</p>
            <p className="font-mono text-sm">Uptime: {formatUptime(stats.uptime)}</p>
          </div>
          <div className="card">
            <h3 className="font-bold mb-3">Top processi</h3>
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="text-muted">
                  <th className="text-left py-1">PID</th>
                  <th className="text-left">Nome</th>
                  <th>CPU%</th>
                  <th>MEM</th>
                </tr>
              </thead>
              <tbody>
                {processes?.map((p) => (
                  <tr key={p.pid} className="border-t border-border/30">
                    <td className="py-1">{p.pid}</td>
                    <td>{p.name}</td>
                    <td>{p.cpu}%</td>
                    <td>{p.memory}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Alert' && <AlertTable alerts={alertsData?.data || []} />}
      {tab === 'Vulnerabilità' && (
        <table className="w-full card text-sm">
          <thead>
            <tr className="text-muted border-b border-border">
              <th className="text-left py-2">CVE</th>
              <th>CVSS</th>
              <th>Severità</th>
              <th>Pacchetto</th>
            </tr>
          </thead>
          <tbody>
            {agentVulns.map((v) => (
              <tr key={v.id} className="border-b border-border/30">
                <td className="py-2">
                  <a href={`https://nvd.nist.gov/vuln/detail/${v.cve}`} target="_blank" rel="noreferrer" className="text-accent hover:underline">
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
      )}
      {tab === 'FIM' && (
        <table className="w-full card text-sm font-mono">
          <thead>
            <tr className="text-muted">
              <th className="text-left py-2">Time</th>
              <th>Path</th>
              <th>Tipo</th>
            </tr>
          </thead>
          <tbody>
            {(fimData || []).map((e) => (
              <tr key={e.id} className={e.critical ? 'text-critical' : ''}>
                <td className="py-2">{formatDate(e.timestamp)}</td>
                <td>{e.path}</td>
                <td>{e.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {tab === 'Compliance' && agentCompliance && (
        <div className="card">
          <p className="text-2xl font-mono text-safe mb-4">{agentCompliance.score}%</p>
          <div className="h-3 bg-border rounded overflow-hidden mb-4">
            <div className="h-full bg-safe transition-all duration-300" style={{ width: `${agentCompliance.score}%` }} />
          </div>
          <table className="w-full text-sm">
            <tbody>
              {agentCompliance.checks?.map((c) => (
                <tr key={c.id} className="border-t border-border/30">
                  <td className="py-2 font-mono">{c.id}</td>
                  <td>{c.description}</td>
                  <td className={c.result === 'passed' ? 'text-safe' : 'text-critical'}>{c.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab === 'AI Analysis' && (
        <div className="card">
          <button type="button" className="btn-primary mb-4" onClick={handleAnalyze} disabled={aiLoading}>
            {aiLoading ? 'Analisi in corso...' : 'Analizza endpoint'}
          </button>
          {analysis && <pre className="whitespace-pre-wrap text-sm">{analysis}</pre>}
        </div>
      )}
    </div>
  );
}
