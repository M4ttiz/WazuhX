import { createContext, useContext, useState, useEffect } from 'react';
import { setDataSourceListener } from '../utils/api';

const DataSourceContext = createContext({ isMock: false });

export function DataSourceProvider({ children }) {
  const [isMock, setIsMock] = useState(false);

  useEffect(() => {
    setDataSourceListener((source) => setIsMock(source === 'mock'));
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setIsMock(d.wazuh === 'mock' || d.useMock))
      .catch(() => setIsMock(true));
  }, []);

  return (
    <DataSourceContext.Provider value={{ isMock }}>
      {children}
    </DataSourceContext.Provider>
  );
}

export function useDataSource() {
  return useContext(DataSourceContext);
}
