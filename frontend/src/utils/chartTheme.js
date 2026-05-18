export const CHART_COLORS = ['#2563eb', '#0891b2', '#16a34a', '#d97706', '#dc2626'];

export const SEVERITY_COLORS = {
  critical: '#dc2626',
  high: '#d97706',
  medium: '#2563eb',
  low: '#16a34a',
};

export const chartTooltipStyle = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-primary)',
  fontSize: 12,
  boxShadow: 'var(--shadow-md)',
};

export const chartAxisProps = {
  tick: { fill: 'var(--text-muted)', fontSize: 11 },
  axisLine: { stroke: 'var(--border-subtle)' },
  tickLine: false,
};

export const chartGridProps = {
  stroke: 'var(--border-subtle)',
  strokeDasharray: '3 3',
};
