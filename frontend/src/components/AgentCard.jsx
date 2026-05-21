import { memo } from 'react';
import { Link } from 'react-router-dom';
import { formatRelative, isStale } from '../utils/formatters';

const STATUS = {
  active: { dot: 'bg-success', label: 'Active' },
  disconnected: { dot: 'bg-danger', label: 'Disconnected' },
  never_connected: { dot: 'bg-muted', label: 'Never connected' },
};

function StatusDot({ status }) {
  const st = STATUS[status] || STATUS.never_connected;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-secondary">
      <span className={`w-2 h-2 rounded-full ${st.dot}`} />
      {st.label}
    </span>
  );
}

function AgentCard({ agent }) {
  const stale = isStale(agent.lastKeepAlive);

  return (
    <Link
      to={`/agents/${agent.id}`}
      className="card block hover:bg-hover transition-colors duration-150"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-sm text-primary">{agent.name}</h3>
          <p className="text-secondary text-xs font-mono mt-0.5">{agent.ip}</p>
        </div>
        <div className="flex items-center gap-2">
          {agent.liveMetricsAvailable && (
            <span
              className="text-sm leading-none"
              title="Glances: metriche real-time disponibili"
              aria-label="Metriche live disponibili"
            >
              ⚡
            </span>
          )}
          <StatusDot status={agent.status} />
        </div>
      </div>
      <p className="text-xs text-secondary mb-3">{agent.os}</p>
      <div className="flex justify-between text-xs">
        <span className={stale ? 'text-warning' : 'text-muted'}>
          {formatRelative(agent.lastKeepAlive)}
        </span>
        <span className="text-secondary">
          <span className="text-danger font-medium">{agent.criticalCount}</span> crit ·{' '}
          {agent.alertCount} alert
        </span>
      </div>
      {agent.compromised && (
        <p className="mt-2 text-danger text-xs font-semibold">Possibile compromissione</p>
      )}
    </Link>
  );
}

export default memo(AgentCard);
