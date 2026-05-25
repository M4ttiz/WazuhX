const http = require('http');
const { WebSocketServer } = require('ws');
const { Client } = require('ssh2');

const PORT = parseInt(process.env.SSH_PROXY_PORT || '3002', 10);

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WazuhX SSH proxy — WebSocket only\n');
});

const wss = new WebSocketServer({ server });

function send(ws, payload) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

wss.on('connection', (ws) => {
  let ssh = null;
  let stream = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      send(ws, { type: 'error', message: 'Invalid JSON message' });
      return;
    }

    if (msg.type === 'connect') {
      if (ssh) {
        ssh.end();
        ssh = null;
      }

      ssh = new Client();

      ssh.on('ready', () => {
        ssh.shell(
          {
            term: 'xterm-256color',
            cols: msg.cols || 80,
            rows: msg.rows || 24,
          },
          (err, shellStream) => {
            if (err) {
              send(ws, { type: 'error', message: err.message });
              return;
            }
            stream = shellStream;
            stream.on('data', (data) => {
              send(ws, {
                type: 'data',
                data: data.toString('utf8'),
              });
            });
            stream.on('close', () => {
              send(ws, { type: 'close' });
            });
            stream.stderr.on('data', (data) => {
              send(ws, { type: 'data', data: data.toString('utf8') });
            });
            send(ws, { type: 'connected' });
          }
        );
      });

      ssh.on('error', (err) => {
        send(ws, { type: 'error', message: err.message });
      });

      ssh.on('close', () => {
        stream = null;
        send(ws, { type: 'close' });
      });

      ssh.connect({
        host: msg.host,
        port: msg.port || 22,
        username: msg.username,
        password: msg.password,
        readyTimeout: 15000,
      });
      return;
    }

    if (msg.type === 'input' && stream) {
      stream.write(msg.data);
      return;
    }

    if (msg.type === 'window-change' && stream?.setWindow) {
      stream.setWindow(msg.rows || 24, msg.cols || 80, 0, 0);
    }
  });

  ws.on('close', () => {
    if (ssh) {
      ssh.end();
      ssh = null;
    }
    stream = null;
  });
});

server.listen(PORT, () => {
  console.log(`WazuhX SSH proxy WebSocket listening on port ${PORT}`);
});
