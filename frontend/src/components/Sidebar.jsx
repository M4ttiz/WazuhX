import { NavLink } from 'react-router-dom';
import { NAV_ICONS } from './NavIcons';

const NAV = [
  { to: '/', label: 'Dashboard', icon: 'dashboard' },
  { to: '/agents', label: 'Agenti', icon: 'agents' },
  { to: '/alerts', label: 'Alert', icon: 'alerts' },
  { to: '/vulnerabilities', label: 'CVE', icon: 'vulnerabilities' },
  { to: '/fim', label: 'FIM', icon: 'fim' },
  { to: '/metrics', label: 'Metriche', icon: 'metrics' },
  { to: '/compliance', label: 'Compliance', icon: 'compliance' },
  { to: '/ai', label: 'AI Analyst', icon: 'ai' },
  { to: '/reports', label: 'Report', icon: 'reports' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-full w-[220px] bg-surface border-r border-border z-40 flex flex-col">
      <div className="p-4 border-b border-border">
        <span className="text-base font-semibold text-white">WazuhX</span>
      </div>
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {NAV.map((item) => {
          const Icon = NAV_ICONS[item.icon];
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 py-2.5 px-4 mb-0.5 rounded-md transition-colors duration-150 ${
                  isActive
                    ? 'nav-link-active'
                    : 'text-secondary hover:bg-hover hover:text-primary border-l-2 border-transparent'
                }`
              }
            >
              <span className="shrink-0">
                <Icon />
              </span>
              <span className="text-sm font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border text-xs text-muted">v1.0.0</div>
    </aside>
  );
}
