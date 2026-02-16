# Opencode Serve Setup (Ubuntu)

This repository is for `opencode serve` + harness integration only.

No Obsidian dependency. No `agents-config` dependency.

## Prerequisites

```bash
sudo apt-get update
sudo apt-get install -y curl git
npm install -g opencode
```

Authenticate once:

```bash
opencode auth
```

## Start Server

```bash
opencode serve --port 3002 --hostname 0.0.0.0
```

## Test Request (single line)

```bash
curl -X POST "http://localhost:3002/v1/chat/completions" -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

## n8n Node

- Method: `POST`
- URL: `http://<server-ip>:3002/v1/chat/completions`
- Header: `Content-Type: application/json`
- Body:

```json
{
  "messages": [
    { "role": "user", "content": "{{$json.message}}" }
  ]
}
```

## Find IP

```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
```

See `docs/opencode-serve-n8n.md` for full troubleshooting.
