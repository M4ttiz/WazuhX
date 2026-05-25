/**
 * WazuhX SSH Proxy Server
 * 
 * WebSocket server on port 3001 that bridges browser terminals to remote SSH hosts.
 * Runs independently from the main WazuhX backend.
 * 
 * Protocol:
 *   Client → Server:
 *     { type: "connect", host, port, username, password }
 *     { type: "data", data }
 *     { type: "resize", cols, rows }
 * 
 *   Server → Client:
 *     { type: "connected" }
 *     { type: "data", data }
 *     { type: "error", message }
 *     { type: "close" }
 */

const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');
const { Client } = require('ssh2');
const cors = require('cors');

const PORT = process.env.SSH_PROXY_PORT || 3001;

const app = express();
app.use(cors());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ssh-proxy' });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  let sshClient = null;
  let sshStream = null;

  console.log('[SSH-Proxy] New WebSocket connection');

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    switch (msg.type) {
      case 'connect': {
        const { host, port = 22, username, password } = msg;

        if (!host || !username) {
          ws.send(JSON.stringify({ type: 'error', message: 'Missing host or username' }));
          return;
        }

        console.log(`[SSH-Proxy] Connecting to ${username}@${host}:${port}`);

        sshClient = new Client();

        sshClient.on('ready', () => {
          console.log(`[SSH-Proxy] SSH connected to ${host}`);
          ws.send(JSON.stringify({ type: 'connected' }));

          sshClient.shell(
            { term: 'xterm-256color', cols: 120, rows: 30 },
            (err, stream) => {
              if (err) {
                ws.send(JSON.stringify({ type: 'error', message: err.message }));
                return;
              }

              sshStream = stream;

              stream.on('data', (data) => {
                if (ws.readyState === ws.OPEN) {
                  ws.send(JSON.stringify({ type: 'data', data: data.toString('utf8') }));
                }
              });

              stream.stderr.on('data', (data) => {
                if (ws.readyState === ws.OPEN) {
                  ws.send(JSON.stringify({ type: 'data', data: data.toString('utf8') }));
                }
              });

              stream.on('close', () => {
                console.log(`[SSH-Proxy] SSH stream closed for ${host}`);
                if (ws.readyState === ws.OPEN) {
                  ws.send(JSON.stringify({ type: 'close' }));
                }
                sshClient.end();
              });
            }
          );
        });

        sshClient.on('error', (err) => {
          console.error(`[SSH-Proxy] SSH error for ${host}:`, err.message);
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: 'error', message: err.message }));
          }
        });

        sshClient.on('close', () => {
          console.log(`[SSH-Proxy] SSH connection closed for ${host}`);
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: 'close' }));
          }
        });

        sshClient.connect({
          host,
          port,
          username,
          password,
          readyTimeout: 10000,
          algorithms: {
            kex: [
              'ecdh-sha2-nistp256',
              'ecdh-sha2-nistp384',
              'ecdh-sha2-nistp521',
              'diffie-hellman-group-exchange-sha256',
              'diffie-hellman-group14-sha256',
              'diffie-hellman-group14-sha1',
            ],
          },
        });
        break;
      }

      case 'data': {
        if (sshStream) {
          sshStream.write(msg.data);
        }
        break;
      }

      case 'resize': {
        if (sshStream && msg.cols && msg.rows) {
          sshStream.setWindow(msg.rows, msg.cols, 0, 0);
        }
        break;
      }

      default:
        break;
    }
  });

  ws.on('close', () => {
    console.log('[SSH-Proxy] WebSocket closed');
    if (sshStream) {
      sshStream.close();
      sshStream = null;
    }
    if (sshClient) {
      sshClient.end();
      sshClient = null;
    }
  });

  ws.on('error', (err) => {
    console.error('[SSH-Proxy] WebSocket error:', err.message);
    if (sshClient) {
      sshClient.end();
    }
  });
});

server.listen(PORT, () => {
  console.log(`[SSH-Proxy] Running on port ${PORT}`);
  console.log(`[SSH-Proxy] WebSocket endpoint: ws://localhost:${PORT}`);
});
