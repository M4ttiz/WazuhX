# WazuhX

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Docker](https://img.shields.io/badge/docker-ready-2496ED.svg)
![Node.js](https://img.shields.io/badge/node-20.x-339933.svg)

**WazuhX** is an open-source alternative dashboard for [Wazuh](https://wazuh.com), with AI-powered analysis via Google Gemini.

![Screenshot placeholder](https://via.placeholder.com/1200x600/080c14/00d4ff?text=WazuhX+Dashboard)

## Features

- Real-time security dashboard (KPI, MITRE heatmap, alert trends)
- Agent resource metrics (CPU, RAM, disk, uptime, load) with threshold alerts
- Fleet **Metriche** page and per-agent **Risorse live** tab powered by **Glances** (auto-discovery via Wazuh agent IP, refresh 5s)
- Live CPU/RAM/disk %, network via `GET /api/metrics` and `GET /api/metrics/realtime/:id`
- Alert management with MITRE mapping and CSV export
- Vulnerability (CVE) tracking with NVD links
- File Integrity Monitoring (FIM)
- Compliance benchmarks (CIS, PCI-DSS, GDPR, HIPAA, NIST)
- AI Analyst (Gemini 1.5 Flash) — briefing and chat in Italian
- Professional PDF/HTML reports via Puppeteer
- Demo mode with realistic mock data when Wazuh is unreachable

## Requirements

- Docker & Docker Compose
- Wazuh 4.x installed (manager API on port 55000)
- External Docker network `wazuh-net` (shared with Wazuh stack)
- Google Gemini API key (free): https://aistudio.google.com/app/apikey

## Quick Start

### 1. Clone and configure

```bash
git clone https://github.com/M4ttiz/WazuhX.git
cd WazuhX
cp .env.example .env
# Edit .env with your Wazuh credentials and Gemini API key
```

### 2. Create Docker network (if not exists)

```bash
docker network create wazuh-net
```

### 3. Build and run

```bash
docker compose up -d --build
```

Open **http://localhost:3000**

### 4. Development (without Docker)

```bash
# Terminal 1 — Backend
cd backend
npm install
set USE_MOCK=true
npm run dev

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173 (proxies `/api` → backend :3001)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `WAZUH_API_URL` | Wazuh manager API URL | `https://wazuh-manager:55000` |
| `WAZUH_USER` | Wazuh API username | `admin` |
| `WAZUH_PASSWORD` | Wazuh API password | — |
| `GEMINI_API_KEY` | Google Gemini API key | — |
| `NODE_ENV` | Environment | `production` |
| `USE_MOCK` | Force demo/mock mode | `false` |
| `CACHE_TTL_SECONDS` | API cache TTL (live data) | `60` |
| `WAZUH_INDEXER_URL` | OpenSearch for alerts/CVE/custom metrics | — |
| `METRICS_CPU_THRESHOLD` | CPU alert threshold (%) | `90` |
| `METRICS_RAM_THRESHOLD` | RAM alert threshold (%) | `90` |
| `METRICS_DISK_THRESHOLD` | Disk alert threshold (%) | `85` |
| `METRICS_CACHE_TTL_SECONDS` | Metrics API cache | `30` |
| `GLANCES_PORT` | Glances HTTP port on agent hosts | `61208` |
| `GLANCES_SCHEME` | `http` or `https` | `http` |
| `GLANCES_TIMEOUT_MS` | Glances request timeout | `2500` |
| `GLANCES_ENABLED` | Disable Glances calls | `true` |
| `GLANCES_USER` / `GLANCES_PASSWORD` | Optional Glances API auth | — |
| `REALTIME_METRICS_CACHE_TTL_MS` | Cache for `GET /metrics/realtime/:id` (ms, max 5000) | `2000` |
| `PORT` | Backend port | `3001` |
| `NODE_TLS_REJECT_UNAUTHORIZED` | Allow self-signed Wazuh certs | `0` (Docker) |

## Adding to Existing Wazuh Compose

Add WazuhX services to your Wazuh `docker-compose.yml` or run standalone with `wazuh-net` external:

```yaml
networks:
  wazuh-net:
    external: true
```

Ensure `wazuh-manager` hostname resolves inside the network.

## Glances Setup (Endpoint Monitoring)

WazuhX discovers **Glances** automatically on each monitored endpoint. No manual IP configuration is required in the dashboard (same model as Wazuh Agent registration).

### Per ogni nuovo endpoint:

1. Install the Wazuh Agent (as per Wazuh documentation)
2. Install and start Glances web mode:

   **Windows 11 (PowerShell Admin):**
   ```powershell
   pip install glances[all]
   glances -w --bind 0.0.0.0 --port 61208 --disable-webui
   ```

   **Linux:**
   ```bash
   sudo apt install glances
   glances -w --bind 0.0.0.0 --port 61208 --disable-webui
   ```

3. Allow port **61208** from the WazuhX backend host only (firewall).

### Auto-discovery

WazuhX reads each agent IP from the Wazuh API and probes `http://<agent_ip>:61208/api/4/quicklook`. When Glances responds, real-time metrics appear in **Risorse live** with the badge on the agents list.

See [deploy/glances/README.md](deploy/glances/README.md). Fleet **Metriche** refreshes every **5 seconds** (`METRICS_CACHE_TTL_SECONDS=5`).

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/overview` | Dashboard KPIs |
| GET | `/api/agents` | List agents (`liveMetricsAvailable` per agent) |
| GET | `/api/agents/:id` | Agent detail |
| GET | `/api/agents/:id/stats` | Live Glances metrics (CPU/RAM/disk/network) |
| GET | `/api/alerts` | Paginated alerts |
| GET | `/api/vulnerabilities` | CVE list (cached 1h; indexer-first on 4.7+) |
| GET | `/api/debug/agents` | Agent IPs + Glances discovery status |
| GET | `/api/fim` | FIM events |
| GET | `/api/compliance` | SCA/compliance |
| GET | `/api/metrics` | Fleet metrics from Glances (`?agentId=`) |
| GET | `/api/metrics/realtime/:agentId` | Live Glances snapshot |
| GET | `/api/metrics/glances/series` | CPU/RAM history (`agentId`, `points`) |
| POST | `/api/ai/briefing` | AI executive briefing |
| POST | `/api/ai/chat` | AI chat |
| POST | `/api/reports/generate` | PDF/HTML report |

## Troubleshooting

### JWT / Authentication errors

- Verify `WAZUH_USER` and `WAZUH_PASSWORD` in `.env`
- Test: `curl -k -u user:pass -X POST https://wazuh-manager:55000/security/user/authenticate`
- Token is cached 15 minutes; backend auto-refreshes on 401

### CORS errors

- In production, frontend and API share origin via Nginx proxy
- In dev, use Vite proxy (configured in `vite.config.js`)

### Docker build failures

- Ensure `package-lock.json` exists in `backend/` and `frontend/`
- Use `npm ci` only (never `npm install` in Dockerfiles)
- Puppeteer in Alpine may need Chromium; HTML fallback is automatic

### Wazuh unreachable

- App shows demo banner and serves mock data (`X-Data-Source: mock`)
- Set `USE_MOCK=true` for local development without Wazuh

### CVE page empty (Wazuh 4.7.5+)

- Configure `WAZUH_INDEXER_URL` and credentials — CVE data is read from `wazuh-states-vulnerabilities-*` (manager API `/vulnerability/{id}` is deprecated).
- Backend falls back to `/vulnerability`, `/vulnerability/{id}/cve`, and `/cve/{id}` per agent when indexer returns no hits.
- Check indexer: `GET /api/debug/agents` includes `indexerLastError`.

### Metrics empty or stale

- Install **Glances** on each agent host (see [deploy/glances/README.md](deploy/glances/README.md)).
- Verify discovery: agent list should show `liveMetricsAvailable: true` (badge updates even when agent list is cached).
- Clear cache after changes: `curl -X DELETE http://localhost:3001/api/cache`

### Glances unreachable from WazuhX

- From the backend host: `curl -s "http://<agent-ip>:61208/api/4/quicklook"`
- Open firewall **61208/tcp** from WazuhX backend to agents.
- On the endpoint: `glances -w --bind 0.0.0.0 --port 61208 --disable-webui`
- Ensure the IP in Wazuh matches the host where Glances listens.

## Links

- Repository: https://github.com/M4ttiz/WazuhX
- Wazuh API docs: https://documentation.wazuh.com/current/user-manual/api/reference.html
- Gemini API key: https://aistudio.google.com/app/apikey

## License

MIT © [M4ttiz](https://github.com/M4ttiz)
