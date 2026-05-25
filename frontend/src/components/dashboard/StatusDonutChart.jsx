import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { chartTooltipStyle } from '../../utils/chartTheme';

export default function StatusDonutChart({ data, colors, loading }) {
  if (loading) {
    return <div className="skeleton h-[220px] w-full rounded-md" />;
  }

  if (!data?.length) {
    return (
      <p className="text-center text-[var(--text-muted)] py-16 text-sm">Nessun dato disponibile</p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={52}
          outerRadius={78}
          paddingAngle={2}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={colors[entry.name] || '#3b82f6'} />
          ))}
        </Pie>
        <Tooltip contentStyle={chartTooltipStyle} />
        <Legend
          wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }}
          iconType="circle"
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
