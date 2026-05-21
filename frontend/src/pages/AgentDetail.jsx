import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useWazuh } from '../hooks/useWazuh';
import { getRefreshInterval } from '../hooks/useAutoRefresh';
import AlertTable from '../components/AlertTable';
import SeverityBadge from '../components/SeverityBadge';
import ThresholdAlertBanner from '../components/ThresholdAlertBanner';
import RealtimeMetricsPanel from '../components/RealtimeMetricsPanel';
import GaugeChart from '../components/GaugeChart';
import PageHeader from '../components/PageHeader';
import GrafanaPanel from '../components/GrafanaPanel';
import { useAI } from '../hooks/useAI';
import {
  formatBytes, formatUptime, formatDate, formatLoadAverage, formatMetricsSource,
} from '../utils/formatters';

const TABS = ['Overview', 'Risorse live', 'Processi', 'Software', 'Rete', 'Alert', 'Vulnerabilità', 'FIM', 'Compliance', 'AI Analysis'];

export default function AgentDetail() {
  const { id } = useParams();
  const [tab, setTab] = useState('Overview');
  const [analysis, setAnalysis] = useState('');
  const { analyzeAgent, loading: aiLoading } = useAI();
  const resourcesSyscollectorInterval = getRefreshInterval('agent-resources', 60000);
  const liveStatsInterval = getRefreshInterval('agent-resources', 15000);

  const { data: agent, loading } = useWazuh(`/agents/${id}`);
  const { data: liveStats, loading: liveStatsLoading } = useWazuh(`/agents/${id}/stats`, {
    skip: tab !== 'Risorse live',
    refreshInterval: tab === 'Risorse live' ? liveStatsInterval : null,
  });
  const { data: metricsPayload, loading: metricsLoading, refetch: refetchMetrics } = useWazuh('/metrics', {
    params: { agentId: id },
    refreshInterval: tab === 'Rete' ? resourcesSyscollectorInterval : null,
    skip: tab !== 'Rete',
  });
  const agentMetrics = metricsPayload?.agents?.[0];
  const stats = agentMetrics
    ? {
        disks: (agentMetrics.disks || []).map((d) => ({
          mount: d.mount,
          used: d.usedPercent,
          total: d.totalGb,
        })),
        network: agentMetrics.network,
        uptime: agentMetrics.uptimeSeconds,
        loadAverage: agentMetrics.loadAverage,
        scanTime: agentMetrics.scanTime,
        source: agentMetrics.source,
      }
    : null;
  const { data: processes } = useWazuh(`/agents/${id}/processes`, { skip: tab !== 'Processi' });
  const { data: alertsData } = useWazuh('/alerts', {
    params: { agentId: id, limit: 50 },
    skip: tab !== 'Alert',
  });
  const { data: vulnData } = useWazuh('/vulnerabilities', { skip: tab !== 'Vulnerabilità' });
  const { data: fimData } = useWazuh('/fim', { params: { agentId: id }, skip: tab !== 'FIM' });
  const { data: complianceData } = useWazuh('/compliance', { skip: tab !== 'Compliance' });

  const agentVulns = vulnData?.data?.filter((v) => v.agentId === id) || [];
  const agentCompliance = Array.isArray(complianceData)
    ? complianceData.find((c) => c.agentId === id)
    : null;

  const handleAnalyze = async () => {
    const result = await analyzeAgent(id);
    setAnalysis(result);
  };

  if (loading) return <div className="skeleton h-64 card" />;
  if (!agent) return <p className="text-[#ef4444] text-sm">Agente non trovato</p>;

  return (
    <div className="space-y-6">
      <PageHeader title={agent.name} subtitle={`${agent.ip} · ${agent.os}`} />

      <div className="flex flex-wrap gap-1 border-b border-[rgba(255,255,255,0.1)] pb-0 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-t-md text-sm font-medium transition-colors duration-150 whitespace-nowrap min-h-[44px] ${
              tab === t ? 'tab-active' : 'text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#334155]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              <p className="text-sm text-[#f1f5f9]">{v}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'Risorse live' && (
        <div className="space-y-6">
          {liveStatsLoading && !liveStats ? (
            <div className="card skeleton h-48" />
          ) : (
            <>
              {liveStats?.reachable !== false ? (
                <span
                  className="inline-block text-xs font-medium px-3 py-1 rounded"
                  style={{
                    background: '#00d4ff22',
                    color: '#00d4ff',
                    border: '1px solid #00d4ff44',
                  }}
                >
                  ⚡ Glances · real-time
                </span>
              ) : (
                <span
                  className="inline-block text-xs font-medium px-3 py-1 rounded text-[#94a3b8]"
                  style={{
                    background: 'rgba(148, 163, 184, 0.12)',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                  }}
                >
                  Metriche non disponibili
                </span>
              )}
              <div className="grid md:grid-cols-3 gap-6">
                <div className="card flex justify-center py-4">
                  <GaugeChart value={liveStats?.cpu?.percent} label="CPU" />
                </div>
                <div className="card flex justify-center py-4">
                  <GaugeChart value={liveStats?.ram?.percent} label="RAM" />
                </div>
                <div className="card flex justify-center py-4">
                  <GaugeChart value={liveStats?.disk?.percent} label="Disco" />
                </div>
              </div>
              <div className="card grid md:grid-cols-2 gap-4 text-sm text-[#94a3b8]">
                <p>
                  RX:{' '}
                  <span className="font-mono text-[#f1f5f9]">
                    {liveStats?.network?.recvKbps != null
                      ? `${liveStats.network.recvKbps} kbps`
                      : '--'}
                  </span>
                </p>
                <p>
                  TX:{' '}
                  <span className="font-mono text-[#f1f5f9]">
                    {liveStats?.network?.sentKbps != null
                      ? `${liveStats.network.sentKbps} kbps`
                      : '--'}
                  </span>
                </p>
                {liveStats?.ram?.usedMB != null && liveStats?.ram?.totalMB != null && (
                  <p className="md:col-span-2">
                    RAM:{' '}
                    <span className="font-mono text-[#f1f5f9]">
                      {liveStats.ram.usedMB} / {liveStats.ram.totalMB} MB
                    </span>
                  </p>
                )}
                {liveStats?.agentInfo?.version && (
                  <p className="md:col-span-2 text-xs text-[#64748b]">
                    Glances {liveStats.agentInfo.version}
                    {liveStats.agentInfo.cpuName ? ` · ${liveStats.agentInfo.cpuName}` : ''}
                  </p>
                )}
              </div>
              <RealtimeMetricsPanel agentId={id} enabled />
            </>
          )}
        </div>
      )}

      {tab === 'Processi' && (
        <div className="space-y-6">
          <div className="card p-0 overflow-hidden">
            <p className="card-title px-5 pt-5">Top processi</p>
            <div className="table-wrap border-0 border-t border-[rgba(255,255,255,0.1)] rounded-none">
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
                  {(processes || []).map((p) => (
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

      {tab === 'Software' && (
        <div className="grid md:grid-cols-2 gap-6">
          {[
            ['OS', agent.os],
            ['Kernel', agent.kernel],
            ['Architettura', agent.architecture],
            ['CPU', agent.cpuModel],
            ['RAM totale', `${agent.ramTotal} MB`],
            ['Gruppo', agent.group],
          ].map(([k, v]) => (
            <div key={k} className="card py-4">
              <p className="card-title mb-1">{k}</p>
              <p className="text-sm text-[#f1f5f9]">{v}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'Rete' && (
        <div className="space-y-6">
          {stats ? (
            <>
              <ThresholdAlertBanner alerts={agentMetrics?.thresholdAlerts || []} />
              <p className="text-xs text-[#64748b]">
                Fonte: {formatMetricsSource(stats.source, stats.scanTime)}
              </p>
              <div className="flex justify-end">
                <button type="button" className="btn-secondary text-sm" onClick={refetchMetrics}>
                  Aggiorna metriche rete
                </button>
              </div>
              <div className="card">
                <p className="card-title">Disk</p>
                {stats.disks?.map((d) => (
                  <div key={d.mount} className="mb-3">
                    <div className="flex justify-between text-xs text-[#94a3b8] mb-1">
                      <span className="font-mono">{d.mount}</span>
                      <span>{d.used}% / {d.total} GB</span>
                    </div>
                    <div className="h-1.5 bg-[#334155] rounded-full overflow-hidden">
                      <div className="h-full bg-[#f59e0b] transition-all duration-150" style={{ width: `${d.used}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="card grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-[#94a3b8]">
                <p>RX: <span className="font-mono text-[#f1f5f9]">{formatBytes(stats.network?.rx)}/s</span></p>
                <p>TX: <span className="font-mono text-[#f1f5f9]">{formatBytes(stats.network?.tx)}/s</span></p>
                <p>Uptime: <span className="font-mono text-[#f1f5f9]">{formatUptime(stats.uptime)}</span></p>
                <p>Load avg: <span className="font-mono text-[#f1f5f9]">{formatLoadAverage(stats.loadAverage)}</span></p>
              </div>
            </>
          ) : (
            <div className="card text-center py-8 text-[#94a3b8] text-sm">
              {metricsLoading ? 'Caricamento metriche...' : 'Metriche di rete non disponibili.'}
            </div>
          )}
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
                      <a href={`https://nvd.nist.gov/vuln/detail/${v.cve}`} target="_blank" rel="noreferrer" className="text-[#f59e0b] hover:underline font-mono text-xs">
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
                  <tr key={e.id} className={e.critical ? 'bg-red-500/10' : ''}>
                    <td className="text-xs text-[#94a3b8]">{formatDate(e.timestamp)}</td>
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
          <p className="text-2xl font-bold text-[#10b981] mb-4">{agentCompliance.score}%</p>
          <div className="h-2 bg-[#334155] rounded-full overflow-hidden mb-4">
            <div className="h-full bg-[#10b981] transition-all duration-150" style={{ width: `${agentCompliance.score}%` }} />
          </div>
          <div className="table-wrap">
            <table>
              <tbody>
                {agentCompliance.checks?.map((c) => (
                  <tr key={c.id}>
                    <td className="font-mono text-xs">{c.id}</td>
                    <td>{c.description}</td>
                    <td className={c.result === 'passed' ? 'text-[#10b981]' : 'text-[#ef4444]'}>{c.result}</td>
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
          {analysis && <pre className="whitespace-pre-wrap text-sm text-[#94a3b8] leading-relaxed">{analysis}</pre>}
        </div>
      )}
    </div>
  );
}
