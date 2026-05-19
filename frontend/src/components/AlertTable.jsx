import { useState, Fragment } from 'react';
import SeverityBadge from './SeverityBadge';
import { formatDate } from '../utils/formatters';
import { normalizeAlertForUi } from '../utils/alertFields';

const STATUS_LABELS = { new: 'Nuovo', seen: 'Visto', dismissed: 'Archiviato' };

export default function AlertTable({
  alerts = [],
  expandable = true,
  selectable = false,
  selectedIds = new Set(),
  onToggleSelect,
  onToggleAll,
  getStatus,
}) {
  const [expanded, setExpanded] = useState(null);
  const normalized = alerts.map(normalizeAlertForUi);
  const allSelected = normalized.length > 0 && normalized.every((a) => selectedIds.has(a.id));
  const colCount = 6 + (selectable ? 1 : 0) + (getStatus ? 1 : 0);

  if (!normalized.length) {
    return <p className="text-[#94a3b8] text-sm text-center py-8">Nessun alert trovato</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {selectable && (
              <th className="w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onToggleAll?.(e.target.checked)}
                  aria-label="Seleziona tutti"
                />
              </th>
            )}
            {getStatus && <th>Stato</th>}
            <th>Timestamp</th>
            <th>Severità</th>
            <th>Agente</th>
            <th>Regola</th>
            <th>Descrizione</th>
            <th>MITRE</th>
          </tr>
        </thead>
        <tbody>
          {normalized.map((a) => (
            <Fragment key={a.id}>
              <tr
                className={expandable ? 'cursor-pointer' : ''}
                onClick={() => expandable && setExpanded(expanded === a.id ? null : a.id)}
              >
                {selectable && (
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(a.id)}
                      onChange={() => onToggleSelect?.(a.id)}
                      aria-label={`Seleziona alert ${a.id}`}
                    />
                  </td>
                )}
                {getStatus && (
                  <td>
                    <span className="text-xs uppercase text-[#94a3b8]">
                      {STATUS_LABELS[getStatus(a.id)] || getStatus(a.id)}
                    </span>
                  </td>
                )}
                <td className="font-mono text-xs text-[#94a3b8]">{formatDate(a.timestamp)}</td>
                <td>
                  <SeverityBadge level={a.level ?? a.severity} label={a.severityLabel} />
                </td>
                <td>{a.agentName}</td>
                <td className="font-mono text-xs">{a.ruleId}</td>
                <td className="max-w-xs truncate text-[#94a3b8]">{a.description}</td>
                <td className="font-mono text-xs text-[#60a5fa]">{a.mitreTechnique}</td>
              </tr>
              {expandable && expanded === a.id && (
                <tr>
                  <td colSpan={colCount} className="!h-auto py-4 bg-[#0f172a]">
                    <div className="grid md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="text-[#64748b] mb-1 uppercase text-[11px] font-semibold">Dettaglio</p>
                        <p className="text-[#f1f5f9] text-sm mb-2">{a.ruleDescription || a.description}</p>
                        <p className="text-[#94a3b8]">Agente: {a.agentName} · Regola {a.ruleId}</p>
                        <p className="text-[#94a3b8] mt-1">{formatDate(a.timestamp)}</p>
                        {a.groups?.length > 0 && (
                          <p className="text-[#94a3b8] mt-1">Gruppi: {a.groups.join(', ')}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[#64748b] mb-1 uppercase text-[11px] font-semibold">Log raw</p>
                        <pre className="bg-[#0f172a] border border-[rgba(255,255,255,0.1)] rounded-md p-3 overflow-x-auto text-[11px] font-mono max-h-40">
                          {a.rawLog || '—'}
                        </pre>
                        {(a.mitreTactic || a.mitreTechniqueName) && (
                          <p className="text-[#94a3b8] mt-2 text-xs">
                            MITRE: {a.mitreTactic} · {a.mitreTechnique} {a.mitreTechniqueName}
                          </p>
                        )}
                        {a.responseSuggestion && (
                          <p className="text-[#10b981] text-sm mt-2">{a.responseSuggestion}</p>
                        )}
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
