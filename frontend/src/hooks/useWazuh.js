import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch } from '../utils/api';
import { useRefresh } from '../context/RefreshContext';

function serializeParams(params) {
  return JSON.stringify(
    Object.keys(params)
      .sort()
      .reduce((acc, k) => {
        const v = params[k];
        if (v !== undefined && v !== '') acc[k] = v;
        return acc;
      }, {})
  );
}

export function useWazuh(path, options = {}) {
  const { params = {}, skip = false, refreshInterval } = options;
  const { refreshSignal } = useRefresh();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState(null);

  const paramsKey = serializeParams(params);

  const queryString = useMemo(() => {
    const parsed = JSON.parse(paramsKey);
    return Object.entries(parsed)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
  }, [paramsKey]);

  const url = queryString ? `${path}?${queryString}` : path;

  const fetchData = useCallback(
    async (silent = false) => {
      if (skip) return;
      try {
        if (!silent) setLoading(true);
        setError(null);
        const result = await apiFetch(url);
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [url, skip]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshSignal]);

  useEffect(() => {
    if (!refreshInterval || skip) return undefined;
    const id = setInterval(() => fetchData(true), refreshInterval);
    return () => clearInterval(id);
  }, [fetchData, refreshInterval, skip]);

  return { data, loading, error, refetch: () => fetchData(false) };
}
