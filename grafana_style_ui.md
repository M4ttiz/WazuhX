## WazuhX — Full Grafana-style UI Redesign + Alert Noise Filtering

### GOAL
Redesign the entire WazuhX UI to look and feel like Grafana:
dark background (#0f1117 or similar), panel cards with subtle borders,
colored metric bars, dense data tables, monospace values, teal/green accent color.
Do NOT use any current UI library if it clashes with this aesthetic.
Use Tailwind dark mode classes + Recharts for all visualizations.

---

## 1. GLOBAL THEME — Apply to entire app

Set these CSS variables globally:

```css
:root {
  --bg-base:        #0f1117;
  --bg-panel:       #181b24;
  --bg-panel-hover: #1f2335;
  --border:         #2a2f45;
  --text-primary:   #d8d9da;
  --text-secondary: #8a8fa3;
  --text-muted:     #5a5f72;
  --accent:         #3b82f6;      /* blue — Grafana-style */
  --green:          #73bf69;
  --yellow:         #f5a623;
  --orange:         #ff7f50;
  --red:            #f2495c;
  --purple:         #b877d9;
  --font-mono:      'JetBrains Mono', 'Fira Mono', monospace;
}
```

Apply `bg-[var(--bg-base)]` to the root layout.
All panel cards: `bg-[var(--bg-panel)] border border-[var(--border)] rounded-md`.
All text defaults to `text-[var(--text-primary)]`.
Sidebar: same dark bg, active item highlighted with left border accent color.

---

## 2. METRICS PAGE — Grafana-style host table

Replicate the layout shown (cluster node details table) but for Wazuh agents:

### Summary row (top bar — 4 stat cards)
- Total agents online
- Avg CPU %
- Avg RAM %
- Alerts last 1h

### Main table columns:
| Agent name | Memory used (bar) | CPU usage (bar) | OS | Kernel | Wazuh version | Status |

### Memory/CPU bars:
Render as inline colored progress bars exactly like Grafana:
- Segments of small rectangles (10-12 blocks), colored by value:
  - 0-60%: var(--green)
  - 60-80%: var(--yellow)
  - 80-90%: var(--orange)
  - 90-100%: var(--red)
- Show % value after the bar in monospace font.

Implementation:
```jsx
function SegmentBar({ value, max = 100 }) {
  const pct = (value / max) * 100;
  const color = pct < 60 ? 'var(--green)' 
              : pct < 80 ? 'var(--yellow)'
              : pct < 90 ? 'var(--orange)' 
              : 'var(--red)';
  const filled = Math.round((pct / 100) * 12);
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-[2px]">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} style={{
            width: 8, height: 16, borderRadius: 2,
            backgroundColor: i < filled ? color : 'var(--border)'
          }} />
        ))}
      </div>
      <span style={{ color, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
        {value.toFixed(1)}%
      </span>
    </div>
  );
}
```

Data comes from Netdata API (already configured). Auto-refresh every 10s.

---

## 3. ALERT NOISE FILTERING — Smart deduplication

This is critical. The alerts page must NOT show spammy repeated events.

### Deduplication rules (apply server-side before sending to frontend):

```js
// In alertsService.js — deduplicate before returning

function deduplicateAlerts(alerts) {
  const grouped = {};

  for (const alert of alerts) {
    // Group key: same rule.id + same agent + same source.ip (if present)
    const key = `${alert.rule?.id}_${alert.agent?.id}_${alert.data?.srcip || ''}`;

    if (!grouped[key]) {
      grouped[key] = { ...alert, count: 1, first_seen: alert.timestamp };
    } else {
      grouped[key].count++;
      grouped[key].timestamp = alert.timestamp; // keep latest
    }
  }

  return Object.values(grouped);
}
```

### Noise suppression rules — filter OUT by default:

```js
const NOISE_RULE_IDS = [
  '5710',  // SSH failed login (brute force noise)
  '5711',  // SSH failed login invalid user
  '5716',  // SSH auth failed
  '5503',  // Agent disconnected (too frequent)
  '1002',  // Generic error messages
  '31101', // Web scan 404s
  '31151', // Web scan noise
];

// Remove from default view — user can toggle "show noisy" to see them
function filterNoise(alerts, showNoise = false) {
  if (showNoise) return alerts;
  return alerts.filter(a => !NOISE_RULE_IDS.includes(String(a.rule?.id)));
}
```

### UI controls for noise:
- Toggle button "Show noisy rules" (off by default) — when off, suppressed alerts
  are hidden but a banner shows: "X alerts hidden (noise filtered) — Show all"
- Deduplication: show "×42" badge on grouped alerts instead of 42 separate rows.
- Add a "Suppression Rules" settings panel where the user can add/remove rule IDs
  to the noise list and persist in localStorage.

---

## 4. PANELS & LAYOUT — Grafana-style grid

Every page must use a panel grid layout:

```jsx
// Reusable GrafanaPanel component
function GrafanaPanel({ title, subtitle, children, className }) {
  return (
    <div className={`
      bg-[var(--bg-panel)] border border-[var(--border)] 
      rounded-md p-4 flex flex-col gap-3 ${className}
    `}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--text-primary)]">{title}</span>
        {subtitle && (
          <span className="text-xs text-[var(--text-muted)]">{subtitle}</span>
        )}
      </div>
      {children}
    </div>
  );
}
```

Use CSS grid for page layout:
```jsx
<div className="grid grid-cols-12 gap-3 p-4">
  <GrafanaPanel className="col-span-3" title="Total Alerts" />
  <GrafanaPanel className="col-span-3" title="Critical" />
  <GrafanaPanel className="col-span-6" title="Alerts over time" />
  <GrafanaPanel className="col-span-12" title="Alert table" />
</div>
```

---

## 5. CHARTS — Recharts styled like Grafana

All charts must use these Recharts defaults:

```jsx
const chartDefaults = {
  background: 'transparent',
  gridColor: 'var(--border)',
  axisColor: 'var(--text-muted)',
  tooltipBg: '#1a1f2e',
  tooltipBorder: 'var(--border)',
  colors: ['#3b82f6', '#73bf69', '#f5a623', '#f2495c', '#b877d9'],
};

// Apply to all charts:
<CartesianGrid strokeDasharray="3 3" stroke={chartDefaults.gridColor} />
<XAxis tick={{ fill: chartDefaults.axisColor, fontSize: 11 }} axisLine={false} />
<YAxis tick={{ fill: chartDefaults.axisColor, fontSize: 11 }} axisLine={false} />
<Tooltip
  contentStyle={{
    backgroundColor: chartDefaults.tooltipBg,
    border: `1px solid ${chartDefaults.tooltipBorder}`,
    borderRadius: 4,
    fontSize: 12,
  }}
/>
```

---

## RULES
- Apply theme changes globally, not page by page.
- The GrafanaPanel component must be used on EVERY page.
- SegmentBar must be used on Metrics page and anywhere CPU/RAM % is shown.
- Noise filtering must be applied on Alerts, Errors, and Compliance pages.
- Do not change API logic, only UI and filtering layer.
- Keep the sidebar navigation as-is but restyle it to match the dark theme.