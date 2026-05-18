Ridisegna completamente la UI di WazuhX mantenendo tutta la logica esistente. Obiettivo: dashboard enterprise sobria stile Grafana/Datadog, niente cyberpunk.
Design system da applicare a tutti i componenti:
Token CSS globali (metti in index.css o globals.css):
css:root {
  --bg-base: #0f1117;
  --bg-surface: #1a1d27;
  --bg-card: #1e2130;
  --bg-hover: #252839;
  --border: #2a2d3e;
  --border-subtle: #1f2235;
  --text-primary: #e2e8f0;
  --text-secondary: #8892a4;
  --text-muted: #4a5568;
  --accent: #2563eb;
  --accent-hover: #1d4ed8;
  --accent-light: rgba(37,99,235,0.12);
  --success: #16a34a;
  --warning: #d97706;
  --danger: #dc2626;
  --info: #0891b2;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 18px;
  --font: 'Inter', system-ui, sans-serif;
  --shadow: 0 1px 3px rgba(0,0,0,0.4);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.3);
}
Importa Inter da Google Fonts: https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap
Layout generale:

Sidebar fissa a sinistra, larghezza 220px, sfondo --bg-surface, bordo destro --border
Contenuto principale sfondo --bg-base, padding 24px
Topbar alta 56px, sfondo --bg-surface, bordo inferiore --border, con titolo pagina a sinistra e status Wazuh + avatar a destra
Nessun glow, nessun neon, nessun gradiente cyberpunk, nessuna animazione eccessiva

Sidebar:

Logo in alto 16px padding, testo bianco peso 600
Voci menu: icona (20px) + label, padding 10px 16px, radius --radius-md, hover --bg-hover, attivo --accent-light con testo --accent e bordo sinistro 2px --accent
Icone solo per le voci di menu e per le azioni principali, non decorative

Card / pannelli:

Sfondo --bg-card, border 1px solid var(--border), border-radius --radius-lg, padding 20px
Titolo card: testo 13px uppercase, colore --text-muted, letter-spacing 0.05em, margin-bottom 12px
Nessuna card con glow o ombre colorate

KPI widgets (usati in overview e agent detail):

Layout a griglia 4 colonne su desktop, 2 su tablet
Ogni KPI: numero grande (28px, peso 700, --text-primary), label sotto (12px, --text-secondary), icona piccola in alto a destra colorata con l'accento
Variazione trend opzionale sotto il numero (es. "+12% vs ieri") in verde/rosso
Bordo sinistro 3px colorato per contesto (blu=info, verde=ok, rosso=critico, giallo=warning)

Grafici (usa quelli già esistenti, solo restyling):

Sfondo trasparente su --bg-card
Colori serie: #2563eb, #0891b2, #16a34a, #d97706, #dc2626
Griglia: --border-subtle, assi: --text-muted
Tooltip: sfondo --bg-surface, border --border, testo --text-primary
Legenda: testo --text-secondary, 12px

Tabelle:

Header: sfondo --bg-surface, testo --text-muted 12px uppercase
Righe: border-bottom --border-subtle, hover --bg-hover
Border-radius su tabella intera --radius-md, overflow hidden
Nessuna zebra striping colorata

Badge severità:

Critical: sfondo rgba(220,38,38,0.15), testo #f87171, border rgba(220,38,38,0.3)
High: sfondo rgba(217,119,6,0.15), testo #fbbf24, border rgba(217,119,6,0.3)
Medium: sfondo rgba(37,99,235,0.15), testo #60a5fa, border rgba(37,99,235,0.3)
Low: sfondo rgba(22,163,74,0.15), testo #4ade80, border rgba(22,163,74,0.3)
Font-size 11px, peso 500, padding 2px 8px, border-radius --radius-xl

Status agente:

Active: pallino verde #16a34a + testo
Disconnected: pallino rosso #dc2626 + testo
Never connected: pallino grigio --text-muted + testo

Bottoni:

Primary: sfondo --accent, hover --accent-hover, testo bianco, radius --radius-md, padding 8px 16px, peso 500
Secondary: sfondo trasparente, border --border, testo --text-secondary, hover --bg-hover
Danger: sfondo rgba(220,38,38,0.1), testo #f87171, border rgba(220,38,38,0.3)

Input e select:

Sfondo --bg-surface, border --border, radius --radius-md, testo --text-primary, placeholder --text-muted
Focus: border --accent, outline none, box-shadow 0 0 0 3px var(--accent-light)

Regole generali:

Rimuovi tutti i colori neon, glow, text-shadow, box-shadow colorati
Rimuovi animazioni tipo pulse, flicker, scan-line
Mantieni transition 150ms ease solo su hover e focus
Densità compatta: padding interni ridotti, tabelle con row-height 40px
Testo leggibile: mai sotto 12px, mai --text-muted per testo informativo importante
Tutti i font var(--font), nessun font monospace tranne per ID tecnici e hash