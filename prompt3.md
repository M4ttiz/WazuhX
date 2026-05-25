# CONTESTO
Sto sviluppando WazuhX (dashboard alternativa per Wazuh). Il repository è su GitHub: https://github.com/M4ttiz/WazuhX

# PROBLEMI ATTUALI (da log reali)
1. **Pagina CVE non mostra dati** - Log: `Wazuh API: [/vulnerability/000] empty affected_items` ripetuto migliaia di volte
2. **Syscollector fallisce** - Log: `Wazuh API: [/syscollector/001/processes] 400: Request failed`
3. **Glances scoperto ma non abilitato** - Lista agenti mostra `Glances: false` per tutti, ma log mostra `[Glances] Discovered on agent 001 @ 192.168.50.46`
4. **Container Alpine senza curl** - Impossibile fare debug dalla shell
5. **Rate limiting non configurato** - Nessuna protezione richieste

# VERSIONE WAZUH
Wazuh 4.7.5 (manager, indexer, dashboard)

# RICHIESTE SPECIFICHE

## 1. Fix API Vulnerabilità
- Scopri l'endpoint corretto per Wazuh 4.7.5 (es. `/vulnerability/{agent_id}/cve` o `/cve`)
- Implementa fallback: se vuoto, prova `/sca/{agent_id}/vulnerabilities`
- Aggiungi cache con TTL 3600 secondi

## 2. Fix Glasses liveMetricsAvailable
- Modifica `backend/services/glances.js` per salvare lo stato discovery
- Quando Glances risponde, imposta `liveMetricsAvailable: true` per quell'agente
- Endpoint `/api/agents` deve restituire questo flag

## 3. Fix Syscollector
- Disabilita o rimuovi chiamate a `/syscollector/*/processes`
- Sostituisci con endpoint alternativo o rimuovi dalla UI

## 4. Aggiungi strumenti di debug
- Aggiungi `curl` e `wget` al Dockerfile backend
- Aggiungi endpoint `/api/debug/agents` che mostra IP e stato Glances

## 5. Configura rate limiting
- Implementa `express-rate-limit` con:
  - `windowMs: 60 * 1000` (1 minuto)
  - `max: 100` richieste per IP
  - `trustProxy: true` (perchè dietro Nginx)

## 6. Ottimizzazione performance
- Aggiungi `AbortController` nelle fetch del frontend
- Implementa React.memo() nei componenti lista
- Aggiungi debounce (300ms) su input ricerca

# STRUTTURA DEL PROGETTO