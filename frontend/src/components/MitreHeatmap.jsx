export default function MitreHeatmap({ data = [] }) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
      {data.map((item) => {
        const intensity = item.count / max;
        const bg = `rgba(37, 99, 235, ${0.08 + intensity * 0.35})`;
        return (
          <div
            key={item.id}
            className="rounded-md border border-border p-3 text-center transition-colors duration-150 hover:bg-hover"
            style={{ backgroundColor: bg }}
            title={`${item.name}: ${item.count} eventi`}
          >
            <p className="font-mono text-accent text-sm font-semibold">{item.id}</p>
            <p className="text-xs text-secondary mt-1 line-clamp-2">{item.name}</p>
            <p className="font-semibold text-primary text-lg mt-1">{item.count}</p>
          </div>
        );
      })}
    </div>
  );
}
