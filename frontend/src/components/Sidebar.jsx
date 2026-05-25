import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Server,
  AlertTriangle,
  Shield,
  FileSearch,
  Activity,
  CheckCircle,
  Brain,
  FileText,
  Settings,
  ShieldCheck,
  Package,
} from 'lucide-react';

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/agents', label: 'Hosts', icon: Server },
  { to: '/metrics', label: 'Services', icon: Activity },
  { to: '/alerts', label: 'Alerts', icon: AlertTriangle },
  { to: '/vulnerabilities', label: 'Inventory', icon: Package },
  { to: '/fim', label: 'Integrity', icon: FileSearch },
  { to: '/compliance', label: 'Analytics', icon: CheckCircle },
  { to: '/ai', label: 'AI Analyst', icon: Brain },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onClose}
          aria-label="Chiudi menu"
        />
      )}
      <aside
        role="navigation"
        aria-label="Main navigation"
        className={`fixed left-0 top-0 h-full w-[220px] bg-[var(--bg-panel)] border-r border-[var(--border)] z-50 flex flex-col transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="p-4 border-b border-[var(--border)] flex items-center gap-2">
          <ShieldCheck className="text-[var(--accent)]" size={24} aria-hidden />
          <span className="text-lg font-bold text-[var(--text-primary)]">WazuhX</span>
        </div>
        <nav className="flex-1 py-3 px-2 overflow-y-auto">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 py-3 px-4 mb-0.5 rounded-md transition-colors duration-150 ${
                    isActive
                      ? 'nav-link-active'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={18} aria-hidden />
                    <span className="text-sm font-medium" aria-current={isActive ? 'page' : undefined}>
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
        <div className="p-4 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">v1.0.0</div>
      </aside>
    </>
  );
}
