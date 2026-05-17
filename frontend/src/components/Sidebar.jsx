import { NavLink } from 'react-router-dom';
import { useState } from 'react';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '◉' },
  { to: '/agents', label: 'Agenti', icon: '⬡' },
  { to: '/alerts', label: 'Alert', icon: '⚠' },
  { to: '/vulnerabilities', label: 'CVE', icon: '◎' },
  { to: '/fim', label: 'FIM', icon: '▣' },
  { to: '/compliance', label: 'Compliance', icon: '✓' },
  { to: '/ai', label: 'AI Analyst', icon: '✦' },
  { to: '/reports', label: 'Report', icon: '▤' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-surface border-r border-border z-40 transition-all duration-300 flex flex-col ${
        collapsed ? 'w-[60px]' : 'w-[240px]'
      }`}
    >
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!collapsed && (
          <span className="text-xl font-bold text-accent tracking-wider">WAZUHX</span>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="btn-ghost text-accent"
          aria-label="Toggle sidebar"
        >
          {collapsed ? '»' : '«'}
        </button>
      </div>
      <nav className="flex-1 py-4 overflow-y-auto">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 mx-2 rounded transition-all duration-300 ${
                isActive
                  ? 'bg-accent/10 text-accent border-l-2 border-accent'
                  : 'text-muted hover:text-text hover:bg-border/30'
              }`
            }
          >
            <span className="text-lg w-6 text-center">{item.icon}</span>
            {!collapsed && <span className="font-semibold">{item.label}</span>}
          </NavLink>
        ))}
      </nav>
      {!collapsed && (
        <div className="p-4 border-t border-border text-xs text-muted font-mono">
          v1.0.0 · MIT
        </div>
      )}
    </aside>
  );
}
