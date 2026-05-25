import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Terminal, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatRelative } from '../../utils/formatters';
import { filterAndPaginate } from '../../utils/dashboardHelpers';
import DataTable from './DataTable';
import HostStatusBadge from './HostStatusBadge';

const PAGE_SIZE = 8;

export default function ProblemHostsTable({ rows = [], loading, onOpenTerminal }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const paginated = useMemo(
    () => filterAndPaginate(rows, { search, page, pageSize: PAGE_SIZE }),
    [rows, search, page]
  );

  if (loading) {
    return <div className="skeleton h-48 w-full rounded-md" />;
  }

  const columns = [
    {
      key: 'host',
      label: 'Host',
      render: (row) => (
        <Link to={`/agents/${row.id}`} className="text-[var(--accent)] hover:underline font-medium">
          {row.host}
        </Link>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <HostStatusBadge status={row.status} />,
    },
    {
      key: 'problems',
      label: 'Problems',
      className: 'font-mono text-sm',
    },
    {
      key: 'lastChange',
      label: 'Last Change',
      className: 'text-[var(--text-secondary)] text-sm',
      render: (row) => formatRelative(row.lastChange),
    },
    {
      key: 'terminal',
      label: 'Terminal',
      render: (row) => (
        <button
          type="button"
          className="btn-icon text-[var(--accent)] hover:bg-[var(--bg-panel-hover)]"
          onClick={() => onOpenTerminal?.(row)}
          aria-label={`SSH terminal for ${row.host}`}
          title="Open SSH terminal"
        >
          <Terminal size={18} />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="search"
            className="input w-full pl-9 !min-h-[36px]"
            placeholder="Search host or IP..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            aria-label="Search hosts"
          />
        </div>
        <span className="text-xs text-[var(--text-muted)]">
          {paginated.total} host{paginated.total !== 1 ? 's' : ''}
        </span>
      </div>

      <DataTable
        columns={columns}
        rows={paginated.rows}
        emptyMessage="No problem hosts found"
      />

      {paginated.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <button
            type="button"
            className="btn-ghost flex items-center gap-1"
            disabled={paginated.page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft size={16} />
            Prev
          </button>
          <span className="text-[var(--text-secondary)]">
            {paginated.page} / {paginated.totalPages}
          </span>
          <button
            type="button"
            className="btn-ghost flex items-center gap-1"
            disabled={paginated.page >= paginated.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
