Sei un assistente AI specializzato in sviluppo full‑stack e UI/UX design enterprise. Devi sistemare e ridisegnare il progetto WazuhX (dashboard per Wazuh) lavorando in due fasi sequenziali: prima il backend, poi il frontend. Esegui tutte le correzioni elencate, nell'ordine indicato. Ogni modifica deve essere applicata al file esatto, con le modifiche proposte. Per il frontend, oltre ai bugfix, devi applicare un redesign visivo completo in stile enterprise (colori sobri, tipografia professionale, componenti eleganti, dashboard riorganizzata) in modo che ogni cambiamento sia immediatamente visibile all'utente.

FASE 1 – BACKEND (correzioni funzionali, senza impatto visivo diretto)

1.1 Middleware cache – impedire il caching di null e array vuoti
File: backend/src/middleware/cache.js
Problema: la funzione withCache salva in cache anche risposte null o array vuoti, mascherando guasti temporanei per l’intero TTL.
Fix: Dopo aver ottenuto il risultato dalla callback, aggiungere:
if (result === null || (Array.isArray(result) && result.length === 0)) {
return result; // non salvare in cache
}
prima di chiamare cache.set(key, result, ttl).

1.2 Migliorare la gestione errori in wazuhRequest()
File: backend/src/services/wazuhClient.js (funzione wazuhRequest, intorno a riga 118‑131)
Problema: il catch attuale logga solo un warning generico, senza distinguere lo stato HTTP o il messaggio.
Fix: sostituire il catch block con:
} catch (err) {
const status = err.response?.status;
const msg = err.response?.data?.message || err.message;
lastError = [${path}] ${status || 'network'}: ${msg};
console.warn('Wazuh API:', lastError);
return null;
}
In questo modo il log diventa strutturato e diagnostico, senza cambiare il comportamento per i chiamanti.

1.3 Completare i dati mock (se necessario)
File: backend/src/mock/mockData.js
Problema: il file potrebbe non esistere o essere vuoto, mentre wazuhClient.js lo importa.
Fix: Se il file non esiste o è vuoto, crearlo con una struttura base:
const mock = {
agents: [ /* almeno 3 agenti con id, name, status, ip, os / ],
alerts: [ / almeno 5 alert con timestamp, severity, title, agentId / ],
vulnerabilities: [ / almeno 5 CVE con severity, agentId */ ],
fimEvents: [],
compliance: []
};
module.exports = mock;
Assicurarsi che tutte le funzioni usate in wazuhClient.js (es. getAgentById, filterAlerts, paginate) siano esportate o adattate.

1.4 Correggere e completare response.js
File: backend/src/utils/response.js
Problema: sendData potrebbe impostare l’header X-Data-Source a 'mock' se result.source è undefined.
Fix: Assicurarsi che la funzione sia:
function sendData(res, result) {
const { data, source, pagination, stats } = result || {};
const dataSource = source || 'wazuh'; // default esplicito
res.set('X-Data-Source', dataSource);

const response = { data };
if (pagination) response.pagination = pagination;
if (stats) response.stats = stats;

return res.json(response);
}

1.5 Verificare i Dockerfiles
File: Dockerfile.backend e Dockerfile.frontend
Problema: potrebbero usare npm install invece di npm ci, causando build non riproducibili.
Fix: Cercare npm install e sostituire con npm ci in entrambi i Dockerfile. Verificare che l’immagine base sia node:20-alpine (o simile) e che le variabili d’ambiente come NODE_ENV=production siano impostate.

1.6 Verificare che tutte le route usino sendData
File: tutte le route in backend/src/routes/*.js
Problema: alcune route potrebbero chiamare res.json() direttamente, perdendo l’header X-Data-Source.
Fix: Ispezionare ogni file (agents, alerts, vulnerabilities, fim, compliance, metrics, overview, ai, reports) e assicurarsi che ogni handler termini con sendData(res, result) invece di res.json(data). Correggere dove necessario.

1.7 Aggiungere test base backend
Problema: la cartella backend/tests/ esiste ma è vuota; non c’è alcun test.
Fix:

Creare backend/tests/setup.js con:
process.env.NODE_ENV = 'test';
process.env.WAZUH_API_URL = 'https://localhost:55000';
process.env.USE_MOCK = 'true';

Creare backend/tests/services/wazuhClient.test.js con almeno:

Test per getAgent() con mock di wazuhRequest (successo e agente non trovato).

Test per getVulnerabilities() simulando più agenti.

Test per getAlerts() con fallback a vuoto.

Creare backend/tests/middleware/cache.test.js con:

Test cache hit/miss.

Test che non salvi in cache null o array vuoti.

Verificare che eseguendo npm test nella cartella backend i test passino.

1.8 Verificare configurazione di backend e frontend
File: backend/package.json, frontend/package.json, docker-compose.yml
Fix:

Controllare che backend/package.json abbia "main": "src/index.js" e script start/dev corretti.

Controllare che frontend/package.json abbia "type": "module" (se necessario) e script dev/build.

Nel docker-compose.yml verificare i nomi dei servizi, porte esposte e variabili d’ambiente (WAZUH_API_URL, INDEXER_URL, ecc.).

1.9 Completare .env.example
File: .env.example
Problema: potrebbero mancare variabili come GEMINI_API_KEY, INDEXER_, NETDATA_.
Fix: aggiungere tutte le variabili mancanti con commenti esplicativi.

FASE 2 – FRONTEND (bugfix + REDESIGN ENTERPRISE VISIBILE)

2.1 REDESIGN VISIVO ENTERPRISE – Tema, colori, tipografia
Obiettivo: trasformare l'interfaccia in un dashboard enterprise moderno, con palette scura/blu professionale, tipografia pulita, componenti eleganti e ben spaziati.
File: frontend/tailwind.config.js, frontend/src/index.css
Fix:

Modificare tailwind.config.js per usare una palette enterprise: colori primari blu scuro (#1e293b), accenti oro/arancio (#f59e0b) per azioni, sfondo #0f172a, cards #1e293b, testi #e2e8f0 e #94a3b8.

Aggiungere font Inter o Roboto come default (import da Google Fonts o CDN).

In index.css, ridefinire le variabili CSS:
--bg-primary: #0f172a;
--bg-secondary: #1e293b;
--text-primary: #f1f5f9;
--text-secondary: #94a3b8;
--accent: #f59e0b;
--success: #10b981;
--danger: #ef4444;
--warning: #f59e0b;

Applicare border-radius uniforme (8px) a card, pulsanti, input.

Sostituire ombre con shadow-xl e shadow-2xl per profondità.

2.2 RIMODELLARE LA DASHBOARD PRINCIPALE (cruscotto enterprise)
Obiettivo: la Dashboard diventa un hub di comando con KPI grandi, grafici riorganizzati, metriche live in alto.
File: frontend/src/pages/Dashboard.jsx
Fix visibile:

Creare una sezione superiore con 4 KPI card grandi orizzontali (Agenti attivi, Alert critici, Vulnerabilità, Compliance) usando icone SVG professionali (lucide-react) e numeri grandi con tendenza (+/- %).

Sotto, due colonne: a sinistra il grafico dell'andamento severity (AreaChart ottimizzato con gradiente blu), a destra il donut della distribuzione severity con label personalizzate.

In fondo, una tabella compatta degli ultimi alert con badge severity colorati e link rapidi.

Aggiungere un indicatore di stato globale (connessione Wazuh) nella parte alta della dashboard.

Usare skeleton loading migliori (shimmer effect) durante il caricamento.

Implementare la memoizzazione dei dati grafici come indicato nella sezione 2.9 (ottimizzazione).

2.3 SIDEBAR RIDISEGNATA CON STILE ENTERPRISE
Obiettivo: sidebar professionale con logo, icone moderne, stato collassabile.
File: frontend/src/components/Sidebar.jsx, frontend/src/index.css
Fix visibile:

Sostituire lo sfondo con bg-[#0f172a] (blu scuro), altezza piena.

Aggiungere un logo WazuhX in alto (testo bold "WazuhX" con icona shield SVG) e un divider sotto.

Utilizzare icone SVG da lucide-react per ogni voce di menu (Activity, Shield, AlertTriangle, Server, FileSearch, CheckCircle, Activity, Brain, FileText, Settings).

Voci di menu con padding 12px 16px, border-radius 6px, effetto hover blu più chiaro.

Implementare collassabilità su mobile con un hamburger button nell'Header (vedi sezione 2.5).

Aggiungere aria-current="page" per accessibilità.

2.4 HEADER RISTILIZZATO
Obiettivo: header pulito, con titolo dinamico, breadcrumb, indicatori di stato e refresh.
File: frontend/src/components/Header.jsx
Fix visibile:

Sfondo bg-[#1e293b], altezza 56px, bordo inferiore sottile.

Allineare a sinistra il titolo della pagina (con effetto fade-in al cambio rotta).

Aggiungere un breadcrumb semplice (Dashboard > Agents) se la rotta lo permette.

A destra: pallino di stato Wazuh (verde/giallo), orario ultimo aggiornamento, pulsante Refresh con icona SVG rotante durante il refresh, avatar utente (iniziali "WX").

Rimuovere il fetch duplicato di /api/health (usare DataSourceContext come già indicato nei fix funzionali).

2.5 LAYOUT RESPONSIVE E MOBILE FIRST
Obiettivo: la UI deve funzionare perfettamente su desktop, tablet e mobile.
File: frontend/src/App.jsx, frontend/src/components/Sidebar.jsx, frontend/src/index.css
Fix visibile:

Su mobile: sidebar nascosta di default, accessibile tramite hamburger nell'Header. Overlay scuro quando aperta.

Margin del main content condizionale: lg:ml-[220px] ml-0.

KPI cards in griglia responsive: 1 colonna mobile, 2 tablet, 4 desktop.

Grafici con altezza adattiva (200px mobile, 300px desktop).

Toast notifications posizionate in basso a destra anche su mobile.

Assicurarsi che i touch target siano almeno 44x44px per pulsanti e link.

2.6 COMPONENTI UI ENTERPRISE (cards, pulsanti, badge, tabelle)
Obiettivo: uniformare tutti i componenti a uno stile enterprise coerente.
File: frontend/src/index.css, frontend/tailwind.config.js, vari componenti
Fix visibile:

Card: sfondo bg-[#1e293b], bordo 1px solid rgba(255,255,255,0.1), border-radius 8px, padding 20px, ombra shadow-md, titolo card font-semibold text-lg.

Pulsanti: primario bg-[#f59e0b] text-[#0f172a] hover:bg-[#d97706], secondario bg-transparent border border-[#334155] text-[#e2e8f0] hover:bg-[#1e293b].

Badge severity: critical rosso #ef4444, high arancione #f97316, medium giallo #eab308, low verde #22c55e, info blu #3b82f6 – tutti con sfondo opaco (es. bg-red-500/20 text-red-400).

Tabelle: header scuro, righe alternate con bg-[#1e293b]/50, hover row con bg-[#334155].

Input e select: bg-[#0f172a] border-[#334155] text-[#e2e8f0] focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b].

2.7 RIORGANIZZAZIONE DELLE PAGINE
Obiettivo: struttura chiara delle pagine con titoli, sottotitoli e azioni.
File: tutti i file in frontend/src/pages/*.jsx
Fix visibile:

Ogni pagina deve avere un header interno con titolo (es. "Agents", dimensione 24px bold) e sottotitolo descrittivo (es. "Monitora tutti gli agent Wazuh connessi").

Aggiungere un'area azioni (filtri, ricerca, pulsanti) subito sotto l'header, in un contenitore separato.

La griglia dei contenuti deve essere ben spaziata (gap-6).

Pagine vuote o con errori devono mostrare un componente EmptyState centrato con icona e messaggio.

La pagina Agent Detail deve avere tabs (Overview, Processi, Software, Rete, FIM) con stile enterprise.

2.8 ACCESSIBILITÀ VISIVA (focus, contrasto, ARIA)
Obiettivo: garantire che la UI sia utilizzabile da screen reader e tastiera, con contrasto WCAG AA.
File: frontend/src/index.css, vari componenti
Fix visibile:

Aggiungere stili :focus-visible con outline giallo oro su tutti gli elementi interattivi (pulsanti, link, input, select).

Verificare il contrasto testo/sfondo (es. text-[#94a3b8] su bg-[#0f172a] va bene, ma aumentare luminosità se necessario).

Aggiungere aria-label a tutti i pulsanti e link che hanno solo icone.

I toast devono avere role="alert" e un pulsante di chiusura visibile (X) con aria-label="Chiudi notifica".

La sidebar deve avere role="navigation" e aria-label="Main navigation".

2.9 OTTIMIZZAZIONE PERFORMANCE (lazy loading, memoization)
File: frontend/src/pages/Dashboard.jsx, frontend/vite.config.js
Fix:

In Dashboard.jsx, memoizzare i dati del grafico:
const donutData = useMemo(() =>
severityDist ? Object.entries(severityDist).map(([name, value]) => ({ name, value })) : [],
[severityDist]
);

In vite.config.js, aggiungere manualChunks per separare Recharts e React:
build: {
rollupOptions: {
output: {
manualChunks: {
'recharts': ['recharts'],
'react-vendor': ['react', 'react-dom', 'react-router-dom'],
},
},
},
},

2.10 TEST FRONTEND
Problema: la cartella frontend/tests/ è vuota.
Fix:

Creare frontend/tests/setup.js con:
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
afterEach(() => { cleanup(); localStorage.clear(); vi.clearAllMocks(); });

Creare frontend/tests/hooks/useWazuh.test.js con almeno 4 test (fetch, errore, skip, refetch).

Creare frontend/tests/utils/formatters.test.js con test per formatDate, formatRelative, formatBytes.

Eseguire npm test e verificare che passino.

2.11 CORREZIONI FUNZIONALI (bugfix interni ma con effetto visivo)
Nota: queste correzioni risolvono problemi funzionali che causano comportamenti visibili all'utente (crash, dati mancanti, layout rotti).

Rimuovere key={refreshKey} dalle Route in App.jsx per evitare flickering e perdita di scroll.

Correggere l'hook useWazuh per evitare richieste infinite e mostrare correttamente stati di errore (vedi fix funzionale 2.2).

Rendere le pagine Dashboard e Agents safe contro null/undefined (mostrare messaggi di errore invece di crash).

Aggiungere Toast chiudibili (pulsante X visibile).

Esecuzione finale
Dopo aver applicato tutte le correzioni e il redesign, eseguire:
cd backend && npm test && npm run lint
cd frontend && npm test && npm run build

Il progetto finale dovrà apparire come un dashboard enterprise professionale, con colori scuri, accenti oro, componenti eleganti, KPI ben visibili, navigazione fluida, accessibilità migliorata e performance ottimizzate. Ogni modifica alla UI deve essere visivamente evidente.

