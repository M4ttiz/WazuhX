
# WazuhX — Development Prompt

Build **WazuhX**, a professional production-grade Wazuh Security & Infrastructure Dashboard — a full replacement for the default Wazuh Dashboard. The project lives at **https://github.com/M4ttiz/WazuhX** and must be deployable via Docker on the same server as Wazuh.

---

## TECH STACK
- **Frontend:** React 18 + Vite + TailwindCSS + Recharts + React Router v6
- **Backend:** Node.js 20 + Express + Axios
- **AI:** Google Gemini 1.5 Flash via `@google/generative-ai`
- **PDF:** Puppeteer
- **Reverse Proxy:** Nginx
- **Deploy:** Docker + docker-compose
- **Testing:** Vitest (frontend) + Jest + Supertest (backend)

---

## ARCHITETTURA

```
[Docker Network: wazuh-net]
├── wazuh-manager     → porta 55000 (API interna)
├── wazuh-indexer     → porta 9200
├── wazuh-dashboard   → porta 443 (originale, ancora raggiungibile)
└── wazuhx            → porta 3000 (IL NOSTRO)
        ├── frontend (React + Vite build statica servita da Nginx)
        └── backend  (Node.js proxy + Gemini AI + PDF)
```

Il backend Node.js è l'unico che parla con Wazuh API internamente usando JWT. Il frontend chiama solo il backend su `/api/...`. Nginx fa da reverse proxy per entrambi sulla stessa porta 3000.

---

## STRUTTURA FILE

```
WazuhX/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Agents.jsx
│   │   │   ├── AgentDetail.jsx
│   │   │   ├── Alerts.jsx
│   │   │   ├── Vulnerabilities.jsx
│   │   │   ├── FIM.jsx
│   │   │   ├── Compliance.jsx
│   │   │   ├── AIAnalyst.jsx
│   │   │   ├── ReportGenerator.jsx
│   │   │   └── Settings.jsx
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Header.jsx
│   │   │   ├── KpiCard.jsx
│   │   │   ├── AlertTable.jsx
│   │   │   ├── AgentCard.jsx
│   │   │   ├── GaugeChart.jsx
│   │   │   ├── SeverityBadge.jsx
│   │   │   ├── MitreHeatmap.jsx
│   │   │   └── ChatBox.jsx
│   │   ├── hooks/
│   │   │   ├── useWazuh.js
│   │   │   ├── useAutoRefresh.js
│   │   │   └── useAI.js
│   │   ├── utils/
│   │   │   ├── api.js
│   │   │   ├── formatters.js
│   │   │   └── mockData.js
│   │   └── App.jsx
│   ├── tests/
│   ├── index.html
│   └── vite.config.js
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── agents.js
│   │   │   ├── alerts.js
│   │   │   ├── vulnerabilities.js
│   │   │   ├── fim.js
│   │   │   ├── compliance.js
│   │   │   ├── syscollector.js
│   │   │   ├── ai.js
│   │   │   └── reports.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── cache.js
│   │   │   └── rateLimit.js
│   │   ├── services/
│   │   │   ├── wazuhClient.js
│   │   │   ├── geminiService.js
│   │   │   └── pdfService.js
│   │   └── index.js
│   └── tests/
├── nginx/
│   └── nginx.conf
├── Dockerfile.frontend
├── Dockerfile.backend
├── docker-compose.yml
├── .env.example
├── .gitignore
├── .dockerignore
├── LICENSE
└── README.md
```

---

## SEZIONI DEL SITO

### 1. Dashboard Overview
- KPI cards animate on load: alert totali, critical attivi, endpoint online/offline/compromessi, minacce bloccate, CVE totali, compliance score medio
- Area chart: trend alert ultimi 7/30 giorni divisi per severità
- Donut chart: distribuzione severità alert
- Bar chart orizzontale: top 10 regole più attivate
- Heatmap MITRE ATT&CK: tecniche rilevate colorate per frequenza
- Activity feed laterale: ultimi 10 eventi in tempo reale auto-refresh ogni 15s
- Banner rosso lampeggiante se ci sono incidenti critici attivi non risolti

### 2. Agenti / Endpoint
- Griglia cards per ogni agente: nome, IP, OS con icona, stato colorato (🟢 active / 🔴 disconnected / ⚫ never connected), ultimo contatto, alert totali, critical
- Filtri: status, OS, gruppo, ricerca per nome/IP
- Indicatore visivo se agente non si vede da più di 5 minuti

### 3. Dettaglio Agente
Tabs interni:
- **Overview:** OS, kernel, hostname, architettura, RAM totale, CPU model
- **Risorse live** (auto-refresh 30s): gauge CPU %, gauge RAM %, disk per partizione, network I/O real-time, top 10 processi, uptime
- **Alert:** tutti gli alert dell'agente con filtri
- **Vulnerabilità:** CVE su quell'agente
- **FIM:** modifiche file
- **Compliance:** risultati SCA
- **AI Analysis:** bottone "Analizza endpoint" → Gemini genera report testuale

### 4. Alert & Security Events
- Tabella: timestamp, severità badge, agente, regola ID, descrizione, MITRE technique
- Riga espandibile: log raw + dettagli regola + suggerimento risposta
- Filtri: severità slider 1-15, agente, date range, MITRE tactic, ricerca testo
- Paginazione 25/50/100
- Export CSV
- Contatore live eventi nell'ultimo minuto

### 5. Vulnerabilità
- KPI: totale CVE, critical, high, medium, low, con fix disponibile
- Tabella: CVE ID linkato a nvd.nist.gov, agente, pacchetto, versione installata, versione fix, CVSS score, badge severità
- Grafico: CVE per agente, timeline CVE nel tempo

### 6. File Integrity Monitoring
- Tabella: timestamp, agente, path, tipo (added/modified/deleted), size, permessi, utente
- Per modified: hash MD5/SHA256 prima e dopo
- Alert visivo per file critici (/etc/passwd, /etc/shadow ecc.)

### 7. Compliance
- Selezione benchmark: CIS, PCI-DSS, GDPR, HIPAA, NIST
- Barra progresso compliance % per agente
- Tabella check: ID, descrizione, risultato, remediation, riferimento normativo
- Grafico radar: confronto compliance tra agenti
- Export PDF compliance

### 8. AI Analyst (Gemini 1.5 Flash — GRATUITO)

- Briefing automatico al caricamento: Gemini legge tutti i dati e scrive executive summary
- Chat interattiva in italiano con memoria conversazione completa
- Domande predefinite cliccabili: "Qual è l'endpoint più a rischio?", "Cosa è successo nelle ultime 24 ore?", "Quali CVE devo patchare subito?", "C'è qualcosa di anomalo?"
- Animazione "AI sta analizzando..."
- Contesto passato a Gemini: lista agenti, ultimi 50 alert critici, CVE attivi, compliance scores, anomalie risorse

### 9. Report Generator
Form di configurazione:
- Periodo: oggi / 7gg / 30gg / custom range
- Sezioni: checkbox per ognuna
- Agenti: tutti o selezione multipla
- Lingua: Italiano / English
- Formato: PDF o HTML

PDF professionale con Puppeteer:
- Copertina: titolo "WazuhX Security Report", data, periodo, classificazione
- Indice con numeri pagina
- Executive Summary generato da Gemini
- KPI section
- Sezione Alert con grafici
- Sezione Endpoint con risorse medie
- Sezione Vulnerabilità ordinata per CVSS
- Sezione Compliance per agente
- Azioni Raccomandate prioritizzate da Gemini (🔴 Urgente / 🟡 Alta / 🟢 Normale)
- Footer: numero pagina, timestamp, versione Wazuh

### 10. Settings
- Form connessione Wazuh: URL, username, password + bottone "Test Connessione" con ✅/❌
- Auto-refresh configurabile per sezione
- Campo Gemini API key con link diretto a https://aistudio.google.com/app/apikey
- Theme toggle dark/light
- Notifiche browser configurabili per soglie alert
- **Bottone "Apri Wazuh Dashboard originale"** che apre `https://[WAZUH_HOST]` in nuova tab

---

## DESIGN SYSTEM

```
Background:   #080c14
Surface:      #0d1220
Border:       #1a2540
Accent cyan:  #00d4ff
Critical red: #ff3860
Warning:      #ffd60a
Safe green:   #00ff88
Text primary: #e8eaf0
Text muted:   #4a5568
```

- Font titoli/label: `Rajdhani` (700)
- Font numeri/log/codice: `JetBrains Mono`
- Sidebar fissa 240px collassabile a 60px
- Header: nome pagina, pallino connessione Wazuh animato, ora ultimo aggiornamento, refresh globale
- Cards: bordo `#1a2540`, hover glow `box-shadow: 0 0 20px #00d4ff22`
- Loading skeleton per ogni sezione
- Toast notifications per errori e successi
- Animazioni max 300ms

---

## BACKEND API ENDPOINTS

```
GET  /api/agents
GET  /api/agents/:id
GET  /api/agents/:id/stats
GET  /api/agents/:id/processes
GET  /api/alerts
GET  /api/vulnerabilities
GET  /api/fim
GET  /api/compliance
GET  /api/overview
POST /api/ai/chat
POST /api/ai/briefing
POST /api/reports/generate
GET  /api/health
```

Cache con `node-cache`: TTL 60s dati live, 300s storici. Rate limiting: 100 req/min con `express-rate-limit`.

---

## ⚠️ REGOLE CRITICHE — ZERO PROBLEMI IN PARTENZA

### JWT / Autenticazione Wazuh
```js
// wazuhClient.js — struttura OBBLIGATORIA
let token = null;
let tokenExpiry = null;

async function getToken() {
  if (token && Date.now() < tokenExpiry) return token;
  // login a /security/user/authenticate
  tokenExpiry = Date.now() + 15 * 60 * 1000; // 15 min
  return token;
}
// Interceptor Axios che rinnova automaticamente su 401
// NON fare login ad ogni chiamata API
// Gestire credenziali errate con errore chiaro
```

### Dockerfile.backend — OBBLIGATORIO
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["node", "src/index.js"]
```

### Dockerfile.frontend — OBBLIGATORIO
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### Regole ferree Docker
- SEMPRE `npm ci` mai `npm install` nei Dockerfile
- `package-lock.json` DEVE essere committato nella repo
- MAI `npm run dev` nei container, sempre build statica
- Usare `node:20-alpine` non `node:latest`
- `package.json` frontend DEVE avere `"build": "vite build"`
- `package.json` backend DEVE avere `"start": "node src/index.js"`

### .dockerignore — creare subito
```
node_modules
npm-debug.log
.env
.env.*
dist
.git
.gitignore
README.md
*.test.js
coverage/
```

### .gitignore — creare subito
```
node_modules/
dist/
.env
.env.local
.env.production
*.log
coverage/
.DS_Store
```

### Ordine sviluppo OBBLIGATORIO
1. Backend con mock data → testare tutti gli endpoint con curl
2. Frontend collegato al backend
3. Test con Wazuh reale
4. Build Docker solo alla fine

---

## DOCKER COMPOSE

```yaml
services:
  wazuhx-backend:
    build:
      context: ./backend
      dockerfile: ../Dockerfile.backend
    environment:
      - WAZUH_API_URL=https://wazuh-manager:55000
      - WAZUH_USER=${WAZUH_USER}
      - WAZUH_PASSWORD=${WAZUH_PASSWORD}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - NODE_TLS_REJECT_UNAUTHORIZED=0
    networks:
      - wazuh-net
    restart: unless-stopped

  wazuhx-frontend:
    build:
      context: ./frontend
      dockerfile: ../Dockerfile.frontend
    ports:
      - "3000:80"
    depends_on:
      - wazuhx-backend
    networks:
      - wazuh-net
    restart: unless-stopped

networks:
  wazuh-net:
    external: true
```

---

## ENV VARIABLES

```env
# .env.example — committare questo, MAI il .env reale
WAZUH_API_URL=https://wazuh-manager:55000
WAZUH_USER=admin
WAZUH_PASSWORD=la_tua_password
GEMINI_API_KEY=la_tua_key_da_aistudio.google.com
NODE_ENV=production
CACHE_TTL_SECONDS=60
REFRESH_INTERVAL_MS=30000
```

---

## MOCK DATA

Creare `mockData.js` con dati realistici: 8+ agenti con OS diversi, 200+ alert su 7 giorni, 50+ CVE, eventi FIM, risultati SCA. Attivato automaticamente se Wazuh non raggiungibile con banner `⚠️ Wazuh non raggiungibile — modalità demo`.

---

## FALLBACK WAZUH NON RAGGIUNGIBILE

Se Wazuh API non risponde:
1. Restituire dati dalla cache se disponibili
2. Se cache vuota → mock data con header `X-Data-Source: mock`
3. Banner visivo nel frontend in ogni pagina

---

## TEST

**Frontend (Vitest):** render componenti, filtri tabelle, calcolo KPI da mock
**Backend (Jest + Supertest):** ogni endpoint con mock Wazuh API, fallback cache, generazione PDF, rate limiting

---

## LICENZA E REPO

- Repo: https://github.com/M4ttiz/WazuhX
- Licenza: **MIT**
- Creare file `LICENSE` con testo MIT standard e nome autore `M4ttiz`
- Questo progetto è indipendente da Wazuh, si collega alla sua API ma non ne modifica il codice

---

## README.md

Generare README professionale con:
- Badge: build status, license MIT, Docker, Node.js version
- Descrizione: "WazuhX is an open-source alternative dashboard for Wazuh, with AI-powered analysis via Google Gemini"
- Screenshot placeholder
- Requisiti: Docker, docker-compose, Wazuh installato
- Istruzioni installazione passo passo
- Come ottenere Gemini API key: https://aistudio.google.com/app/apikey
- Come aggiungere al compose Wazuh esistente
- Tutte le env variables spiegate
- Troubleshooting: JWT errors, CORS, Docker build failures
- Link Wazuh API docs: https://documentation.wazuh.com/current/user-manual/api/reference.html
- Link repo: https://github.com/M4ttiz/WazuhX