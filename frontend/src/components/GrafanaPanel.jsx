export default function GrafanaPanel({ title, subtitle, children, className = '' }) {
  return (
    <div
      className={`bg-[var(--bg-panel)] border border-[var(--border)] rounded-md p-4 flex flex-col gap-3 ${className}`}
    >
      {(title || subtitle) && (
        <div className="flex items-center justify-between gap-2">
          {title && (
            <span className="text-sm font-medium text-[var(--text-primary)]">{title}</span>
          )}
          {subtitle && (
            <span className="text-xs text-[var(--text-muted)]">{subtitle}</span>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
