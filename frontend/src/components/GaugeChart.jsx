export default function GaugeChart({ value = 0, label, max = 100, color = '#00d4ff' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="45" fill="none" stroke="#1a2540" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          className="transition-all duration-300"
        />
        <text x="60" y="58" textAnchor="middle" fill="#e8eaf0" fontSize="20" fontFamily="JetBrains Mono">
          {Math.round(pct)}%
        </text>
        <text x="60" y="75" textAnchor="middle" fill="#4a5568" fontSize="10">
          {label}
        </text>
      </svg>
    </div>
  );
}
