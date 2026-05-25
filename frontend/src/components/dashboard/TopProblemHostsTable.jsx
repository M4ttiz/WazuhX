import { Link } from 'react-router-dom';
import { formatRelative } from '../../utils/formatters';
import DataTable from './DataTable';
import HostStatusBadge from './HostStatusBadge';

export default function TopProblemHostsTable({ rows, loading }) {
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
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      emptyMessage="Nessun host con problemi"
    />
  );
}
