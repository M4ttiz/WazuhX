import { useState, useMemo, Fragment } from 'react';
import { useWazuh } from '../hooks/useWazuh';
import PageHeader from '../components/PageHeader';
import GrafanaPanel from '../components/GrafanaPanel';
import StatusTabs from '../components/management/StatusTabs';
import BulkActionBar from '../components/management/BulkActionBar';
import { apiDownload } from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useLocalEntityStatus } from '../hooks/useLocalEntityStatus';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts';
import { chartTooltipStyle, SEVERITY_COLORS } from '../utils/chartTheme';

const BENCHMARKS = [
  { id: 'cis', label: 'CIS' },
  { id: 'pci', label: 'PCI-DSS' },
  { id: 'gdpr', label: 'GDPR' },
  { id: 'hipaa', label: 'HIPAA' },
  { id: 'nist', label: 'NIST' },
];

const COMPLIANCE_TABS = [
  { id: 'all', label: 'Tutti' },
  { id: 'compliant', label: 'Conformi' },
  { id: 'non-compliant', label: 'Non conformi' },
  { id: 'in-review', label: 'In revisione' },
];

export default function Compliance() {
  const [benchmark, setBenchmark] = useState('cis');
  const [statusTab, setStatusTab] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const [expanded, setExpanded] = useState(null);
  const [resultFilter, setResultFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [reqFilter, setReqFilter] = useState('');
  const { toast } = useToast();
  const { data, loading } = useWazuh('/compliance', { params: { benchmark } });
  const statusApi = useLocalEntityStatus('wazuhx-compliance-status', 'compliant');

  const allChecks = useMemo(() => {
    const rows = [];
    (data || []).forEach((agent) => {
      (agent.checks || []).forEach((c) => {
        rows.push({
          ...c,
          agentId: agent.agentId,
          agentName: agent.agentName,
          agentScore: agent.score,
          checkKey: `${agent.agentId}-${c.id}`,
        });
      });
    });
    return rows;
  }, [data]);

  const filteredChecks = useMemo(() => {
    let rows = allChecks.filter((item) => {
      const st = statusApi.getStatus(item.checkKey);
      if (statusTab === 'all') return true;
      return st === statusTab;
    });
    if (resultFilter) rows = rows.filter((c) => c.result === resultFilter);
    if (agentFilter) rows = rows.filter((c) => c.agentName === agentFilter);
    if (reqFilter) {
      const q = reqFilter.toLowerCase();
      rows = rows.filter((c) => c.id?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q));
    }
    return rows;
  }, [allChecks, statusTab, statusApi, resultFilter, agentFilter, reqFilter]);

  const donutData = useMemo(() => {
    const passed = filteredChecks.filter((c) => c.result === 'passed').length;
    const failed = filteredChecks.filter((c) => c.result === 'failed').length;
    return [
      { name: 'passed', value: passed },
      { name: 'failed', value: failed },
    ].filter((d) => d.value > 0);
  }, [filteredChecks]);

  const radarData = (data || []).map((c) => ({
    agent: c.agentName.replace('endpoint-', ''),
    score: c.score,
  }));

  const agents = useMemo(() => [...new Set(allChecks.map((c) => c.agentName))].sort(), [allChecks]);

  const handleExportPdf = async () => {
    try {
      await apiDownload('/reports/generate', {
        format: 'html',
        period: 'Compliance Report',
        sections: ['compliance'],
        language: 'it',
      });
      toast('Report scaricato', 'success');
    } catch {
      toast('Errore export report', 'error');
    }
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filteredChecks.length) setSelected(new Set());
    else setSelected(new Set(filteredChecks.map((c) => c.checkKey)));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance"
        subtitle="Security Configuration Assessment — benchmark CIS, PCI-DSS, GDPR e altri"
      />

      <ComplianceToolbar
        benchmark={benchmark}
        setBenchmark={setBenchmark}
        onExport={handleExportPdf}
        resultFilter={resultFilter}
        setResultFilter={setResultFilter}
        agentFilter={agentFilter}
        setAgentFilter={setAgentFilter}
        reqFilter={reqFilter}
        setReqFilter={setReqFilter}
        agents={agents}
      />

      <StatusTabs active={statusTab} onChange={setStatusTab} tabs={COMPLIANCE_TABS} />

      <BulkActionBar
        selectedCount={selected.size}
        onMarkSeen={() => statusApi.bulkSetStatus([...selected], 'compliant')}
        onDismiss={() => statusApi.bulkSetStatus([...selected], 'non-compliant')}
        onDelete={() => {
          statusApi.bulkSetStatus([...selected], 'in-review');
          setSelected(new Set());
        }}
        seenLabel="Segna conforme"
        dismissLabel="Non conforme"
      />

      <div className="grid grid-cols-12 gap-3">
        <GrafanaPanel title="Confronto compliance" className="col-span-12 lg:col-span-6">
          {loading ? (
            <div className="skeleton h-64" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border-subtle)" />
                <PolarAngleAxis dataKey="agent" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Radar dataKey="score" stroke="#16a34a" fill="#16a34a" fillOpacity={0.25} />
                <Tooltip contentStyle={chartTooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </GrafanaPanel>
        {donutData.length > 0 && (
          <GrafanaPanel title={`Pass / Fail (${benchmark.toUpperCase()})`} className="col-span-12 lg:col-span-6">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90}>
                  {donutData.map((d) => (
                    <Cell key={d.name} fill={d.name === 'passed' ? SEVERITY_COLORS.low : SEVERITY_COLORS.critical} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </GrafanaPanel>
        )}
      </div>

      {!loading && (!data || data.length === 0) && (
        <div className="card text-center py-12 text-secondary">
          <p className="font-medium text-primary mb-2">Nessun dato SCA disponibile</p>
          <p className="text-sm max-w-lg mx-auto">
            Verifica che la Security Configuration Assessment sia attiva sugli agenti.
          </p>
        </div>
      )}

      {!loading && filteredChecks.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="table-wrap border-0 rounded-none">
            <table>
              <thead>
                <tr>
                  <th className="w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === filteredChecks.length && filteredChecks.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th>Stato</th>
                  <th>Agente</th>
                  <th>ID</th>
                  <th>Descrizione</th>
                  <th>Risultato</th>
                </tr>
              </thead>
              <tbody>
                {filteredChecks.map((c) => (
                  <Fragment key={c.checkKey}>
                    <tr
                      className="cursor-pointer"
                      onClick={() => setExpanded(expanded === c.checkKey ? null : c.checkKey)}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(c.checkKey)}
                          onChange={() => toggleSelect(c.checkKey)}
                        />
                      </td>
                      <td className="text-xs capitalize">{statusApi.getStatus(c.checkKey)}</td>
                      <td>{c.agentName}</td>
                      <td className="font-mono text-xs">{c.id}</td>
                      <td className="max-w-md truncate">{c.description}</td>
                      <td className={c.result === 'passed' ? 'text-success' : 'text-danger'}>{c.result}</td>
                    </tr>
                    {expanded === c.checkKey && (
                      <tr>
                        <td colSpan={6} className="!h-auto py-3 bg-[#0f172a] text-xs whitespace-pre-wrap">
                          <p className="font-semibold mb-1">Remediation</p>
                          {c.remediation || 'Nessuna remediation disponibile.'}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ComplianceToolbar({
  benchmark, setBenchmark, onExport,
  resultFilter, setResultFilter, agentFilter, setAgentFilter,
  reqFilter, setReqFilter, agents,
}) {
  return (
    <div className="card flex flex-wrap gap-3 items-center">
      {BENCHMARKS.map((b) => (
        <button
          key={b.id}
          type="button"
          onClick={() => setBenchmark(b.id)}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            benchmark === b.id ? 'tab-active' : 'btn-secondary'
          }`}
        >
          {b.label}
        </button>
      ))}
      <select className="select text-sm" value={resultFilter} onChange={(e) => setResultFilter(e.target.value)}>
        <option value="">Tutti gli esiti</option>
        <option value="passed">Passed</option>
        <option value="failed">Failed</option>
      </select>
      <select className="select text-sm" value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}>
        <option value="">Tutti gli agenti</option>
        {agents.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>
      <input
        className="input text-sm min-w-[140px]"
        placeholder="Requirement ID..."
        value={reqFilter}
        onChange={(e) => setReqFilter(e.target.value)}
      />
      <button type="button" className="btn-primary ml-auto" onClick={onExport}>
        Export PDF
      </button>
    </div>
  );
}
