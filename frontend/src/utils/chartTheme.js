export const CHART_COLORS = ['#3b82f6', '#73bf69', '#f5a623', '#ff7f50', '#f2495c', '#b877d9'];

export const SEVERITY_COLORS = {
  critical: '#f2495c',
  high: '#ff7f50',
  medium: '#3b82f6',
  low: '#73bf69',
};

export const chartDefaults = {
  margin: { top: 8, right: 8, left: 0, bottom: 0 },
};

export const chartTooltipStyle = {
  background: 'var(--bg-panel)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-primary)',
  fontSize: 12,
  fontFamily: 'var(--font-mono)',
  boxShadow: 'var(--shadow-md)',
};

export const chartAxisProps = {
  tick: { fill: 'var(--text-muted)', fontSize: 11 },
  axisLine: { stroke: 'var(--border)' },
  tickLine: false,
};

export const chartGridProps = {
  stroke: 'var(--border)',
  strokeDasharray: '3 3',
};
