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
} from 'lucide-react';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/agents', label: 'Agenti', icon: Server },
  { to: '/alerts', label: 'Alert', icon: AlertTriangle },
  { to: '/vulnerabilities', label: 'CVE', icon: Shield },
  { to: '/fim', label: 'FIM', icon: FileSearch },
  { to: '/metrics', label: 'Metriche', icon: Activity },
  { to: '/compliance', label: 'Compliance', icon: CheckCircle },
  { to: '/ai', label: 'AI Analyst', icon: Brain },
  { to: '/reports', label: 'Report', icon: FileText },
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
        className={`fixed left-0 top-0 h-full w-[220px] bg-[#0f172a] border-r border-[rgba(255,255,255,0.1)] z-50 flex flex-col transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="p-4 border-b border-[rgba(255,255,255,0.1)] flex items-center gap-2">
          <ShieldCheck className="text-[#f59e0b]" size={24} aria-hidden />
          <span className="text-lg font-bold text-[#f1f5f9]">WazuhX</span>
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
                      ? 'nav-link-active text-[#93c5fd]'
                      : 'text-[#94a3b8] hover:bg-[#1e293b] hover:text-[#f1f5f9]'
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
        <div className="p-4 border-t border-[rgba(255,255,255,0.1)] text-xs text-[#64748b]">v1.0.0</div>
      </aside>
    </>
  );
}
