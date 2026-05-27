# WazuhX Documentation

## Guides

- [Installation & Quickstart](./installation.md)
- [Configuration Reference](./../.env.example)
- [Wazuh Decoders & Rules Setup](./../deploy/wazuh/README.md)
- [Glances Setup](./../deploy/glances/README.md)
- [SSH Proxy](./../ssh-proxy/README.md)

## Architecture

See the [main README](../README.md#architecture) for the full architecture diagram.

## Mock Mode

Set `USE_MOCK=true` in your `.env` to run WazuhX with realistic demo data, no Wazuh connection required. Ideal for development, demos, and CI.

## Troubleshooting

**Backend can't reach Wazuh API**
- Verify `wazuh-net` Docker network exists: `docker network ls`
- Check `WAZUH_API_URL`, `WAZUH_USER`, `WAZUH_PASSWORD` in `.env`
- Wazuh manager must be on the same Docker network

**Gemini AI returns errors**
- Verify `GEMINI_API_KEY` is set and valid
- Free tier has rate limits — wait a moment and retry

**Metrics show N/A for agents**
- Glances must be running on each agent: `glances -w --bind 0.0.0.0 --port 61208 --disable-webui`
- `GLANCES_ENABLED=true` in `.env`
