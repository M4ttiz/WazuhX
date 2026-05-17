import { useEffect, useRef } from 'react';

export function useAutoRefresh(callback, intervalMs, enabled = true) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || !intervalMs) return undefined;
    const id = setInterval(() => savedCallback.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
}

export function getRefreshInterval(key, defaultMs = 15000) {
  const stored = localStorage.getItem(`wazuhx-refresh-${key}`);
  return stored ? parseInt(stored, 10) : defaultMs;
}
