# WazuhX

<p align="center">
  <img src="assets/logo_wazuhx.png" width="100" alt="WazuhX Logo" />
</p>

<p align="center">
  <b>Alternative Dashboard for Wazuh &mdash; Powerful, Modern, Scalable</b>
</p>

<p align="center">
  <a href="https://github.com/M4ttiz/WazuhX/actions"><img src="https://github.com/M4ttiz/WazuhX/workflows/CI/badge.svg" alt="Build Status"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/M4ttiz/WazuhX?style=flat" alt="License"></a>
</p>

---

## Overview
WazuhX è una dashboard moderna alternativa per [Wazuh](https://wazuh.com), con un frontend React professionale e un backend Node.js. Offre una user experience ottimizzata, nuove funzionalità, gestione rule, viste avanzate e deployment via Docker.

- **Backend:** Node.js/Express
- **Frontend:** ReactJS
- **Config via:** `.env`
- **Deployment:** docker-compose

### Features
- Dashboard alternativa per Wazuh
- Gestione e visualizzazione regole
- Plug and play via Docker
- Responsive UI/UX moderna
- Moduli aggiuntivi personalizzabili
- Supporto multi-utente
- Logging avanzato
- Estendibile via API

## Quick Start

```sh
git clone https://github.com/M4ttiz/WazuhX.git
cd WazuhX
cp .env.example .env
docker-compose up --build
```

Apri il browser su [http://localhost:3000](http://localhost:3000)

## Repository Structure

```
WazuhX/
│
├── backend/        # API/logic Node.js backend
├── frontend/       # ReactJS frontend
├── prompts/        # Prompt markdown e config
├── deploy/         # Docker setup & compose
├── assets/         # Loghi, immagini, screenshot
├── scripts/        # Script di utilità
├── examples/       # Usage/demo code
├── docs/           # Documentazione tecnica
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

## Developer Guide

- **Coding Style:** vedi `.editorconfig` e seguire best practice Javascript/React
- **Scripts Utili:** vedi cartella `scripts/`
- **Gestione promt/regole:** vedi `prompts/` e documentazione

### Contributing
Contributi, bugfix e suggerimenti sono benvenuti! Leggi [CONTRIBUTING.md](CONTRIBUTING.md).

## License
Licensed under the [MIT License](LICENSE).

---

### Keywords
Wazuh, Dashboard, Security, React, Node.js, SIEM, Log Management, Docker, Open-source, Alternative UI

### Credits
Wazuh is a trademark of its respective owners. WazuhX non è affiliato ufficialmente al progetto Wazuh.