import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const TITLES = {
  '/': 'Dashboard Overview',
  '/agents': 'Agenti / Endpoint',
  '/alerts': 'Alert & Security Events',
  '/vulnerabilities': 'Vulnerabilità',
  '/fim': 'File Integrity Monitoring',
  '/compliance': 'Compliance',
  '/ai': 'AI Analyst',
  '/reports': 'Report Generator',
  '/settings': 'Settings',
};

export default function Header({ onRefresh, lastUpdate }) {
  const location = useLocation();
  const [connected, setConnected] = useState(false);
  const title =
    TITLES[location.pathname] ||
    (location.pathname.startsWith('/agents/') ? 'Dettaglio Agente' : 'WazuhX');

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setConnected(d.wazuh === 'connected'))
      .catch(() => setConnected(false));
  }, [lastUpdate]);

  return (
    <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-6 sticky top-0 z-30">
      <h1 className="text-base font-semibold text-primary">{title}</h1>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`w-2 h-2 rounded-full ${connected ? 'bg-success' : 'bg-warning'}`}
          />
          <span className="text-secondary text-xs">
            Wazuh {connected ? 'connesso' : 'demo'}
          </span>
        </div>
        {lastUpdate && (
          <span className="text-muted text-xs hidden md:inline">
            {new Date(lastUpdate).toLocaleTimeString('it-IT')}
          </span>
        )}
        <button type="button" onClick={onRefresh} className="btn-primary text-sm">
          Refresh
        </button>
        <div
          className="w-8 h-8 rounded-full bg-hover border border-border flex items-center justify-center text-xs font-semibold text-secondary"
          title="User"
        >
          WX
        </div>
      </div>
    </header>
  );
}
