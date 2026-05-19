import { useWazuh } from '../hooks/useWazuh';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { FileSearch } from 'lucide-react';
import { formatDate } from '../utils/formatters';

export default function FIM() {
  const { data: events, loading, error } = useWazuh('/fim');
  const list = Array.isArray(events) ? events : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="File Integrity Monitoring"
        subtitle="Eventi di modifica file rilevati dagli agent"
      />

      {error && <EmptyState icon={FileSearch} title="Errore" message={error} />}

      {loading && <div className="card skeleton h-64" />}

      {!loading && !error && list.length === 0 && (
        <EmptyState icon={FileSearch} title="Nessun evento FIM" message="Non ci sono eventi da visualizzare." />
      )}

      {!loading && !error && list.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="table-wrap border-0 rounded-none">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Agente</th>
                  <th>Path</th>
                  <th>Tipo</th>
                  <th>Size</th>
                  <th>Permessi</th>
                  <th>Utente</th>
                  <th>Hash</th>
                </tr>
              </thead>
              <tbody>
                {list.map((e) => (
                  <tr key={e.id} className={e.critical ? 'bg-red-500/10' : ''}>
                    <td className="text-xs text-[#94a3b8]">{formatDate(e.timestamp)}</td>
                    <td>{e.agentName}</td>
                    <td className="font-mono text-xs max-w-xs truncate">{e.path}</td>
                    <td>{e.type}</td>
                    <td className="font-mono text-xs">{e.size}</td>
                    <td className="font-mono text-xs">{e.permissions}</td>
                    <td>{e.user}</td>
                    <td className="font-mono text-xs truncate max-w-[120px]">{e.hash}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
