# Opencode Serve Setup (macOS/Linux)

This repository is only for running `opencode serve` as an HTTP inference endpoint for automation harnesses (`n8n`, `openclaw`, `codex cli` wrappers, custom workers).

It does not require Obsidian and does not depend on `agents-config`.

## Prerequisites

- `opencode` installed
- User already authenticated with `opencode auth`

## Start Server

```bash
opencode serve --port 3002 --hostname 0.0.0.0
```

## Test Request (single line)

```bash
curl -X POST "http://localhost:3002/v1/chat/completions" -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

## n8n HTTP Request Node

- Method: `POST`
- URL: `http://<server-ip>:3002/v1/chat/completions`
- Header: `Content-Type: application/json`
- JSON body:

```json
{
  "messages": [
    {
      "role": "user",
      "content": "{{$json.message}}"
    }
  ]
}
```

## Find Server IP

```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Use the returned LAN IP in n8n clients.

## More Details

See `docs/opencode-serve-n8n.md`.
