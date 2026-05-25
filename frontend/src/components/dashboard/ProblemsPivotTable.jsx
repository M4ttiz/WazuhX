import DataTable from './DataTable';

export default function ProblemsPivotTable({ rows, loading, title }) {
  if (loading) {
    return <div className="skeleton h-32 w-full rounded-md" />;
  }

  const columns = [
    { key: 'state', label: 'State' },
    { key: 'count', label: 'Count', className: 'font-mono text-sm' },
    {
      key: 'percent',
      label: '%',
      className: 'font-mono text-sm',
      render: (row) => `${row.percent}%`,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows?.map((r) => ({ ...r, id: r.state }))}
      emptyMessage={`Nessun problema ${title ? `— ${title}` : ''}`}
    />
  );
}
