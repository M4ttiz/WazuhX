export default function MitreHeatmap({ data = [] }) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
      {data.map((item) => {
        const intensity = item.count / max;
        const bg = `rgba(0, 212, 255, ${0.15 + intensity * 0.85})`;
        return (
          <div
            key={item.id}
            className="rounded border border-border p-3 text-center transition-all duration-300 hover:shadow-glow"
            style={{ backgroundColor: bg }}
            title={`${item.name}: ${item.count} eventi`}
          >
            <p className="font-mono text-accent text-sm font-bold">{item.id}</p>
            <p className="text-xs text-muted mt-1 line-clamp-2">{item.name}</p>
            <p className="font-mono text-lg mt-1">{item.count}</p>
          </div>
        );
      })}
    </div>
  );
}
