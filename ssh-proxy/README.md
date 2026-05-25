# WazuhX SSH Proxy

Standalone WebSocket bridge for browser SSH terminals. Does not modify the main WazuhX backend.

## Port

Default **3002** (WazuhX API uses 3001). Override with `SSH_PROXY_PORT`.

## Start

```bash
cd ssh-proxy
npm install
node server.js
```

## Protocol

Client sends JSON over WebSocket:

- `{ "type": "connect", "host", "port", "username", "password", "cols?", "rows?" }`
- `{ "type": "input", "data" }` — keystrokes
- `{ "type": "window-change", "cols", "rows" }`

Server replies:

- `{ "type": "connected" }`
- `{ "type": "data", "data" }` — terminal output
- `{ "type": "error", "message" }`
- `{ "type": "close" }`

## Frontend

Set `VITE_SSH_WS_URL=ws://localhost:3002` or use the default in `SshModal.jsx`.

## Docker (optional)

```bash
docker build -t wazuhx-ssh-proxy .
docker run -p 3002:3002 wazuhx-ssh-proxy
```
