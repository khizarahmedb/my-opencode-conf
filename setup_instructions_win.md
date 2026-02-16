# Opencode Agent Setup Instructions (Windows)

## Overview

This guide sets up opencode-specific agent configuration on Windows. It extends the base [agents-config](https://github.com/khizarahmedb/agents-config) with opencode-specific features like MCP servers and enhanced context retrieval.

## Prerequisites

- Windows 10 or 11 operating system
- Git for Windows installed and configured
- PowerShell 5.1+ or PowerShell Core 7+
- opencode CLI installed (see: https://github.com/opencode-ai/opencode)
- Node.js 18+ and npm
- Optional: Obsidian CLI for enhanced context retrieval

## Setup Steps

### Step 1: Clone Configuration Repository

Open PowerShell and run:

```powershell
cd ~\Documents\GitHub
git clone https://github.com/khizarahmedb/my-opencode-conf.git
```

### Step 2: Create Global Configuration Directory

```powershell
New-Item -ItemType Directory -Force -Path ~\.config\opencode
```

### Step 3: Install Global AGENTS.md

```powershell
Copy-Item ~\Documents\GitHub\my-opencode-conf\templates\global\AGENTS.md.template `
    ~\Documents\GitHub\AGENTS.md
```

### Step 4: Install Global Agent Notes

```powershell
Copy-Item ~\Documents\GitHub\my-opencode-conf\templates\global\AGENT_NOTES_GLOBAL.md.template `
    ~\Documents\GitHub\AGENT_NOTES_GLOBAL.md
```

Initialize state keys in AGENT_NOTES_GLOBAL.md with today's date:

```powershell
$TODAY = Get-Date -Format "yyyy-MM-dd"
(Get-Content ~\Documents\GitHub\AGENT_NOTES_GLOBAL.md) `
    -replace 'YYYY-MM-DD', $TODAY `
    | Set-Content ~\Documents\GitHub\AGENT_NOTES_GLOBAL.md
```

### Step 5: Configure MCP Servers

Create `~\.config\opencode\mcp.json`:

```powershell
@"
{
  `"mcpServers`": {
    `"filesystem`": {
      `"command`": `"npx`",
      `"args`": [`"-y`", `"@modelcontextprotocol/server-filesystem`", `"$env:USERPROFILE`"]
    }
  }
}
"@ | Set-Content ~\.config\opencode\mcp.json -Encoding UTF8
```

If you have Obsidian CLI installed, add it:

```powershell
@"
{
  `"mcpServers`": {
    `"filesystem`": {
      `"command`": `"npx`",
      `"args`": [`"-y`", `"@modelcontextprotocol/server-filesystem`", `"$env:USERPROFILE`"]
    },
    `"obsidian`": {
      `"command`": `"obsidian`",
      `"args`": [`"mcp`"]
    }
  }
}
"@ | Set-Content ~\.config\opencode\mcp.json -Encoding UTF8
```

### Step 6: Set Up Cross-Tool Compatibility

Create copies for other AI tools (Windows doesn't support symlinks easily):

```powershell
# Codex
New-Item -ItemType Directory -Force -Path ~\.codex
Copy-Item ~\Documents\GitHub\AGENTS.md ~\.codex\AGENTS.md -Force

# Claude Code
New-Item -ItemType Directory -Force -Path ~\.claude
Copy-Item ~\Documents\GitHub\AGENTS.md ~\.claude\CLAUDE.md -Force

# Gemini CLI
New-Item -ItemType Directory -Force -Path ~\.gemini
Copy-Item ~\Documents\GitHub\AGENTS.md ~\.gemini\AGENTS.md -Force

# Create Gemini settings.json
@"
{
  `"context`": {
    `"fileName`": `"AGENTS.md`"
  }
}
"@ | Set-Content ~\.gemini\settings.json -Encoding UTF8
```

### Step 7: Create Bootstrap Script

Create `~\Documents\GitHub\setup-opencode-agent-standards.ps1`:

```powershell
@"
# Setup script to sync tool-specific global files with canonical AGENTS.md (Windows)

`$CANONICAL_AGENTS = `"`$env:USERPROFILE\Documents\GitHub\AGENTS.md`"

if (-not (Test-Path `$CANONICAL_AGENTS)) {
    Write-Host `"❌ Canonical AGENTS.md not found at `$CANONICAL_AGENTS`" -ForegroundColor Red
    exit 1
}

# Codex
New-Item -ItemType Directory -Force -Path `"`$env:USERPROFILE\.codex`" | Out-Null
Copy-Item `$CANONICAL_AGENTS `"`$env:USERPROFILE\.codex\AGENTS.md`" -Force
Write-Host `"✅ Codex: Copied to `$env:USERPROFILE\.codex\AGENTS.md`"

# Claude Code
New-Item -ItemType Directory -Force -Path `"`$env:USERPROFILE\.claude`" | Out-Null
Copy-Item `$CANONICAL_AGENTS `"`$env:USERPROFILE\.claude\CLAUDE.md`" -Force
Write-Host `"✅ Claude Code: Copied to `$env:USERPROFILE\.claude\CLAUDE.md`"

# Gemini CLI
New-Item -ItemType Directory -Force -Path `"`$env:USERPROFILE\.gemini`" | Out-Null
Copy-Item `$CANONICAL_AGENTS `"`$env:USERPROFILE\.gemini\AGENTS.md`" -Force

if (-not (Test-Path `"`$env:USERPROFILE\.gemini\settings.json`")) {
    @`"
{
  `"context`": {
    `"fileName`": `"AGENTS.md`"
  }
}
`"@ | Set-Content `"`$env:USERPROFILE\.gemini\settings.json`" -Encoding UTF8
    Write-Host `"✅ Gemini CLI: Created settings.json and copied AGENTS.md`"
} else {
    Write-Host `"✅ Gemini CLI: Copied AGENTS.md (settings.json already exists)`"
}

Write-Host `"✅ All tool configurations synced successfully!`"
"@ | Set-Content ~\Documents\GitHub\setup-opencode-agent-standards.ps1 -Encoding UTF8
```

### Step 8: Apply Repository-Level Configuration

For each repository you work in, run the bootstrap:

```powershell
powershell -ExecutionPolicy Bypass -File ~\Documents\GitHub\my-opencode-conf\scripts\setup_opencode_agent.ps1 `
    -WorkspaceRoot ~\Documents\GitHub `
    -RepoRoot ~\Documents\GitHub\your-repo
```

Or use the base agents-config script:

```powershell
powershell -ExecutionPolicy Bypass -File ~\Documents\GitHub\agents-config\scripts\apply_repo_agent_policy.ps1 `
    -WorkspaceRoot ~\Documents\GitHub `
    -RepoRoot ~\Documents\GitHub\your-repo
```

### Step 9: Configure .gitignore

Ensure all repositories have the correct .gitignore entries. The bootstrap scripts do this automatically, but verify:

```powershell
cd ~\Documents\GitHub\your-repo

# Check if AGENT*.md is in .gitignore
if (-not (Select-String -Path .gitignore -Pattern "AGENT\*\.md" -Quiet)) {
    Add-Content .gitignore "AGENT*.md"
}
if (-not (Select-String -Path .gitignore -Pattern "\.agentsmd" -Quiet)) {
    Add-Content .gitignore ".agentsmd"
}
if (-not (Select-String -Path .gitignore -Pattern "/docs/" -Quiet)) {
    Add-Content .gitignore "/docs/"
}
```

### Step 10: Validation

Run the validation script:

```powershell
powershell -ExecutionPolicy Bypass -File ~\Documents\GitHub\my-opencode-conf\scripts\validate_setup.ps1
```

## Daily Workflow

### Automatic Maintenance

The setup includes automatic maintenance that runs on each conversation start:

1. **Config Review**: Reviews `AGENTS.md` and `AGENT_NOTES_GLOBAL.md`
2. **Daily Sync**: If date changed, pulls latest from `my-opencode-conf` and `agents-config`
3. **State Update**: Updates `last_config_sync_date`, `last_global_config_review_date`, `last_global_config_review_repo`

### Manual Sync

To manually sync configurations:

```powershell
# Pull latest opencode config
cd ~\Documents\GitHub\my-opencode-conf
git pull --ff-only

# Pull latest base config
cd ~\Documents\GitHub\agents-config
git pull --ff-only

# Update sync date
$TODAY = Get-Date -Format "yyyy-MM-dd"
(Get-Content ~\Documents\GitHub\AGENT_NOTES_GLOBAL.md) `
    -replace 'last_config_sync_date: .*', "last_config_sync_date: $TODAY" `
    | Set-Content ~\Documents\GitHub\AGENT_NOTES_GLOBAL.md

# Sync tool configurations
powershell -ExecutionPolicy Bypass -File ~\Documents\GitHub\setup-opencode-agent-standards.ps1
```

## MCP Server Management

### Adding a New MCP Server

1. Edit `~\.config\opencode\mcp.json`:

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

```powershell
Get-Content ~\.config\opencode\mcp.json | ConvertFrom-Json | Out-Null
Write-Host "✅ Valid JSON"
```

3. Restart opencode agent to pick up changes

### Testing MCP Servers

```powershell
# List available MCP tools
opencode mcp list

# Test a specific tool
opencode mcp call filesystem list_directory '{"path": "~\"}'
```

## Troubleshooting

### MCP Server Not Found

```powershell
# Verify MCP config exists
Test-Path ~\.config\opencode\mcp.json

# Validate JSON
Get-Content ~\.config\opencode\mcp.json | ConvertFrom-Json

# Check server command exists
Get-Command <command-name>
```

### Obsidian Context Not Working

```powershell
# Verify Obsidian CLI
Get-Command obsidian

# Check vault accessibility
obsidian list

# Test query
obsidian search "your query"
```

### Global Config Not Applying

```powershell
# Verify AGENTS.md exists
Test-Path ~\Documents\GitHub\AGENTS.md

# Check tool files
Test-Path ~\.codex\AGENTS.md
Test-Path ~\.claude\CLAUDE.md
Test-Path ~\.gemini\AGENTS.md

# Re-run setup
powershell -ExecutionPolicy Bypass -File ~\Documents\GitHub\setup-opencode-agent-standards.ps1
```

## PowerShell Execution Policy

If you encounter execution policy errors, you can temporarily bypass:

```powershell
powershell -ExecutionPolicy Bypass -File .\script.ps1
```

Or set for current user (less secure):

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Updates

Track changes in this setup:

- **2026-02-16**: Initial opencode-specific configuration setup for Windows

## References

- Base configuration: https://github.com/khizarahmedb/agents-config
- Opencode CLI: https://github.com/opencode-ai/opencode
- MCP Documentation: https://modelcontextprotocol.io/
