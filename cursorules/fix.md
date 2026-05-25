# WazuhX Dashboard — Comprehensive Refactor & Bug Fix

## PROJECT CONTEXT
WazuhX is a custom web dashboard that interfaces with a Wazuh SIEM server (Ubuntu).
The stack likely uses React/Next.js (or similar) on the frontend and a Node/Python backend
that queries the Wazuh API. Analyze the entire codebase before making changes.

---

## PRIORITY ORDER (top = highest priority)
1. Alerts Page
2. Errors Page
3. FIM Page
4. CVE Page
5. Metrics Page (Netdata migration)
6. Compliance Page
7. Reports Page (lowest priority)

---

## 1. ALERTS PAGE — Fix & Enhance

**Problems:** No filtering, no status management, poor UX.

**Requirements:**
- Add a **filter bar** at the top with: severity (critical/high/medium/low/info),
  date range picker, agent/host selector, rule group selector, free-text search.
- Add a **status column** to each alert row with three possible states:
  `new` | `seen` | `dismissed`
- Add **bulk action toolbar** (appears when rows are selected):
  - "Mark as seen" → sets status to `seen`, moves to a "Seen" tab
  - "Dismiss" → sets status to `dismissed`, removes from active list
  - "Delete" → permanently removes from local state (with confirmation modal)
- Persist status changes in localStorage (or backend if API endpoint available).
- Add **tabs**: All | New | Seen | Dismissed
- Add a **severity badge** with color coding (red=critical, orange=high, yellow=medium,
  blue=low, gray=info).
- Add a **summary chart** at the top (bar or donut) showing alert distribution by severity
  using Recharts or Chart.js — whichever is already in the project.
- Each row must be **expandable** (accordion) to show full alert details (rule.description,
  agent.name, timestamp, raw log, MITRE ATT&CK tags if present).

---

## 2. ERRORS PAGE — Fix & Enhance

**Same requirements as Alerts Page (filters, status, delete, seen/unseen, charts).**

**Additional specifics:**
- Filter by: error type/code, affected component, date range, agent.
- Show a **timeline chart** (line chart) of errors over time (last 24h / 7d / 30d).
- Status workflow: `new` → `acknowledged` → `resolved` | `dismissed`
- Add a "Mark as resolved" action with optional notes field.
- Persist status in localStorage keyed by error ID.

---

## 3. FIM PAGE — Improve Readability & Add Charts

**Problem:** Page is hard to read, lacks visual context.

**Requirements:**
- Add a **summary stats bar** at top: total events today, files added, modified, deleted.
- Add a **timeline chart** (Recharts LineChart or AreaChart) showing FIM events over time.
- Add a **treemap or bar chart** showing which directories have the most changes.
- Display events in a **sortable, filterable table** with columns:
  timestamp | agent | file path | event type (add/modify/delete) | MD5/SHA1 hash diff
- Color-code event types: green=add, yellow=modify, red=delete.
- Add a **file path filter** (free-text) and **event type filter** (checkboxes).
- Make **file path clickable** to expand and show full diff (old vs new hash, permissions, owner).
- Add a **"high risk paths" panel** that highlights changes in /etc, /bin, /usr/bin, /sbin, cron dirs.

---

## 4. CVE PAGE — Fix Data Fetching

**Problem:** No data arrives. The API call is broken.

**Requirements:**
- Audit the current CVE data fetching logic. Check:
  1. Is the Wazuh API endpoint correct? It should be:
     `GET /vulnerability/{agent_id}/summary` or `GET /vulnerability/{agent_id}`
     (Wazuh API v4.x: `GET /vulnerability/{agent_id}?pretty=true`)
  2. Is the auth token being passed correctly? (Bearer token from Wazuh JWT login)
  3. Is CORS or SSL verification blocking the request? Add `rejectUnauthorized: false`
     for self-signed certs in dev, or proxy through backend.
- Fix the fetch and ensure data is properly mapped to the UI.
- Display CVEs in a **sortable table**: CVE ID | severity | CVSS score | package | version |
  affected agent | description | fix available.
- Add a **severity distribution chart** (donut chart) at the top.
- Add filters: severity, agent, package name, fix available (yes/no).
- Group by agent in a collapsible tree if multiple agents are monitored.
- Add a **"Last scanned"** timestamp per agent.

---

## 5. METRICS PAGE — Migrate from Syscollector to Netdata

**Problem:** Currently uses Wazuh syscollector. Must be replaced with Netdata.

**Server-side setup to document/configure in code (add to README and/or config file):**
```bash
# Install Netdata on Ubuntu server
curl https://get.netdata.cloud/kickstart.sh > /tmp/netdata-kickstart.sh && sh /tmp/netdata-kickstart.sh

# Enable Netdata API (default port 19999, no auth by default)
# In /etc/netdata/netdata.conf:
[web]
    allow connections from = localhost 192.168.*.*
    # or use Netdata Cloud / token auth for remote access
```

**Frontend requirements:**
- Replace all syscollector API calls with **Netdata REST API v1** calls:
  - CPU usage: `GET http://<server>:19999/api/v1/data?chart=system.cpu`
  - RAM: `GET http://<server>:19999/api/v1/data?chart=system.ram`
  - Network: `GET http://<server>:19999/api/v1/data?chart=system.net`
  - Disk I/O: `GET http://<server>:19999/api/v1/data?chart=system.io`
  - Load avg: `GET http://<server>:19999/api/v1/data?chart=system.load`
- Add a **config file** (e.g. `config/netdata.config.js`) with:
```js
  export const NETDATA_HOST = process.env.NETDATA_HOST || 'http://localhost:19999';
```
- Display metrics as **real-time charts** with auto-refresh every 5s using Recharts AreaChart.
- Show widgets/cards for: CPU %, RAM used/total, Disk usage %, Network in/out (KB/s), Load avg.
- Add a **time range selector**: Last 5m / 15m / 1h / 6h / 24h.
- Handle connection errors gracefully with a "Netdata not reachable" banner.

---

## 6. COMPLIANCE PAGE — Same pattern as Alerts Page

**Requirements (mirror Alerts Page structure):**
- Filter by: framework (PCI-DSS, HIPAA, NIST, GDPR, CIS), requirement ID, status, agent.
- Add status workflow per compliance check: `compliant` | `non-compliant` | `in-review`
- Bulk actions: mark compliant, mark in-review, dismiss.
- Summary chart: compliance pass/fail ratio (donut chart) per framework.
- Expandable rows showing full compliance check details.
- Persist status in localStorage.

---

## 7. REPORTS PAGE — Fix Real Data Generation (LOWEST PRIORITY)

**Problem:** Report generates fake/placeholder data instead of real data.

**Requirements:**
- When generating a report, fetch **live data** from all available pages (alerts, CVE,
  FIM, metrics, compliance) using the same API service layer used by individual pages.
- Do NOT mock data — import and reuse existing data-fetching functions/services.
- Report sections should include: Executive Summary (alert counts by severity),
  Top CVEs, FIM changes summary, Compliance status per framework, Metrics snapshot.
- Export as PDF (using jsPDF + html2canvas or a server-side solution) or JSON.
- Add a **date range selector** for the report period.
- Show a **progress indicator** while data is being fetched.

---

## GENERAL RULES FOR ALL CHANGES
- Do NOT break existing working functionality.
- Reuse existing UI components, theme, and design system where possible.
- All new charts must use whichever charting library is already installed in the project.
- Status/filter state must survive page navigation (use localStorage or React context).
- All API calls must go through the existing API service layer — do not add raw fetch()
  calls directly in components.
- Add loading skeletons and empty states for all data-fetching views.
- Mobile responsiveness is NOT required — desktop only.
- Do not add new dependencies unless strictly necessary; prefer existing ones.