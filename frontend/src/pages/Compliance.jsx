import { useState } from 'react';
import { useWazuh } from '../hooks/useWazuh';
import { apiDownload } from '../utils/api';
import { useToast } from '../context/ToastContext';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip,
} from 'recharts';
import { chartTooltipStyle } from '../utils/chartTheme';

const BENCHMARKS = [
  { id: 'cis', label: 'CIS' },
  { id: 'pci', label: 'PCI-DSS' },
  { id: 'gdpr', label: 'GDPR' },
  { id: 'hipaa', label: 'HIPAA' },
  { id: 'nist', label: 'NIST' },
];

export default function Compliance() {
  const [benchmark, setBenchmark] = useState('cis');
  const { toast } = useToast();
  const { data, loading } = useWazuh('/compliance', { params: { benchmark } });

  const radarData = data?.map((c) => ({
    agent: c.agentName.replace('endpoint-', ''),
    score: c.score,
  })) || [];

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-primary">Compliance (SCA)</h1>
        <p className="text-secondary text-sm mt-1">
          Security Configuration Assessment — benchmark CIS, PCI-DSS, GDPR e altri.
        </p>
      </div>

      <div className="card flex flex-wrap gap-3 items-center">
        {BENCHMARKS.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setBenchmark(b.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
              benchmark === b.id ? 'tab-active' : 'btn-secondary'
            }`}
          >
            {b.label}
          </button>
        ))}
        <button type="button" className="btn-primary ml-auto" onClick={handleExportPdf}>
          Export PDF
        </button>
      </div>

      <div className="card">
        <p className="card-title">Confronto compliance</p>
        {loading ? (
          <div className="skeleton h-64" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border-subtle)" />
              <PolarAngleAxis dataKey="agent" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <Radar dataKey="score" stroke="#16a34a" fill="#16a34a" fillOpacity={0.25} />
              <Tooltip contentStyle={chartTooltipStyle} />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>

      {!loading && (!data || data.length === 0) && (
        <div className="card text-center py-12 text-secondary">
          <p className="font-medium text-primary mb-2">Nessun dato SCA disponibile</p>
          <p className="text-sm max-w-lg mx-auto">
            Verifica che la Security Configuration Assessment sia attiva sugli agenti e che WazuhX
            raggiunga l&apos;API manager (porta 55000). Se vedi gli agenti ma non i punteggi,
            prova <code className="text-xs">DELETE /api/cache</code> dopo un aggiornamento.
          </p>
        </div>
      )}

      {data?.map((agent) => (
        <div key={agent.agentId} className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-primary">{agent.agentName}</h3>
            <span className="text-2xl font-bold text-success">{agent.score}%</span>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden mb-4">
            <div className="h-full bg-success transition-all duration-150" style={{ width: `${agent.score}%` }} />
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Descrizione</th>
                  <th>Risultato</th>
                  <th>Remediation</th>
                </tr>
              </thead>
              <tbody>
                {agent.checks?.slice(0, 10).map((c) => (
                  <tr key={c.id}>
                    <td className="font-mono text-xs">{c.id}</td>
                    <td>{c.description}</td>
                    <td className={c.result === 'passed' ? 'text-success' : 'text-danger'}>{c.result}</td>
                    <td className="text-muted text-xs">{c.remediation || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
