import { useWazuh } from '../hooks/useWazuh';
import { formatDate } from '../utils/formatters';

export default function FIM() {
  const { data: events, loading } = useWazuh('/fim');

  return (
    <div className="card overflow-x-auto">
      {loading ? (
        <div className="skeleton h-64" />
      ) : (
        <table className="w-full text-sm font-mono">
          <thead>
            <tr className="text-muted border-b border-border text-left">
              <th className="py-2 px-3">Timestamp</th>
              <th className="py-2 px-3">Agente</th>
              <th className="py-2 px-3">Path</th>
              <th className="py-2 px-3">Tipo</th>
              <th className="py-2 px-3">Size</th>
              <th className="py-2 px-3">Permessi</th>
              <th className="py-2 px-3">Utente</th>
              <th className="py-2 px-3">Hash</th>
            </tr>
          </thead>
          <tbody>
            {events?.map((e) => (
              <tr
                key={e.id}
                className={`border-b border-border/30 ${e.critical ? 'bg-critical/10 text-critical' : ''}`}
              >
                <td className="py-2 px-3">{formatDate(e.timestamp)}</td>
                <td className="py-2 px-3">{e.agentName}</td>
                <td className="py-2 px-3 max-w-xs truncate">{e.path}</td>
                <td className="py-2 px-3">
                  <span
                    className={
                      e.type === 'deleted'
                        ? 'text-critical'
                        : e.type === 'added'
                          ? 'text-safe'
                          : 'text-warning'
                    }
                  >
                    {e.type}
                  </span>
                </td>
                <td className="py-2 px-3">{e.size}</td>
                <td className="py-2 px-3">{e.permissions || '—'}</td>
                <td className="py-2 px-3">{e.user}</td>
                <td className="py-2 px-3 text-[10px]">
                  {e.type === 'modified' && (
                    <>
                      MD5: {e.md5Before} → {e.md5After}
                      <br />
                      SHA256: {e.sha256Before?.slice(0, 12)}...
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
