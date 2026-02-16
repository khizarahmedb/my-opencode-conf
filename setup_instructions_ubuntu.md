# Opencode Agent Setup Instructions (Ubuntu)

## Overview

This guide sets up opencode-specific agent configuration on Ubuntu. It extends the base [agents-config](https://github.com/khizarahmedb/agents-config) with opencode-specific features like MCP servers and enhanced context retrieval.

## Prerequisites

- Ubuntu 20.04+ operating system
- Git installed: `sudo apt-get install git`
- opencode CLI installed (see: https://github.com/opencode-ai/opencode)
- Node.js 18+ and npm: `sudo apt-get install nodejs npm`
- Optional: Obsidian CLI for enhanced context retrieval
- `realpath` utility: `sudo apt-get install coreutils`

## Setup Steps

### Step 1: Clone Configuration Repository

```bash
cd ~/Documents/GitHub
git clone https://github.com/khizarahmedb/my-opencode-conf.git
```

### Step 2: Create Global Configuration Directory

```bash
mkdir -p ~/.config/opencode
```

### Step 3: Install Global AGENTS.md

```bash
cp ~/Documents/GitHub/my-opencode-conf/templates/global/AGENTS.md.template \
   ~/Documents/GitHub/AGENTS.md
```

### Step 4: Install Global Agent Notes

```bash
cp ~/Documents/GitHub/my-opencode-conf/templates/global/AGENT_NOTES_GLOBAL.md.template \
   ~/Documents/GitHub/AGENT_NOTES_GLOBAL.md
```

Initialize state keys in AGENT_NOTES_GLOBAL.md with today's date:

```bash
TODAY=$(date +%Y-%m-%d)
sed -i "s/YYYY-MM-DD/$TODAY/g" ~/Documents/GitHub/AGENT_NOTES_GLOBAL.md
```

### Step 5: Configure MCP Servers

Create `~/.config/opencode/mcp.json`:

```bash
cat > ~/.config/opencode/mcp.json << 'EOF'
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/khizar"]
    }
  }
}
EOF
```

If you have Obsidian CLI installed, add it:

```bash
cat > ~/.config/opencode/mcp.json << 'EOF'
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/khizar"]
    },
    "obsidian": {
      "command": "obsidian",
      "args": ["mcp"]
    }
  }
}
EOF
```

### Step 6: Set Up Cross-Tool Compatibility

Create symlinks for other AI tools to use the same AGENTS.md:

```bash
# Codex
mkdir -p ~/.codex
ln -sf ~/Documents/GitHub/AGENTS.md ~/.codex/AGENTS.md

# Claude Code
mkdir -p ~/.claude
ln -sf ~/Documents/GitHub/AGENTS.md ~/.claude/CLAUDE.md

# Gemini CLI
mkdir -p ~/.gemini
ln -sf ~/Documents/GitHub/AGENTS.md ~/.gemini/AGENTS.md

# Create Gemini settings.json
cat > ~/.gemini/settings.json << 'EOF'
{
  "context": {
    "fileName": "AGENTS.md"
  }
}
EOF
```

### Step 7: Create Bootstrap Script

Create `/Users/khizar/Documents/GitHub/setup-opencode-agent-standards.sh`:

```bash
cat > ~/Documents/GitHub/setup-opencode-agent-standards.sh << 'EOF'
#!/bin/bash
# Setup script to wire tool-specific global files to canonical AGENTS.md

set -e

CANONICAL_AGENTS="$HOME/Documents/GitHub/AGENTS.md"

if [ ! -f "$CANONICAL_AGENTS" ]; then
    echo "❌ Canonical AGENTS.md not found at $CANONICAL_AGENTS"
    exit 1
fi

# Codex
mkdir -p "$HOME/.codex"
ln -sf "$CANONICAL_AGENTS" "$HOME/.codex/AGENTS.md"
echo "✅ Codex: Linked $HOME/.codex/AGENTS.md"

# Claude Code
mkdir -p "$HOME/.claude"
ln -sf "$CANONICAL_AGENTS" "$HOME/.claude/CLAUDE.md"
echo "✅ Claude Code: Linked $HOME/.claude/CLAUDE.md"

# Gemini CLI
mkdir -p "$HOME/.gemini"
ln -sf "$CANONICAL_AGENTS" "$HOME/.gemini/AGENTS.md"

if [ ! -f "$HOME/.gemini/settings.json" ]; then
    cat > "$HOME/.gemini/settings.json" << 'INNEREOF'
{
  "context": {
    "fileName": "AGENTS.md"
  }
}
INNEREOF
    echo "✅ Gemini CLI: Created settings.json and linked AGENTS.md"
else
    echo "✅ Gemini CLI: Linked AGENTS.md (settings.json already exists)"
fi

echo "✅ All tool configurations linked successfully!"
EOF

chmod +x ~/Documents/GitHub/setup-opencode-agent-standards.sh
```

### Step 8: Apply Repository-Level Configuration

For each repository you work in, run the bootstrap:

```bash
bash ~/Documents/GitHub/my-opencode-conf/scripts/setup_opencode_agent.sh \
  --workspace-root ~/Documents/GitHub \
  --repo-root ~/Documents/GitHub/your-repo
```

Or use the base agents-config script:

```bash
bash ~/Documents/GitHub/agents-config/scripts/apply_repo_agent_policy.sh \
  --workspace-root ~/Documents/GitHub \
  --repo-root ~/Documents/GitHub/your-repo
```

### Step 9: Configure .gitignore

Ensure all repositories have the correct .gitignore entries. The bootstrap scripts do this automatically, but verify:

```bash
cd ~/Documents/GitHub/your-repo

# Check if AGENT*.md is in .gitignore
grep -q "AGENT\*.md" .gitignore || echo "AGENT*.md" >> .gitignore
grep -q "\.agentsmd" .gitignore || echo ".agentsmd" >> .gitignore
grep -q "/docs/" .gitignore || echo "/docs/" >> .gitignore
```

### Step 10: Validation

Run the validation script:

```bash
bash ~/Documents/GitHub/my-opencode-conf/scripts/validate_setup.sh
```

## Daily Workflow

### Automatic Maintenance

The setup includes automatic maintenance that runs on each conversation start:

1. **Config Review**: Reviews `AGENTS.md` and `AGENT_NOTES_GLOBAL.md`
2. **Daily Sync**: If date changed, pulls latest from `my-opencode-conf` and `agents-config`
3. **State Update**: Updates `last_config_sync_date`, `last_global_config_review_date`, `last_global_config_review_repo`

### Manual Sync

To manually sync configurations:

```bash
# Pull latest opencode config
cd ~/Documents/GitHub/my-opencode-conf
git pull --ff-only

# Pull latest base config
cd ~/Documents/GitHub/agents-config
git pull --ff-only

# Update sync date
TODAY=$(date +%Y-%m-%d)
sed -i '' "s/last_config_sync_date: .*/last_config_sync_date: $TODAY/" \
    ~/Documents/GitHub/AGENT_NOTES_GLOBAL.md
```

## MCP Server Management

### Adding a New MCP Server

1. Edit `~/.config/opencode/mcp.json`:

```json
{
  "mcpServers": {
    "existing-server": { ... },
    "new-server": {
      "command": "command-name",
      "args": ["arg1", "arg2"]
    }
  }
}
```

2. Validate JSON syntax:

```bash
python3 -m json.tool ~/.config/opencode/mcp.json > /dev/null && echo "✅ Valid JSON"
```

3. Restart opencode agent to pick up changes

### Testing MCP Servers

```bash
# List available MCP tools
opencode mcp list

# Test a specific tool
opencode mcp call filesystem list_directory '{"path": "/Users/khizar"}'
```

## Troubleshooting

### MCP Server Not Found

```bash
# Verify MCP config exists
ls -la ~/.config/opencode/mcp.json

# Validate JSON
python3 -m json.tool ~/.config/opencode/mcp.json

# Check server command exists
which <command-name>
```

### Obsidian Context Not Working

```bash
# Verify Obsidian CLI
which obsidian

# Check vault accessibility
obsidian list

# Test query
obsidian search "your query"
```

### Global Config Not Applying

```bash
# Verify AGENTS.md exists
ls -la ~/Documents/GitHub/AGENTS.md

# Check symlinks
ls -la ~/.codex/AGENTS.md
ls -la ~/.claude/CLAUDE.md
ls -la ~/.gemini/AGENTS.md

# Re-run setup
bash ~/Documents/GitHub/setup-opencode-agent-standards.sh
```

## Updates

Track changes in this setup:

- **2026-02-16**: Initial opencode-specific configuration setup

## References

- Base configuration: https://github.com/khizarahmedb/agents-config
- Opencode CLI: https://github.com/opencode-ai/opencode
- MCP Documentation: https://modelcontextprotocol.io/
