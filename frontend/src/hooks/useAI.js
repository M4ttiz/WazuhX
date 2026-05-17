import { useState, useCallback } from 'react';
import { apiFetch } from '../utils/api';

export function useAI() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [briefing, setBriefing] = useState('');

  const loadBriefing = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/ai/briefing', { method: 'POST' });
      setBriefing(res.briefing || '');
    } catch (err) {
      setBriefing(`Errore: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = useCallback(
    async (text) => {
      const userMsg = { role: 'user', content: text };
      setMessages((m) => [...m, userMsg]);
      setLoading(true);
      try {
        const res = await apiFetch('/ai/chat', {
          method: 'POST',
          body: JSON.stringify({ message: text, messages }),
        });
        setMessages((m) => [...m, { role: 'assistant', content: res.reply }]);
      } catch (err) {
        setMessages((m) => [...m, { role: 'assistant', content: `Errore: ${err.message}` }]);
      } finally {
        setLoading(false);
      }
    },
    [messages]
  );

  const analyzeAgent = useCallback(async (agentId) => {
    setLoading(true);
    try {
      const res = await apiFetch('/ai/analyze-agent', {
        method: 'POST',
        body: JSON.stringify({ agentId }),
      });
      return res.analysis;
    } finally {
      setLoading(false);
    }
  }, []);

  return { messages, loading, briefing, loadBriefing, sendMessage, analyzeAgent };
}
