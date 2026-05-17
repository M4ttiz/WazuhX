const wazuh = require('./wazuhClient');
const gemini = require('./geminiService');
const mock = require('../mock/mockData');

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function priorityBadge(p) {
  const colors = { urgent: '#ff3860', high: '#ffd60a', normal: '#00ff88' };
  const labels = { urgent: 'Urgente', high: 'Alta', normal: 'Normale' };
  return `<span style="color:${colors[p] || colors.normal}">● ${labels[p] || p}</span>`;
}

async function buildReportHtml(options) {
  const {
    period = '7 giorni',
    sections = ['overview', 'alerts', 'agents', 'vulnerabilities', 'compliance'],
    language = 'it',
    agents: selectedAgents = 'all',
  } = options;

  const overview = mock.getOverview();
  const vulnStats = mock.getVulnStats();
  const compliance = mock.generateCompliance('cis');
  const lang = language === 'en' ? 'en' : 'it';

  let executiveSummary = 'Report generato automaticamente da WazuhX.';
  let recommendations = [];

  try {
    executiveSummary = await gemini.generateExecutiveSummary(period, sections);
    recommendations = await gemini.generateRecommendations();
  } catch {
    executiveSummary =
      lang === 'it'
        ? 'Executive summary non disponibile (configurare GEMINI_API_KEY).'
        : 'Executive summary unavailable (configure GEMINI_API_KEY).';
  }

  const title = lang === 'it' ? 'Report di Sicurezza WazuhX' : 'WazuhX Security Report';
  const date = new Date().toLocaleString(lang === 'it' ? 'it-IT' : 'en-US');

  const recsHtml = recommendations
    .map(
      (r) =>
        `<li>${priorityBadge(r.priority)} <strong>${escapeHtml(r.title)}</strong> — ${escapeHtml(r.description)}</li>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <style>
    @page { margin: 2cm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; line-height: 1.6; }
    .cover { page-break-after: always; text-align: center; padding-top: 200px; }
    .cover h1 { font-size: 36px; color: #00d4ff; }
    .cover .meta { color: #666; margin-top: 40px; }
    .classification { border: 2px solid #ff3860; padding: 8px; display: inline-block; margin-top: 20px; }
    h2 { color: #00d4ff; border-bottom: 2px solid #1a2540; padding-bottom: 8px; margin-top: 32px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 20px 0; }
    .kpi { background: #f0f4f8; padding: 16px; border-radius: 8px; text-align: center; }
    .kpi .value { font-size: 28px; font-weight: bold; color: #00d4ff; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #0d1220; color: white; }
    .footer { position: fixed; bottom: 0; width: 100%; font-size: 10px; color: #999; text-align: center; }
    .toc { page-break-after: always; }
    .toc li { margin: 8px 0; }
  </style>
</head>
<body>
  <div class="cover">
    <h1>${title}</h1>
    <p class="meta">${date}</p>
    <p class="meta">${lang === 'it' ? 'Periodo' : 'Period'}: ${escapeHtml(period)}</p>
    <div class="classification">CONFIDENTIAL</div>
  </div>

  <div class="toc">
    <h2>${lang === 'it' ? 'Indice' : 'Table of Contents'}</h2>
    <ol>
      <li>Executive Summary</li>
      <li>KPI Overview</li>
      <li>Alerts</li>
      <li>Endpoints</li>
      <li>Vulnerabilities</li>
      <li>Compliance</li>
      <li>${lang === 'it' ? 'Azioni Raccomandate' : 'Recommended Actions'}</li>
    </ol>
  </div>

  <h2>Executive Summary</h2>
  <p>${escapeHtml(executiveSummary)}</p>

  <h2>KPI Overview</h2>
  <div class="kpi-grid">
    <div class="kpi"><div class="value">${overview.kpis.totalAlerts}</div><div>Total Alerts</div></div>
    <div class="kpi"><div class="value">${overview.kpis.criticalAlerts}</div><div>Critical</div></div>
    <div class="kpi"><div class="value">${overview.kpis.agentsOnline}</div><div>Online</div></div>
    <div class="kpi"><div class="value">${vulnStats.total}</div><div>CVE</div></div>
    <div class="kpi"><div class="value">${overview.kpis.avgCompliance}%</div><div>Compliance</div></div>
    <div class="kpi"><div class="value">${overview.kpis.threatsBlocked}</div><div>Blocked</div></div>
  </div>

  ${sections.includes('alerts') ? `
  <h2>Alerts</h2>
  <table>
    <tr><th>Time</th><th>Severity</th><th>Agent</th><th>Description</th></tr>
    ${mock.alerts.slice(0, 15).map(a => `<tr><td>${a.timestamp}</td><td>${a.severity}</td><td>${escapeHtml(a.agentName)}</td><td>${escapeHtml(a.description)}</td></tr>`).join('')}
  </table>` : ''}

  ${sections.includes('agents') ? `
  <h2>Endpoints</h2>
  <table>
    <tr><th>Name</th><th>IP</th><th>OS</th><th>Status</th><th>CPU%</th><th>RAM%</th></tr>
    ${mock.agents.map(a => `<tr><td>${escapeHtml(a.name)}</td><td>${a.ip}</td><td>${escapeHtml(a.os)}</td><td>${a.status}</td><td>${a.cpuUsage}</td><td>${a.ramUsage}</td></tr>`).join('')}
  </table>` : ''}

  ${sections.includes('vulnerabilities') ? `
  <h2>Vulnerabilities</h2>
  <table>
    <tr><th>CVE</th><th>Agent</th><th>Package</th><th>CVSS</th><th>Severity</th></tr>
    ${mock.vulnerabilities.sort((a,b) => b.cvss - a.cvss).slice(0, 20).map(v => `<tr><td>${v.cve}</td><td>${escapeHtml(v.agentName)}</td><td>${v.package}</td><td>${v.cvss}</td><td>${v.severity}</td></tr>`).join('')}
  </table>` : ''}

  ${sections.includes('compliance') ? `
  <h2>Compliance</h2>
  <table>
    <tr><th>Agent</th><th>Score</th><th>Passed</th><th>Total</th></tr>
    ${compliance.map(c => `<tr><td>${escapeHtml(c.agentName)}</td><td>${c.score}%</td><td>${c.passed}</td><td>${c.total}</td></tr>`).join('')}
  </table>` : ''}

  <h2>${lang === 'it' ? 'Azioni Raccomandate' : 'Recommended Actions'}</h2>
  <ul>${recsHtml}</ul>

  <div class="footer">WazuhX v1.0 | ${date} | Wazuh 4.9</div>
</body>
</html>`;
}

async function generatePdf(html) {
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
    });
    return pdf;
  } finally {
    await browser.close();
  }
}

async function generateReport(options) {
  const html = await buildReportHtml(options);
  const format = options.format || 'pdf';

  if (format === 'html') {
    return { html, buffer: Buffer.from(html, 'utf-8'), contentType: 'text/html' };
  }

  try {
    const buffer = await generatePdf(html);
    return { buffer, contentType: 'application/pdf' };
  } catch (err) {
    console.warn('PDF generation failed, falling back to HTML:', err.message);
    return { html, buffer: Buffer.from(html, 'utf-8'), contentType: 'text/html' };
  }
}

module.exports = { generateReport, buildReportHtml };
