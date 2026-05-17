import { useState } from 'react';
import { useWazuh } from '../hooks/useWazuh';
import { apiDownload } from '../utils/api';
import { useToast } from '../context/ToastContext';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip,
} from 'recharts';

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
      <div className="card flex flex-wrap gap-4 items-center">
        {BENCHMARKS.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setBenchmark(b.id)}
            className={`px-4 py-2 rounded font-semibold transition-all duration-300 ${
              benchmark === b.id ? 'bg-accent/20 text-accent border border-accent/40' : 'btn-ghost border border-border'
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
        <h2 className="font-bold text-accent mb-4">Confronto compliance</h2>
        {loading ? (
          <div className="skeleton h-64" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#1a2540" />
              <PolarAngleAxis dataKey="agent" tick={{ fill: '#4a5568', fontSize: 10 }} />
              <Radar dataKey="score" stroke="#00ff88" fill="#00ff88" fillOpacity={0.4} />
              <Tooltip contentStyle={{ background: '#0d1220', border: '1px solid #1a2540' }} />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>

      {data?.map((agent) => (
        <div key={agent.agentId} className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold">{agent.agentName}</h3>
            <span className="font-mono text-2xl text-safe">{agent.score}%</span>
          </div>
          <div className="h-2 bg-border rounded overflow-hidden mb-4">
            <div className="h-full bg-safe transition-all duration-300" style={{ width: `${agent.score}%` }} />
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted border-b border-border">
                <th className="text-left py-2">ID</th>
                <th className="text-left">Descrizione</th>
                <th>Risultato</th>
                <th>Remediation</th>
              </tr>
            </thead>
            <tbody>
              {agent.checks?.slice(0, 10).map((c) => (
                <tr key={c.id} className="border-b border-border/30">
                  <td className="py-2 font-mono">{c.id}</td>
                  <td className="py-2">{c.description}</td>
                  <td className={c.result === 'passed' ? 'text-safe' : 'text-critical'}>{c.result}</td>
                  <td className="text-muted text-xs">{c.remediation || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
