# Remote MCP Server Example

A complete, working example of an MCP server with HTTP transport that can be accessed remotely from another device.

## Quick Start

### 1. Install Dependencies (Server - Device A)

```bash
cd ~/Documents/GitHub/my-opencode-conf/examples/remote-mcp-server
npm install
```

### 2. Start the Server (Device A)

```bash
# Basic mode - accessible to any device on your network
npm start
# or
PORT=3000 node server.js

# With authentication (recommended)
MCP_API_KEY=your-secret-key npm start

# With HTTPS (requires cert.pem and key.pem)
HTTPS=true PORT=3443 npm start
```

The server will start and display:
```
✅ MCP Server running on http://0.0.0.0:3000
📡 Accessible from other devices on your network

Available tools:
  - read_file: Read contents of a file
  - write_file: Write content to a file
  - list_directory: List contents of a directory
  - execute_command: Execute a shell command
  - get_system_info: Get system information

Test locally:
  curl http://localhost:3000/health
```

### 3. Find Your Server IP (Device A)

```bash
# macOS
ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1

# Linux
ip addr show | grep "inet " | grep -v 127.0.0.1 | head -1

# Or
hostname -I
```

Note the IP address (e.g., `192.168.1.100`).

### 4. Test from Another Device (Device B)

```bash
# Replace with your server's IP
curl http://192.168.1.100:3000/health
```

You should see:
```json
{
  "status": "ok",
  "server": "remote-mcp-server",
  "version": "1.0.0",
  "tools": ["read_file", "write_file", "list_directory", "execute_command", "get_system_info"]
}
```

### 5. Configure Client (Device B - opencode)

Edit `~/.config/opencode/mcp.json`:

**Without authentication:**
```json
{
  "mcpServers": {
    "remote-server": {
      "url": "http://192.168.1.100:3000",
      "transport": "http"
    }
  }
}
```

**With authentication:**
```json
{
  "mcpServers": {
    "remote-server": {
      "url": "http://192.168.1.100:3000",
      "transport": "http",
      "headers": {
        "Authorization": "Bearer your-secret-key"
      }
    }
  }
}
```

### 6. Verify Connection (Device B)

```bash
# List available MCP tools
opencode mcp list

# You should see tools from your remote server
```

## Available Tools

### read_file
Read contents of a file from the server.

**Parameters:**
- `path` (string, required): Absolute path to the file
- `encoding` (string, optional): 'utf-8' or 'base64', default 'utf-8'

**Example:**
```bash
curl -X POST http://192.168.1.100:3000/mcp/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "read_file",
    "arguments": {
      "path": "/Users/khizar/Documents/README.md"
    }
  }'
```

### write_file
Write content to a file on the server.

**Parameters:**
- `path` (string, required): Absolute path to the file
- `content` (string, required): Content to write
- `encoding` (string, optional): 'utf-8' or 'base64'

### list_directory
List contents of a directory on the server.

**Parameters:**
- `path` (string, required): Absolute path to the directory

### execute_command
Execute a shell command on the server.

⚠️ **Security Warning:** This tool allows arbitrary command execution. Only enable this if you trust all clients and use authentication.

**Parameters:**
- `command` (string, required): Command to execute
- `cwd` (string, optional): Working directory
- `timeout` (number, optional): Timeout in milliseconds, default 30000

### get_system_info
Get system information from the server.

**Parameters:** None

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `HOST` | 0.0.0.0 | Server host (0.0.0.0 allows remote connections) |
| `MCP_API_KEY` | (none) | API key for authentication |
| `HTTPS` | false | Enable HTTPS (requires cert.pem and key.pem) |
| `ALLOWED_ORIGINS` | * | Comma-separated list of allowed CORS origins |

## Running with PM2 (Production)

```bash
# Install PM2 globally
npm install -g pm2

# Start server with PM2
npm run pm2:start

# View logs
npm run pm2:logs

# Stop server
npm run pm2:stop

# Auto-start on boot
pm2 startup
pm2 save
```

## HTTPS Setup

### Generate Self-Signed Certificate

```bash
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost"
```

### Run with HTTPS

```bash
HTTPS=true PORT=3443 npm start
```

## Firewall Configuration

### macOS

```bash
# Add Node.js to firewall (requires password)
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add $(which node)

# Or disable firewall temporarily for testing
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate off
```

### Linux (UFW)

```bash
# Allow port 3000
sudo ufw allow 3000/tcp

# Or allow specific IP range
sudo ufw allow from 192.168.1.0/24 to any port 3000

# Check status
sudo ufw status
```

## Troubleshooting

### Connection Refused

1. Check server is running: `lsof -i :3000`
2. Verify binding: Should show `*:3000` not `127.0.0.1:3000`
3. Check firewall settings
4. Ensure both devices are on the same network

### CORS Errors

If you see CORS errors, check the `ALLOWED_ORIGINS` environment variable:

```bash
ALLOWED_ORIGINS=http://device-b-ip:port npm start
```

Or set to `*` for all origins (less secure):

```bash
ALLOWED_ORIGINS=* npm start
```

### Authentication Failures

Make sure the client sends the correct header:

```bash
curl -H "Authorization: Bearer your-secret-key" http://192.168.1.100:3000/health
```

## API Reference

### Endpoints

#### GET /health
Returns server health status and available tools.

**Response:**
```json
{
  "status": "ok",
  "server": "remote-mcp-server",
  "version": "1.0.0",
  "timestamp": "2026-02-16T12:00:00.000Z",
  "tools": ["read_file", "write_file", ...]
}
```

#### POST /mcp/tools/list
List all available tools.

**Response:**
```json
{
  "tools": [
    {
      "name": "read_file",
      "description": "Read contents of a file",
      "inputSchema": { ... }
    }
  ]
}
```

#### POST /mcp/tools/call
Call a tool.

**Request:**
```json
{
  "name": "read_file",
  "arguments": {
    "path": "/Users/khizar/Documents/README.md"
  }
}
```

**Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "file contents here..."
    }
  ]
}
```

## Security Best Practices

1. **Always use authentication** (`MCP_API_KEY`) when exposing to network
2. **Use HTTPS** in production environments
3. **Restrict firewall rules** to specific IP ranges
4. **Review tool permissions** - consider removing `execute_command` for untrusted clients
5. **Monitor logs** for unauthorized access attempts
6. **Use strong API keys** (32+ random characters)

## Extending the Server

To add your own tools, edit `server.js` and add to the `registerDefaultTools()` method:

```javascript
this.tools.set('my_custom_tool', {
  name: 'my_custom_tool',
  description: 'Does something cool',
  inputSchema: {
    type: 'object',
    properties: {
      param1: { type: 'string' }
    },
    required: ['param1']
  },
  handler: async (args) => {
    // Your logic here
    return {
      content: [{ type: 'text', text: 'Result!' }]
    };
  }
});
```

## Client Examples

### JavaScript/Node.js

```javascript
const fetch = require('node-fetch');

async function callRemoteTool(serverUrl, toolName, args, apiKey) {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  
  const response = await fetch(`${serverUrl}/mcp/tools/call`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: toolName,
      arguments: args
    })
  });
  
  return await response.json();
}

// Usage
const result = await callRemoteTool(
  'http://192.168.1.100:3000',
  'read_file',
  { path: '/Users/khizar/Documents/README.md' },
  'your-secret-key'
);
```

### Python

```python
import requests

def call_remote_tool(server_url, tool_name, args, api_key=None):
    headers = {'Content-Type': 'application/json'}
    
    if api_key:
        headers['Authorization'] = f'Bearer {api_key}'
    
    response = requests.post(
        f'{server_url}/mcp/tools/call',
        headers=headers,
        json={
            'name': tool_name,
            'arguments': args
        }
    )
    
    return response.json()

# Usage
result = call_remote_tool(
    'http://192.168.1.100:3000',
    'read_file',
    {'path': '/Users/khizar/Documents/README.md'},
    api_key='your-secret-key'
)
```

### cURL

```bash
# With authentication
curl -X POST http://192.168.1.100:3000/mcp/tools/call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-key" \
  -d '{
    "name": "read_file",
    "arguments": {
      "path": "/Users/khizar/Documents/README.md"
    }
  }'

# List tools
curl http://192.168.1.100:3000/mcp/tools/list \
  -H "Authorization: Bearer your-secret-key"
```

## License

MIT
