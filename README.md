# WazuhX

<p align="center">
  <img src="assets/logo_wazuhx.png" width="100" alt="WazuhX Logo" />
</p>

<p align="center">
  <b>Alternative Dashboard for Wazuh · Professional, Modern, Scalable</b>
</p>

<p align="center">
  <a href="https://github.com/M4ttiz/WazuhX/actions"><img src="https://github.com/M4ttiz/WazuhX/workflows/CI/badge.svg" alt="Build Status"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/M4ttiz/WazuhX?style=flat" alt="License"></a>
</p>

---

## Overview
WazuhX is a modern, open-source alternative dashboard for [Wazuh](https://wazuh.com). It provides a professional frontend (React) and backend (Node.js), optimized for security monitoring, SIEM, and enterprise cybersecurity. Easily deployable with Docker.

- **Backend:** Node.js/Express
- **Frontend:** ReactJS
- **Config:** `.env`
- **Deployment:** Docker Compose

### Features
- Alternative dashboard for Wazuh
- Rule management and alert visualization
- Plug & play via Docker
- Responsive modern UI/UX
- Customizable modules
- Multi-user support
- Advanced logging
- Extensible via API

## Quickstart

```sh
git clone https://github.com/M4ttiz/WazuhX.git
cd WazuhX
cp .env.example .env
docker-compose up --build
```

Open [http://localhost:3000](http://localhost:3000)

## Architecture

```
          ┌─────────────┐           ┌──────────────┐
          │  Frontend  │◀─────────▶│   Backend    │
          │  ReactJS   │  REST API │   Node.js    │
          └─────────────┘           └──────────────┘
                 │                       │
                 ▼                       ▼
           Users (Browser)     Wazuh API, Indexer, Glances
```

## Repository Structure

```
WazuhX/
├── backend/        # Node.js API backend
├── frontend/       # ReactJS frontend app
├── prompts/        # Prompts & config
├── deploy/         # Docker setups
├── assets/         # Logos, images
├── scripts/        # Utility scripts
├── examples/       # Usage/demo
├── docs/           # Documentation
│
├── .env.example
├── .gitignore
├── docker-compose.yml
├── LICENSE
├── README.md
├── CHANGELOG.md
├── ROADMAP.md
├── SECURITY.md
├── CONTRIBUTING.md
└── .editorconfig
```

## Deploy

Use Docker Compose stack:

```sh
docker-compose up --build
```

## Contributing
We welcome contributions, bug fixes, and suggestions. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License
MIT License - see [LICENSE](LICENSE)

---

### SEO Keywords
wazuh, siem, dashboard, security monitoring, open-source, cybersecurity, alternative dashboard, log analysis, react, nodejs
