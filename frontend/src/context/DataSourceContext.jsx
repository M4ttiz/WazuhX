import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setDataSourceListener } from '../utils/api';

const DataSourceContext = createContext({
  isMock: false,
  wazuhConnected: false,
  refreshHealth: () => {},
});

export function DataSourceProvider({ children }) {
  const [isMock, setIsMock] = useState(false);
  const [wazuhConnected, setWazuhConnected] = useState(false);

  const refreshHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health');
      const d = await res.json();
      setIsMock(d.wazuh === 'mock' || d.useMock === true);
      setWazuhConnected(d.wazuh === 'connected');
    } catch {
      setIsMock(true);
      setWazuhConnected(false);
    }
  }, []);

  useEffect(() => {
    setDataSourceListener((source) => setIsMock(source === 'mock'));
    refreshHealth();
  }, [refreshHealth]);

  return (
    <DataSourceContext.Provider value={{ isMock, wazuhConnected, refreshHealth }}>
      {children}
    </DataSourceContext.Provider>
  );
}

export function useDataSource() {
  return useContext(DataSourceContext);
}
