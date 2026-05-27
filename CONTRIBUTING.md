# Contributing to WazuhX

Thank you for your interest in contributing! WazuhX is an open-source project and contributions of all kinds are welcome.

---

## 🐛 Reporting Bugs

Use the [Bug Report template](https://github.com/M4ttiz/WazuhX/issues/new?template=bug_report.yml). Include:
- What you expected vs what happened
- Steps to reproduce
- WazuhX version, Wazuh version, OS
- Relevant logs (redact any credentials)

## 💡 Suggesting Features

Use the [Feature Request template](https://github.com/M4ttiz/WazuhX/issues/new?template=feature_request.yml).

---

## 🔧 Development Setup

### Prerequisites

- Node.js >= 20
- Docker + Docker Compose (for integration testing)

### 1. Fork & clone

```bash
git clone https://github.com/YOUR_USERNAME/WazuhX.git
cd WazuhX
```

### 2. Backend

```bash
cd backend
npm install
cp ../.env.example ../.env   # set USE_MOCK=true for offline dev
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Run tests

```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
```

---

## 📋 Pull Request Guidelines

1. **Branch naming:** `feat/my-feature`, `fix/issue-123`, `docs/update-readme`
2. **Commits:** follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
3. **One concern per PR** — keep PRs focused and small where possible
4. **Tests:** add or update tests for any changed behaviour
5. **No secrets:** never commit API keys, passwords, or IP addresses
6. **Fill out the PR template** when opening your PR

---

## 📁 Project Structure

See [`STRUCTURE.md`](STRUCTURE.md) for a full explanation of every folder.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating you agree to abide by its terms.
