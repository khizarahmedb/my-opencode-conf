# my-opencode-conf

Standalone setup for using `opencode serve` as an HTTP inference endpoint in automation harnesses like `n8n`, `openclaw`, and custom request/response workers.

This repository is intentionally independent. It does not require `agents-config` and does not depend on Obsidian retrieval.

## Primary Use Case

Use your existing `opencode` auth session, start a local HTTP server, then send requests from your harness.

## Quick Start

1. Install and authenticate opencode (one-time):
   - `npm install -g opencode`
   - `opencode auth`
2. Start server:
   - `opencode serve --port 3002 --hostname 0.0.0.0`
3. Send request:
   - `POST http://<your-ip>:3002/v1/chat/completions`

Detailed guide: `docs/opencode-serve-n8n.md`

## Windows Quick Request

```cmd
curl -X POST "http://10.10.8.84:3002/v1/chat/completions" -H "Content-Type: application/json" -d "{\"messages\":[{\"role\":\"user\",\"content\":\"Hello\"}]}"
```

## Included Assets

- `docs/opencode-serve-n8n.md` - full setup + troubleshooting
- `scripts/opencode-serve-n8n.sh` - start script for macOS/Linux
- `setup_instructions.md` - standalone setup (macOS/Linux)
- `setup_instructions_ubuntu.md` - standalone setup (Ubuntu)
- `setup_instructions_win.md` - standalone setup (Windows)
- `examples/` - optional local examples

## Notes

- This repo focuses on opencode HTTP serving and harness integration.
- For production exposure, add your own auth/reverse proxy layer.
