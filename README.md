# my-opencode-conf

Standalone repository for opencode configuration and HTTP serving setup.

This repository is intentionally independent. It does not require `agents-config` and does not depend on Obsidian retrieval.

## Two Ways to Use This Repo

### Option 1: Direct Opencode Config (No Server)

Just want the same agent profiles and settings? Apply the bundled config directly:

```bash
# Apply bundled configs to your local opencode
bash scripts/apply-bundled-opencode-config.sh

# Use opencode normally
opencode
```

This updates your `~/.config/opencode/` with the same profiles and default agent settings from this repo.

### Option 2: HTTP Server for Automation Harnesses

Use `opencode serve` as an HTTP inference endpoint for `n8n`, `openclaw`, or custom request/response workers:

1. Install and authenticate opencode (one-time):
   - `npm install -g opencode`
   - `opencode auth`
2. Start server:
   - `opencode serve --port 3002 --hostname 0.0.0.0`
3. Send request:
   - `POST http://<your-ip>:3002/v1/chat/completions`

Detailed guide: `docs/opencode-serve-n8n.md`

## Windows Quick Request (Server Mode)

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

This repo includes curated opencode agent profiles:

- `configs/opencode/opencode.json` - default agent selection
- `configs/opencode/agents/coding-pro.md` - general coding assistant
- `configs/opencode/agents/appscript-expert.md` - Google Apps Script specialist
- `configs/opencode/agents/nextjs-fullstack-db.md` - Next.js + database engineer

Apply them:

```bash
bash scripts/apply-bundled-opencode-config.sh
```

This copies configs to `~/.config/opencode/` (assumes you've already run `opencode auth`).

## Notes

- The bundled configs can be used directly with `opencode` CLI (no server needed)
- The serve/MCP setup is optional for automation harness integration
- For production HTTP exposure, add your own auth/reverse proxy layer
