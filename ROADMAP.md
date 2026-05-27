# WazuhX Roadmap

This document outlines the planned features and direction for WazuhX.
Community feedback and pull requests are welcome on any of these items.

---

## ✅ v1.0.0 — Shipped

- Full alternative Wazuh dashboard (React + Node.js)
- AI SOC Analyst via Google Gemini 1.5
- Agent management, alerts, FIM, compliance, vulnerabilities
- Real-time metrics via Glances
- PDF report generation
- In-browser SSH terminal
- Docker Compose single-command deployment
- Mock mode for offline development

---

## 🔨 v1.1.0 — In Progress (Q2 2025)

- [ ] Improved CI/CD pipeline with GitHub Actions
- [ ] Full test coverage for all backend routes
- [ ] Frontend E2E tests (Playwright)
- [ ] `docs/` site with setup guides and architecture diagrams
- [ ] Improved onboarding: validation script for `.env` values

---

## 🗓️ v1.2.0 — Planned (Q3 2025)

- [ ] **Multi-Wazuh support** — connect to multiple Wazuh instances
- [ ] **Alert correlation view** — group related alerts by host/time
- [ ] **Custom dashboards** — drag-and-drop widget layout
- [ ] **Webhook notifications** — Slack/Teams/email on threshold breach
- [ ] **Role-based access control** — admin vs read-only users
- [ ] **Audit log** — track who did what inside WazuhX

---

## 💡 Backlog / Under Consideration

- [ ] Internationalization (i18n) — English, Italian, Spanish
- [ ] Kubernetes / Helm chart deployment option
- [ ] LDAP / Active Directory authentication
- [ ] Grafana panel embed improvements
- [ ] OpenAI / local LLM support as alternative to Gemini
- [ ] Mobile-optimized layout
- [ ] Agent grouping and tag management

---

> 💬 Have an idea? [Open a Feature Request](https://github.com/M4ttiz/WazuhX/issues/new?template=feature_request.yml)
