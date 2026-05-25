/**
 * Reusable data table component for Analytics/Trends pages.
 * Supports custom column renderers and empty state.
 */
export default function DataTable({ columns = [], rows = [], emptyMessage = 'No data' }) {
  if (!rows.length) {
    return (
      <p className="text-center text-[var(--text-muted)] py-8 text-sm">{emptyMessage}</p>
    );
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
          {rows.map((row, rowIdx) => (
            <tr key={row.id ?? rowIdx}>
              {columns.map((col) => (
                <td key={col.key} className={col.className || ''}>
                  {col.render ? col.render(row) : (row[col.key] ?? '--')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
