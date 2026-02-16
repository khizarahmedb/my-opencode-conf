# MCP Server Remote Access Guide

This guide explains how to run an MCP server on localhost and connect to it from another device on your network.

## Understanding MCP Transports

MCP (Model Context Protocol) supports different transport methods:

| Transport | Use Case | Remote Access |
|-----------|----------|---------------|
| **stdio** | Local CLI tools | ❌ No |
| **HTTP** | REST API access | ✅ Yes |
| **SSE** | Server-Sent Events | ✅ Yes |

For remote access, you need to use **HTTP** or **SSE** transport instead of stdio.

---

## Architecture Overview

```
Device A (Server)                    Device B (Client)
┌─────────────────────┐              ┌─────────────────────┐
│  MCP Server         │◄────────────►│  opencode agent     │
│  - Port 3000        │   Network    │  - mcp.json config  │
│  - HTTP transport   │              │  - Points to Server │
└─────────────────────┘              └─────────────────────┘
   Localhost:3000                      http://device-a:3000
```

---

## Step 1: Choose Your MCP Server Type

### Option A: Use an Existing MCP Server with HTTP Support

Some MCP servers already support HTTP mode:

```bash
# Example: Filesystem MCP server with HTTP transport
npx -y @modelcontextprotocol/server-filesystem --port 3000 /Users/khizar
```

### Option B: Create a Custom MCP Server

Create a simple MCP server that exposes HTTP endpoints:

```javascript
// mcp-server-http.js
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const express = require('express');
const cors = require('cors');

// Create MCP server
const server = new Server({
  name: 'remote-filesystem-server',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
  },
});

// Define a tool
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'read_file',
        description: 'Read a file from the filesystem',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
          },
          required: ['path'],
        },
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler('tools/call', async (request) => {
  if (request.params.name === 'read_file') {
    const fs = require('fs').promises;
    const content = await fs.readFile(request.params.arguments.path, 'utf-8');
    return {
      content: [{ type: 'text', text: content }],
    };
  }
  throw new Error(`Unknown tool: ${request.params.name}`);
});

// Create HTTP server
const app = express();
app.use(cors());
app.use(express.json());

// MCP endpoints
app.post('/mcp', async (req, res) => {
  try {
    const result = await server.handleRequest(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'remote-filesystem-server' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ MCP Server running on http://0.0.0.0:${PORT}`);
  console.log(`📡 Accessible from other devices on your network`);
});
```

---

## Step 2: Server Setup (Device A)

### 2.1 Install Dependencies

```bash
# Create project directory
mkdir -p ~/mcp-remote-server
cd ~/mcp-remote-server

# Initialize and install dependencies
npm init -y
npm install @modelcontextprotocol/sdk express cors
```

### 2.2 Create the Server

Save the custom server code above as `mcp-server-http.js` in `~/mcp-remote-server/`.

### 2.3 Start the Server

```bash
# Start the server
node mcp-server-http.js

# Or with a specific port
PORT=3000 node mcp-server-http.js
```

You should see:
```
✅ MCP Server running on http://0.0.0.0:3000
📡 Accessible from other devices on your network
```

### 2.4 Verify Server is Running

```bash
# Test locally
curl http://localhost:3000/health

# Expected output:
# {"status":"ok","server":"remote-filesystem-server"}
```

### 2.5 Find Your Server's IP Address

```bash
# macOS
ifconfig | grep "inet " | grep -v 127.0.0.1

# Linux/Ubuntu
ip addr show | grep "inet " | grep -v 127.0.0.1

# Or use hostname
hostname -I
```

Note your IP address (e.g., `192.168.1.100`).

---

## Step 3: Network Configuration

### 3.1 Firewall Rules

Allow incoming connections on your chosen port:

```bash
# macOS (add to Firewall Options in System Preferences)
# Or using socketfilterfw (requires sudo)
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add node

# Ubuntu/Debian (using UFW)
sudo ufw allow 3000/tcp

# Or for specific IP range
sudo ufw allow from 192.168.1.0/24 to any port 3000

# Check status
sudo ufw status
```

### 3.2 Test Network Connectivity

From another device on the same network:

```bash
# Replace with your server's IP
curl http://192.168.1.100:3000/health

# Should return: {"status":"ok","server":"remote-filesystem-server"}
```

If this doesn't work, check:
1. Both devices are on the same network
2. Firewall rules are correct
3. Server is bound to `0.0.0.0` not just `localhost`

---

## Step 4: Client Setup (Device B)

### 4.1 Configure opencode to Connect to Remote MCP

Edit `~/.config/opencode/mcp.json`:

```json
{
  "mcpServers": {
    "remote-filesystem": {
      "url": "http://192.168.1.100:3000/mcp",
      "transport": "http"
    }
  }
}
```

### 4.2 Test the Connection

```bash
# List available MCP tools
opencode mcp list

# You should see tools from your remote server
```

### 4.3 Using the Remote MCP in Conversations

Once connected, you can use the remote MCP tools in your opencode conversations:

```
You: Read the file ~/Documents/project/README.md using the remote filesystem

Agent: [Uses the remote MCP server to read the file from Device A]
```

---

## Step 5: Production Considerations

### 5.1 Authentication (Critical for Security)

Add API key authentication to your server:

```javascript
// Add to mcp-server-http.js before routes
const API_KEY = process.env.MCP_API_KEY || 'your-secret-key';

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${API_KEY}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Apply to MCP endpoint
app.post('/mcp', authenticate, async (req, res) => {
  // ... handler
});
```

Update client config:

```json
{
  "mcpServers": {
    "remote-filesystem": {
      "url": "http://192.168.1.100:3000/mcp",
      "transport": "http",
      "headers": {
        "Authorization": "Bearer your-secret-key"
      }
    }
  }
}
```

### 5.2 HTTPS with Self-Signed Certificate

For encrypted connections on local network:

```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

Update server to use HTTPS:

```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),
};

https.createServer(options, app).listen(PORT, '0.0.0.0', () => {
  console.log(`✅ MCP Server running on https://0.0.0.0:${PORT}`);
});
```

### 5.3 Process Management (PM2)

Keep the server running:

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start mcp-server-http.js --name mcp-remote

# Auto-start on boot
pm2 startup
pm2 save

# Monitor
pm2 logs mcp-remote
pm2 status
```

---

## Complete Setup Checklist

### Server (Device A)
- [ ] MCP server code created and saved
- [ ] Dependencies installed (`npm install`)
- [ ] Server started successfully
- [ ] Health check responds locally (`curl http://localhost:3000/health`)
- [ ] Server IP address identified
- [ ] Firewall rules configured
- [ ] (Optional) Authentication enabled
- [ ] (Optional) HTTPS configured
- [ ] (Optional) PM2 process manager configured

### Network
- [ ] Both devices on same network
- [ ] Port accessible (test with `curl` from Device B)
- [ ] No firewall blocking connections

### Client (Device B)
- [ ] opencode installed and configured
- [ ] `~/.config/opencode/mcp.json` updated with server URL
- [ ] Connection tested (`opencode mcp list`)
- [ ] Remote tools appear in list

---

## Troubleshooting

### Connection Refused

```bash
# Check if server is running
lsof -i :3000

# Check server is bound to 0.0.0.0 (not just localhost)
netstat -tlnp | grep 3000
# Should show 0.0.0.0:3000, not 127.0.0.1:3000
```

### Firewall Issues

```bash
# Temporarily disable firewall to test (macOS)
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate off

# Or allow specific app (after testing, re-enable)
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add $(which node)
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on
```

### CORS Errors

If you see CORS errors, ensure your server has:

```javascript
app.use(cors({
  origin: '*', // Or restrict to specific origins
  methods: ['POST', 'GET'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

### Timeout Issues

```bash
# Test with verbose curl
curl -v --max-time 10 http://192.168.1.100:3000/health
```

---

## Advanced: Multiple MCP Servers

You can run multiple MCP servers on different ports:

```bash
# Terminal 1 - Filesystem server
PORT=3000 node mcp-server-http.js

# Terminal 2 - Database server
PORT=3001 node mcp-db-server.js

# Terminal 3 - Custom tools server
PORT=3002 node mcp-custom-server.js
```

Client configuration:

```json
{
  "mcpServers": {
    "remote-filesystem": {
      "url": "http://192.168.1.100:3000/mcp",
      "transport": "http"
    },
    "remote-database": {
      "url": "http://192.168.1.100:3001/mcp",
      "transport": "http"
    },
    "remote-custom": {
      "url": "http://192.168.1.100:3002/mcp",
      "transport": "http"
    }
  }
}
```

---

## Security Best Practices

1. **Never expose to the public internet** without authentication
2. **Use strong API keys** if authentication is enabled
3. **Bind to specific interfaces** when possible (not `0.0.0.0`)
4. **Use HTTPS** for sensitive data
5. **Restrict firewall rules** to specific IP ranges
6. **Regularly update** MCP server dependencies
7. **Monitor logs** for unauthorized access attempts

---

## References

- [MCP Protocol Documentation](https://modelcontextprotocol.io/)
- [MCP SDK for JavaScript](https://github.com/modelcontextprotocol/typescript-sdk)
- [Express.js Documentation](https://expressjs.com/)
- [Node.js HTTPS Documentation](https://nodejs.org/api/https.html)

---

*Last updated: 2026-02-16*
