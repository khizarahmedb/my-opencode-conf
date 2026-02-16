#!/usr/bin/env node
/**
 * Remote MCP Server with HTTP Transport
 * 
 * This server exposes MCP tools via HTTP endpoints for remote access.
 * Run on Device A, connect from Device B.
 * 
 * Usage:
 *   PORT=3000 node server.js                    # Basic mode
 *   PORT=3000 MCP_API_KEY=secret node server.js # With auth
 *   PORT=3443 HTTPS=true node server.js         # With HTTPS
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');

// Configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // 0.0.0.0 allows remote connections
const API_KEY = process.env.MCP_API_KEY;
const USE_HTTPS = process.env.HTTPS === 'true';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['*'];

// Simple in-memory request handler (MCP protocol over HTTP)
class MCPServer {
  constructor() {
    this.tools = new Map();
    this.registerDefaultTools();
  }

  registerDefaultTools() {
    // Tool: Read file
    this.tools.set('read_file', {
      name: 'read_file',
      description: 'Read contents of a file',
      inputSchema: {
        type: 'object',
        properties: {
          path: { 
            type: 'string', 
            description: 'Absolute path to the file' 
          },
          encoding: { 
            type: 'string', 
            enum: ['utf-8', 'base64'],
            default: 'utf-8',
            description: 'File encoding'
          }
        },
        required: ['path']
      },
      handler: async (args) => {
        const content = await fs.readFile(args.path, args.encoding || 'utf-8');
        return {
          content: [{ type: 'text', text: content }]
        };
      }
    });

    // Tool: Write file
    this.tools.set('write_file', {
      name: 'write_file',
      description: 'Write content to a file',
      inputSchema: {
        type: 'object',
        properties: {
          path: { 
            type: 'string', 
            description: 'Absolute path to the file' 
          },
          content: { 
            type: 'string', 
            description: 'Content to write' 
          },
          encoding: { 
            type: 'string', 
            enum: ['utf-8', 'base64'],
            default: 'utf-8'
          }
        },
        required: ['path', 'content']
      },
      handler: async (args) => {
        await fs.writeFile(args.path, args.content, args.encoding || 'utf-8');
        return {
          content: [{ type: 'text', text: `File written: ${args.path}` }]
        };
      }
    });

    // Tool: List directory
    this.tools.set('list_directory', {
      name: 'list_directory',
      description: 'List contents of a directory',
      inputSchema: {
        type: 'object',
        properties: {
          path: { 
            type: 'string', 
            description: 'Absolute path to the directory' 
          }
        },
        required: ['path']
      },
      handler: async (args) => {
        const entries = await fs.readdir(args.path, { withFileTypes: true });
        const formatted = entries.map(e => ({
          name: e.name,
          type: e.isDirectory() ? 'directory' : 'file'
        }));
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify(formatted, null, 2) 
          }]
        };
      }
    });

    // Tool: Execute command (use with caution!)
    this.tools.set('execute_command', {
      name: 'execute_command',
      description: 'Execute a shell command',
      inputSchema: {
        type: 'object',
        properties: {
          command: { 
            type: 'string', 
            description: 'Command to execute' 
          },
          cwd: { 
            type: 'string', 
            description: 'Working directory' 
          },
          timeout: { 
            type: 'number', 
            default: 30000,
            description: 'Timeout in milliseconds' 
          }
        },
        required: ['command']
      },
      handler: async (args) => {
        const { exec } = require('child_process');
        const util = require('util');
        const execPromise = util.promisify(exec);
        
        try {
          const { stdout, stderr } = await execPromise(args.command, {
            cwd: args.cwd,
            timeout: args.timeout || 30000
          });
          return {
            content: [
              { type: 'text', text: stdout || 'Command completed successfully' },
              ...(stderr ? [{ type: 'text', text: `STDERR: ${stderr}` }] : [])
            ]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}\n${error.stderr || ''}` }],
            isError: true
          };
        }
      }
    });

    // Tool: Get system info
    this.tools.set('get_system_info', {
      name: 'get_system_info',
      description: 'Get system information',
      inputSchema: {
        type: 'object',
        properties: {}
      },
      handler: async () => {
        const os = require('os');
        const info = {
          platform: os.platform(),
          arch: os.arch(),
          hostname: os.hostname(),
          uptime: os.uptime(),
          loadavg: os.loadavg(),
          totalmem: os.totalmem(),
          freemem: os.freemem(),
          cpus: os.cpus().length,
          home: os.homedir(),
          cwd: process.cwd()
        };
        return {
          content: [{ type: 'text', text: JSON.stringify(info, null, 2) }]
        };
      }
    });
  }

  async handleListTools() {
    return {
      tools: Array.from(this.tools.values()).map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema
      }))
    };
  }

  async handleCallTool(name, args) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }
    return await tool.handler(args);
  }
}

// Create server instance
const mcpServer = new MCPServer();
const app = express();

// Middleware
app.use(cors({
  origin: ALLOWED_ORIGINS,
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json({ limit: '50mb' }));

// Authentication middleware
const authenticate = (req, res, next) => {
  if (!API_KEY) {
    return next(); // No auth required if no API_KEY set
  }
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Unauthorized. Provide Authorization: Bearer <API_KEY> header' 
    });
  }
  
  const token = authHeader.slice(7);
  if (token !== API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    server: 'remote-mcp-server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    tools: Array.from(mcpServer.tools.keys())
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Remote MCP Server',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      tools: 'POST /mcp/tools/list',
      call: 'POST /mcp/tools/call'
    },
    documentation: 'https://github.com/khizarahmedb/my-opencode-conf/docs/mcp-remote-access-guide.md'
  });
});

// MCP Protocol endpoints
app.post('/mcp/tools/list', authenticate, async (req, res) => {
  try {
    const result = await mcpServer.handleListTools();
    res.json(result);
  } catch (error) {
    console.error('Error listing tools:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/mcp/tools/call', authenticate, async (req, res) => {
  try {
    const { name, arguments: args } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Tool name required' });
    }
    
    const result = await mcpServer.handleCallTool(name, args || {});
    res.json(result);
  } catch (error) {
    console.error('Error calling tool:', error);
    res.status(500).json({ error: error.message });
  }
});

// Legacy MCP endpoint (for compatibility)
app.post('/mcp', authenticate, async (req, res) => {
  try {
    const { method, params } = req.body;
    
    let result;
    switch (method) {
      case 'tools/list':
        result = await mcpServer.handleListTools();
        break;
      case 'tools/call':
        result = await mcpServer.handleCallTool(params.name, params.arguments);
        break;
      default:
        return res.status(400).json({ error: `Unknown method: ${method}` });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
function startServer() {
  const protocol = USE_HTTPS ? 'https' : 'http';
  
  if (USE_HTTPS) {
    // For HTTPS, you need cert.pem and key.pem files
    try {
      const options = {
        key: fs.readFileSync('key.pem'),
        cert: fs.readFileSync('cert.pem')
      };
      https.createServer(options, app).listen(PORT, HOST, () => {
        console.log(`✅ MCP Server running on ${protocol}://${HOST}:${PORT}`);
        console.log(`📡 Accessible from other devices on your network`);
        console.log(`🔒 HTTPS enabled`);
        if (API_KEY) console.log(`🔑 Authentication enabled`);
        console.log('');
        console.log('Available tools:');
        mcpServer.tools.forEach((tool, name) => {
          console.log(`  - ${name}: ${tool.description}`);
        });
        console.log('');
        console.log('Test locally:');
        console.log(`  curl ${protocol}://localhost:${PORT}/health`);
        console.log('');
        console.log('Press Ctrl+C to stop');
      });
    } catch (error) {
      console.error('❌ HTTPS error:', error.message);
      console.error('Make sure cert.pem and key.pem exist, or run without HTTPS=true');
      process.exit(1);
    }
  } else {
    http.createServer(app).listen(PORT, HOST, () => {
      console.log(`✅ MCP Server running on ${protocol}://${HOST}:${PORT}`);
      console.log(`📡 Accessible from other devices on your network`);
      if (API_KEY) console.log(`🔑 Authentication enabled`);
      console.log('');
      console.log('Available tools:');
      mcpServer.tools.forEach((tool, name) => {
        console.log(`  - ${name}: ${tool.description}`);
      });
      console.log('');
      console.log('Test locally:');
      console.log(`  curl ${protocol}://localhost:${PORT}/health`);
      console.log('');
      console.log('Press Ctrl+C to stop');
    });
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n👋 Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 Received SIGINT, shutting down gracefully');
  process.exit(0);
});

// Start
startServer();
