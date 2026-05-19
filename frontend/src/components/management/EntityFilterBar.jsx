const SEVERITY_OPTIONS = [
  { value: '', label: 'Tutte le severità' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'info', label: 'Info' },
];

export default function EntityFilterBar({
  filters,
  onChange,
  agents = [],
  showDateRange = true,
  showAgent = true,
  showRuleGroup = true,
}) {
  return (
    <div className="card flex flex-wrap gap-4 items-end">
      {showDateRange && (
        <>
          <label className="text-xs text-[#94a3b8]">
            Da
            <input
              type="datetime-local"
              className="input block mt-1"
              value={filters.from || ''}
              onChange={(e) => onChange({ from: e.target.value ? new Date(e.target.value).toISOString() : '' })}
            />
          </label>
          <label className="text-xs text-[#94a3b8]">
            A
            <input
              type="datetime-local"
              className="input block mt-1"
              value={filters.toLocal || ''}
              onChange={(e) => {
                const toLocal = e.target.value;
                onChange({
                  toLocal,
                  to: toLocal ? new Date(toLocal).toISOString() : '',
                });
              }}
            />
          </label>
        </>
      )}
      <label className="text-xs text-[#94a3b8]">
        Severità
        <select
          className="select block mt-1 min-w-[140px]"
          value={filters.severity || ''}
          onChange={(e) => onChange({ severity: e.target.value })}
        >
          {SEVERITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {showAgent && (
        <label className="text-xs text-[#94a3b8]">
          Agente
          <select
            className="select block mt-1 min-w-[140px]"
            value={filters.agentId || ''}
            onChange={(e) => onChange({ agentId: e.target.value })}
          >
            <option value="">Tutti</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {showRuleGroup && (
        <input
          className="input"
          placeholder="Gruppo regola / MITRE tactic"
          value={filters.ruleGroup || filters.mitreTactic || ''}
          onChange={(e) => onChange({ ruleGroup: e.target.value, mitreTactic: e.target.value })}
        />
      )}
      <input
        className="input flex-1 min-w-[200px]"
        placeholder="Cerca..."
        value={filters.search || ''}
        onChange={(e) => onChange({ search: e.target.value })}
      />
      <select
        className="select"
        value={filters.limit || 25}
        onChange={(e) => onChange({ limit: +e.target.value, page: 1 })}
      >
        <option value={25}>25 / pagina</option>
        <option value={50}>50 / pagina</option>
        <option value={100}>100 / pagina</option>
      </select>
    </div>
  );
}
