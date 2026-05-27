# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x (latest) | ✅ Active |
| < 1.0 | ❌ No longer supported |

## Reporting a Vulnerability

**Please do NOT open a public GitHub issue for security vulnerabilities.**

If you discover a security issue in WazuhX, please report it responsibly:

1. **Open a [GitHub Security Advisory](https://github.com/M4ttiz/WazuhX/security/advisories/new)** (preferred)
2. Or email the maintainer directly via the contact on their GitHub profile

Please include:
- A clear description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fix (optional but appreciated)

We aim to acknowledge reports within **48 hours** and will coordinate a fix and disclosure timeline with you.

## Security Notes for Operators

- **Never expose the WazuhX backend port directly to the internet.** Place it behind a reverse proxy with HTTPS.
- WazuhX stores Wazuh credentials in environment variables — protect your `.env` file and never commit it.
- `NODE_TLS_REJECT_UNAUTHORIZED=0` is set for internal Docker communication only. Do not use in external-facing deployments.
- The SSH proxy (port 3001) should be firewalled from public access.
- Rotate your `GEMINI_API_KEY` if you suspect it has been exposed.
