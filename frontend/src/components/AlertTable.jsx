import { useState, Fragment } from 'react';
import SeverityBadge from './SeverityBadge';
import { formatDate } from '../utils/formatters';

export default function AlertTable({ alerts = [], expandable = true }) {
  const [expanded, setExpanded] = useState(null);

  if (!alerts.length) {
    return <p className="text-muted text-sm text-center py-8">Nessun alert trovato</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Severità</th>
            <th>Agente</th>
            <th>Regola</th>
            <th>Descrizione</th>
            <th>MITRE</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map((a) => (
            <Fragment key={a.id}>
              <tr
                className={expandable ? 'cursor-pointer' : ''}
                onClick={() => expandable && setExpanded(expanded === a.id ? null : a.id)}
              >
                <td className="font-mono text-xs text-secondary">{formatDate(a.timestamp)}</td>
                <td>
                  <SeverityBadge level={a.severity} label={a.severityLabel} />
                </td>
                <td>{a.agentName}</td>
                <td className="font-mono text-xs">{a.ruleId}</td>
                <td className="max-w-xs truncate text-secondary">{a.description}</td>
                <td className="font-mono text-xs text-info">{a.mitreTechnique}</td>
              </tr>
              {expandable && expanded === a.id && (
                <tr>
                  <td colSpan={6} className="!h-auto py-4 bg-surface">
                    <div className="grid md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="text-muted mb-1 uppercase text-[11px] font-semibold">Log raw</p>
                        <pre className="bg-base border border-border rounded-md p-3 overflow-x-auto text-[11px] font-mono">
                          {a.rawLog}
                        </pre>
                      </div>
                      <div>
                        <p className="text-muted mb-1 uppercase text-[11px] font-semibold">Suggerimento</p>
                        <p className="text-success text-sm">{a.responseSuggestion}</p>
                        <p className="text-muted mt-2 text-xs">
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
