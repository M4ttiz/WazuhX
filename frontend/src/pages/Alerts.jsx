import { useState, useEffect } from 'react';
import { useWazuh } from '../hooks/useWazuh';
import AlertTable from '../components/AlertTable';
import { exportCsv } from '../utils/formatters';

export default function Alerts() {
  const [filters, setFilters] = useState({
    severityMin: 1,
    severityMax: 15,
    search: '',
    mitreTactic: '',
    page: 1,
    limit: 25,
  });
  const [liveCount, setLiveCount] = useState(0);

  const { data, loading } = useWazuh('/alerts', {
    params: {
      ...filters,
      severityMin: filters.severityMin,
      severityMax: filters.severityMax,
    },
  });

  useEffect(() => {
    const fetchLive = () => {
      fetch('/api/alerts/live-count')
        .then((r) => r.json())
        .then((d) => setLiveCount(d.count))
        .catch(() => {});
    };
    fetchLive();
    const id = setInterval(fetchLive, 15000);
    return () => clearInterval(id);
  }, []);

  const handleExport = () => {
    const rows = data?.data || [];
    exportCsv(
      rows,
      [
        { label: 'Timestamp', get: (r) => r.timestamp },
        { label: 'Severity', get: (r) => r.severity },
        { label: 'Agent', get: (r) => r.agentName },
        { label: 'Rule', get: (r) => r.ruleId },
        { label: 'Description', get: (r) => r.description },
        { label: 'MITRE', get: (r) => r.mitreTechnique },
      ],
      `wazuhx-alerts-${Date.now()}.csv`
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-secondary text-sm">
          <span className="text-2xl font-bold text-primary">{liveCount}</span>
          {' '}eventi/min
        </p>
        <button type="button" className="btn-primary" onClick={handleExport}>
          Export CSV
        </button>
      </div>

      <div className="card flex flex-wrap gap-4 items-end">
        <label className="text-xs text-secondary">
          Severità min: {filters.severityMin}
          <input
            type="range"
            min="1"
            max="15"
            value={filters.severityMin}
            onChange={(e) => setFilters({ ...filters, severityMin: +e.target.value })}
            className="block w-32 mt-1"
          />
        </label>
        <label className="text-xs text-secondary">
          Severità max: {filters.severityMax}
          <input
            type="range"
            min="1"
            max="15"
            value={filters.severityMax}
            onChange={(e) => setFilters({ ...filters, severityMax: +e.target.value })}
            className="block w-32 mt-1"
          />
        </label>
        <input
          className="input"
          placeholder="Cerca..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
        />
        <select
          className="select"
          value={filters.limit}
          onChange={(e) => setFilters({ ...filters, limit: +e.target.value, page: 1 })}
        >
          <option value={25}>25 per pagina</option>
          <option value={50}>50 per pagina</option>
          <option value={100}>100 per pagina</option>
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="skeleton h-64 m-5" />
        ) : (
          <AlertTable alerts={data?.data || []} />
        )}
      </div>

      {data?.pagination && (
        <div className="flex justify-center items-center gap-4">
          <button
            type="button"
            className="btn-secondary text-sm"
            disabled={filters.page <= 1}
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
          >
            Prec
          </button>
          <span className="text-muted text-sm">
            {data.pagination.page} / {data.pagination.totalPages}
          </span>
          <button
            type="button"
            className="btn-secondary text-sm"
            disabled={filters.page >= data.pagination.totalPages}
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
          >
            Succ
          </button>
        </div>
      )}
    </div>
  );
}
