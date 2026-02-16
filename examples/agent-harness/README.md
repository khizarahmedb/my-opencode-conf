# Agent Harness Server

A custom AI agent harness with HTTP API for n8n integration. Replaces the OpenAI node in n8n workflows with a self-hosted AI assistant that maintains conversation memory, evolves its system prompt, and creates conversation summaries.

## Features

- **HTTP API** - RESTful endpoints for n8n integration
- **Conversation Memory** - Each conversation persists across requests
- **Evolving System Prompt** - System prompt updates based on conversation context
- **Automatic Summarization** - Creates summary files after N messages
- **Multi-LLM Support** - Works with Ollama or OpenAI
- **Full Context** - Receives conversation history in each request but maintains its own notes

## Architecture

```
n8n Workflow                                    Agent Harness Server
┌──────────────┐                               ┌─────────────────────┐
│  User Input  │──── HTTP POST ──────────────►│  /message endpoint  │
└──────────────┘                               │                     │
                                                │  1. Get/Create     │
┌──────────────┐       ┌──────────────┐       │    conversation    │
│  AI Response │◄──────│  HTTP JSON   │◄──────│  2. Build messages │
└──────────────┘       │  Response    │       │  3. Call LLM       │
                       └──────────────┘       │  4. Save to memory │
                                                │  5. Update prompt  │
                                                │  6. Return response│
                                                └─────────────────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────────┐
                                                │ conversations/      │
                                                │   conv_xxx.json    │
                                                │   conv_xxx_summary.md
                                                └─────────────────────┘
```

## Quick Start

### 1. Install Bun

```bash
# macOS
brew install bun

# Linux
curl -fsSL https://bun.sh/install | bash

# Windows
powershell -Command "irm bun.sh/install.ps1 | iex"
```

### 2. Install Dependencies

```bash
cd agent-harness
bun install
```

### 3. Configure LLM

**Option A: Ollama (Recommended - Local)**

```bash
# Install and start Ollama
brew install ollama
ollama serve
ollama pull llama3

# Set environment
export LLM_PROVIDER=ollama
export OLLAMA_MODEL=llama3
```

**Option B: OpenAI**

```bash
export LLM_PROVIDER=openai
export OPENAI_API_KEY=sk-xxx
export OPENAI_MODEL=gpt-4
```

### 4. Start Server

```bash
# Default (port 3001)
bun run server.ts

# Custom port
PORT=3001 bun run server.ts
```

Server starts on `http://localhost:3001`

---

## API Endpoints

### POST /message

Send a message to the AI agent.

**Request:**
```json
{
  "conversation_id": "conv_123_abc",  // optional: existing conversation ID
  "message": "Hello, help me with coding",
  "system_prompt": "You are a Python expert",  // optional: override system prompt
  "metadata": { "customer_id": "123" },  // optional: custom metadata
  "model": "llama3",  // optional: override model
  "temperature": 0.7  // optional: override temperature
}
```

**Response:**
```json
{
  "conversation_id": "conv_123_abc",
  "response": "Hello! I'd be happy to help you with coding...",
  "system_prompt": "You are a helpful AI assistant...",
  "message_count": 2,
  "summary": "## Conversation Summary\n\n..."
}
```

### GET /conversations

List all conversations.

**Response:**
```json
{
  "conversations": ["conv_123_abc", "conv_456_def"]
}
```

### GET /conversations/:id

Get full conversation details.

**Response:**
```json
{
  "id": "conv_123_abc",
  "created_at": "2026-02-16T12:00:00.000Z",
  "updated_at": "2026-02-16T12:30:00.000Z",
  "system_prompt": "You are a helpful AI assistant...",
  "messages": [
    { "role": "user", "content": "Hello", "timestamp": "..." },
    { "role": "assistant", "content": "Hi!", "timestamp": "..." }
  ],
  "summary": "## Conversation Summary\n\n..."
}
```

### PUT /conversations/:id

Update the system prompt for a conversation.

**Request:**
```json
{
  "system_prompt": "You are now a customer support agent for a tech company."
}
```

**Response:**
```json
{
  "success": true,
  "conversation_id": "conv_123_abc"
}
```

### GET /health

Health check endpoint.

---

## n8n Integration

### Basic Setup

1. Add an **HTTP Request** node in n8n
2. Configure as follows:

```
Method: POST
URL: http://YOUR_SERVER:3001/message
Headers:
  Content-Type: application/json
Body (JSON):
{
  "message": "{{ $json.user_message }}"
}
```

### Full Workflow Example

```
┌─────────────┐
│  Webhook    │  (receives user input)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  HTTP       │  ──POST──► http://localhost:3001/message
│  Request    │           { "message": "{{ $json.message }}" }
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Response  │  (AI response in {{ $json.response }})
│  Handler   │
└─────────────┘
```

### With Conversation ID (Multi-turn)

To maintain conversation context, pass the `conversation_id`:

```
┌─────────────┐
│  Webhook    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│  Set (Conversation ID)       │  {{ $json.conversation_id || "" }}
└─────────────┬─────────────────┘
             │
             ▼
┌───────────────────────────────────────────┐
│  HTTP Request                             │
│  URL: http://localhost:3001/message        │
│  Body:                                    │
│  {                                        │
│    "message": "{{ $json.message }}",      │
│    "conversation_id": "{{ $json.conversation_id }}"  │
│  }                                        │
└─────────────┬─────────────────────────────┘
             │
             ▼
┌─────────────────────────────┐
│  Response (contains        │
│  conversation_id,          │
│  response, etc.)            │
└─────────────────────────────┘
```

### Customer Support Example

```
┌─────────────────────┐
│  WhatsApp/Chat      │  User message comes in
│  Webhook           │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Set Node          │  Prepare request body
│  - message         │  {
│  - conversation_id  │    "message": "{{ $json.text }}",
│  - metadata        │    "conversation_id": "{{ $json.conversation_id }}",
│                    │    "system_prompt": "You are a customer support..."
│                    │  }
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  HTTP Request       │  POST to agent-harness
│  (Agent Harness)   │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Set Node          │  Extract response
│  - ai_response     │  {{ $json.response }}
│  - conversation_id │  {{ $json.conversation_id }}
│  - message_count   │  {{ $json.message_count }}
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Send Reply        │  Send to user
│  (WhatsApp/Chat)   │
└─────────────────────┘
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Server port |
| `HOST` | 0.0.0.0 | Server host |
| `LLM_PROVIDER` | ollama | LLM provider (ollama or openai) |
| `OPENAI_API_KEY` | - | OpenAI API key |
| `OPENAI_MODEL` | gpt-4 | OpenAI model |
| `OPENAI_BASE_URL` | https://api.openai.com/v1 | OpenAI base URL |
| `OLLAMA_BASE_URL` | http://localhost:11434 | Ollama base URL |
| `OLLAMA_MODEL` | llama3 | Ollama model |
| `CONVERSATIONS_DIR` | ./conversations | Where to store conversation files |
| `SUMMARY_THRESHOLD` | 10 | Messages before creating summary |
| `MAX_HISTORY_MESSAGES` | 20 | Max messages to send to LLM |

---

## Conversation Files

Conversations are stored as JSON files:

```
conversations/
├── conv_1234567890_abc.json        # Full conversation
├── conv_1234567890_abc_summary.md  # Auto-generated summary
├── conv_1234567891_def.json
└── conv_1234567891_def_summary.md
```

### Conversation JSON Structure

```json
{
  "id": "conv_1234567890_abc",
  "created_at": "2026-02-16T12:00:00.000Z",
  "updated_at": "2026-02-16T12:30:00.000Z",
  "system_prompt": "You are a helpful AI assistant...",
  "messages": [
    {
      "role": "user",
      "content": "Hello",
      "timestamp": "2026-02-16T12:00:00.000Z"
    },
    {
      "role": "assistant", 
      "content": "Hi! How can I help?",
      "timestamp": "2026-02-16T12:00:01.000Z"
    }
  ],
  "summary": "## Conversation Summary\n\n...",
  "metadata": {}
}
```

---

## Examples

### cURL

```bash
# New conversation
curl -X POST http://localhost:3001/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, help me write a Python function"
  }'

# Continue conversation (use returned conversation_id)
curl -X POST http://localhost:3001/message \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "conv_123_abc",
    "message": "Make it handle errors too"
  }'

# Update system prompt
curl -X PUT http://localhost:3001/conversations/conv_123_abc \
  -H "Content-Type: application/json" \
  -d '{
    "system_prompt": "You are now a Python expert specializing in async programming."
  }'
```

### Python

```python
import requests

BASE_URL = "http://localhost:3001"

def send_message(message, conversation_id=None, system_prompt=None):
    payload = {"message": message}
    if conversation_id:
        payload["conversation_id"] = conversation_id
    if system_prompt:
        payload["system_prompt"] = system_prompt
    
    response = requests.post(f"{BASE_URL}/message", json=payload)
    return response.json()

# First message
result = send_message("Hello, help me with coding")
print(result["response"])
print(f"Conversation ID: {result['conversation_id']}")

# Continue conversation
result2 = send_message(
    "Now write a function for me",
    conversation_id=result["conversation_id"]
)
```

### JavaScript

```javascript
const BASE_URL = "http://localhost:3001";

async function sendMessage(message, options = {}) {
  const response = await fetch(`${BASE_URL}/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, ...options })
  });
  return await response.json();
}

// First message
const result = await sendMessage("Hello");
console.log(result.response);
console.log(result.conversation_id);

// Continue conversation
const result2 = await sendMessage("Help me with Python", {
  conversation_id: result.conversation_id
});
```

---

## Security

For production:

1. **Add authentication** - Add API key validation to the server
2. **Use HTTPS** - Run behind a reverse proxy with TLS
3. **Rate limiting** - Add rate limiting to prevent abuse
4. **Input validation** - Sanitize user inputs

Example with API key:

```bash
# Server
export API_KEY=your-secret-key
```

```javascript
// Add to server.ts
const API_KEY = process.env.API_KEY;

const authMiddleware = (req) => {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${API_KEY}`;
};
```

---

## Use Cases

1. **Customer Support Automation** - AI agent that remembers conversation context
2. **Multi-step Forms** - AI that guides users through complex processes
3. **Booking/Scheduling** - AI assistant with memory of user preferences
4. **Technical Support** - AI that builds knowledge base over time
5. **Sales Bot** - AI that remembers customer history and preferences

---

## Troubleshooting

### Ollama not running
```bash
# Start Ollama
ollama serve

# Pull a model
ollama pull llama3
```

### Connection refused
```bash
# Check server is running
lsof -i :3001

# Check firewall
sudo ufw allow 3001/tcp
```

### Model not found
```bash
# List available models
ollama list

# Pull a model
ollama pull llama3
```

---

## License

MIT
