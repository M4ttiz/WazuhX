# WazuhX SSH Proxy

WebSocket-to-SSH bridge for live terminal access from the WazuhX dashboard.

## Quick Start

```bash
cd ssh-proxy
npm install
node server.js
```

The proxy runs on **port 3001** by default. Set `SSH_PROXY_PORT` env var to override.

## How It Works

1. The frontend opens a WebSocket connection to `ws://localhost:3001`
2. Sends a `connect` message with SSH credentials
3. The proxy uses `ssh2` to establish an SSH connection to the target host
4. Data is piped bidirectionally between the WebSocket and the SSH shell

## Docker (optional)

```bash
docker build -t wazuhx-ssh-proxy .
docker run -p 3001:3001 wazuhx-ssh-proxy
```

## Protocol

### Client → Server

| Message | Description |
|---------|-------------|
| `{ type: "connect", host, port, username, password }` | Initiate SSH connection |
| `{ type: "data", data }` | Send terminal input |
| `{ type: "resize", cols, rows }` | Resize terminal window |

### Server → Client

| Message | Description |
|---------|-------------|
| `{ type: "connected" }` | SSH session established |
| `{ type: "data", data }` | Terminal output |
| `{ type: "error", message }` | Connection or runtime error |
| `{ type: "close" }` | SSH session ended |

## Notes

- The target host must be reachable from the machine running the proxy
- For local testing, use `localhost:22` if SSH is running on the host
- This service is **independent** from the main WazuhX backend
