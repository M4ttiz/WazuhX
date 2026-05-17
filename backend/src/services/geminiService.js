const { GoogleGenerativeAI } = require('@google/generative-ai');
const wazuh = require('./wazuhClient');

const SYSTEM_PROMPT = `Sei un analista SOC senior. Rispondi sempre in italiano, in modo chiaro e professionale.
Analizza i dati di sicurezza Wazuh forniti e fornisci insight actionable per il team di sicurezza.
Prioritizza minacce critiche, endpoint a rischio e azioni di remediation.`;

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY non configurata. Ottieni una key su https://aistudio.google.com/app/apikey');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
}

function buildContextPrompt() {
  const ctx = wazuh.getAIContext();
  return `CONTESTO SICUREZZA WAZUH:
Agenti (${ctx.agents.length}): ${JSON.stringify(ctx.agents, null, 0)}
Alert critici recenti: ${JSON.stringify(ctx.criticalAlerts.slice(0, 20), null, 0)}
CVE critici: ${JSON.stringify(ctx.vulnerabilities, null, 0)}
Compliance: ${JSON.stringify(ctx.compliance, null, 0)}
Anomalie risorse: ${JSON.stringify(ctx.anomalies, null, 0)}`;
}

async function generateBriefing() {
  const model = getModel();
  const prompt = `${buildContextPrompt()}

Genera un executive briefing di sicurezza (max 400 parole) con:
1. Stato generale della postura di sicurezza
2. Minacce principali attive
3. Endpoint più a rischio
4. Azioni prioritarie per le prossime 24 ore`;

  const result = await model.generateContent([SYSTEM_PROMPT, prompt]);
  return result.response.text();
}

async function chat(messages, userMessage) {
  const model = getModel();
  const history = messages
    .map((m) => `${m.role === 'user' ? 'Utente' : 'Assistente'}: ${m.content}`)
    .join('\n');

  const prompt = `${buildContextPrompt()}

CRONOLOGIA CONVERSAZIONE:
${history}

NUOVA DOMANDA UTENTE: ${userMessage}

Rispondi in modo conciso e actionable.`;

  const result = await model.generateContent([SYSTEM_PROMPT, prompt]);
  return result.response.text();
}

async function analyzeAgent(agentId) {
  const { data: agent } = await wazuh.getAgent(agentId);
  if (!agent) throw new Error('Agente non trovato');

  const model = getModel();
  const prompt = `Analizza questo endpoint:
${JSON.stringify(agent, null, 2)}

${buildContextPrompt()}

Genera un report di analisi endpoint con: rischio complessivo, problemi rilevati, raccomandazioni.`;

  const result = await model.generateContent([SYSTEM_PROMPT, prompt]);
  return result.response.text();
}

async function generateExecutiveSummary(period, sections) {
  const model = getModel();
  const ctx = wazuh.getAIContext();
  const prompt = `Genera un executive summary per un report di sicurezza.
Periodo: ${period}
Sezioni incluse: ${sections.join(', ')}
Dati: ${JSON.stringify(ctx).slice(0, 8000)}
Max 300 parole, in italiano.`;

  const result = await model.generateContent([SYSTEM_PROMPT, prompt]);
  return result.response.text();
}

async function generateRecommendations() {
  const model = getModel();
  const prompt = `${buildContextPrompt()}

Genera 5-8 azioni raccomandate in formato JSON array:
[{"priority":"urgent|high|normal","title":"...","description":"..."}]
Solo JSON valido, niente markdown.`;

  const result = await model.generateContent([SYSTEM_PROMPT, prompt]);
  const text = result.response.text();
  try {
    const match = text.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  } catch {
    return [
      { priority: 'urgent', title: 'Patch CVE critici', description: 'Applicare patch per CVE con CVSS >= 9' },
      { priority: 'high', title: 'Verificare alert critici', description: 'Analizzare e chiudere alert severity >= 12' },
    ];
  }
}

module.exports = {
  generateBriefing,
  chat,
  analyzeAgent,
  generateExecutiveSummary,
  generateRecommendations,
};
