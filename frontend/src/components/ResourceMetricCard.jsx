import SegmentBar from './SegmentBar';

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
  const displayValue =
    showBar && unit === '%'
      ? null
      : typeof value === 'number'
        ? Math.round(value * 10) / 10
        : value;
  const unitSuffix = unit === '%' || String(unit).startsWith('%') ? unit : ` ${unit}`;

  return (
    <div className="card">
      <div className="flex justify-between items-baseline mb-2">
        <p className="card-title mb-0">{label}</p>
        {!(showBar && unit === '%') && (
          <span
            className={`text-lg font-semibold font-mono ${showBar && pct > threshold ? 'text-danger' : 'text-primary'}`}
          >
            {displayValue}
            {unitSuffix}
          </span>
        )}
        {showBar && unit === '%' && (
          <span
            className={`text-sm font-mono ${pct > threshold ? 'text-danger' : 'text-secondary'}`}
          >
            {pct.toFixed(1)}%
          </span>
        )}
      </div>
      {showBar && unit === '%' && <SegmentBar value={pct} />}
      {showBar && unit !== '%' && (
        <div className="h-2 bg-border rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-150 ${metricBarColor(pct, threshold)}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {!hideThreshold && showBar && unit === '%' && (
        <p className="text-xs text-muted mt-2">
          Soglia alert: {threshold}
          {unit}
        </p>
      )}
    </div>
  );
}

