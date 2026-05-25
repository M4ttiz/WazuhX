import { useState, useEffect, useMemo } from 'react';
import { useWazuh } from '../hooks/useWazuh';
import { apiFetch } from '../utils/api';
import AlertTable from '../components/AlertTable';
import PageHeader from '../components/PageHeader';
import GrafanaPanel from '../components/GrafanaPanel';
import StatusTabs from '../components/management/StatusTabs';
import BulkActionBar from '../components/management/BulkActionBar';
import EntityFilterBar from '../components/management/EntityFilterBar';
import { exportCsv } from '../utils/formatters';
import { normalizeAlertsForUi, severityDistribution } from '../utils/alertFields';
import { useLocalEntityStatus, filterByStatusTab } from '../hooks/useLocalEntityStatus';
import { useNoiseRuleIds, filterClientNoise } from '../hooks/useNoiseRuleIds';
import {
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { chartTooltipStyle, chartAxisProps, chartGridProps, SEVERITY_COLORS } from '../utils/chartTheme';

const TIMELINE_RANGES = [
  { id: '24h', label: '24h', days: 1, interval: '1h' },
  { id: '7d', label: '7 giorni', days: 7, interval: '1d' },
  { id: '30d', label: '30 giorni', days: 30, interval: '1d' },
];

export default function Alerts() {
  const [statusTab, setStatusTab] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const [timelineRange, setTimelineRange] = useState('7d');
  const [showNoise, setShowNoise] = useState(false);
  const [filters, setFilters] = useState({
    severity: '',
    agentId: '',
    ruleGroup: '',
    search: '',
    from: '',
    to: '',
    toLocal: '',
    page: 1,
    limit: 25,
  });
  const [liveCount, setLiveCount] = useState(0);
  const { ruleIds } = useNoiseRuleIds();

  const { data: agentsData } = useWazuh('/agents');
  const agents = Array.isArray(agentsData) ? agentsData : [];

  const alertParams = useMemo(
    () => ({ ...filters, showNoise: showNoise ? 'true' : 'false' }),
    [filters, showNoise]
  );

  const { data, loading } = useWazuh('/alerts', { params: alertParams });

  const statusApi = useLocalEntityStatus('wazuhx-alert-status', 'new');

  const allAlerts = useMemo(() => {
    const raw = data?.data || [];
    const normalized = normalizeAlertsForUi(raw);
    return filterClientNoise(normalized, ruleIds, showNoise);
  }, [data, ruleIds, showNoise]);

  const visibleAlerts = useMemo(
    () => filterByStatusTab(allAlerts, { ...statusApi, tab: statusTab }),
    [allAlerts, statusTab, statusApi]
  );

  const hiddenNoiseCount = data?.stats?.hiddenNoiseCount ?? 0;

  const donutData = useMemo(() => severityDistribution(visibleAlerts), [visibleAlerts]);

  const timelineParams = useMemo(() => {
    const r = TIMELINE_RANGES.find((t) => t.id === timelineRange) || TIMELINE_RANGES[1];
    const to = new Date();
    const from = new Date(to.getTime() - r.days * 86400000);
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      interval: r.interval,
      agentId: filters.agentId || undefined,
      severity: filters.severity || undefined,
    };
  }, [timelineRange, filters.agentId, filters.severity]);

  const { data: timelineData } = useWazuh('/alerts/timeline', {
    params: timelineParams,
    refreshInterval: 60000,
  });

  useEffect(() => {
    const fetchLive = () => {
      apiFetch('/alerts/live-count')
        .then((d) => setLiveCount(d?.count ?? 0))
        .catch(() => {});
    };
    fetchLive();
    const id = setInterval(fetchLive, 15000);
    return () => clearInterval(id);
  }, []);

  const updateFilters = (patch) => setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = (checked) => {
    setSelected(checked ? new Set(visibleAlerts.map((a) => a.id)) : new Set());
  };

  const handleExport = () => {
    exportCsv(
      visibleAlerts,
      [
        { label: 'Timestamp', get: (r) => r.timestamp },
        { label: 'Severity', get: (r) => r.severityLabel || r.severity },
        { label: 'Agent', get: (r) => r.agentName },
        { label: 'Rule', get: (r) => r.ruleId },
        { label: 'Description', get: (r) => r.description },
        { label: 'MITRE', get: (r) => r.mitreTechnique },
        { label: 'Status', get: (r) => statusApi.getStatus(r.id) },
        { label: 'Count', get: (r) => r.count || 1 },
      ],
      `wazuhx-alerts-${Date.now()}.csv`
    );
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Alerts"
        subtitle="Monitor security events, manage status, and analyze trends"
        actions={
          <button type="button" className="btn-primary" onClick={handleExport}>
            Export CSV
          </button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[var(--text-secondary)] text-sm">
          <span className="text-2xl font-bold font-mono text-[var(--text-primary)]">{liveCount}</span>{' '}
          eventi/min
        </p>
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
          <input
            type="checkbox"
            checked={showNoise}
            onChange={(e) => {
              setShowNoise(e.target.checked);
              updateFilters({ page: 1 });
            }}
          />
          Mostra regole rumorose
        </label>
      </div>

      {!showNoise && hiddenNoiseCount > 0 && (
        <div className="p-3 rounded-md border border-[var(--border)] bg-[var(--bg-panel)] text-sm flex flex-wrap items-center justify-between gap-2">
          <span className="text-[var(--text-secondary)]">
            {hiddenNoiseCount} alert nascosti (rumore filtrato)
          </span>
          <button type="button" className="text-[var(--accent)] hover:underline" onClick={() => setShowNoise(true)}>
            Mostra tutti
          </button>
        </div>
      )}

      <AlertsGrid
        donutData={donutData}
        timelineData={timelineData}
        timelineRange={timelineRange}
        setTimelineRange={setTimelineRange}
      />

      <StatusTabs active={statusTab} onChange={setStatusTab} />

      <EntityFilterBar filters={filters} onChange={updateFilters} agents={agents} />

      <BulkActionBar
        selectedCount={selected.size}
        onMarkSeen={() => {
          statusApi.bulkSetStatus([...selected], 'seen');
          setSelected(new Set());
        }}
        onDismiss={() => {
          statusApi.bulkSetStatus([...selected], 'dismissed');
          setSelected(new Set());
        }}
        onDelete={() => {
          statusApi.deleteIds([...selected]);
          setSelected(new Set());
        }}
      />

      <GrafanaPanel title="Elenco alert" className="col-span-12 p-0 overflow-hidden">
        {loading ? (
          <AlertsSkeleton />
        ) : (
          <AlertTable
            alerts={visibleAlerts}
            selectable
            selectedIds={selected}
            onToggleSelect={toggleSelect}
            onToggleAll={toggleAll}
            getStatus={statusApi.getStatus}
          />
        )}
      </GrafanaPanel>

      {data?.pagination && (
        <div className="flex justify-center items-center gap-4">
          <button
            type="button"
            className="btn-secondary text-sm"
            disabled={filters.page <= 1}
            onClick={() => updateFilters({ page: filters.page - 1 })}
          >
            Prec
          </button>
          <span className="text-[var(--text-muted)] text-sm font-mono">
            {data.pagination.page} / {data.pagination.totalPages}
          </span>
          <button
            type="button"
            className="btn-secondary text-sm"
            disabled={filters.page >= data.pagination.totalPages}
            onClick={() => updateFilters({ page: filters.page + 1 })}
          >
            Succ
          </button>
        </div>
      )}
    </div>
  );
}

function AlertsGrid({ donutData, timelineData, timelineRange, setTimelineRange }) {
  return (
    <div className="grid grid-cols-12 gap-3">
      <GrafanaPanel title="Distribuzione severita" className="col-span-12 lg:col-span-6">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70}>
              {donutData.map((entry) => (
                <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] || '#5a5f72'} />
              ))}
            </Pie>
            <Tooltip contentStyle={chartTooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </GrafanaPanel>
      <GrafanaPanel title="Trend nel tempo" className="col-span-12 lg:col-span-6">
        <div className="flex justify-end mb-2">
          <select className="select text-sm" value={timelineRange} onChange={(e) => setTimelineRange(e.target.value)}>
            {TIMELINE_RANGES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={timelineData || []}>
            <CartesianGrid {...chartGridProps} />
            <XAxis dataKey="date" {...chartAxisProps} tickFormatter={(v) => String(v).slice(0, 10)} />
            <YAxis {...chartAxisProps} />
            <Tooltip contentStyle={chartTooltipStyle} />
            <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </GrafanaPanel>
    </div>
  );
}

function AlertsSkeleton() {
  return <div className="skeleton h-64 m-5" />;
}
