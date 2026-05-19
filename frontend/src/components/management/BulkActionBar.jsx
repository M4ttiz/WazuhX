import { useState } from 'react';

export default function BulkActionBar({
  selectedCount,
  onMarkSeen,
  onDismiss,
  onDelete,
  seenLabel = 'Segna come visto',
  dismissLabel = 'Archivia',
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <div className="card flex flex-wrap items-center gap-3 bg-[#334155]/40 border-[#f59e0b]/30">
      <span className="text-sm text-[#f1f5f9] font-medium">{selectedCount} selezionati</span>
      <button type="button" className="btn-secondary text-sm" onClick={onMarkSeen}>
        {seenLabel}
      </button>
      <button type="button" className="btn-secondary text-sm" onClick={onDismiss}>
        {dismissLabel}
      </button>
      {!confirmDelete ? (
        <button type="button" className="btn-danger text-sm" onClick={() => setConfirmDelete(true)}>
          Elimina
        </button>
      ) : (
        <>
          <span className="text-xs text-[#94a3b8]">Confermi eliminazione locale?</span>
          <button
            type="button"
            className="btn-danger text-sm"
            onClick={() => {
              onDelete();
              setConfirmDelete(false);
            }}
          >
            Conferma
          </button>
          <button type="button" className="btn-ghost text-sm" onClick={() => setConfirmDelete(false)}>
            Annulla
          </button>
        </>
      )}
    </div>
  );
}
