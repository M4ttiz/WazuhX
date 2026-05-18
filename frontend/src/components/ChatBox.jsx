import { useState, useRef, useEffect } from 'react';

const QUICK_PROMPTS = [
  "Qual è l'endpoint più a rischio?",
  'Cosa è successo nelle ultime 24 ore?',
  'Quali CVE devo patchare subito?',
  "C'è qualcosa di anomalo?",
];

export default function ChatBox({ messages, onSend, loading, briefing }) {
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    onSend(input.trim());
    setInput('');
  };

  return (
    <div className="flex flex-col h-full">
      {briefing && (
        <div className="card mb-4 border-l-[3px] border-l-accent">
          <p className="card-title">Executive Briefing</p>
          <p className="text-sm text-secondary whitespace-pre-wrap leading-relaxed">{briefing}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onSend(p)}
            disabled={loading}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            {p}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-[300px]">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`p-3 rounded-md text-sm max-w-[85%] ${
              m.role === 'user'
                ? 'ml-auto bg-accent-light border border-accent/20 text-primary'
                : 'bg-surface border border-border text-secondary'
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && <p className="text-muted text-sm">Analisi in corso...</p>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          className="input flex-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Scrivi una domanda..."
          disabled={loading}
        />
        <button type="submit" className="btn-primary" disabled={loading}>
          Invia
        </button>
      </form>
    </div>
  );
}
