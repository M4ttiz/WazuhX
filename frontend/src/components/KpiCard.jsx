const VARIANTS = {
  info: { border: 'border-l-[var(--info)]', accent: 'text-[var(--info)]' },
  ok: { border: 'border-l-[var(--success)]', accent: 'text-[var(--success)]' },
  critical: { border: 'border-l-[var(--danger)]', accent: 'text-[var(--danger)]' },
  warning: { border: 'border-l-[var(--warning)]', accent: 'text-[var(--warning)]' },
  accent: { border: 'border-l-[var(--accent)]', accent: 'text-[var(--accent)]' },
};

// Tailwind needs literal classes for JIT — provide static fallback borders
const BORDER_COLORS = {
  info: '#3b82f6',
  ok: '#10B981',
  critical: '#EF4444',
  warning: '#F59E0B',
  accent: '#3b82f6',
};

export default function KpiCard({ label, value, sub, trend, variant = 'info', loading, hero, icon: Icon }) {
  if (loading) {
    return (
      <div className={`${hero ? 'kpi-hero' : 'card'}`} style={{ borderLeft: '3px solid var(--border)' }}>
        <div className="skeleton h-3 w-24 mb-3" />
        <div className="skeleton h-9 w-20" />
      </div>
    );
  }

  const v = VARIANTS[variant] || VARIANTS.info;
  const borderColor = BORDER_COLORS[variant] || BORDER_COLORS.info;
  const Wrapper = hero ? 'kpi-hero' : 'card';

  return (
    <div className={`${Wrapper} relative`} style={{ borderLeft: `3px solid ${borderColor}` }}>
      {Icon && (
        <div className={`absolute top-4 right-4 ${v.accent} opacity-60`}>
          <Icon size={20} aria-hidden />
        </div>
      )}
      <p className="text-2xl font-bold text-[var(--text-primary)] leading-none">{value ?? '—'}</p>
      <p className="text-sm text-[var(--text-secondary)] mt-2">{label}</p>
      {sub && <p className="text-xs text-[var(--text-muted)] mt-1">{sub}</p>}
      {trend && (
        <p
          className={`text-xs mt-2 font-semibold ${
            trend.startsWith('+') ? 'text-[var(--success)]' : trend.startsWith('-') ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'
          }`}
        >
          {trend}
        </p>
      )}
    </div>
  );
}
