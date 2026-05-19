import { useState, useCallback, useEffect } from 'react';

function loadMap(storageKey) {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || '{}');
  } catch {
    return {};
  }
}

function saveMap(storageKey, map) {
  localStorage.setItem(storageKey, JSON.stringify(map));
}

export function useLocalEntityStatus(storageKey, defaultStatus = 'new') {
  const [statusMap, setStatusMap] = useState(() => loadMap(storageKey));
  const [deletedIds, setDeletedIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(`${storageKey}-deleted`) || '[]'));
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    saveMap(storageKey, statusMap);
  }, [storageKey, statusMap]);

  useEffect(() => {
    localStorage.setItem(`${storageKey}-deleted`, JSON.stringify([...deletedIds]));
  }, [storageKey, deletedIds]);

  const getStatus = useCallback(
    (id) => statusMap[id] || defaultStatus,
    [statusMap, defaultStatus]
  );

  const setStatus = useCallback((id, status) => {
    setStatusMap((m) => ({ ...m, [id]: status }));
  }, []);

  const bulkSetStatus = useCallback((ids, status) => {
    setStatusMap((m) => {
      const next = { ...m };
      ids.forEach((id) => {
        next[id] = status;
      });
      return next;
    });
  }, []);

  const deleteIds = useCallback((ids) => {
    setDeletedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  const isDeleted = useCallback((id) => deletedIds.has(id), [deletedIds]);

  return {
    getStatus,
    setStatus,
    bulkSetStatus,
    deleteIds,
    isDeleted,
    statusMap,
  };
}

export function filterByStatusTab(items, { getStatus, isDeleted, tab, defaultStatus = 'new' }) {
  return items.filter((item) => {
    if (isDeleted(item.id)) return false;
    const st = getStatus(item.id) || defaultStatus;
    if (tab === 'all') return st !== 'dismissed';
    if (tab === 'dismissed') return st === 'dismissed';
    return st === tab;
  });
}
