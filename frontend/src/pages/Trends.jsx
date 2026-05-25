import { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import { AlertTriangle, Calendar } from 'lucide-react';
import { useWazuh } from '../hooks/useWazuh';
import { getRefreshInterval } from '../hooks/useAutoRefresh';
import EmptyState from '../components/EmptyState';
import GrafanaPanel from '../components/GrafanaPanel';
import DataTable from '../components/dashboard/DataTable';
import { groupAlertsByDay, filterAlertsByRange } from '../utils/dashboardHelpers';
import { chartTooltipStyle, chartAxisProps, chartGridProps } from '../utils/chartTheme';

const RANGES = [
  { key: '24h', label: '24h', days: 1 },
  { key: '7d', label: '7 Days', days: 7 },
  { key: '30d', label: '30 Days', days: 30 },
];

export default function Trends() {
  const interval = getRefreshInterval('trends', 30000);
  const [range, setRange] = useState('7d');

  const { data: alertsData, loading, error } = useWazuh('/alerts', {
    refreshInterval: interval,
  });

  const allAlerts = useMemo(() => {
    if (Array.isArray(alertsData)) return alertsData;
    if (alertsData?.data && Array.isArray(alertsData.data)) return alertsData.data;
    return [];
  }, [alertsData]);

  const filteredAlerts = useMemo(
    () => filterAlertsByRange(allAlerts, range),
    [allAlerts, range]
  );

  const selectedRange = RANGES.find((r) => r.key === range) || RANGES[1];

  const trendData = useMemo(
    () => groupAlertsByDay(filteredAlerts, selectedRange.days),
    [filteredAlerts, selectedRange.days]
  );

  const totalInRange = useMemo(
    () => trendData.reduce((sum, d) => sum + d.count, 0),
    [trendData]
  );

  const peakDay = useMemo(() => {
    if (!trendData.length) return null;
    return trendData.reduce((max, d) => (d.count > max.count ? d : max), trendData[0]);
  }, [trendData]);

  if (error && !allAlerts.length) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Cannot load Trends"
        message={error}
      />
    );
  }

  const breakdownColumns = [
    {
      key: 'date',
      label: 'Date',
      className: 'font-mono text-sm',
      render: (row) => {
        const d = new Date(row.date);
        return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
      },
    },
    {
      key: 'count',
      label: 'Alert Count',
      className: 'font-mono text-sm',
    },
    {
      key: 'hostDown',
      label: 'Critical',
      className: 'font-mono text-sm',
      render: (row) => (
        <span className={row.hostDown > 0 ? 'text-[#EF4444]' : 'text-[var(--text-secondary)]'}>
          {row.hostDown}
        </span>
      ),
    },
    {
      key: 'pct',
      label: '% of Total',
      className: 'font-mono text-sm text-[var(--text-secondary)]',
      render: (row) => totalInRange > 0 ? `${((row.count / totalInRange) * 100).toFixed(1)}%` : '--',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Trends</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Evoluzione temporale degli alert
          </p>
        </div>

        {/* Range selector */}
        <div className="flex items-center gap-1 bg-[var(--bg-panel)] border border-[var(--border)] rounded-md p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                range === r.key
                  ? 'bg-[var(--accent-light)] text-[#93c5fd]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)]'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card border-l-[3px] border-l-[#00A8FF]">
          <p className="text-xs text-[#8B92A8] uppercase tracking-wide font-semibold mb-1">Total Alerts ({selectedRange.label})</p>
          {loading ? (
            <div className="skeleton h-7 w-16 rounded" />
          ) : (
            <p className="text-xl font-bold text-[#E0E4F0]">{totalInRange}</p>
          )}
        </div>
        <div className="card border-l-[3px] border-l-[#F59E0B]">
          <p className="text-xs text-[#8B92A8] uppercase tracking-wide font-semibold mb-1">Daily Average</p>
          {loading ? (
            <div className="skeleton h-7 w-16 rounded" />
          ) : (
            <p className="text-xl font-bold text-[#E0E4F0]">
              {trendData.length > 0 ? (totalInRange / trendData.length).toFixed(1) : '--'}
            </p>
          )}
        </div>
        <div className="card border-l-[3px] border-l-[#EF4444]">
          <p className="text-xs text-[#8B92A8] uppercase tracking-wide font-semibold mb-1">Peak Day</p>
          {loading ? (
            <div className="skeleton h-7 w-16 rounded" />
          ) : (
            <p className="text-xl font-bold text-[#E0E4F0]">
              {peakDay ? `${peakDay.count} alerts` : '--'}
            </p>
          )}
        </div>
      </div>

      {/* Alert trend chart */}
      <GrafanaPanel title="Alert Trend">
        {loading ? (
          <div className="skeleton h-[300px] w-full rounded-md" />
        ) : trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="alertGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00A8FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00A8FF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="criticalGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...chartGridProps} />
              <XAxis
                dataKey="date"
                {...chartAxisProps}
                tickFormatter={(d) => {
                  const date = new Date(d);
                  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
                }}
              />
              <YAxis {...chartAxisProps} />
              <Tooltip
                contentStyle={chartTooltipStyle}
                labelFormatter={(d) => {
                  const date = new Date(d);
                  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                name="Total Alerts"
                stroke="#00A8FF"
                strokeWidth={2}
                fill="url(#alertGradient)"
                dot={{ fill: '#00A8FF', r: 3 }}
                activeDot={{ fill: '#00A8FF', r: 5, strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="hostDown"
                name="Critical"
                stroke="#EF4444"
                strokeWidth={1.5}
                fill="url(#criticalGradient)"
                dot={{ fill: '#EF4444', r: 2 }}
                activeDot={{ fill: '#EF4444', r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-[var(--text-muted)] py-16 text-sm">No trend data available</p>
        )}
      </GrafanaPanel>

      {/* Daily breakdown table */}
      <GrafanaPanel title="Daily Breakdown">
        {loading ? (
          <div className="skeleton h-48 w-full rounded-md" />
        ) : (
          <DataTable
            columns={breakdownColumns}
            rows={trendData.map((d) => ({ ...d, id: d.date }))}
            emptyMessage="No data for selected period"
          />
        )}
      </GrafanaPanel>
    </div>
  );
}
