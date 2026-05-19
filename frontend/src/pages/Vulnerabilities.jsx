import { useState, useMemo } from 'react';
import { useWazuh } from '../hooks/useWazuh';
import PageHeader from '../components/PageHeader';
import KpiCard from '../components/KpiCard';
import SeverityBadge from '../components/SeverityBadge';
import EmptyState from '../components/EmptyState';
import { ShieldAlert, ChevronDown, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { chartTooltipStyle, SEVERITY_COLORS } from '../utils/chartTheme';

const SEVERITY_OPTIONS = ['', 'critical', 'high', 'medium', 'low'];

export default function Vulnerabilities() {
  const { data, loading, error } = useWazuh('/vulnerabilities');
  const vulns = data?.data || [];
  const stats = data?.stats || {};

  const [severity, setSeverity] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [packageFilter, setPackageFilter] = useState('');
  const [fixOnly, setFixOnly] = useState(false);
  const [sortKey, setSortKey] = useState('cvss');
  const [sortDir, setSortDir] = useState('desc');
  const [expandedAgents, setExpandedAgents] = useState(new Set());
  const [grouped, setGrouped] = useState(true);

  const agents = useMemo(() => {
    const set = new Set(vulns.map((v) => v.agentName).filter(Boolean));
    return [...set].sort();
  }, [vulns]);

  const filtered = useMemo(() => {
    let rows = [...vulns];
    if (severity) rows = rows.filter((v) => v.severity === severity);
    if (agentFilter) rows = rows.filter((v) => v.agentName === agentFilter);
    if (packageFilter) {
      const q = packageFilter.toLowerCase();
      rows = rows.filter((v) => v.package?.toLowerCase().includes(q));
    }
    if (fixOnly) rows = rows.filter((v) => v.hasFix || v.fixVersion);
    rows.sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [vulns, severity, agentFilter, packageFilter, fixOnly, sortKey, sortDir]);

  const donutData = useMemo(() => {
    const dist = { critical: 0, high: 0, medium: 0, low: 0 };
    filtered.forEach((v) => {
      if (dist[v.severity] != null) dist[v.severity] += 1;
    });
    return Object.entries(dist)
      .filter(([, n]) => n > 0)
      .map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const byAgent = useMemo(() => {
    const map = {};
    filtered.forEach((v) => {
      const key = v.agentId || v.agentName;
      if (!map[key]) {
        map[key] = {
          agentId: key,
          agentName: v.agentName,
          vulns: [],
          lastScanned: null,
        };
      }
      map[key].vulns.push(v);
      const ts = v.detectedAt ? new Date(v.detectedAt).getTime() : 0;
      if (!map[key].lastScanned || ts > map[key].lastScanned) {
        map[key].lastScanned = ts;
      }
    });
    return Object.values(map).sort((a, b) => b.vulns.length - a.vulns.length);
  }, [filtered]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const toggleAgent = (id) => {
    setExpandedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const emptyMessage = error
    ? error
    : 'Nessuna vulnerabilità trovata. Verifica WAZUH_INDEXER_URL e che gli agenti eseguano vulnerability detection.';

  return (
    <div className="space-y-6">
      <PageHeader title="Vulnerabilità" subtitle="Traccia CVE e patch mancanti sull'infrastruttura" />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        <KpiCard label="Totale CVE" value={stats.total} variant="info" loading={loading} />
        <KpiCard label="Critical" value={stats.critical} variant="critical" loading={loading} />
        <KpiCard label="High" value={stats.high} variant="warning" loading={loading} />
        <KpiCard label="Medium" value={stats.medium} variant="accent" loading={loading} />
        <KpiCard label="Low" value={stats.low} variant="ok" loading={loading} />
        <KpiCard label="Con fix" value={stats.withFix} variant="ok" loading={loading} />
      </div>

      {!loading && donutData.length > 0 && (
        <div className="card">
          <p className="card-title">Distribuzione severità</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {donutData.map((d) => (
                  <Cell key={d.name} fill={SEVERITY_COLORS[d.name] || '#64748b'} />
                ))}
              </Pie>
              <Tooltip contentStyle={chartTooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card flex flex-wrap gap-3 items-end">
        <select className="select" value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="">Tutte le severità</option>
          {SEVERITY_OPTIONS.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select className="select" value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}>
          <option value="">Tutti gli agenti</option>
          {agents.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <input
          className="input min-w-[160px]"
          placeholder="Pacchetto..."
          value={packageFilter}
          onChange={(e) => setPackageFilter(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer">
          <input type="checkbox" checked={fixOnly} onChange={(e) => setFixOnly(e.target.checked)} />
          Solo con fix
        </label>
        <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer ml-auto">
          <input type="checkbox" checked={grouped} onChange={(e) => setGrouped(e.target.checked)} />
          Raggruppa per agente
        </label>
      </div>

      {loading && <div className="card skeleton h-48" />}

      {!loading && filtered.length === 0 && (
        <EmptyState icon={ShieldAlert} title="Nessun dato CVE" message={emptyMessage} />
      )}

      {!loading && filtered.length > 0 && grouped && (
        <div className="space-y-4">
          {byAgent.map((group) => (
            <div key={group.agentId} className="card p-0 overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-[rgba(255,255,255,0.03)]"
                onClick={() => toggleAgent(group.agentId)}
              >
                <span className="flex items-center gap-2 font-semibold text-primary">
                  {expandedAgents.has(group.agentId) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  {group.agentName}
                  <span className="text-xs text-muted font-normal">({group.vulns.length} CVE)</span>
                </span>
                <span className="text-xs text-muted">
                  Ultima scansione:{' '}
                  {group.lastScanned ? new Date(group.lastScanned).toLocaleString('it-IT') : '—'}
                </span>
              </button>
              {expandedAgents.has(group.agentId) && (
                <VulnTable rows={group.vulns} toggleSort={toggleSort} />
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length > 0 && !grouped && (
        <div className="card p-0 overflow-hidden">
          <VulnTable rows={filtered} toggleSort={toggleSort} />
        </div>
      )}
    </div>
  );
}

function VulnTable({ rows, toggleSort }) {
  return (
    <div className="table-wrap border-0 rounded-none border-t border-[rgba(255,255,255,0.06)]">
      <table>
        <thead>
          <tr>
            <th className="cursor-pointer" onClick={() => toggleSort('cve')}>CVE</th>
            <th className="cursor-pointer" onClick={() => toggleSort('agentName')}>Agente</th>
            <th className="cursor-pointer" onClick={() => toggleSort('package')}>Pacchetto</th>
            <th>Descrizione</th>
            <th>Versione</th>
            <th>Fix</th>
            <th className="cursor-pointer" onClick={() => toggleSort('cvss')}>CVSS</th>
            <th>Severità</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((v) => (
            <tr key={v.id}>
              <td>
                <a
                  href={`https://nvd.nist.gov/vuln/detail/${v.cve}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:underline font-mono text-xs"
                >
                  {v.cve}
                </a>
              </td>
              <td>{v.agentName}</td>
              <td>{v.package}</td>
              <td className="text-xs text-muted max-w-xs truncate" title={v.description}>{v.description || '—'}</td>
              <td className="font-mono text-xs">{v.version}</td>
              <td className="font-mono text-xs text-success">{v.fixVersion || (v.hasFix ? 'sì' : '—')}</td>
              <td className="font-mono font-semibold">{v.cvss}</td>
              <td>
                <SeverityBadge
                  label={v.severity}
                  level={v.severity === 'critical' ? 15 : v.severity === 'high' ? 10 : 5}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
