# Changelog

All notable changes to WazuhX are documented here.
This project follows [Semantic Versioning](https://semver.org/) and [Keep a Changelog](https://keepachangelog.com/).

---

## [Unreleased]

### Added
- `.github/` folder: CI workflow, issue templates, PR template
- `CODE_OF_CONDUCT.md`

### Fixed
- `docker-compose.yml`: Dockerfile.frontend path now references root instead of `cursorules/`

---

## [1.0.0] — 2025-05-01

### Added
- **Dashboard** — Overview with KPIs, severity pie chart, top agents by alert count
- **Agents** — Full agent list with status tabs, bulk actions, search/filter, per-agent detail page
- **Alerts** — Real-time alert table with multi-field filtering, MITRE ATT&CK heatmap, noise rule suppression
- **Vulnerabilities** — CVE list from Wazuh Indexer with severity breakdown and per-agent filtering
- **FIM** — File Integrity Monitoring events table with path, action, timestamp
- **Compliance** — PCI-DSS, HIPAA, NIST, GPG13 compliance panels
- **Metrics** — Real-time CPU/RAM/Disk metrics via Glances auto-discovery per agent
- **AI Analyst** — Chat interface powered by Google Gemini 1.5 Flash with live Wazuh context
- **Report Generator** — One-click PDF report via Puppeteer
- **SSH Terminal** — In-browser WebSocket SSH proxy using xterm.js
- **Mock Mode** — Full offline demo with `USE_MOCK=true`
- **Dark/Light theme** — Grafana-inspired dark UI with toggle
- **Rate limiting** — API rate limiting via `express-rate-limit`
- **Caching** — Server-side response caching via `node-cache`
- **Docker Compose** deployment on the `wazuh-net` Docker network
- **Custom Wazuh decoders & rules** for Glances metrics ingestion
- **Test suites** — Vitest (frontend) + Jest/Supertest (backend)

---

[Unreleased]: https://github.com/M4ttiz/WazuhX/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/M4ttiz/WazuhX/releases/tag/v1.0.0
