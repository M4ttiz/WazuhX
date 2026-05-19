const METRIC_LABELS = { cpu: 'CPU', ram: 'RAM', disk: 'Disco' };

export default function ThresholdAlertBanner({ alerts = [] }) {
  if (!alerts.length) return null;

  return (
    <div className="banner-warning space-y-2">
      <p className="font-semibold text-sm">Soglie risorse superate</p>
      <ul className="text-sm space-y-1">
        {alerts.map((a) => (
          <li key={a.id}>
            <span className="font-medium">{a.agentName || a.agentId}</span>
            {' — '}
            {METRIC_LABELS[a.metric] || a.metric}
            {' '}
            {a.value}%
            {' > '}
            {a.threshold}%
            {a.mount ? ` (${a.mount})` : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}
