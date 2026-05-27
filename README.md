<p align="center">
  <img src="assets/logo_wazuhx.png" width="120" alt="WazuhX Logo" />
</p>

<h1 align="center">WazuhX</h1>

<p align="center">
  <b>A modern, open-source alternative dashboard for Wazuh — with AI-powered SOC analysis.</b>
</p>

<p align="center">
  <a href="https://github.com/M4ttiz/WazuhX/actions/workflows/ci.yml">
    <img src="https://github.com/M4ttiz/WazuhX/actions/workflows/ci.yml/badge.svg" alt="CI">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/github/license/M4ttiz/WazuhX?style=flat&color=blue" alt="License: MIT">
  </a>
  <a href="https://github.com/M4ttiz/WazuhX/releases">
    <img src="https://img.shields.io/github/v/release/M4ttiz/WazuhX?style=flat&color=green" alt="Latest Release">
  </a>
  <img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen?style=flat" alt="Node.js >= 20">
  <img src="https://img.shields.io/badge/docker-compose-blue?style=flat&logo=docker" alt="Docker Compose">
  <img src="https://img.shields.io/badge/AI-Gemini%201.5-orange?style=flat&logo=google" alt="Gemini AI">
  <a href="https://github.com/M4ttiz/WazuhX/issues">
    <img src="https://img.shields.io/github/issues/M4ttiz/WazuhX?style=flat" alt="Open Issues">
  </a>
</p>

---

## What is WazuhX?

**WazuhX** is a production-grade, open-source dashboard that replaces the default Wazuh UI. Built with React 18 and Node.js, it connects directly to your existing Wazuh stack via Docker and brings a clean modern interface, an integrated **AI SOC Analyst** powered by Google Gemini, in-browser SSH terminals, and PDF report generation — all without touching your Wazuh core.

> ⚡ Runs alongside Wazuh on the same server. Zero modifications to your existing Wazuh setup required.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🏠 **Overview Dashboard** | KPIs, severity charts, top attackers, agent status at a glance |
| 🤖 **AI SOC Analyst** | Chat with Gemini AI trained on your live Wazuh data — threat briefings, remediation advice |
| 🖥️ **Agent Management** | Full agent list, status tabs, bulk actions, per-agent detail pages |
| 🚨 **Alerts & Events** | Real-time alert table with filters, MITRE ATT&CK heatmap, noise suppression |
| 🔓 **Vulnerability Management** | CVE tracking via Wazuh Indexer (OpenSearch), severity breakdown |
| 🗂️ **File Integrity Monitoring** | FIM events per agent with file path, action and timestamp |
| ✅ **Compliance** | PCI-DSS, HIPAA, NIST, GPG13 compliance checks across agents |
| 📊 **Metrics & Performance** | Real-time CPU/RAM/Disk via Glances, configurable thresholds & alerts |
| 📄 **Report Generator** | One-click PDF security reports via Puppeteer |
| 🔑 **SSH Terminal** | In-browser terminal to agents via WebSocket SSH proxy (xterm.js) |
| 🌙 **Dark/Light Theme** | Grafana-inspired dark UI with full theme toggle |
| 🔄 **Mock Mode** | Run fully offline with `USE_MOCK=true` — no Wazuh instance needed |

---

## 🏗️ Architecture

```
┌─────────────────────── Docker Network: wazuh-net ───────────────────────┐
│                                                                           │
│   ┌─────────────────┐   REST /api/*    ┌──────────────────────────────┐  │
│   │  Frontend        │◀───────────────▶│  Backend (Node.js/Express)   │  │
│   │  React 18 + Vite │                 │                              │  │
│   │  TailwindCSS     │                 │  ├─ Wazuh API proxy (JWT)    │  │
│   │  Recharts        │                 │  ├─ Wazuh Indexer (OpenSearch)│  │
│   │  xterm.js        │                 │  ├─ Gemini AI service        │  │
│   └────────┬─────────┘                 │  ├─ PDF generator (Puppeteer)│  │
│            │ :3000 (Nginx)             │  ├─ Glances metrics service  │  │
│            │                           │  └─ Rate limiting + cache    │  │
│   ┌────────▼─────────┐                 └──────────────┬───────────────┘  │
│   │  SSH Proxy        │ WebSocket :3001               │                  │
│   │  (WS → SSH)       │                              ▼                  │
│   └──────────────────┘                 ┌──────────────────────────────┐  │
│                                        │  Wazuh Stack                  │  │
│                                        │  ├─ wazuh-manager :55000      │  │
│                                        │  ├─ wazuh-indexer :9200       │  │
│                                        │  └─ wazuh-dashboard :443      │  │
│                                        └──────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quickstart

### Prerequisites

- Docker + Docker Compose
- A running Wazuh stack on the `wazuh-net` Docker network
- A [Google Gemini API key](https://aistudio.google.com/app/apikey) (free tier works)

### 1. Clone & configure

```bash
git clone https://github.com/M4ttiz/WazuhX.git
cd WazuhX
cp .env.example .env
```

Edit `.env` with your Wazuh credentials and Gemini API key:

```env
WAZUH_API_URL=https://wazuh-manager:55000
WAZUH_USER=admin
WAZUH_PASSWORD=your_password
WAZUH_INDEXER_URL=https://wazuh-indexer:9200
GEMINI_API_KEY=your_gemini_key
```

### 2. Deploy

```bash
docker compose up --build -d
```

Open **http://localhost:3000** 🎉

### 3. Try it without Wazuh (mock mode)

```bash
USE_MOCK=true docker compose up --build
```

---

## 🛠️ Development

### Backend

```bash
cd backend
npm install
npm run dev        # nodemon hot-reload on :3001
npm test           # Jest + Supertest
```

### Frontend

```bash
cd frontend
npm install
npm run dev        # Vite HMR on :5173
npm test           # Vitest
npm run build      # Production build
```

### Environment variables

See [`.env.example`](.env.example) for the full reference with descriptions for every variable.

---

## 📁 Repository Structure

```
WazuhX/
├── backend/               # Node.js/Express API
│   ├── src/
│   │   ├── routes/        # agents, alerts, ai, reports, metrics, ...
│   │   ├── services/      # wazuhClient, geminiService, pdfService, glances
│   │   ├── middleware/     # auth, cache, rateLimit
│   │   └── index.js
│   └── tests/
├── frontend/              # React 18 + Vite app
│   ├── src/
│   │   ├── pages/         # Dashboard, Alerts, Agents, AIAnalyst, ...
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/         # useWazuh, useAI, useAutoRefresh, ...
│   │   ├── context/       # Theme, DataSource, Refresh, Toast
│   │   └── utils/         # formatters, chartTheme, api
│   └── tests/
├── ssh-proxy/             # Standalone WebSocket SSH proxy
├── deploy/
│   ├── wazuh/             # Custom Wazuh decoders & rules for metrics
│   └── glances/           # Glances setup guide
├── docs/                  # Extended documentation
├── assets/                # Logos and images
├── .github/
│   ├── workflows/ci.yml   # GitHub Actions CI
│   └── ISSUE_TEMPLATE/    # Bug & feature templates
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
├── .env.example
└── LICENSE
```

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a pull request.

1. Fork the repository
2. Create your branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'feat: add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 🔒 Security

Found a vulnerability? Please **do not** open a public issue. See [SECURITY.md](SECURITY.md) for responsible disclosure instructions.

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgements

- [Wazuh](https://wazuh.com) — The open-source security platform this dashboard connects to
- [Google Gemini](https://deepmind.google/technologies/gemini/) — AI SOC analysis engine
- [Glances](https://nicolargo.github.io/glances/) — Real-time system metrics
