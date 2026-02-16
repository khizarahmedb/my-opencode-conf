# validate_setup.ps1 - Validate opencode agent configuration consistency (Windows)
# Usage: powershell -ExecutionPolicy Bypass -File .\validate_setup.ps1

$WorkspaceRoot = if ($env:WORKSPACE_ROOT) { $env:WORKSPACE_ROOT } else { "$HOME\Documents\GitHub" }
$Errors = 0

Write-Host "🔍 Validating opencode agent setup..." -ForegroundColor Cyan
Write-Host "   Workspace: $WorkspaceRoot" -ForegroundColor Gray
Write-Host ""

# Check global AGENTS.md
Write-Host "📋 Checking global configuration..." -ForegroundColor Yellow
$GlobalAgents = Join-Path $WorkspaceRoot "AGENTS.md"
if (Test-Path $GlobalAgents) {
    Write-Host "   ✅ Global AGENTS.md exists" -ForegroundColor Green
} else {
    Write-Host "   ❌ Global AGENTS.md missing at $GlobalAgents" -ForegroundColor Red
    $Errors++
}

# Check global AGENT_NOTES_GLOBAL.md
$GlobalNotes = Join-Path $WorkspaceRoot "AGENT_NOTES_GLOBAL.md"
if (Test-Path $GlobalNotes) {
    Write-Host "   ✅ Global AGENT_NOTES_GLOBAL.md exists" -ForegroundColor Green
} else {
    Write-Host "   ❌ Global AGENT_NOTES_GLOBAL.md missing" -ForegroundColor Red
    $Errors++
}

# Check MCP configuration
Write-Host ""
Write-Host "📋 Checking MCP configuration..." -ForegroundColor Yellow
$McpConfig = "$HOME\.config\opencode\mcp.json"
if (Test-Path $McpConfig) {
    Write-Host "   ✅ MCP config exists" -ForegroundColor Green
    try {
        Get-Content $McpConfig | ConvertFrom-Json | Out-Null
        Write-Host "   ✅ MCP config is valid JSON" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ MCP config has invalid JSON" -ForegroundColor Red
        $Errors++
    }
} else {
    Write-Host "   ⚠️  MCP config not found at $McpConfig (optional but recommended)" -ForegroundColor Yellow
}

# Check cross-tool compatibility
Write-Host ""
Write-Host "📋 Checking cross-tool compatibility..." -ForegroundColor Yellow

$CodexLink = "$HOME\.codex\AGENTS.md"
if (Test-Path $CodexLink) {
    Write-Host "   ✅ Codex file exists" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Codex file missing (run setup-opencode-agent-standards.ps1)" -ForegroundColor Yellow
}

$ClaudeLink = "$HOME\.claude\CLAUDE.md"
if (Test-Path $ClaudeLink) {
    Write-Host "   ✅ Claude Code file exists" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Claude Code file missing" -ForegroundColor Yellow
}

$GeminiLink = "$HOME\.gemini\AGENTS.md"
if (Test-Path $GeminiLink) {
    Write-Host "   ✅ Gemini CLI file exists" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Gemini CLI file missing" -ForegroundColor Yellow
}

# Check my-opencode-conf repository
Write-Host ""
Write-Host "📋 Checking configuration repositories..." -ForegroundColor Yellow
$OpenConfRepo = Join-Path $WorkspaceRoot "my-opencode-conf"
if (Test-Path $OpenConfRepo) {
    Write-Host "   ✅ my-opencode-conf repository exists" -ForegroundColor Green
    Push-Location $OpenConfRepo
    if (Test-Path ".git") {
        Write-Host "   ✅ my-opencode-conf is a git repository" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  my-opencode-conf is not a git repository" -ForegroundColor Yellow
    }
    Pop-Location
} else {
    Write-Host "   ❌ my-opencode-conf repository missing" -ForegroundColor Red
    $Errors++
}

# Check base agents-config repository
$BaseConfigRepo = Join-Path $WorkspaceRoot "agents-config"
if (Test-Path $BaseConfigRepo) {
    Write-Host "   ✅ agents-config repository exists" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  agents-config repository missing (base configuration)" -ForegroundColor Yellow
}

# Sample repository checks
Write-Host ""
Write-Host "📋 Checking sample repositories..." -ForegroundColor Yellow
$RepoCount = 0
$Repos = Get-ChildItem $WorkspaceRoot -Directory
foreach ($Repo in $Repos) {
    $GitDir = Join-Path $Repo.FullName ".git"
    if (Test-Path $GitDir) {
        $RepoName = $Repo.Name
        if ($RepoName -eq "my-opencode-conf" -or $RepoName -eq "agents-config") {
            continue
        }
        
        $RepoCount++
        
        # Check .gitignore
        $Gitignore = Join-Path $Repo.FullName ".gitignore"
        if (Test-Path $Gitignore) {
            $Content = Get-Content $Gitignore -Raw -ErrorAction SilentlyContinue
            if ($Content -match "AGENT\*\.md") {
                Write-Host "   ✅ $RepoName`: .gitignore configured" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️  $RepoName`: .gitignore missing AGENT*.md" -ForegroundColor Yellow
            }
        } else {
            Write-Host "   ⚠️  $RepoName`: .gitignore missing" -ForegroundColor Yellow
        }
        
        # Check AGENTS.md
        $AgentsMd = Join-Path $Repo.FullName "AGENTS.md"
        if (Test-Path $AgentsMd) {
            Write-Host "   ✅ $RepoName`: AGENTS.md exists" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  $RepoName`: AGENTS.md missing" -ForegroundColor Yellow
        }
        
        # Check AGENT_NOTES.md
        $AgentNotes = Join-Path $Repo.FullName "AGENT_NOTES.md"
        if (Test-Path $AgentNotes) {
            Write-Host "   ✅ $RepoName`: AGENT_NOTES.md exists" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  $RepoName`: AGENT_NOTES.md missing" -ForegroundColor Yellow
        }
    }
}

if ($RepoCount -eq 0) {
    Write-Host "   ℹ️  No repositories found in workspace (except config repos)" -ForegroundColor Gray
}

# Summary
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
if ($Errors -eq 0) {
    Write-Host "✅ Validation complete: No critical errors found" -ForegroundColor Green
    Write-Host ""
    Write-Host "💡 Tips:" -ForegroundColor Yellow
    Write-Host "   - Run setup_opencode_agent.ps1 for new repositories"
    Write-Host "   - Keep configurations in sync with daily pulls"
    Write-Host "   - Update AGENT_NOTES.md with repository-specific preferences"
} else {
    Write-Host "❌ Validation complete: $Errors critical error(s) found" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 To fix:" -ForegroundColor Yellow
    Write-Host "   1. Ensure global files exist (AGENTS.md, AGENT_NOTES_GLOBAL.md)"
    Write-Host "   2. Clone my-opencode-conf repository"
    Write-Host "   3. Run setup-opencode-agent-standards.ps1 for cross-tool setup"
    exit 1
}
