import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/api';

export function useWazuh(path, options = {}) {
  const { params = {}, skip = false, refreshInterval } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState(null);

  const queryString = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');

  const url = queryString ? `${path}?${queryString}` : path;

  const fetchData = useCallback(async () => {
    if (skip) return;
    try {
      setLoading(true);
      setError(null);
      const result = await apiFetch(url);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [url, skip]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!refreshInterval) return undefined;
    const id = setInterval(fetchData, refreshInterval);
    return () => clearInterval(id);
  }, [fetchData, refreshInterval]);

  return { data, loading, error, refetch: fetchData };
}
