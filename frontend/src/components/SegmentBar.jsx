function segmentColor(pct) {
  if (pct < 60) return 'var(--green)';
  if (pct < 80) return 'var(--yellow)';
  if (pct < 90) return 'var(--orange)';
  return 'var(--red)';
}

export default function SegmentBar({ value, max = 100, segments = 12 }) {
  const num = Number(value);
  if (Number.isNaN(num)) {
    return <span className="text-xs text-[var(--text-muted)]">—</span>;
  }

  const pct = Math.min(100, Math.max(0, (num / max) * 100));
  const color = segmentColor(pct);
  const filled = Math.round((pct / 100) * segments);

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-[2px]">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 16,
              borderRadius: 2,
              backgroundColor: i < filled ? color : 'var(--border)',
            }}
          />
        ))}
      </div>
      <span
        className="text-xs tabular-nums"
        style={{ color, fontFamily: 'var(--font-mono)' }}
      >
        {num.toFixed(1)}%
      </span>
    </div>
  );
}
