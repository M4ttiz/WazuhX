const STYLES = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-green-500/20 text-green-400 border-green-500/30',
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
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
  } else if (label === 'info') {
    key = 'info';
    text = 'info';
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium uppercase ${STYLES[key]}`}
    >
      {lvl > 0 ? `${lvl} · ` : ''}
      {text}
    </span>
  );
}
