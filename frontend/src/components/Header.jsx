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
      .then((d) => setConnected(d.wazuh === 'connected' || d.status === 'ok'))
      .catch(() => setConnected(false));
  }, [lastUpdate]);

  return (
    <header className="h-16 border-b border-border bg-surface/80 backdrop-blur flex items-center justify-between px-6 sticky top-0 z-30">
      <h1 className="text-xl font-bold text-text">{title}</h1>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`w-2 h-2 rounded-full ${connected ? 'bg-safe animate-pulse' : 'bg-warning'}`}
          />
          <span className="text-muted font-mono text-xs">
            Wazuh {connected ? 'connesso' : 'demo/mock'}
          </span>
        </div>
        {lastUpdate && (
          <span className="text-muted font-mono text-xs hidden md:inline">
            Aggiornato: {new Date(lastUpdate).toLocaleTimeString('it-IT')}
          </span>
        )}
        <button type="button" onClick={onRefresh} className="btn-primary text-sm">
          ↻ Refresh
        </button>
      </div>
    </header>
  );
}
