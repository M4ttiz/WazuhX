import { useState } from 'react';
import { Server } from 'lucide-react';
import { useWazuh } from '../hooks/useWazuh';
import AgentCard from '../components/AgentCard';
import PageHeader from '../components/PageHeader';
import GrafanaPanel from '../components/GrafanaPanel';
import EmptyState from '../components/EmptyState';

export default function Agents() {
  const [filters, setFilters] = useState({ status: '', os: '', group: '', search: '' });
  const { data: agents, loading, error } = useWazuh('/agents', { params: filters });

  const list = Array.isArray(agents) ? agents : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agents"
        subtitle="Monitora tutti gli agent Wazuh connessi"
      />

      <GrafanaPanel className="flex flex-wrap gap-4">
        <select
          className="select"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          aria-label="Filtra per status"
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
          aria-label="Filtra per sistema operativo"
        />
        <input
          className="input"
          placeholder="Cerca nome/IP..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          aria-label="Cerca agente"
        />
      </GrafanaPanel>

      {error && <EmptyState icon={Server} title="Errore caricamento" message={error} />}

      {!error && loading && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card skeleton h-32" />
          ))}
        </div>
      )}

      {!error && !loading && list.length === 0 && (
        <EmptyState
          icon={Server}
          title="Nessun agente"
          message="Non sono stati trovati agenti con i filtri selezionati."
        />
      )}

      {!error && !loading && list.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {list.map((a) => (
            <AgentCard key={a.id} agent={a} />
          ))}
        </div>
      )}
    </div>
  );
}