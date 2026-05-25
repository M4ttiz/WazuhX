import { useEffect, useState, useRef } from 'react';
import { useWazuh } from '../hooks/useWazuh';
import { getRefreshInterval } from '../hooks/useAutoRefresh';
import ResourceMetricCard from './ResourceMetricCard';
import GaugeChart from './GaugeChart';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { chartTooltipStyle, chartAxisProps, chartGridProps } from '../utils/chartTheme';

const MAX_POINTS = 20;

function sourceLabel(source, partial) {
  if (source === 'mock') return 'Mock';
  return partial ? 'Glances (parziale)' : 'Glances';
}

const GLANCES_ERROR_BANNER =
  'Glances non raggiungibile — verifica che Glances sia in esecuzione sull\'host (porta 61208)';

export default function RealtimeMetricsPanel({ agentId, enabled }) {
  const interval = getRefreshInterval('realtime', 2500);
  const { data, loading, error } = useWazuh(`/metrics/realtime/${agentId}`, {
    skip: !enabled || !agentId,
    refreshInterval: interval,
  });
  const [history, setHistory] = useState([]);
  const lastTs = useRef(null);

  const diskIo = data?.diskMetric === 'io';

  useEffect(() => {
    if (!data?.reachable || data.timestamp == null) return;
    if (lastTs.current === data.timestamp) return;
    lastTs.current = data.timestamp;

    setHistory((prev) => {
      const next = [
        ...prev,
        {
          t: new Date(data.timestamp).toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          cpu: data.cpu ?? 0,
          ram: data.ram ?? 0,
          disk: data.disk ?? 0,
        },
      ];
      return next.slice(-MAX_POINTS);
    });
  }, [data]);

  if (!enabled) return null;

  if (loading && !data) {
    return <div className="card skeleton h-40 mb-6" />;
  }

  if (error) {
    return (
      <div className="card mb-6 text-danger text-sm">
        Errore metriche live: {error}
      </div>
    );
  }

  if (!data) return null;

  const port = 61208;
  const diskUnit = data.diskUnit || (diskIo ? 'KiB/s' : '%');
  const diskLabel = diskIo ? 'Disk I/O' : 'Disco (uso %)';

  return (
    <div className="card mb-6 space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div>
          <p className="card-title mb-0">Prestazioni in tempo reale</p>
          <p className="text-xs text-muted mt-1">
            {sourceLabel(data.source, data.partial)} · ogni {Math.round(interval / 1000)}s · {data.hostIp}:{port}
          </p>
        </div>
        {data.reachable && (
          <span className="text-xs font-medium text-success bg-[rgba(22,163,74,0.12)] px-2 py-1 rounded">
            Live
          </span>
        )}
      </div>

      {!data.reachable && (
        <div className="p-3 rounded-md bg-red-500/10 border border-red-500/30">
          <p className="text-sm text-red-400">{GLANCES_ERROR_BANNER}</p>
          <p className="text-xs text-muted mt-1 font-mono">
            {data.hostIp}:{port}
            {data.error && ` · ${data.error}`}
          </p>
        </div>
      )}

      {data.reachable && (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            <ResourceMetricCard label="CPU" value={data.cpu ?? 0} threshold={90} hideThreshold />
            <ResourceMetricCard label="RAM" value={data.ram ?? 0} threshold={90} hideThreshold />
            <ResourceMetricCard
              label={diskLabel}
              value={data.disk ?? 0}
              threshold={85}
              unit={diskIo ? diskUnit : '%'}
              hideThreshold
              showBar={!diskIo}
            />
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="card flex justify-center py-4">
              <GaugeChart value={data.cpu ?? 0} label="CPU" />
            </div>
            <div className="card flex justify-center py-4">
              <GaugeChart value={data.ram ?? 0} label="RAM" />
            </div>
            {diskIo ? (
              <div className="card flex flex-col justify-center py-6 px-4 text-center">
                <p className="text-xs text-secondary mb-1">Disk I/O</p>
                <p className="text-2xl font-semibold text-primary tabular-nums">
                  {data.disk != null ? Math.round(data.disk * 10) / 10 : '—'}
                  <span className="text-sm font-normal text-secondary ml-1">{diskUnit}</span>
                </p>
              </div>
            ) : (
              <div className="card flex justify-center py-4">
                <GaugeChart value={data.disk ?? 0} label="Disco" />
              </div>
            )}
          </div>
          {history.length > 1 && (
            <div>
              <p className="card-title">
                {diskIo ? 'Trend CPU / RAM / I/O disco' : 'Trend CPU / RAM / disco'}
              </p>
              <ResponsiveContainer width="100%" height={160}>
                <ComposedChart data={history}>
                  <CartesianGrid {...chartGridProps} />
                  <XAxis dataKey="t" {...chartAxisProps} tick={{ fontSize: 10 }} />
                  <YAxis
                    yAxisId="left"
                    domain={[0, 100]}
                    {...chartAxisProps}
                    width={28}
                    label={{ value: '%', angle: -90, position: 'insideLeft', fontSize: 10 }}
                  />
                  {diskIo && (
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      width={36}
                      {...chartAxisProps}
                      domain={['auto', 'auto']}
                    />
                  )}
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="cpu"
                    name="CPU %"
                    stroke="#2563eb"
                    fill="#2563eb"
                    fillOpacity={0.12}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="ram"
                    name="RAM %"
                    stroke="#16a34a"
                    fill="#16a34a"
                    fillOpacity={0.1}
                  />
                  {diskIo ? (
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="disk"
                      name={`I/O (${diskUnit})`}
                      stroke="#d97706"
                      dot={false}
                      strokeWidth={2}
                    />
                  ) : (
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="disk"
                      name="Disco %"
                      stroke="#d97706"
                      fill="#d97706"
                      fillOpacity={0.1}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
