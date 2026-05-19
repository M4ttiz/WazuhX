export default function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-full bg-[#334155]/50 flex items-center justify-center mb-4 text-[#94a3b8]">
          <Icon size={28} />
        </div>
      )}
      <h3 className="text-lg font-semibold text-[#f1f5f9]">{title}</h3>
      {message && <p className="text-sm text-[#94a3b8] mt-2 max-w-md">{message}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
