export function metricBarColor(value, threshold) {
  if (value > threshold) return 'bg-danger';
  if (value > threshold * 0.78) return 'bg-warning';
  return 'bg-accent';
}

export default function ResourceMetricCard({
  label,
  value = 0,
  threshold = 90,
  unit = '%',
  hideThreshold,
  showBar = true,
}) {
  const pct = Math.min(100, Math.max(0, value));
  const displayValue = showBar ? Math.round(pct) : typeof value === 'number' ? Math.round(value * 10) / 10 : value;
  const unitSuffix = unit === '%' || String(unit).startsWith('%') ? unit : ` ${unit}`;

  return (
    <div className="card">
      <div className="flex justify-between items-baseline mb-2">
        <p className="card-title mb-0">{label}</p>
        <span className={`text-lg font-semibold ${showBar && pct > threshold ? 'text-danger' : 'text-primary'}`}>
          {displayValue}
          {unitSuffix}
        </span>
      </div>
      {showBar && (
        <div className="h-2 bg-border rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-150 ${metricBarColor(pct, threshold)}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {!hideThreshold && showBar && (
        <p className="text-xs text-muted mt-2">
          Soglia alert: {threshold}
          {unit}
        </p>
      )}
    </div>
  );
}
