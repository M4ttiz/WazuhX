export default function KpiCard({ label, value, sub, color = 'accent', loading }) {
  if (loading) {
    return (
      <div className="card">
        <div className="skeleton h-4 w-24 mb-3" />
        <div className="skeleton h-8 w-16" />
      </div>
    );
  }

  const colors = {
    accent: 'text-accent',
    critical: 'text-critical',
    safe: 'text-safe',
    warning: 'text-warning',
  };

  return (
    <div className="card group">
      <p className="text-muted text-sm font-semibold uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold font-mono ${colors[color] || colors.accent} transition-transform duration-300 group-hover:scale-105`}>
        {value}
      </p>
      {sub && <p className="text-muted text-xs mt-1 font-mono">{sub}</p>}
    </div>
  );
}
