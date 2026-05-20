# WazuhX — Netdata Auto-Discovery: Cursor Implementation Prompt

## CONTESTO DEL PROGETTO

Stai lavorando su **WazuhX** (`https://github.com/M4ttiz/WazuhX`), un dashboard alternativo per Wazuh scritto in:
- **Backend:** Node.js 20 + Express (`backend/src/`)
- **Frontend:** React 18 + Vite + TailwindCSS + Recharts (`frontend/src/`)
- **Deploy:** Docker Compose

Il progetto ha già:
- `backend/src/services/wazuhClient.js` — client JWT per Wazuh API
- `backend/src/routes/agents.js` — route `/api/agents` e `/api/agents/:id`
- `backend/src/routes/syscollector.js` — metriche base da Wazuh Syscollector
- `frontend/src/pages/AgentDetail.jsx` — dettaglio agente con tab "Risorse live"
- `frontend/src/components/GaugeChart.jsx` — componente gauge già esistente
- `.env.example` — ha già le variabili `NETDATA_*`

---

## OBIETTIVO

Implementare il **monitoring real-time degli endpoint tramite Netdata con auto-discovery automatico**.

Il comportamento desiderato è:
1. Admin installa **Wazuh Agent + Netdata** su un nuovo endpoint
2. Netdata si avvia sulla porta 19999 di quell'host
3. WazuhX lo scopre **automaticamente** leggendo l'IP dell'agente da Wazuh API
4. Il tab "Risorse live" mostra metriche real-time da Netdata
5. Se Netdata non è installato → fallback silenzioso a Wazuh Syscollector
6. **Zero configurazione manuale** nel dashboard

---

## TASK 1 — Crea `backend/src/services/netdataService.js`

Crea questo file da zero con la seguente logica:

```
VARIABILI D'AMBIENTE DA LEGGERE:
- NETDATA_PORT          (default: 19999)
- NETDATA_SCHEME        (default: 'http')
- NETDATA_TIMEOUT_MS    (default: 2500)
- NETDATA_ENABLED       (default: 'true')
```

### Discovery Cache
- Usa una `Map` in-memory: `discoveryCache = Map<agentId, { available: boolean, checkedAt: number }>`
- TTL della cache: 60 secondi
- Funzione `isNetdataAvailable(agentId, agentIp)`:
  - Se cache valida → ritorna il valore cached senza fare chiamate HTTP
  - Altrimenti → tenta `GET http://<agentIp>:<NETDATA_PORT>/api/v1/info` con timeout
  - Salva risultato in cache con timestamp
  - Logga `[Netdata] ✅ Discovered on agent <id> @ <ip>` se disponibile

### Fetch Metriche
- Funzione `getMetrics(agentIp)`:
  1. Prima chiama `GET /api/v1/charts` per scoprire i chart disponibili (i nomi disco/NIC variano per OS)
  2. Trova dinamicamente:
     - `diskChart` = primo chart che inizia con `disk_space.`
     - `netChart`  = primo chart che inizia con `net.` e NON contiene `net_packets`
  3. Poi chiama in `Promise.allSettled` parallelo:
     - `GET /api/v1/data?chart=system.cpu&points=1&format=json&options=absolute`
     - `GET /api/v1/data?chart=system.ram&points=1&format=json&options=absolute`
     - `GET /api/v1/data?chart=<diskChart>&points=1&format=json&options=absolute` (se trovato)
     - `GET /api/v1/data?chart=<netChart>&points=1&format=json&options=absolute` (se trovato)
     - `GET /api/v1/info`
  4. Parse CPU%: la risposta ha `dimension_names` array e `data[0]` array (primo elemento = timestamp, resto = valori). Trova indice di `idle`, calcola `(1 - idle/sum) * 100`
  5. Parse RAM%: trova `used`, `free`, `cached`, `buffers` nelle dimension_names. `percent = used / (used+free+cached+buffers) * 100`
  6. Parse Disk%: trova `used` e `avail`. `percent = used / (used+avail) * 100`
  7. Parse Network: trova `received` e `sent`, prendi valori assoluti in kbps
  8. Ritorna oggetto:
     ```js
     {
       source: 'netdata',
       timestamp: new Date().toISOString(),
       cpu: { percent: Number|null },
       ram: { percent: Number|null, usedMB: Number|null, totalMB: Number|null },
       disk: { percent: Number|null, chart: String|null },
       network: { recvKbps: Number|null, sentKbps: Number|null, chart: String|null },
       netdataInfo: { version: String, os: String } | null
     }
     ```

### Entry Point
- Funzione `getAgentMetrics(agentId, agentIp)`:
  - Se `agentIp` è null/undefined/`127.0.0.1` → ritorna `null`
  - Se `NETDATA_ENABLED === 'false'` → ritorna `null`
  - Chiama `isNetdataAvailable()` — se false → ritorna `null`
  - Chiama `getMetrics()` in try/catch — se fallisce → cancella cache dell'agente, ritorna `null`
  - Se ok → ritorna i dati

### Discovery Status
- Funzione `getDiscoveryStatus()`:
  - Ritorna oggetto `{ [agentId]: { netdataAvailable: bool, lastChecked: ISOString } }` per ogni entry in cache

### Export
```js
module.exports = { getAgentMetrics, isNetdataAvailable, getDiscoveryStatus };
```

---

## TASK 2 — Modifica `backend/src/routes/agents.js`

### Modifica `GET /api/agents/:id/stats` (già esistente o creala se manca)

```
LOGICA:
1. Leggi agentId da req.params.id
2. Chiama wazuhClient per ottenere i dati dell'agente (incluso agent.ip)
3. Chiama getAgentMetrics(agent.id, agent.ip) da netdataService
4. Se netdataMetrics è non-null → res.json(netdataMetrics)
5. Altrimenti → chiama il fallback syscollector esistente e ritorna:
   {
     source: 'syscollector',
     timestamp: new Date().toISOString(),
     cpu: { percent: null },
     ram: { percent: syscollector.ram?.usage ?? null,
            usedMB:  syscollector.ram?.used  ?? null,
            totalMB: syscollector.ram?.total ?? null },
     disk: { percent: null },
     network: { recvKbps: null, sentKbps: null }
   }
6. Gestisci errori con try/catch → res.status(500).json({ error: err.message })
```

### Modifica `GET /api/agents` (già esistente)

Dopo aver preso la lista agenti da Wazuh, aggiungi:
```
1. Importa isNetdataAvailable e getDiscoveryStatus da netdataService
2. Lancia Promise.allSettled con isNetdataAvailable per ogni agente (usa la cache, non blocca)
3. Leggi getDiscoveryStatus()
4. Map degli agenti aggiungendo il campo: netdataAvailable: boolean
5. Ritorna la lista arricchita
```

---

## TASK 3 — Modifica `frontend/src/pages/AgentDetail.jsx`

### Tab "Risorse live" — già esiste, va modificato

**Aggiungi il badge sorgente dati** in cima al tab, prima dei gauge:
```jsx
// Se metrics.source === 'netdata' → badge ciano "⚡ Netdata · real-time"
// Se metrics.source === 'syscollector' → badge giallo "📊 Syscollector · ~1h delay"
// Stile inline coerente con il design system del progetto:
//   background: '#00d4ff22', color: '#00d4ff', border: '1px solid #00d4ff44'  (netdata)
//   background: '#ffd60a22', color: '#ffd60a', border: '1px solid #ffd60a44'  (syscollector)
```

**Modifica il fetching**: la chiamata al backend deve essere `GET /api/agents/:id/stats` con auto-refresh ogni 15 secondi (usa `useAutoRefresh` hook già presente nel progetto).

**Gestisci i valori null**: se un valore è null (es. CPU% in modalità syscollector), il gauge deve mostrare `--` al posto di `0` e avere opacità ridotta visivamente.

---

## TASK 4 — Modifica `frontend/src/pages/Agents.jsx`

Nella griglia delle agent card, se `agent.netdataAvailable === true`, mostra un piccolo badge/icona `⚡` accanto allo status indicator dell'agente, con tooltip `"Netdata: metriche real-time disponibili"`.

---

## TASK 5 — Aggiorna `.env.example`

Sostituisci le righe Netdata esistenti con:
```env
# Netdata — auto-discovery per ogni endpoint (non serve configurare IP manualmente)
# WazuhX usa l'IP dell'agente Wazuh per scoprire Netdata automaticamente
# Installa Netdata su ogni endpoint: curl https://get.netdata.cloud/kickstart.sh | sh
# Configura /etc/netdata/netdata.conf: [web] bind to = 0.0.0.0
NETDATA_PORT=19999
NETDATA_SCHEME=http
NETDATA_TIMEOUT_MS=2500
NETDATA_ENABLED=true
# NETDATA_HOST non è più necessario — IP derivato automaticamente da Wazuh Agent
```

Rimuovi `NETDATA_HOST` dal `docker-compose.yml` — non serve più.

---

## TASK 6 — Aggiorna `README.md`

Aggiungi una sezione `## Netdata Setup (Endpoint Monitoring)` con:

```markdown
## Netdata Setup (Endpoint Monitoring)

WazuhX scopre automaticamente Netdata su ogni endpoint monitorato.
Non è necessaria nessuna configurazione nel dashboard.

### Per ogni nuovo endpoint da monitorare:

1. Installa il Wazuh Agent (come da documentazione Wazuh)
2. Installa Netdata:
   curl https://get.netdata.cloud/kickstart.sh | sh

3. Configura Netdata per accettare connessioni remote:
   sudo nano /etc/netdata/netdata.conf

   [web]
       bind to = 0.0.0.0

   sudo systemctl restart netdata

4. (Consigliato) Limita l'accesso alla porta 19999 solo alla rete interna:
   ufw allow from <ip_wazuhx_server> to any port 19999

### Come funziona l'auto-discovery

WazuhX legge l'IP di ogni agente dalla Wazuh API e tenta automaticamente
la connessione a http://<agent_ip>:19999. Se Netdata risponde, le metriche
real-time vengono mostrate nel tab "Risorse live" con il badge ⚡.
Se Netdata non è installato, il sistema usa Wazuh Syscollector come fallback
senza mostrare errori.
```

---

## VINCOLI CRITICI — NON VIOLARE

1. **NON modificare** `wazuhClient.js`, `geminiService.js`, `pdfService.js`
2. **NON cambiare** il design system esistente (colori, font, layout sidebar/header)
3. **NON rompere** le route esistenti — solo aggiungere logica, non sostituire
4. **NON fare** chiamate Netdata dal frontend — solo tramite backend proxy
5. **NON rimuovere** il mock data fallback esistente (`USE_MOCK=true`)
6. **Discovery DEVE essere non-bloccante** — un agente senza Netdata non deve rallentare il caricamento degli altri
7. **Cache discovery DEVE avere TTL** — non fare HTTP check ad ogni request
8. **Tutti i valori numerici ritornati DEVONO essere arrotondati** con `Math.round()`
9. Usa `Promise.allSettled` (non `Promise.all`) per le chiamate parallele a Netdata — un chart mancante non deve far fallire tutto

---

## ORDINE DI IMPLEMENTAZIONE CONSIGLIATO

1. `netdataService.js` — crea e testa con `console.log`
2. Route `GET /api/agents/:id/stats` — testa con `curl`
3. Route `GET /api/agents` — aggiungi campo `netdataAvailable`
4. `AgentDetail.jsx` — badge + gestione null
5. `Agents.jsx` — badge ⚡ nella card
6. `.env.example` + `docker-compose.yml` — cleanup variabili
7. `README.md` — sezione Netdata

---

## TEST RAPIDO POST-IMPLEMENTAZIONE

```bash
# 1. Verifica discovery
curl http://localhost:3001/api/agents
# → ogni agente deve avere il campo netdataAvailable: true/false

# 2. Verifica metriche real-time (se Netdata è installato sull'agente)
curl http://localhost:3001/api/agents/001/stats
# → { source: 'netdata', cpu: { percent: 42 }, ram: { ... }, ... }

# 3. Verifica fallback (agente senza Netdata)
curl http://localhost:3001/api/agents/002/stats
# → { source: 'syscollector', cpu: { percent: null }, ram: { ... }, ... }
```
