# Opencode Serve Setup (Windows)

This repository is for `opencode serve` + harness integration only.

No Obsidian dependency. No `agents-config` dependency.

## Prerequisites

- Install Node.js
- Install opencode:

```powershell
npm install -g opencode
```

- Authenticate once:

```powershell
opencode auth
```

## Start Server

```powershell
opencode serve --port 3002 --hostname 0.0.0.0
```

## Test Request (Windows curl single line)

```cmd
curl -X POST "http://localhost:3002/v1/chat/completions" -H "Content-Type: application/json" -d "{\"messages\":[{\"role\":\"user\",\"content\":\"Hello\"}]}"
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

## Find Server IP (PowerShell)

```powershell
ipconfig
```

Use your IPv4 LAN address in n8n.

See `docs/opencode-serve-n8n.md` for full troubleshooting.
