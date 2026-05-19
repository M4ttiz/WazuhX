import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';

export default function Settings() {
  const { toast } = useToast();
  const [theme, setTheme] = useState(localStorage.getItem('wazuhx-theme') || 'dark');
  const [refreshDashboard, setRefreshDashboard] = useState(
    localStorage.getItem('wazuhx-refresh-dashboard') || '15000'
  );
  const [notifications, setNotifications] = useState(
    localStorage.getItem('wazuhx-notifications') === 'true'
  );
  const [testResult, setTestResult] = useState(null);
  const [wazuhHost, setWazuhHost] = useState(
    localStorage.getItem('wazuhx-wazuh-host') || 'https://localhost'
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
    localStorage.setItem('wazuhx-theme', theme);
  }, [theme]);

  const handleTestConnection = async () => {
    try {
      const res = await fetch('/api/settings/test-connection', { method: 'POST' });
      const data = await res.json();
      setTestResult(data);
      toast(data.success ? 'Connessione OK' : data.message, data.success ? 'success' : 'error');
    } catch (err) {
      setTestResult({ success: false, message: err.message });
      toast('Test fallito', 'error');
    }
  };

  const saveRefresh = (key, value) => {
    localStorage.setItem(`wazuhx-refresh-${key}`, value);
    toast('Intervallo salvato', 'success');
  };

  const requestNotifications = async () => {
    if (!('Notification' in window)) {
      toast('Browser non supporta notifiche', 'error');
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifications(perm === 'granted');
    localStorage.setItem('wazuhx-notifications', perm === 'granted');
    toast(perm === 'granted' ? 'Notifiche attivate' : 'Notifiche negate', perm === 'granted' ? 'success' : 'error');
  };

  return (
    <div className="max-w-xl space-y-4">
      <div className="card space-y-4">
        <p className="card-title mb-0">Connessione Wazuh</p>
        <p className="text-secondary text-sm">
          Manager API: WAZUH_API_URL, WAZUH_USER, WAZUH_PASSWORD.
          Per alert, grafici e CVE (Wazuh 4.8+): WAZUH_INDEXER_URL, WAZUH_INDEXER_USER, WAZUH_INDEXER_PASSWORD.
        </p>
        <button type="button" className="btn-primary" onClick={handleTestConnection}>
          Test Connessione
        </button>
        {testResult && (
          <p className={`text-sm ${testResult.success ? 'text-success' : 'text-danger'}`}>
            {testResult.success ? 'Connesso' : 'Errore'}: {testResult.message}
            {testResult.agentCount !== undefined && ` (${testResult.agentCount} agenti)`}
          </p>
        )}
      </div>

      <div className="card space-y-4">
        <p className="card-title mb-0">Auto-refresh</p>
        <label className="block">
          <span className="text-secondary text-xs">Dashboard (ms)</span>
          <input
            type="number"
            className="input w-full mt-1"
            value={refreshDashboard}
            onChange={(e) => setRefreshDashboard(e.target.value)}
            onBlur={() => saveRefresh('dashboard', refreshDashboard)}
          />
        </label>
      </div>

      <div className="card space-y-4">
        <p className="card-title mb-0">Gemini API</p>
        <p className="text-secondary text-sm">
          Configura GEMINI_API_KEY nel file .env del backend.
        </p>
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noreferrer"
          className="text-accent hover:underline text-sm"
        >
          Ottieni API key gratuita
        </a>
      </div>

      <div className="card space-y-4">
        <p className="card-title mb-0">Aspetto</p>
        <div className="flex gap-2">
          <button
            type="button"
            className={`px-4 py-2 rounded-md text-sm font-medium ${theme === 'dark' ? 'tab-active' : 'btn-secondary'}`}
            onClick={() => setTheme('dark')}
          >
            Dark
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-md text-sm font-medium ${theme === 'light' ? 'tab-active' : 'btn-secondary'}`}
            onClick={() => setTheme('light')}
          >
            Light
          </button>
        </div>
      </div>

      <div className="card space-y-4">
        <p className="card-title mb-0">Notifiche browser</p>
        <button type="button" className="btn-primary" onClick={requestNotifications}>
          {notifications ? 'Notifiche attive' : 'Abilita notifiche'}
        </button>
        <p className="text-muted text-xs">Alert per severità ≥ 12</p>
      </div>

      <div className="card space-y-4">
        <p className="card-title mb-0">Wazuh Dashboard originale</p>
        <input
          className="input w-full"
          value={wazuhHost}
          onChange={(e) => {
            setWazuhHost(e.target.value);
            localStorage.setItem('wazuhx-wazuh-host', e.target.value);
          }}
          placeholder="https://your-wazuh-host"
        />
        <a
          href={wazuhHost}
          target="_blank"
          rel="noreferrer"
          className="btn-primary inline-block text-center"
        >
          Apri Wazuh Dashboard
        </a>
      </div>
    </div>
  );
}
