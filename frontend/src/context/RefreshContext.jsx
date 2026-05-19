import { createContext, useContext, useState, useCallback } from 'react';

const RefreshContext = createContext({
  refreshSignal: 0,
  lastUpdate: Date.now(),
  triggerRefresh: () => {},
  isRefreshing: false,
});

export function RefreshProvider({ children }) {
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const triggerRefresh = useCallback(() => {
    setIsRefreshing(true);
    setRefreshSignal((k) => k + 1);
    setLastUpdate(Date.now());
    setTimeout(() => setIsRefreshing(false), 600);
  }, []);

  return (
    <RefreshContext.Provider
      value={{ refreshSignal, lastUpdate, triggerRefresh, isRefreshing }}
    >
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh() {
  return useContext(RefreshContext);
}
