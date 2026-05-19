import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import GrafanaPanel from '../components/GrafanaPanel';
import { useNoiseRuleIds, DEFAULT_NOISE_RULE_IDS } from '../hooks/useNoiseRuleIds';

export default function Settings() {
  const { toast } = useToast();
  const { ruleIds, addRuleId, removeRuleId, resetDefaults } = useNoiseRuleIds();
  const [newRuleId, setNewRuleId] = useState('');
  const [refreshDashboard, setRefreshDashboard] = useState(
    localStorage.getItem('wazuhx-refresh-dashboard') || '15000'
  );
  const [refreshRealtime, setRefreshRealtime] = useState(
    localStorage.getItem('wazuhx-refresh-realtime') || '3000'
  );
  const [notifications, setNotifications] = useState(
    localStorage.getItem('wazuhx-notifications') === 'true'
  );
  const [testResult, setTestResult] = useState(null);
  const [wazuhHost, setWazuhHost] = useState(
    localStorage.getItem('wazuhx-wazuh-host') || 'https://localhost'
  );

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

  const handleAddRule = () => {
    if (!newRuleId.trim()) return;
    addRuleId(newRuleId.trim());
    setNewRuleId('');
    toast('Regola aggiunta', 'success');
  };

  return (
    <div className="max-w-xl space-y-4">
      <GrafanaPanel title="Connessione Wazuh">
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
      </GrafanaPanel>

      <GrafanaPanel title="Auto-refresh">
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
        <label className="block mt-3">
          <span className="text-secondary text-xs">Netdata / metriche live agente (ms)</span>
          <input
            type="number"
            className="input w-full mt-1"
            value={refreshRealtime}
            onChange={(e) => setRefreshRealtime(e.target.value)}
            onBlur={() => saveRefresh('realtime', refreshRealtime)}
          />
        </label>
      </GrafanaPanel>

      <GrafanaPanel title="Regole di soppressione alert">
        <p className="text-secondary text-sm mb-3">
          ID regola Wazuh nascosti per default nella pagina Alert (es. 5710 SSH brute force).
          Il server applica anche{' '}
          <span className="font-mono text-xs">{DEFAULT_NOISE_RULE_IDS.join(', ')}</span>.
        </p>
        <ul className="space-y-2 mb-3">
          {ruleIds.map((id) => (
            <li key={id} className="flex items-center justify-between gap-2 text-sm font-mono">
              <span>{id}</span>
              <button type="button" className="btn-secondary text-xs py-1 px-2" onClick={() => removeRuleId(id)}>
                Rimuovi
              </button>
            </li>
          ))}
        </ul>
        <SettingsRuleForm
          newRuleId={newRuleId}
          setNewRuleId={setNewRuleId}
          onAdd={handleAddRule}
          onReset={resetDefaults}
        />
      </GrafanaPanel>

      <GrafanaPanel title="Gemini API">
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
      </GrafanaPanel>

      <GrafanaPanel title="Notifiche browser">
        <button type="button" className="btn-primary" onClick={requestNotifications}>
          {notifications ? 'Notifiche attive' : 'Abilita notifiche'}
        </button>
        <p className="text-muted text-xs mt-2">Alert per severita &gt;= 12</p>
      </GrafanaPanel>

      <GrafanaPanel title="Wazuh Dashboard originale">
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
          className="btn-primary inline-block text-center mt-3"
        >
          Apri Wazuh Dashboard
        </a>
      </GrafanaPanel>
    </div>
  );
}

function SettingsRuleForm({ newRuleId, setNewRuleId, onAdd, onReset }) {
  return (
    <div className="flex flex-wrap gap-2">
      <input
        className="input flex-1 min-w-[120px]"
        placeholder="ID regola"
        value={newRuleId}
        onChange={(e) => setNewRuleId(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onAdd()}
      />
      <button type="button" className="btn-primary" onClick={onAdd}>
        Aggiungi
      </button>
      <button type="button" className="btn-secondary" onClick={onReset}>
        Reset default
      </button>
    </div>
  );
}
