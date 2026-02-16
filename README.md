# my-opencode-conf

Standalone setup for using `opencode serve` as an HTTP inference endpoint in automation harnesses like `n8n`, `openclaw`, and custom request/response workers.


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
- `examples/n8n/opencode-serve-proxy-workflow.json` - importable n8n workflow
- `examples/n8n/README.md` - n8n import and usage steps
- `setup_instructions.md` - standalone setup (macOS/Linux)
- `setup_instructions_ubuntu.md` - standalone setup (Ubuntu)
- `setup_instructions_win.md` - standalone setup (Windows)
- `examples/` - optional local examples

## Bundled Agent Profiles

This repo now includes your current local opencode profiles under:

- `configs/opencode/opencode.json`
- `configs/opencode/agents/appscript-expert.md`
- `configs/opencode/agents/coding-pro.md`
- `configs/opencode/agents/nextjs-fullstack-db.md`

Apply them to a machine with:

```bash
bash scripts/apply-bundled-opencode-config.sh
```

This assumes the user has already authenticated via `opencode auth`.

## Notes

- This repo focuses on opencode HTTP serving and harness integration.
- For production exposure, add your own auth/reverse proxy layer.
