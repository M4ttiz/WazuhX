import { useLocation, Link } from 'react-router-dom';
import { Menu, RefreshCw } from 'lucide-react';
import { useDataSource } from '../context/DataSourceContext';
import { useRefresh } from '../context/RefreshContext';

const TITLES = {
  '/': 'Dashboard',
  '/agents': 'Agent',
  '/alerts': 'Alert',
  '/vulnerabilities': 'CVE',
  '/fim': 'PM',
  '/metrics': 'Metrics',
  '/compliance': 'Compliance',
  '/ai': 'AI Analyst',
  '/analytics': 'Analytics',
  '/trends': 'Trends',
  '/reports': 'Report',
  '/settings': 'Settings',
};

const BREADCRUMBS = {
  '/': [{ label: 'Dashboard' }],
  '/agents': [{ label: 'Dashboard', to: '/' }, { label: 'Agent' }],
  '/alerts': [{ label: 'Dashboard', to: '/' }, { label: 'Alert' }],
  '/vulnerabilities': [{ label: 'Dashboard', to: '/' }, { label: 'CVE' }],
  '/fim': [{ label: 'Dashboard', to: '/' }, { label: 'PM' }],
  '/metrics': [{ label: 'Dashboard', to: '/' }, { label: 'Metrics' }],
  '/compliance': [{ label: 'Dashboard', to: '/' }, { label: 'Compliance' }],
  '/ai': [{ label: 'Dashboard', to: '/' }, { label: 'AI Analyst' }],
  '/analytics': [{ label: 'Dashboard', to: '/' }, { label: 'Analytics' }],
  '/trends': [{ label: 'Dashboard', to: '/' }, { label: 'Trends' }],
  '/reports': [{ label: 'Dashboard', to: '/' }, { label: 'Report' }],
  '/settings': [{ label: 'Dashboard', to: '/' }, { label: 'Settings' }],
};

export default function Header({ onMenuOpen }) {
  const location = useLocation();
  const { wazuhConnected, isMock, refreshHealth } = useDataSource();
  const { lastUpdate, triggerRefresh, isRefreshing } = useRefresh();

  const title =
    TITLES[location.pathname] ||
    (location.pathname.startsWith('/agents/') ? 'Agent Detail' : 'WazuhX');

  const crumbs =
    location.pathname.startsWith('/agents/') && location.pathname !== '/agents'
      ? [{ label: 'Dashboard', to: '/' }, { label: 'Agent', to: '/agents' }, { label: 'Detail' }]
      : BREADCRUMBS[location.pathname] || [{ label: title }];

  const handleRefresh = () => {
    triggerRefresh();
    refreshHealth();
  };

  return (
    <header className="h-14 bg-[var(--bg-panel)] border-b border-[var(--border)] flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuOpen}
          className="btn-icon lg:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-[var(--text-primary)] truncate">
            {title}
          </h1>
          <nav className="hidden sm:flex items-center gap-1 text-xs text-[var(--text-secondary)] mt-0.5" aria-label="Breadcrumb">
            {crumbs.map((c, i) => (
              <span key={c.label} className="flex items-center gap-1">
                {i > 0 && <span>/</span>}
                {c.to ? (
                  <Link to={c.to} className="hover:text-[var(--accent)]">
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
            className={`w-2.5 h-2.5 rounded-full ${wazuhConnected && !isMock ? 'bg-[var(--success)]' : 'bg-[var(--warning)]'}`}
            aria-hidden
          />
          <span className="text-[var(--text-secondary)] text-xs hidden sm:inline">
            Wazuh {wazuhConnected && !isMock ? 'connected' : 'demo'}
          </span>
        </div>
        {lastUpdate && (
          <span className="text-[var(--text-muted)] text-xs hidden md:inline">
            {new Date(lastUpdate).toLocaleTimeString('it-IT')}
          </span>
        )}
        <button
          type="button"
          onClick={handleRefresh}
          className="btn-secondary flex items-center gap-2 text-sm !min-h-[36px] !py-2"
          aria-label="Refresh data"
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
        <div
          className="w-9 h-9 rounded-full bg-[var(--bg-hover)] border border-[var(--border)] flex items-center justify-center text-xs font-semibold text-[var(--text-secondary)]"
          title="User"
        >
          WX
        </div>
      </div>
    </header>
  );
}
