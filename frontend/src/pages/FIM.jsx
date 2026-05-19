import { useState, useMemo, Fragment } from 'react';
import { useWazuh } from '../hooks/useWazuh';
import PageHeader from '../components/PageHeader';
import GrafanaPanel from '../components/GrafanaPanel';
import EmptyState from '../components/EmptyState';
import { FileSearch } from 'lucide-react';
import { formatDate } from '../utils/formatters';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { chartTooltipStyle, chartAxisProps, chartGridProps } from '../utils/chartTheme';

const TYPE_COLORS = {
  added: 'text-green-400 bg-green-500/20',
  modified: 'text-yellow-400 bg-yellow-500/20',
  deleted: 'text-red-400 bg-red-500/20',
};

function topDirectory(path) {
  if (!path) return '/';
  const parts = path.split('/').filter(Boolean);
  return parts.length ? `/${parts[0]}` : '/';
}

export default function FIM() {
  const { data: events, loading, error } = useWazuh('/fim');
  const [pathFilter, setPathFilter] = useState('');
  const [types, setTypes] = useState({ added: true, modified: true, deleted: true });
  const [sortKey, setSortKey] = useState('timestamp');
  const [sortDir, setSortDir] = useState('desc');
  const [expanded, setExpanded] = useState(null);

  const list = Array.isArray(events) ? events : [];

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const stats = useMemo(() => {
    const today = list.filter((e) => new Date(e.timestamp).getTime() >= todayStart);
    return {
      total: today.length,
      added: today.filter((e) => e.type === 'added').length,
      modified: today.filter((e) => e.type === 'modified').length,
      deleted: today.filter((e) => e.type === 'deleted').length,
    };
  }, [list, todayStart]);

  const timeline = useMemo(() => {
    const buckets = {};
    list.forEach((e) => {
      const day = e.timestamp?.slice(0, 10) || 'unknown';
      buckets[day] = (buckets[day] || 0) + 1;
    });
    return Object.entries(buckets)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);
  }, [list]);

  const dirChart = useMemo(() => {
    const counts = {};
    list.forEach((e) => {
      const dir = topDirectory(e.path);
      counts[dir] = (counts[dir] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [list]);

  const highRisk = useMemo(() => list.filter((e) => e.critical), [list]);

  const filtered = useMemo(() => {
    let rows = list.filter((e) => types[e.type] !== false);
    if (pathFilter) {
      const q = pathFilter.toLowerCase();
      rows = rows.filter((e) => e.path?.toLowerCase().includes(q));
    }
    rows.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [list, pathFilter, types, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const toggleType = (type) => setTypes((t) => ({ ...t, [type]: !t[type] }));

  return (
    <div className="space-y-4">
      <PageHeader title="File Integrity Monitoring" subtitle="Eventi di modifica file con analisi visiva" />

      {error && <EmptyState icon={FileSearch} title="Errore" message={error} />}

      {!error && !loading && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              ['Eventi oggi', stats.total],
              ['Aggiunti', stats.added],
              ['Modificati', stats.modified],
              ['Eliminati', stats.deleted],
            ].map(([label, val]) => (
              <div key={label} className="card text-center py-4">
                <p className="text-2xl font-bold text-[#f1f5f9]">{val}</p>
                <p className="text-xs text-[#94a3b8] mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-12 gap-3">
            <GrafanaPanel title="Timeline eventi" className="col-span-12 lg:col-span-6">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={timeline}>
                  <CartesianGrid {...chartGridProps} />
                  <XAxis dataKey="date" {...chartAxisProps} />
                  <YAxis {...chartAxisProps} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </GrafanaPanel>
            <GrafanaPanel title="Top directory" className="col-span-12 lg:col-span-6">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dirChart} layout="vertical">
                  <CartesianGrid {...chartGridProps} />
                  <XAxis type="number" {...chartAxisProps} />
                  <YAxis type="category" dataKey="name" width={80} {...chartAxisProps} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </GrafanaPanel>
          </div>

          {highRisk.length > 0 && (
            <GrafanaPanel title="Percorsi ad alto rischio" className="border-red-500/30 bg-red-500/5">
              <ul className="text-sm space-y-1 max-h-32 overflow-y-auto">
                {highRisk.slice(0, 20).map((e) => (
                  <li key={e.id} className="font-mono text-xs text-[#f1f5f9]">
                    {e.agentName}: {e.path} ({e.type})
                  </li>
                ))}
              </ul>
            </GrafanaPanel>
          )}

          <GrafanaPanel className="flex flex-wrap gap-4 items-end">
            <input
              className="input flex-1 min-w-[200px]"
              placeholder="Filtra per path..."
              value={pathFilter}
              onChange={(e) => setPathFilter(e.target.value)}
            />
            {['added', 'modified', 'deleted'].map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm text-[#94a3b8] cursor-pointer">
                <input type="checkbox" checked={types[t]} onChange={() => toggleType(t)} />
                {t}
              </label>
            ))}
          </GrafanaPanel>
        </>
      )}

      {loading && <div className="card skeleton h-64" />}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState icon={FileSearch} title="Nessun evento FIM" message="Nessun evento con i filtri correnti." />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="table-wrap border-0 rounded-none">
            <table>
              <thead>
                <tr>
                  <th className="cursor-pointer" onClick={() => toggleSort('timestamp')}>Timestamp</th>
                  <th className="cursor-pointer" onClick={() => toggleSort('agentName')}>Agente</th>
                  <th className="cursor-pointer" onClick={() => toggleSort('path')}>Path</th>
                  <th className="cursor-pointer" onClick={() => toggleSort('type')}>Tipo</th>
                  <th>Hash diff</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <Fragment key={e.id}>
                    <tr
                      className={`cursor-pointer ${e.critical ? 'bg-red-500/10' : ''}`}
                      onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                    >
                      <td className="text-xs text-[#94a3b8]">{formatDate(e.timestamp)}</td>
                      <td>{e.agentName}</td>
                      <td className="font-mono text-xs max-w-md truncate">{e.path}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded text-xs uppercase ${TYPE_COLORS[e.type] || ''}`}>
                          {e.type}
                        </span>
                      </td>
                      <td className="font-mono text-xs text-[#94a3b8]">
                        {e.md5Before || '—'} → {e.md5After || e.sha256After || '—'}
                      </td>
                    </tr>
                    {expanded === e.id && (
                      <tr>
                        <td colSpan={5} className="!h-auto py-3 bg-[#0f172a] text-xs">
                          <p>Permessi: {e.permissions || '—'} · Utente: {e.user}</p>
                          <p className="mt-1">MD5: {e.md5Before} → {e.md5After}</p>
                          <p>SHA256: {e.sha256Before} → {e.sha256After}</p>
                          <p className="mt-1">Size: {e.size}</p>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
