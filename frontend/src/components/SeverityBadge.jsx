const STYLES = {
  critical: 'bg-[rgba(220,38,38,0.15)] text-[#f87171] border-[rgba(220,38,38,0.3)]',
  high: 'bg-[rgba(217,119,6,0.15)] text-[#fbbf24] border-[rgba(217,119,6,0.3)]',
  medium: 'bg-[rgba(37,99,235,0.15)] text-[#60a5fa] border-[rgba(37,99,235,0.3)]',
  low: 'bg-[rgba(22,163,74,0.15)] text-[#4ade80] border-[rgba(22,163,74,0.3)]',
};

export default function SeverityBadge({ level, label }) {
  const lvl = typeof level === 'number' ? level : 0;
  let key = 'low';
  let text = label || 'low';

  if (lvl >= 12 || label === 'critical') {
    key = 'critical';
    text = label || 'critical';
  } else if (lvl >= 8 || label === 'high') {
    key = 'high';
    text = label || 'high';
  } else if (lvl >= 5 || label === 'medium') {
    key = 'medium';
    text = label || 'medium';
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-xl border text-[11px] font-medium uppercase ${STYLES[key]}`}
    >
      {lvl > 0 ? `${lvl} · ` : ''}
      {text}
    </span>
  );
}
