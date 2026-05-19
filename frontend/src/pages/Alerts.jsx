import { useState, useEffect, useMemo } from 'react';
import { useWazuh } from '../hooks/useWazuh';
import { apiFetch } from '../utils/api';
import AlertTable from '../components/AlertTable';
import PageHeader from '../components/PageHeader';
import StatusTabs from '../components/management/StatusTabs';
import BulkActionBar from '../components/management/BulkActionBar';
import EntityFilterBar from '../components/management/EntityFilterBar';
import { exportCsv } from '../utils/formatters';
import { normalizeAlertsForUi, severityDistribution } from '../utils/alertFields';
import { useLocalEntityStatus, filterByStatusTab } from '../hooks/useLocalEntityStatus';
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

  const { data: agentsData } = useWazuh('/agents');
  const agents = Array.isArray(agentsData) ? agentsData : [];

  const { data, loading } = useWazuh('/alerts', { params: filters });

  const statusApi = useLocalEntityStatus('wazuhx-alert-status', 'new');

  const allAlerts = useMemo(
    () => normalizeAlertsForUi(data?.data || []),
    [data]
  );

  const visibleAlerts = useMemo(
    () => filterByStatusTab(allAlerts, { ...statusApi, tab: statusTab }),
    [allAlerts, statusTab, statusApi]
  );

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
      ],
      `wazuhx-alerts-${Date.now()}.csv`
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alert"
        subtitle="Monitora eventi di sicurezza, gestisci stato e analizza trend"
        actions={
          <button type="button" className="btn-primary" onClick={handleExport}>
            Export CSV
          </button>
        }
      />

      <div className="flex items-center justify-between">
        <p className="text-[#94a3b8] text-sm">
          <span className="text-2xl font-bold text-[#f1f5f9]">{liveCount}</span> eventi/min
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <p className="card-title">Distribuzione severità</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70}>
                {donutData.map((entry) => (
                  <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] || '#64748b'} />
                ))}
              </Pie>
              <Tooltip contentStyle={chartTooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="flex justify-between items-center mb-2">
            <p className="card-title mb-0">Trend nel tempo</p>
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
        </div>
      </div>

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

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="skeleton h-64 m-5" />
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
      </div>

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
          <span className="text-[#64748b] text-sm">
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
