const express = require('express');
const gemini = require('../services/geminiService');
const { sendData } = require('../utils/response');

const router = express.Router();

router.post('/briefing', async (req, res, next) => {
  try {
    const text = await gemini.generateBriefing();
    sendData(res, { data: { briefing: text }, source: 'gemini' });
  } catch (err) {
    if (err.message.includes('GEMINI_API_KEY')) {
      return res.status(503).json({
        error: err.message,
        data: {
          briefing:
            'Modalità demo: configurare GEMINI_API_KEY per il briefing AI automatico. ' +
            'Ottenere una key gratuita su https://aistudio.google.com/app/apikey',
        },
      });
    }
    next(err);
  }
});

router.post('/chat', async (req, res, next) => {
  try {
    const { messages = [], message } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    const reply = await gemini.chat(messages, message);
    sendData(res, { data: { reply }, source: 'gemini' });
  } catch (err) {
    if (err.message.includes('GEMINI_API_KEY')) {
      return sendData(res, {
        data: {
          reply:
            'Per utilizzare la chat AI, configura GEMINI_API_KEY nelle variabili d\'ambiente. ' +
            'Key gratuita: https://aistudio.google.com/app/apikey',
        },
        source: 'mock',
      });
    }
    next(err);
  }
});

router.post('/analyze-agent', async (req, res, next) => {
  try {
    const { agentId } = req.body;
    if (!agentId) return res.status(400).json({ error: 'agentId is required' });
    const analysis = await gemini.analyzeAgent(agentId);
    sendData(res, { data: { analysis }, source: 'gemini' });
  } catch (err) {
    if (err.message.includes('GEMINI_API_KEY')) {
      return sendData(res, {
        data: { analysis: 'Analisi AI non disponibile. Configurare GEMINI_API_KEY.' },
        source: 'mock',
      });
    }
    next(err);
  }
});

module.exports = router;
