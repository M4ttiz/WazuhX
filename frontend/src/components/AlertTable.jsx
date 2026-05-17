import { useState, Fragment } from 'react';
import SeverityBadge from './SeverityBadge';
import { formatDate } from '../utils/formatters';

export default function AlertTable({ alerts = [], expandable = true }) {
  const [expanded, setExpanded] = useState(null);

  if (!alerts.length) {
    return <p className="text-muted text-center py-8">Nessun alert trovato</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted text-left">
            <th className="py-2 px-3">Timestamp</th>
            <th className="py-2 px-3">Severità</th>
            <th className="py-2 px-3">Agente</th>
            <th className="py-2 px-3">Regola</th>
            <th className="py-2 px-3">Descrizione</th>
            <th className="py-2 px-3">MITRE</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map((a) => (
            <Fragment key={a.id}>
              <tr
                className="border-b border-border/50 hover:bg-border/20 cursor-pointer transition-colors duration-300"
                onClick={() => expandable && setExpanded(expanded === a.id ? null : a.id)}
              >
                <td className="py-2 px-3 font-mono text-xs">{formatDate(a.timestamp)}</td>
                <td className="py-2 px-3">
                  <SeverityBadge level={a.severity} label={a.severityLabel} />
                </td>
                <td className="py-2 px-3">{a.agentName}</td>
                <td className="py-2 px-3 font-mono">{a.ruleId}</td>
                <td className="py-2 px-3 max-w-xs truncate">{a.description}</td>
                <td className="py-2 px-3 font-mono text-xs text-accent">{a.mitreTechnique}</td>
              </tr>
              {expandable && expanded === a.id && (
                <tr className="bg-bg">
                  <td colSpan={6} className="p-4">
                    <div className="grid md:grid-cols-2 gap-4 text-xs font-mono">
                      <div>
                        <p className="text-muted mb-1">Log raw</p>
                        <pre className="bg-surface p-3 rounded overflow-x-auto text-[10px]">
                          {a.rawLog}
                        </pre>
                      </div>
                      <div>
                        <p className="text-muted mb-1">Suggerimento risposta</p>
                        <p className="text-safe">{a.responseSuggestion}</p>
                        <p className="text-muted mt-2">
                          {a.mitreTactic} · {a.mitreTechniqueName}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
