import { Link } from 'react-router-dom';
import { formatRelative, isStale } from '../utils/formatters';

const STATUS = {
  active: { color: 'text-safe', dot: '🟢', label: 'Active' },
  disconnected: { color: 'text-critical', dot: '🔴', label: 'Disconnected' },
  never_connected: { color: 'text-muted', dot: '⚫', label: 'Never connected' },
};

export default function AgentCard({ agent }) {
  const st = STATUS[agent.status] || STATUS.never_connected;
  const stale = isStale(agent.lastKeepAlive);

  return (
    <Link to={`/agents/${agent.id}`} className="card block hover:border-accent/50">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-lg">{agent.name}</h3>
          <p className="text-muted font-mono text-sm">{agent.ip}</p>
        </div>
        <span className={st.color}>
          {st.dot} {st.label}
        </span>
      </div>
      <p className="text-sm text-muted mb-2">{agent.os}</p>
      <div className="flex justify-between text-xs font-mono">
        <span className={stale ? 'text-warning' : 'text-muted'}>
          {formatRelative(agent.lastKeepAlive)}
        </span>
        <span>
          <span className="text-critical">{agent.criticalCount}</span> crit · {agent.alertCount} alert
        </span>
      </div>
      {agent.compromised && (
        <p className="mt-2 text-critical text-xs font-bold blink-critical">⚠ POSSIBILE COMPROMISSIONE</p>
      )}
    </Link>
  );
}
