import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Terminal as TerminalIcon, Loader2, Wifi, WifiOff } from 'lucide-react';

const SSH_WS_URL = 'ws://localhost:3001';

const STATUS = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error',
  DISCONNECTED: 'disconnected',
};

export default function SshModal({ host, onClose }) {
  const [status, setStatus] = useState(STATUS.IDLE);
  const [errorMsg, setErrorMsg] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const termRef = useRef(null);
  const wsRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (xtermRef.current) {
      xtermRef.current.dispose();
      xtermRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const handleConnect = useCallback(async () => {
    if (!username.trim()) return;
    setStatus(STATUS.CONNECTING);
    setErrorMsg('');

    try {
      // Dynamic import for xterm (only when needed)
      const { Terminal } = await import('xterm');
      const { FitAddon } = await import('xterm-addon-fit');

      // Load xterm CSS
      if (!document.getElementById('xterm-css')) {
        const link = document.createElement('link');
        link.id = 'xterm-css';
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.min.css';
        document.head.appendChild(link);
      }

      cleanup();

      const term = new Terminal({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        theme: {
          background: '#0B0F19',
          foreground: '#E0E4F0',
          cursor: '#00A8FF',
          selectionBackground: 'rgba(0, 168, 255, 0.3)',
          black: '#0B0F19',
          red: '#EF4444',
          green: '#10B981',
          yellow: '#F59E0B',
          blue: '#00A8FF',
          magenta: '#A78BFA',
          cyan: '#22D3EE',
          white: '#E0E4F0',
        },
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);

      xtermRef.current = term;
      fitAddonRef.current = fitAddon;

      if (termRef.current) {
        term.open(termRef.current);
        setTimeout(() => fitAddon.fit(), 100);
      }

      const ws = new WebSocket(SSH_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: 'connect',
            host: host,
            port: 22,
            username: username,
            password: password,
          })
        );
      };

      ws.onmessage = (event) => {
        const msg = typeof event.data === 'string' ? event.data : '';
        try {
          const parsed = JSON.parse(msg);
          if (parsed.type === 'connected') {
            setStatus(STATUS.CONNECTED);
          } else if (parsed.type === 'error') {
            setStatus(STATUS.ERROR);
            setErrorMsg(parsed.message || 'Connection error');
          } else if (parsed.type === 'data') {
            term.write(parsed.data);
          } else if (parsed.type === 'close') {
            setStatus(STATUS.DISCONNECTED);
          }
        } catch {
          // Raw data fallback
          term.write(msg);
          if (status !== STATUS.CONNECTED) setStatus(STATUS.CONNECTED);
        }
      };

      ws.onerror = () => {
        setStatus(STATUS.ERROR);
        setErrorMsg('WebSocket connection failed. Is ssh-proxy running on port 3001?');
      };

      ws.onclose = () => {
        if (status === STATUS.CONNECTED) {
          setStatus(STATUS.DISCONNECTED);
        }
      };

      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'data', data }));
        }
      });

      term.onResize(({ cols, rows }) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'resize', cols, rows }));
        }
      });

      // Handle window resize
      const handleResize = () => {
        if (fitAddonRef.current) {
          fitAddonRef.current.fit();
        }
      };
      window.addEventListener('resize', handleResize);

      return () => window.removeEventListener('resize', handleResize);
    } catch (err) {
      setStatus(STATUS.ERROR);
      setErrorMsg(err.message || 'Failed to initialize terminal');
    }
  }, [host, username, password, cleanup, status]);

  const handleDisconnect = useCallback(() => {
    cleanup();
    setStatus(STATUS.IDLE);
  }, [cleanup]);

  const statusIndicator = () => {
    switch (status) {
      case STATUS.CONNECTING:
        return (
          <span className="flex items-center gap-1.5 text-[#F59E0B] text-xs">
            <Loader2 size={12} className="animate-spin" /> Connecting...
          </span>
        );
      case STATUS.CONNECTED:
        return (
          <span className="flex items-center gap-1.5 text-[#10B981] text-xs">
            <Wifi size={12} /> Connected
          </span>
        );
      case STATUS.ERROR:
        return (
          <span className="flex items-center gap-1.5 text-[#EF4444] text-xs">
            <WifiOff size={12} /> Error
          </span>
        );
      case STATUS.DISCONNECTED:
        return (
          <span className="flex items-center gap-1.5 text-[#8B92A8] text-xs">
            <WifiOff size={12} /> Disconnected
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="bg-[#151B2B] border border-[#2A2F3F] rounded-lg shadow-2xl w-[90vw] max-w-4xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2F3F]">
          <div className="flex items-center gap-2">
            <TerminalIcon size={16} className="text-[#00A8FF]" />
            <span className="text-sm font-medium text-[#E0E4F0]">
              SSH — {host}
            </span>
            {statusIndicator()}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-[#1E2438] transition-colors"
            aria-label="Close SSH terminal"
          >
            <X size={16} className="text-[#8B92A8]" />
          </button>
        </div>

        {/* Login form or terminal */}
        {status === STATUS.IDLE || status === STATUS.ERROR || status === STATUS.DISCONNECTED ? (
          <div className="p-6">
            {errorMsg && (
              <div className="mb-4 px-3 py-2 rounded bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[#EF4444] text-sm">
                {errorMsg}
              </div>
            )}
            <div className="space-y-3 max-w-sm">
              <div>
                <label className="block text-xs text-[#8B92A8] mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input w-full"
                  placeholder="root"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                />
              </div>
              <div>
                <label className="block text-xs text-[#8B92A8] mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input w-full"
                  placeholder="••••••••"
                  onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                />
              </div>
              <button
                type="button"
                onClick={handleConnect}
                disabled={!username.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <TerminalIcon size={14} />
                Connect
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-[400px] relative">
            <div ref={termRef} className="absolute inset-0 p-2" />
            {status === STATUS.CONNECTED && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-[rgba(239,68,68,0.15)] text-[#EF4444] border border-[rgba(239,68,68,0.3)] hover:bg-[rgba(239,68,68,0.25)] transition-colors"
              >
                Disconnect
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
