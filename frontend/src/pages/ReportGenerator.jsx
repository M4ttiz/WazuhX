import { useState } from 'react';
import { apiDownload } from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useWazuh } from '../hooks/useWazuh';

const SECTIONS = [
  { id: 'overview', label: 'Overview KPI' },
  { id: 'alerts', label: 'Alert' },
  { id: 'agents', label: 'Endpoint' },
  { id: 'vulnerabilities', label: 'Vulnerabilità' },
  { id: 'compliance', label: 'Compliance' },
];

export default function ReportGenerator() {
  const { toast } = useToast();
  const { data: agents } = useWazuh('/agents');
  const [form, setForm] = useState({
    period: '7 giorni',
    sections: ['overview', 'alerts', 'agents', 'vulnerabilities', 'compliance'],
    agents: 'all',
    selectedAgents: [],
    language: 'it',
    format: 'pdf',
  });
  const [generating, setGenerating] = useState(false);

  const toggleSection = (id) => {
    setForm((f) => ({
      ...f,
      sections: f.sections.includes(id)
        ? f.sections.filter((s) => s !== id)
        : [...f.sections, id],
    }));
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await apiDownload('/reports/generate', {
        period: form.period,
        sections: form.sections,
        agents: form.agents === 'all' ? 'all' : form.selectedAgents,
        language: form.language,
        format: form.format,
      });
      toast('Report generato con successo', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="card space-y-4">
        <h2 className="font-bold text-accent">Configurazione report</h2>

        <label className="block">
          <span className="text-muted text-sm">Periodo</span>
          <select
            className="input w-full mt-1"
            value={form.period}
            onChange={(e) => setForm({ ...form, period: e.target.value })}
          >
            <option>Oggi</option>
            <option>7 giorni</option>
            <option>30 giorni</option>
            <option>Custom range</option>
          </select>
        </label>

        <div>
          <span className="text-muted text-sm">Sezioni</span>
          <div className="flex flex-wrap gap-2 mt-2">
            {SECTIONS.map((s) => (
              <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.sections.includes(s.id)}
                  onChange={() => toggleSection(s.id)}
                />
                <span className="text-sm">{s.label}</span>
              </label>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="text-muted text-sm">Agenti</span>
          <select
            className="input w-full mt-1"
            value={form.agents}
            onChange={(e) => setForm({ ...form, agents: e.target.value })}
          >
            <option value="all">Tutti</option>
            <option value="selected">Selezione multipla</option>
          </select>
        </label>

        {form.agents === 'selected' && (
          <div className="flex flex-wrap gap-2">
            {agents?.map((a) => (
              <label key={a.id} className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={form.selectedAgents.includes(a.id)}
                  onChange={(e) => {
                    setForm((f) => ({
                      ...f,
                      selectedAgents: e.target.checked
                        ? [...f.selectedAgents, a.id]
                        : f.selectedAgents.filter((id) => id !== a.id),
                    }));
                  }}
                />
                {a.name}
              </label>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-muted text-sm">Lingua</span>
            <select
              className="input w-full mt-1"
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
            >
              <option value="it">Italiano</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="block">
            <span className="text-muted text-sm">Formato</span>
            <select
              className="input w-full mt-1"
              value={form.format}
              onChange={(e) => setForm({ ...form, format: e.target.value })}
            >
              <option value="pdf">PDF</option>
              <option value="html">HTML</option>
            </select>
          </label>
        </div>

        <button
          type="button"
          className="btn-primary w-full"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? 'Generazione in corso...' : 'Genera Report'}
        </button>
      </div>
    </div>
  );
}
