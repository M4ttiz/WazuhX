# Glances per WazuhX

WazuhX legge le metriche da **Glances** su ogni host agente Wazuh. Il backend usa l'IP registrato in Wazuh e interroga la porta **61208** — nessuna configurazione IP nel dashboard.

## Windows 11

PowerShell (amministratore):

```powershell
pip install glances[all]
glances -w --bind 0.0.0.0 --port 61208 --disable-webui
```

Firewall (solo dal server WazuhX):

```powershell
New-NetFirewallRule -DisplayName "Glances WazuhX" -Direction Inbound -Protocol TCP -LocalPort 61208 -RemoteAddress IP_WAZUHX -Action Allow
```

Test locale: `http://localhost:61208/api/4/quicklook`

Per servizio permanente: Task Scheduler o NSSM con lo stesso comando.

## Linux

```bash
sudo apt install glances
# oppure: pip install glances[all]
glances -w --bind 0.0.0.0 --port 61208 --disable-webui
```

```bash
sudo ufw allow from IP_WAZUHX to any port 61208
```

## Variabili backend (`.env`)

```env
GLANCES_PORT=61208
GLANCES_SCHEME=http
GLANCES_TIMEOUT_MS=2500
GLANCES_ENABLED=true
```

## Flusso

1. Installa Wazuh Agent sull'endpoint
2. Installa e avvia Glances in modalità web (`-w`)
3. WazuhX scopre Glances entro ~60s e mostra il badge nella lista agenti e il tab **Risorse live**
