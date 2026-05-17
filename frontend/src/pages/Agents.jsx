import { useState } from 'react';
import { useWazuh } from '../hooks/useWazuh';
import AgentCard from '../components/AgentCard';

export default function Agents() {
  const [filters, setFilters] = useState({ status: '', os: '', group: '', search: '' });
  const { data: agents, loading } = useWazuh('/agents', { params: filters });

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap gap-4">
        <select
          className="input"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">Tutti gli status</option>
          <option value="active">Active</option>
          <option value="disconnected">Disconnected</option>
          <option value="never_connected">Never connected</option>
        </select>
        <input
          className="input"
          placeholder="Filtra OS..."
          value={filters.os}
          onChange={(e) => setFilters({ ...filters, os: e.target.value })}
        />
        <input
          className="input"
          placeholder="Cerca nome/IP..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card skeleton h-32" />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents?.map((a) => (
            <AgentCard key={a.id} agent={a} />
          ))}
        </div>
      )}
    </div>
  );
}
