# Opencode Serve + n8n Integration

This guide shows how to use `opencode serve` as an HTTP AI endpoint for n8n workflows. Your users just need to have opencode authenticated on their machine - no extra API keys needed!

## How It Works

```
n8n Workflow                                    Your Computer
┌──────────────┐                              ┌─────────────────────┐
│  User Input  │──── HTTP POST ─────────────►│  opencode serve    │
└──────────────┘                              │  (port 3002)       │
                                                │                     │
                                                │  Uses YOUR opencode │
                                                │  inference/auth    │
                                                └─────────┬───────────┘
                                                          │
                                                          ▼
                                                ┌─────────────────────┐
                                                │  Returns AI response │
                                                └─────────────────────┘
```

## Prerequisites

1. **opencode installed** on your machine
2. **opencode authenticated** - run `opencode auth` and log in (one time)
3. **n8n** running (local or cloud)

Optional: apply bundled local agent profiles from this repo:

```bash
bash scripts/apply-bundled-opencode-config.sh
```

---

## Step 1: Start opencode serve

```bash
# Start opencode in headless server mode
opencode serve --port 3002 --hostname 0.0.0.0
```

**Options:**
- `--port 3002` - Choose any port (default is random)
- `--hostname 0.0.0.0` - Allow connections from other devices on your network
- `--mdns` - Enable mDNS for automatic discovery

**Keep it running:**
```bash
# Run in background (macOS/Linux)
opencode serve --port 3002 --hostname 0.0.0.0 &

# Or use nohup
nohup opencode serve --port 3002 --hostname 0.0.0.0 > opencode.log 2>&1 &
```

---

## Step 2: Find Your IP Address

```bash
# macOS
ifconfig | grep "inet " | grep -v 127.0.0.1

# Linux
ip addr show | grep "inet " | grep -v 127.0.0.1
```

You'll get something like `10.10.8.84` - use this in n8n.

---

## Step 3: n8n Integration

You can import a ready-made workflow from:

- `examples/n8n/opencode-serve-proxy-workflow.json`

Import guide: `examples/n8n/README.md`

### Option A: Webhook (Simplest)

1. Create a new **Webhook** node in n8n
2. Set the **HTTP Method** to `POST`
3. Set the **Path** to something like `opencode`
4. Set **Response Mode** to `Last Node`

5. Add an **HTTP Request** node after the webhook:

```
Method: POST
URL: http://YOUR_IP:3002/v1/chat/completions
Headers:
  Content-Type: application/json
Body:
{
  "messages": [
    {
      "role": "user",
      "content": "{{ $json.message }}"
    }
  ]
}
```

### Option B: Direct HTTP Node

```
┌─────────────────────┐
│  HTTP Request      │
├─────────────────────┤
│  URL: http://10.10.8.84:3002/v1/chat/completions
│  Method: POST
│  Headers:
│    Content-Type: application/json
│  Body:
│  {
│    "messages": [
│      {
│        "role": "user", 
│        "content": "{{ $json.user_message }}"
│      }
│    ]
│  }
└─────────────────────┘
```

---

## API Endpoints

Once `opencode serve` is running, you have these endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | Web interface |
| `/v1/chat/completions` | POST | Chat completions (OpenAI-compatible) |
| `/v1/models` | GET | List available models |
| `/health` | GET | Health check |

---

## Example: Chat Completions

### Request

```bash
curl -X POST http://10.10.8.84:3002/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Hello! Say hi in 3 words."
      }
    ]
  }'
```

### Response

```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "o1",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello there! 👋"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```

---

## Example: n8n Workflow

```
┌─────────────┐
│  Webhook    │  ← Receives user message
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  HTTP       │  ← POST to opencode serve
│  Request    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Set        │  ← Extract response
│  (Response) │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Webhook    │  ← Return to user
│  Response   │
└─────────────┘
```

---

## Windows PowerShell

```powershell
# Test chat
Invoke-RestMethod -Uri "http://10.10.8.84:3002/v1/chat/completions" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{
    "messages": [
      {"role": "user", "content": "Say hi"}
    ]
  }'
```

---

## Troubleshooting

### Connection Refused

1. Check opencode serve is running: `lsof -i :3002`
2. Check firewall: `sudo ufw allow 3002/tcp`
3. Make sure you used `--hostname 0.0.0.0`

### Authentication Issues

Run on your machine:
```bash
opencode auth
```

This opens a browser to log in to OpenAI. Do this once - it persists.

### Port Already in Use

Choose a different port:
```bash
opencode serve --port 3003 --hostname 0.0.0.0
```

---

## Security Notes

- **Local network only** - This is designed for your local network
- **No extra auth needed** - Uses your existing opencode authentication
- **Don't expose to internet** - No built-in authentication for the HTTP server

If you need to expose publicly, add your own authentication layer (nginx, API key, etc.)

---

## Setup Script

Run this to start opencode serve:

```bash
#!/bin/bash
# opencode-serve-n8n.sh

PORT=${1:-3002}
HOST=${2:-0.0.0.0}

echo "Starting opencode serve on port $PORT..."

# Check if opencode is installed
if ! command -v opencode &> /dev/null; then
    echo "Error: opencode not installed"
    echo "Install with: npm install -g opencode"
    exit 1
fi

# Check if already running
if lsof -i :$PORT &> /dev/null; then
    echo "Port $PORT is already in use"
    read -p "Kill existing process? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill $(lsof -t -i:$PORT)
        sleep 1
    else
        exit 1
    fi
fi

# Start opencode serve
echo "Starting opencode serve on http://$HOST:$PORT"
opencode serve --port $PORT --hostname $HOST

echo "Server started!"
echo "Find your IP with: ifconfig | grep 'inet ' | grep -v 127.0.0.1"
```

Save as `opencode-serve-n8n.sh` and run:

```bash
chmod +x opencode-serve-n8n.sh
./opencode-serve-n8n.sh 3002 0.0.0.0
```

---

## Summary

| Step | Command |
|------|---------|
| Install opencode | `npm install -g opencode` |
| Authenticate | `opencode auth` |
| Start server | `opencode serve --port 3002 --hostname 0.0.0.0` |
| Test | `curl -X POST http://localhost:3002/v1/chat/completions -d '{"messages":[{"role":"user","content":"hi"}]}'` |
| n8n URL | `http://YOUR_IP:3002/v1/chat/completions` |

That's it! Your n8n workflow can now use opencode as the AI backend!
