export default function GaugeChart({ value = 0, label, max = 100 }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="45" fill="none" stroke="var(--border)" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          className="transition-all duration-150"
        />
        <text x="60" y="58" textAnchor="middle" fill="var(--text-primary)" fontSize="20" fontWeight="700">
          {Math.round(pct)}%
        </text>
        <text x="60" y="75" textAnchor="middle" fill="var(--text-muted)" fontSize="11">
          {label}
        </text>
      </svg>
    </div>
  );
}
