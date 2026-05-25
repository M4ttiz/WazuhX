import { useEffect, useRef, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

const WS_URL = import.meta.env.VITE_SSH_WS_URL || 'ws://localhost:3002';

export default function SshModal({ host, onClose }) {
  const terminalRef = useRef(null);
  const termRef = useRef(null);
  const fitRef = useRef(null);
  const wsRef = useRef(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [port, setPort] = useState('22');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
    setStatus('disconnected');
  }, []);

  const connect = useCallback(() => {
    if (!host?.ip && !host?.host) {
      setError('No host address available');
      return;
    }
    setError(null);
    setStatus('connecting');

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: 'connect',
          host: host.ip || host.host,
          port: parseInt(port, 10) || 22,
          username,
          password,
        })
      );
    };

    ws.onmessage = (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (msg.type === 'connected') {
        setStatus('connected');
        setConnected(true);
        termRef.current?.focus();
      } else if (msg.type === 'data' && termRef.current) {
        const raw = msg.encoding === 'base64'
          ? atob(msg.data)
          : msg.data;
        termRef.current.write(raw);
      } else if (msg.type === 'error') {
        setError(msg.message || 'SSH connection failed');
        setStatus('error');
        disconnect();
      } else if (msg.type === 'close') {
        setStatus('disconnected');
        setConnected(false);
      }
    };

    ws.onerror = () => {
      setError('WebSocket error — is ssh-proxy running on port 3002?');
      setStatus('error');
    };

    ws.onclose = () => {
      setConnected(false);
      setStatus((s) => {
        if (s === 'connecting') {
          setError('Connection closed');
          return 'error';
        }
        return 'disconnected';
      });
    };
  }, [host, username, password, port, disconnect]);

  useEffect(() => {
    if (!connected || !terminalRef.current) return undefined;

    const term = new Terminal({
      theme: {
        background: '#0b0f19',
        foreground: '#e0e4f0',
        cursor: '#00a8ff',
      },
      fontSize: 13,
      fontFamily: 'JetBrains Mono, monospace',
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(terminalRef.current);
    fit.fit();
    termRef.current = term;
    fitRef.current = fit;

    const onData = (data) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'input', data }));
      }
    };
    term.onData(onData);

    const onResize = () => {
      fit.fit();
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'window-change',
            cols: term.cols,
            rows: term.rows,
          })
        );
      }
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      term.dispose();
      termRef.current = null;
    };
  }, [connected]);

  useEffect(() => () => disconnect(), [disconnect]);

  const hostLabel = host?.host || host?.ip || '--';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            SSH — {hostLabel}
          </h2>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {!connected ? (
          <div className="p-4 space-y-3">
            <p className="text-xs text-[var(--text-secondary)]">
              Target: {host?.ip || host?.host || '--'} — start ssh-proxy on port 3002 first.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block text-xs text-[var(--text-muted)]">
                Username
                <input
                  className="input w-full mt-1"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </label>
              <label className="block text-xs text-[var(--text-muted)]">
                Password
                <input
                  type="password"
                  className="input w-full mt-1"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </label>
              <label className="block text-xs text-[var(--text-muted)]">
                Port
                <input
                  className="input w-full mt-1"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                />
              </label>
            </div>
            {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={connect}
                disabled={!username || status === 'connecting'}
              >
                {status === 'connecting' ? 'Connecting…' : 'Connect'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-[320px] p-2">
            <div ref={terminalRef} className="h-[400px] w-full rounded border border-[var(--border)]" />
            <div className="flex justify-end gap-2 mt-2 px-2 pb-2">
              <button type="button" className="btn-secondary text-sm" onClick={disconnect}>
                Disconnect
              </button>
              <button type="button" className="btn-primary text-sm" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
