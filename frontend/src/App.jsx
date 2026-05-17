import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Agents from './pages/Agents';
import AgentDetail from './pages/AgentDetail';
import Alerts from './pages/Alerts';
import Vulnerabilities from './pages/Vulnerabilities';
import FIM from './pages/FIM';
import Compliance from './pages/Compliance';
import AIAnalyst from './pages/AIAnalyst';
import ReportGenerator from './pages/ReportGenerator';
import Settings from './pages/Settings';

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    setLastUpdate(Date.now());
  };

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="ml-[240px] transition-all duration-300">
        <Header onRefresh={handleRefresh} lastUpdate={lastUpdate} />
        <main className="p-6">
          <Routes>
            <Route path="/" element={<Dashboard key={refreshKey} />} />
            <Route path="/agents" element={<Agents key={refreshKey} />} />
            <Route path="/agents/:id" element={<AgentDetail key={refreshKey} />} />
            <Route path="/alerts" element={<Alerts key={refreshKey} />} />
            <Route path="/vulnerabilities" element={<Vulnerabilities key={refreshKey} />} />
            <Route path="/fim" element={<FIM key={refreshKey} />} />
            <Route path="/compliance" element={<Compliance key={refreshKey} />} />
            <Route path="/ai" element={<AIAnalyst key={refreshKey} />} />
            <Route path="/reports" element={<ReportGenerator key={refreshKey} />} />
            <Route path="/settings" element={<Settings key={refreshKey} />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
