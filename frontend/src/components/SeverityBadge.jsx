export default function SeverityBadge({ level, label }) {
  const lvl = typeof level === 'number' ? level : 0;
  let cls = 'bg-safe/20 text-safe border-safe/40';
  let text = label || 'low';

  if (lvl >= 12) {
    cls = 'bg-critical/20 text-critical border-critical/40';
    text = label || 'critical';
  } else if (lvl >= 8) {
    cls = 'bg-warning/20 text-warning border-warning/40';
    text = label || 'high';
  } else if (lvl >= 5) {
    cls = 'bg-accent/20 text-accent border-accent/40';
    text = label || 'medium';
  }

  return (
    <span className={`inline-flex px-2 py-0.5 rounded border text-xs font-mono uppercase ${cls}`}>
      {lvl > 0 ? `${lvl} · ` : ''}{text}
    </span>
  );
}
