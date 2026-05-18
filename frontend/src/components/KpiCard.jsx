const VARIANTS = {
  info: { border: 'border-l-info', icon: 'text-info' },
  ok: { border: 'border-l-success', icon: 'text-success' },
  critical: { border: 'border-l-danger', icon: 'text-danger' },
  warning: { border: 'border-l-warning', icon: 'text-warning' },
  accent: { border: 'border-l-accent', icon: 'text-accent' },
};

const ICONS = {
  info: 'ℹ',
  ok: '✓',
  critical: '!',
  warning: '⚠',
  accent: '●',
};

export default function KpiCard({ label, value, sub, trend, variant = 'info', loading }) {
  if (loading) {
    return (
      <div className="card border-l-[3px] border-l-border">
        <div className="skeleton h-3 w-20 mb-3" />
        <div className="skeleton h-7 w-16" />
      </div>
    );
  }

  const v = VARIANTS[variant] || VARIANTS.info;

  return (
    <div className={`card border-l-[3px] ${v.border} relative`}>
      <span className={`absolute top-5 right-5 text-sm ${v.icon}`}>{ICONS[variant] || ICONS.info}</span>
      <p className="text-[28px] font-bold text-primary leading-none">{value ?? '—'}</p>
      <p className="text-xs text-secondary mt-2">{label}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
      {trend && (
        <p className={`text-xs mt-1 font-medium ${trend.startsWith('+') ? 'text-success' : trend.startsWith('-') ? 'text-danger' : 'text-muted'}`}>
          {trend}
        </p>
      )}
    </div>
  );
}
