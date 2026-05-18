import { useWazuh } from '../hooks/useWazuh';
import { formatDate } from '../utils/formatters';

export default function FIM() {
  const { data: events, loading } = useWazuh('/fim');

  if (loading) {
    return <div className="card skeleton h-64" />;
  }

  return (
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
            {events?.map((e) => (
              <tr key={e.id} className={e.critical ? 'bg-[rgba(220,38,38,0.08)]' : ''}>
                <td className="text-xs text-secondary">{formatDate(e.timestamp)}</td>
                <td>{e.agentName}</td>
                <td className="font-mono text-xs max-w-xs truncate">{e.path}</td>
                <td>
                  <span
                    className={
                      e.type === 'deleted'
                        ? 'text-danger'
                        : e.type === 'added'
                          ? 'text-success'
                          : 'text-warning'
                    }
                  >
                    {e.type}
                  </span>
                </td>
                <td className="text-xs">{e.size}</td>
                <td className="font-mono text-xs">{e.permissions || '—'}</td>
                <td>{e.user}</td>
                <td className="font-mono text-[11px] text-muted">
                  {e.type === 'modified' && (
                    <>
                      {e.md5Before?.slice(0, 8)} → {e.md5After?.slice(0, 8)}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
