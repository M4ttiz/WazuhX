import { createContext, useContext, useState, useCallback } from 'react';
import { X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => dismiss(id), 5000);
  }, [dismiss]);

  const styles = {
    error: 'bg-red-500/20 border-red-500/30 text-red-400',
    success: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
    info: 'bg-[#1e293b] border-[rgba(255,255,255,0.1)] text-[#f1f5f9]',
  };

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <ToastList toasts={toasts} styles={styles} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastList({ toasts, styles, dismiss }) {
  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm shadow-xl ${styles[t.type] || styles.info}`}
        >
          <span className="flex-1">{t.message}</span>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            className="btn-icon shrink-0 text-current opacity-70 hover:opacity-100"
            aria-label="Chiudi notifica"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
