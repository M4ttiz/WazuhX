export default function DataTable({ columns, rows, emptyMessage = 'Nessun dato' }) {
  if (!rows?.length) {
    return <p className="text-center text-[var(--text-muted)] py-8 text-sm">{emptyMessage}</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id ?? row.key ?? JSON.stringify(row)}>
              {columns.map((col) => (
                <td key={col.key} className={col.className}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
