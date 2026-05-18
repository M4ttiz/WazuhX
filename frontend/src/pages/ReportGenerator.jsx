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
    <div className="max-w-2xl">
      <div className="card space-y-4">
        <p className="card-title mb-0">Configurazione report</p>

        <label className="block">
          <span className="text-secondary text-xs">Periodo</span>
          <select
            className="select w-full mt-1"
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
          <span className="text-secondary text-xs">Sezioni</span>
          <div className="flex flex-wrap gap-3 mt-2">
            {SECTIONS.map((s) => (
              <label key={s.id} className="flex items-center gap-2 cursor-pointer text-sm text-secondary">
                <input
                  type="checkbox"
                  checked={form.sections.includes(s.id)}
                  onChange={() => toggleSection(s.id)}
                />
                {s.label}
              </label>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="text-secondary text-xs">Agenti</span>
          <select
            className="select w-full mt-1"
            value={form.agents}
            onChange={(e) => setForm({ ...form, agents: e.target.value })}
          >
            <option value="all">Tutti</option>
            <option value="selected">Selezione multipla</option>
          </select>
        </label>

        {form.agents === 'selected' && (
          <div className="flex flex-wrap gap-3">
            {agents?.map((a) => (
              <label key={a.id} className="flex items-center gap-1.5 text-sm text-secondary">
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
            <span className="text-secondary text-xs">Lingua</span>
            <select
              className="select w-full mt-1"
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
            >
              <option value="it">Italiano</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="block">
            <span className="text-secondary text-xs">Formato</span>
            <select
              className="select w-full mt-1"
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
