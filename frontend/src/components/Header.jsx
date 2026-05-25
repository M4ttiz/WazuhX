import { useLocation, Link } from 'react-router-dom';
import { Menu, RefreshCw } from 'lucide-react';
import { useDataSource } from '../context/DataSourceContext';
import { useRefresh } from '../context/RefreshContext';

const TITLES = {
  '/': 'Overview',
  '/agents': 'Hosts',
  '/alerts': 'Alerts',
  '/vulnerabilities': 'Inventory',
  '/fim': 'Integrity',
  '/metrics': 'Services',
  '/compliance': 'Analytics',
  '/ai': 'AI Analyst',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

const BREADCRUMBS = {
  '/': [{ label: 'Overview' }],
  '/agents': [{ label: 'Overview', to: '/' }, { label: 'Hosts' }],
  '/alerts': [{ label: 'Overview', to: '/' }, { label: 'Alerts' }],
  '/vulnerabilities': [{ label: 'Overview', to: '/' }, { label: 'Inventory' }],
  '/fim': [{ label: 'Overview', to: '/' }, { label: 'Integrity' }],
  '/metrics': [{ label: 'Overview', to: '/' }, { label: 'Services' }],
  '/compliance': [{ label: 'Overview', to: '/' }, { label: 'Analytics' }],
  '/ai': [{ label: 'Overview', to: '/' }, { label: 'AI Analyst' }],
  '/reports': [{ label: 'Overview', to: '/' }, { label: 'Reports' }],
  '/settings': [{ label: 'Overview', to: '/' }, { label: 'Settings' }],
};

export default function Header({ onMenuOpen }) {
  const location = useLocation();
  const { wazuhConnected, isMock, refreshHealth } = useDataSource();
  const { lastUpdate, triggerRefresh, isRefreshing } = useRefresh();

  const title =
    TITLES[location.pathname] ||
    (location.pathname.startsWith('/agents/') ? 'Host Detail' : 'WazuhX');

  const crumbs =
    location.pathname.startsWith('/agents/') && location.pathname !== '/agents'
      ? [{ label: 'Overview', to: '/' }, { label: 'Hosts', to: '/agents' }, { label: 'Detail' }]
      : BREADCRUMBS[location.pathname] || [{ label: title }];

  const handleRefresh = () => {
    triggerRefresh();
    refreshHealth();
  };

  return (
    <header className="h-14 bg-[#1e293b] border-b border-[rgba(255,255,255,0.1)] flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuOpen}
          className="btn-icon lg:hidden text-[#94a3b8] hover:text-[#f1f5f9]"
          aria-label="Apri menu"
        >
          <Menu size={22} />
        </button>
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-[#f1f5f9] truncate animate-in fade-in">
            {title}
          </h1>
          <nav className="hidden sm:flex items-center gap-1 text-xs text-[#94a3b8] mt-0.5" aria-label="Breadcrumb">
            {crumbs.map((c, i) => (
              <span key={c.label} className="flex items-center gap-1">
                {i > 0 && <span>/</span>}
                {c.to ? (
                  <Link to={c.to} className="hover:text-[#f59e0b]">
                    {c.label}
                  </Link>
                ) : (
                  <span>{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`w-2.5 h-2.5 rounded-full ${wazuhConnected && !isMock ? 'bg-[#10b981]' : 'bg-[#f59e0b]'}`}
            aria-hidden
          />
          <span className="text-[#94a3b8] text-xs hidden sm:inline">
            Wazuh {wazuhConnected && !isMock ? 'connesso' : 'demo'}
          </span>
        </div>
        {lastUpdate && (
          <span className="text-[#64748b] text-xs hidden md:inline">
            {new Date(lastUpdate).toLocaleTimeString('it-IT')}
          </span>
        )}
        <button
          type="button"
          onClick={handleRefresh}
          className="btn-secondary flex items-center gap-2 text-sm !min-h-[44px]"
          aria-label="Aggiorna dati"
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
        <div
          className="w-9 h-9 rounded-full bg-[#334155] border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-xs font-semibold text-[#94a3b8]"
          title="Utente"
        >
          WX
        </div>
      </div>
    </header>
  );
}
