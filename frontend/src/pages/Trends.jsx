import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useWazuh } from '../hooks/useWazuh';
import PageHeader from '../components/PageHeader';
import GrafanaPanel from '../components/GrafanaPanel';
import { buildDailyBreakdown } from '../utils/dashboardHelpers';
import { chartTooltipStyle, chartAxisProps, chartGridProps } from '../utils/chartTheme';

const RANGES = [
  { id: '24h', label: '24h', days: 1, interval: '1h' },
  { id: '7d', label: '7d', days: 7, interval: '1d' },
  { id: '30d', label: '30d', days: 30, interval: '1d' },
];

function buildTimelineParams(rangeId) {
  const r = RANGES.find((x) => x.id === rangeId) || RANGES[1];
  const to = new Date();
  const from = new Date(to.getTime() - r.days * 86400000);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    interval: r.interval,
  };
}

function normalizeTimeline(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function alertsToTimeline(alerts, days) {
  const cutoff = Date.now() - days * 86400000;
  const buckets = {};
  alerts.forEach((a) => {
    if (!a.timestamp) return;
    const t = new Date(a.timestamp).getTime();
    if (t < cutoff) return;
    const day = a.timestamp.slice(0, 10);
    buckets[day] = (buckets[day] || 0) + 1;
  });
  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

export default function Trends() {
  const [range, setRange] = useState('7d');
  const timelineParams = useMemo(() => buildTimelineParams(range), [range]);
  const rangeMeta = RANGES.find((r) => r.id === range) || RANGES[1];

  const { data: timelineRaw, loading: timelineLoading } = useWazuh('/alerts/timeline', {
    params: timelineParams,
  });
  const { data: alertsData, loading: alertsLoading } = useWazuh('/alerts', {
    params: { limit: 500, page: 1 },
  });
  const { data: agentsData } = useWazuh('/agents');

  const agents = useMemo(
    () => (Array.isArray(agentsData) ? agentsData : []),
    [agentsData]
  );

  const alerts = useMemo(() => {
    const d = alertsData;
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.data)) return d.data;
    return [];
  }, [alertsData]);

  const timeline = useMemo(() => {
    const api = normalizeTimeline(timelineRaw);
    if (api.length) return api;
    return alertsToTimeline(alerts, rangeMeta.days);
  }, [timelineRaw, alerts, rangeMeta.days]);

  const breakdown = useMemo(
    () => buildDailyBreakdown(timeline, agents),
    [timeline, agents]
  );

  const loading = timelineLoading || alertsLoading;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Trends"
        subtitle="Alert volume over time and daily breakdown"
      />

      <GrafanaPanel title="Total alerts">
        <div className="flex justify-end mb-3">
          <select
            className="select text-sm"
            value={range}
            onChange={(e) => setRange(e.target.value)}
            aria-label="Time range"
          >
            {RANGES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        {loading ? (
          <div className="skeleton h-[260px]" />
        ) : timeline.length === 0 ? (
          <p className="text-center text-[var(--text-muted)] py-16 text-sm">--</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={timeline}>
              <CartesianGrid {...chartGridProps} />
              <XAxis dataKey="date" {...chartAxisProps} />
              <YAxis {...chartAxisProps} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </GrafanaPanel>

      <GrafanaPanel title="Daily breakdown">
        {loading ? (
          <div className="skeleton h-40" />
        ) : breakdown.length === 0 ? (
          <p className="text-center text-[var(--text-muted)] py-8 text-sm">--</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Alert count</th>
                  <th>Hosts down</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((row) => (
                  <tr key={row.date}>
                    <td className="font-mono text-sm">{row.date}</td>
                    <td className="font-mono">{row.alertCount}</td>
                    <td className="font-mono">{row.hostsDown}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GrafanaPanel>
    </div>
  );
}
