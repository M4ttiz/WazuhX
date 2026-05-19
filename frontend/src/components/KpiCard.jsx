const VARIANTS = {
  info: { border: 'border-l-[#3b82f6]', accent: 'text-[#60a5fa]' },
  ok: { border: 'border-l-[#22c55e]', accent: 'text-[#4ade80]' },
  critical: { border: 'border-l-[#ef4444]', accent: 'text-[#f87171]' },
  warning: { border: 'border-l-[#f59e0b]', accent: 'text-[#fbbf24]' },
  accent: { border: 'border-l-[#f59e0b]', accent: 'text-[#f59e0b]' },
};

export default function KpiCard({ label, value, sub, trend, variant = 'info', loading, hero, icon: Icon }) {
  if (loading) {
    return (
      <div className={`${hero ? 'kpi-hero' : 'card'} border-l-[3px] border-l-[#334155]`}>
        <div className="skeleton h-3 w-24 mb-3" />
        <div className="skeleton h-9 w-20" />
      </div>
    );
  }

  const v = VARIANTS[variant] || VARIANTS.info;
  const Wrapper = hero ? 'kpi-hero' : 'card';

  return (
    <div className={`${Wrapper} border-l-[3px] ${v.border} relative`}>
      {Icon && (
        <div className={`absolute top-5 right-5 ${v.accent}`}>
          <Icon size={22} aria-hidden />
        </div>
      )}
      <p className="text-3xl font-bold text-[#f1f5f9] leading-none">{value ?? '—'}</p>
      <p className="text-sm text-[#94a3b8] mt-2">{label}</p>
      {sub && <p className="text-xs text-[#64748b] mt-1">{sub}</p>}
      {trend && (
        <p
          className={`text-xs mt-2 font-semibold ${
            trend.startsWith('+') ? 'text-[#10b981]' : trend.startsWith('-') ? 'text-[#ef4444]' : 'text-[#64748b]'
          }`}
        >
          {trend}
        </p>
      )}
    </div>
  );
}
