const DEFAULT_TABS = [
  { id: 'all', label: 'Tutti' },
  { id: 'new', label: 'Nuovi' },
  { id: 'seen', label: 'Visti' },
  { id: 'dismissed', label: 'Archiviati' },
];

export default function StatusTabs({ active, onChange, tabs = DEFAULT_TABS }) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-[rgba(255,255,255,0.1)]">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`px-4 py-2 text-sm font-medium rounded-t-md min-h-[44px] ${
            active === t.id ? 'tab-active' : 'text-[#94a3b8] hover:text-[#f1f5f9]'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
