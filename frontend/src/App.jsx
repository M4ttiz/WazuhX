import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { useDataSource } from './context/DataSourceContext';
import Dashboard from './pages/Dashboard';
import Agents from './pages/Agents';
import AgentDetail from './pages/AgentDetail';
import Alerts from './pages/Alerts';
import Vulnerabilities from './pages/Vulnerabilities';
import FIM from './pages/FIM';
import Metrics from './pages/Metrics';
import Compliance from './pages/Compliance';
import AIAnalyst from './pages/AIAnalyst';
import ReportGenerator from './pages/ReportGenerator';
import Settings from './pages/Settings';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isMock } = useDataSource();

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:ml-[220px] ml-0 min-h-screen flex flex-col">
        {isMock && (
          <div className="banner-warning">
            Wazuh non raggiungibile — modalità demo
          </div>
        )}
        <Header onMenuOpen={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/agents/:id" element={<AgentDetail />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/vulnerabilities" element={<Vulnerabilities />} />
            <Route path="/fim" element={<FIM />} />
            <Route path="/metrics" element={<Metrics />} />
            <Route path="/compliance" element={<Compliance />} />
            <Route path="/ai" element={<AIAnalyst />} />
            <Route path="/reports" element={<ReportGenerator />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
