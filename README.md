# my-opencode-conf

Opencode-specific agent configuration and setup instructions for AI coding assistants in the OpenCode ecosystem.

This repository contains specialized configuration for working with opencode agents, including custom instructions, MCP (Model Context Protocol) integrations, and standardized workflows.

## Overview

This config extends the base [agents-config](https://github.com/khizarahmedb/agents-config) repository with opencode-specific customizations:

- **MCP Server Integration**: Custom MCP servers for enhanced agent capabilities
  - [Remote MCP Server Guide](docs/mcp-remote-access-guide.md) - Run MCP server on one device, connect from another
  - [Working Example](examples/remote-mcp-server/) - Complete, ready-to-use remote MCP server
- **Obsidian-First Context**: Hybrid context retrieval with Obsidian integration
- **Tool-Specific Configurations**: Optimized settings for different agent tools
- **Custom Skills**: Repository-specific skill definitions

## Prerequisites

Before using this configuration, ensure you have:

1. **opencode CLI installed**: See [opencode installation guide](https://github.com/opencode-ai/opencode)
2. **Node.js 18+** and **npm**
3. **Git** configured with your GitHub credentials
4. Access to required MCP servers (if using custom integrations)

## Quick Start

### Method 1: Copy-Paste Setup (Recommended)

1. Choose your OS-specific setup file:
   - `setup_instructions.md` (macOS/Linux)
   - `setup_instructions_ubuntu.md` (Ubuntu-specific)
   - `setup_instructions_win.md` (Windows)

2. Open your opencode agent session

3. Paste the entire chosen markdown file into the AI

4. Ask the AI to execute it and report created/updated files

### Method 2: Manual Setup

1. Clone this repository:
   ```bash
   git clone https://github.com/khizarahmedb/my-opencode-conf.git
   cd my-opencode-conf
   ```

2. Run the bootstrap script for your OS:
   ```bash
   # macOS/Linux
   bash ./scripts/setup_opencode_agent.sh

   # Windows PowerShell
   powershell -ExecutionPolicy Bypass -File .\scripts\setup_opencode_agent.ps1
   ```

## What This Setup Creates

### Global Configuration Files

Located in `~/.config/opencode/` (or tool-specific locations):

- **`AGENTS.md`**: Primary instruction file for opencode agents
- **`AGENT_NOTES_GLOBAL.md`**: Global preference memory and state tracking
- **`settings.json`**: Tool-specific settings and MCP configurations
- **`mcp.json`**: MCP server configurations

### Repository-Level Files

For each repository under `/Users/khizar/Documents/GitHub/`:

- **`AGENTS.md`**: Repository-specific instructions
- **`AGENT_NOTES.md`**: Repository-specific preferences
- **`skills.md`** (optional): Repository skill definitions
- **`.gitignore`**: Automatically configured to ignore local agent files

### MCP Server Integrations

This configuration includes MCP server setups for:

1. **Obsidian Integration**: Fast context retrieval from Obsidian vault
2. **Web Search**: Enhanced web search capabilities
3. **File Operations**: Advanced file manipulation tools
4. **Git Operations**: Enhanced git workflow support

## File Structure

```
my-opencode-conf/
├── README.md                          # This file
├── AGENTS.md                          # Repository instructions
├── AGENT_NOTES.md                     # Repository notes
├── .gitignore                         # Git ignore rules
├── skills.md                          # Available skills index
├── setup_instructions.md              # macOS/Linux setup guide
├── setup_instructions_ubuntu.md       # Ubuntu-specific guide
├── setup_instructions_win.md          # Windows setup guide
├── scripts/
│   ├── setup_opencode_agent.sh        # Unix setup script
│   ├── setup_opencode_agent.ps1       # Windows setup script
│   ├── validate_setup.sh              # Unix validation
│   └── validate_setup.ps1             # Windows validation
└── templates/
    ├── global/
    │   ├── AGENTS.md.template         # Global AGENTS template
    │   └── AGENT_NOTES_GLOBAL.md.template
    └── repo/
        ├── AGENTS.md.template         # Repo AGENTS template
        └── AGENT_NOTES.md.template
```

## Key Features

### 1. Obsidian-First Context Retrieval

The setup prioritizes Obsidian vault queries for context retrieval:

- Uses `obsidian_fast_context.sh` for hybrid search
- Falls back to standard file operations if Obsidian CLI unavailable
- Maintains fast startup times while ensuring rich context

### 2. MCP Server Configuration

Pre-configured MCP servers enhance agent capabilities:

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "/path/to/obsidian-mcp",
      "args": ["--vault", "/path/to/vault"]
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/khizar"]
    }
  }
}
```

### 3. Cross-Tool Compatibility

Configuration works across multiple AI coding tools:

- **opencode**: Primary target, full feature support
- **Codex**: Compatible via AGENTS.md standard
- **Claude Code**: Compatible via CLAUDE.md symlink
- **Gemini CLI**: Compatible via settings.json

### 4. Automatic Maintenance

The setup includes automatic maintenance tasks:

- Daily sync from remote reference repository
- Automatic global config review on conversation start
- State tracking via `AGENT_NOTES_GLOBAL.md`
- Idempotent bootstrap scripts for new repositories

## Customization

### Adding Custom MCP Servers

Edit `~/.config/opencode/mcp.json`:

```json
{
  "mcpServers": {
    "your-server": {
      "command": "your-command",
      "args": ["arg1", "arg2"]
    }
  }
}
```

### Modifying Global Instructions

Update `~/.config/opencode/AGENTS.md` with your preferences. Changes are automatically applied to all repositories.

### Repository-Specific Overrides

Create `AGENTS.override.md` in any repository to override global instructions for that specific project.

## Validation

Verify your setup is correct:

```bash
# macOS/Linux
bash ./scripts/validate_setup.sh

# Windows
powershell -ExecutionPolicy Bypass -File .\scripts\validate_setup.ps1
```

## Updates

This repository follows a read-only consumption model:

- **Consumers**: Pull updates daily (automatic via setup)
- **Owner**: Push updates to this canonical repository
- **Sync**: Update `last_config_sync_date` in global notes

To manually sync:

```bash
cd /Users/khizar/Documents/GitHub/my-opencode-conf
git pull --ff-only
```

## Troubleshooting

### MCP Server Not Connecting

1. Verify MCP server is installed: `which obsidian` or `which your-server`
2. Check MCP configuration in `~/.config/opencode/mcp.json`
3. Restart the opencode agent

### Obsidian Context Retrieval Failing

1. Ensure Obsidian CLI is installed and in PATH
2. Check vault path is correct in configuration
3. Verify Obsidian vault is accessible

### Global Config Not Applying

1. Check `~/.config/opencode/AGENTS.md` exists
2. Verify symlink if using multiple tools: `ls -la ~/.codex/`
3. Restart your agent session

## Related Repositories

- **[agents-config](https://github.com/khizarahmedb/agents-config)**: Base agent configuration (read-only reference)
- **[opencode](https://github.com/opencode-ai/opencode)**: The opencode CLI tool
- **[nysonian-marketing-scripts](https://github.com/khizarahmedb/nysonian-marketing-scripts)**: Example repository using this config

## Version Control Notes

- **2026-02-16**: Initial creation of my-opencode-conf repository | Why: Separate opencode-specific configuration from base agents-config | Commit: `initial`

## License

Private configuration. For personal use only.
