ANALISI DEFINITIVA — tutti i bug trovati
🔴 CRITICI (fanno crashare o mostrano dati sbagliati)
B1 — getAgent(id) → path errato → "Agente non trovato"
/agents/${id} non esiste in Wazuh v4. Endpoint corretto: /agents?agents_list=${id}.
Colpisce anche syscollector.js route che chiama wazuh.getAgent().
B2 — getVulnerabilities() hardcoded su agent 001
Se nessun agente ha ID 001, sempre vuoto. Nessun parametro agentId.
B3 — getFim() → /syscheck senza agentId nel path
Wazuh vuole /syscheck/{agentId}. Il codice passa agent_id come query param — ignorato.
B4 — getCompliance() → endpoint e params completamente sbagliati
Chiama /rootcheck?pci_dss=cis. Endpoint corretto: /sca/{agentId}. Il parametro pci_dss non è un filtro Wazuh.
B5 — getAlerts() e getOverview() → /alerts non esiste
Wazuh v4 REST API non ha /alerts. Le alert vivono nell'indexer OpenSearch porta 9200. Entrambe le funzioni ritornano sempre null.
B6 — getAgentStats() → placeholder vuoto
Ritorna sempre { data: {}, source: 'wazuh' }. Zero chiamate API.
B7 — alerts.js route → import mock hardcoded
javascriptconst mock = require('../mock/mockData'); // importa dati finti
// live-count usa sempre mock.alerts → mai dati reali
const count = mock.alerts.filter((a) => a.timestamp >= oneMinAgo).length;

🟠 GRAVI (degradano silenziosamente)
B8 — Cache congela risposte null/vuote
withCache fa if (cached !== undefined) — NodeCache ritorna undefined solo per chiavi inesistenti, ma null viene cachato normalmente. Quindi se una funzione rotta ritorna null, quel null viene servito per 60 secondi anche dopo il fix. Nessuna route espone clearCache().
B9 — sendData imposta X-Data-Source: mock come default
javascriptres.set('X-Data-Source', result.source || 'mock');
Se source è undefined, il frontend vede 'mock' e potrebbe attivare logica demo anche con dati reali.
B10 — getAgentProcesses() sort param sbagliato
Passa sort: '-cpu' come query param. Wazuh v4 vuole sort=-cpu (stringa, non oggetto) oppure non supporta questo formato. Risultato: processi non ordinati o errore 400 silenzioso.
B11 — Race condition sul token
Se due richieste arrivano simultaneamente con token = null, entrambe chiamano /security/user/authenticate. Non è distruttivo ma causa doppio login inutile sotto carico.
B12 — wazuhRequest() inghiotte tutti gli errori
Qualsiasi errore (400, 404, 500, network) ritorna null silenziosamente. Impossibile distinguere "agente non trovato" da "endpoint sbagliato" dai log.

🟡 MINORI (inconsistenze)
B13 — vulnerabilities.js route bypassa sendData
Usa res.json({ data: result.data, stats: result.stats }) direttamente invece di sendData. Inconsistente con tutte le altre route, non setta X-Data-Source.
B14 — compliance.js route non passa agentId
Chiama wazuh.getCompliance(benchmark) ma non sa su quale agente fare la query SCA. Serve un loop su tutti gli agenti attivi.
B15 — fim.js route passa agentId: undefined
Se nessun ?agentId= nella query string, passa { agentId: undefined } che diventa stringa "undefined" in certi contesti.
B16 — .env ha variabili duplicate
WAZUH_API_USER/WAZUH_API_PASSWORD sono ignorate dal codice (usa WAZUH_USER/WAZUH_PASSWORD). Confonde.
B17 — backend/index.js non trovato
Il file entry point non è in ./backend/index.js. Cerca con:
bashfind ./backend -name "index.js" | head -5
find ./backend -name "app.js" | head -5

Istruzioni complete per Cursor
Digli esattamente questo:

Nel file backend/src/services/wazuhClient.js correggi questi bug usando Wazuh REST API v4:

getAgent(id): cambia /agents/${id} in /agents?agents_list=${id}&limit=1 e prendi raw.affected_items[0]
getVulnerabilities(): aggiungi parametro opzionale agentId. Se fornito chiama /vulnerability/${agentId}. Se non fornito, prima prendi tutti gli agenti attivi con /agents?status=active&limit=500, poi per ciascuno chiama /vulnerability/${a.id} e aggrega i risultati in un unico array
getFim(filters): se filters.agentId è definito chiama /syscheck/${filters.agentId}. Se non definito, prendi tutti gli agenti attivi e aggrega i risultati di /syscheck/${a.id} per ciascuno
getCompliance(benchmark): ignora il parametro benchmark nel path. Prendi tutti gli agenti attivi, per ciascuno chiama /sca/${a.id} e aggrega i risultati. Aggiungi campo agentId e agentName a ogni policy
getAlerts(filters): l'endpoint /alerts non esiste in Wazuh v4 REST API. Restituisci { data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 }, source: 'wazuh' }
getOverview(): rimuovi la chiamata a /alerts. Per i conteggi agenti usa /agents/summary/status invece di caricare 500 agenti. Per gli alert count restituisci 0
getAgentStats(id): implementa con chiamate reali a /syscollector/${id}/hardware e /syscollector/${id}/os, ritorna i dati combinati
getAgentProcesses(id): cambia il parametro sort da sort: '-cpu' a sort: '-cpu_usage_percent' o rimuovilo se causa errori 400
Aggiungi token race condition protection: usa una Promise condivisa let _tokenPromise = null e se _tokenPromise è già in corso ritorna quella invece di fare una nuova chiamata auth

Nel file backend/src/routes/alerts.js:
10. Rimuovi const mock = require('../mock/mockData')
11. Sostituisci il body di /live-count con res.json({ count: 0 }) finché non c'è accesso all'indexer
Nel file backend/src/middleware/cache.js:
12. In withCache, non cachare risultati null o array vuoti: aggiungi if (data === null || data === undefined) return data; prima di cache.set()
13. Aggiungi una route DELETE /api/cache in index.js che chiama clearCache() per poter invalidare la cache senza restart