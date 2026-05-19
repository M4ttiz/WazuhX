import { useEffect, useState, useRef } from 'react';
import { useWazuh } from '../hooks/useWazuh';
import { getRefreshInterval } from '../hooks/useAutoRefresh';
import ResourceMetricCard from './ResourceMetricCard';
import GaugeChart from './GaugeChart';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { chartTooltipStyle, chartAxisProps, chartGridProps } from '../utils/chartTheme';

const MAX_POINTS = 20;

export default function RealtimeMetricsPanel({ agentId, enabled }) {
  const interval = getRefreshInterval('realtime', 3000);
  const { data, loading, error } = useWazuh(`/metrics/realtime/${agentId}`, {
    skip: !enabled || !agentId,
    refreshInterval: interval,
  });
  const [history, setHistory] = useState([]);
  const lastTs = useRef(null);

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
        Errore Netdata: {error}
      </div>
    );
  }

  if (!data) return null;

  const port = 19999;

  return (
    <div className="card mb-6 space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div>
          <p className="card-title mb-0">Prestazioni in tempo reale (Netdata)</p>
          <p className="text-xs text-muted mt-1">
            Netdata · aggiornamento ogni {Math.round(interval / 1000)}s · {data.hostIp}:{port}
          </p>
        </div>
        {data.reachable && (
          <span className="text-xs font-medium text-success bg-[rgba(22,163,74,0.12)] px-2 py-1 rounded">
            Live
          </span>
        )}
      </div>

      {!data.reachable && (
        <p className="text-sm text-secondary">
          Netdata non raggiungibile su <span className="font-mono text-primary">{data.hostIp}</span>
          :{port}
          {data.error && ` (${data.error})`}
        </p>
      )}

      {data.reachable && (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            <ResourceMetricCard label="CPU (Netdata)" value={data.cpu ?? 0} threshold={90} hideThreshold />
            <ResourceMetricCard label="RAM (Netdata)" value={data.ram ?? 0} threshold={90} hideThreshold />
            <ResourceMetricCard label="Disco (Netdata)" value={data.disk ?? 0} threshold={85} hideThreshold />
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="card flex justify-center py-4">
              <GaugeChart value={data.cpu ?? 0} label="CPU" />
            </div>
            <div className="card flex justify-center py-4">
              <GaugeChart value={data.ram ?? 0} label="RAM" />
            </div>
            <div className="card flex justify-center py-4">
              <GaugeChart value={data.disk ?? 0} label="Disco" />
            </div>
          </div>
          {history.length > 1 && (
            <div>
              <p className="card-title">Trend CPU / RAM / disco</p>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={history}>
                  <CartesianGrid {...chartGridProps} />
                  <XAxis dataKey="t" {...chartAxisProps} tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} {...chartAxisProps} width={28} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Area type="monotone" dataKey="cpu" name="CPU" stroke="#2563eb" fill="#2563eb" fillOpacity={0.12} />
                  <Area type="monotone" dataKey="ram" name="RAM" stroke="#16a34a" fill="#16a34a" fillOpacity={0.1} />
                  <Area type="monotone" dataKey="disk" name="Disco" stroke="#d97706" fill="#d97706" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
