# setup_opencode_agent.ps1 - Bootstrap opencode agent configuration for a repository (Windows)
# Usage: powershell -ExecutionPolicy Bypass -File .\setup_opencode_agent.ps1 -WorkspaceRoot C:\path\to\workspace -RepoRoot C:\path\to\repo

param(
    [Parameter(Mandatory=$true)]
    [string]$WorkspaceRoot,
    
    [Parameter(Mandatory=$true)]
    [string]$RepoRoot
)

# Ensure paths are absolute
$WorkspaceRoot = Resolve-Path $WorkspaceRoot
$RepoRoot = Resolve-Path $RepoRoot

if (-not (Test-Path $RepoRoot)) {
    Write-Host "❌ Repository not found: $RepoRoot" -ForegroundColor Red
    exit 1
}

$RelativeRepo = $RepoRoot.Substring($WorkspaceRoot.Length).TrimStart('\', '/')
if ([string]::IsNullOrEmpty($RelativeRepo)) {
    $RelativeRepo = Split-Path $RepoRoot -Leaf
}

Write-Host "🔧 Setting up opencode agent configuration for: $RelativeRepo" -ForegroundColor Cyan

# Source templates from my-opencode-conf
$TemplateDir = Join-Path $WorkspaceRoot "my-opencode-conf\templates"
if (-not (Test-Path $TemplateDir)) {
    Write-Host "⚠️  my-opencode-conf templates not found, using base agents-config" -ForegroundColor Yellow
    $TemplateDir = Join-Path $WorkspaceRoot "agents-config\templates"
}

# Create/update .gitignore
Write-Host "📝 Configuring .gitignore..." -ForegroundColor Yellow
$Gitignore = Join-Path $RepoRoot ".gitignore"

function Ensure-InGitignore {
    param($Pattern, $File)
    if (-not (Test-Path $File)) {
        New-Item $File -ItemType File -Force | Out-Null
    }
    $Content = Get-Content $File -Raw -ErrorAction SilentlyContinue
    if ($Content -notmatch [regex]::Escape($Pattern)) {
        Add-Content $File $Pattern
        Write-Host "   Added: $Pattern" -ForegroundColor Gray
    }
}

Ensure-InGitignore "AGENT*.md" $Gitignore
Ensure-InGitignore ".agentsmd" $Gitignore
Ensure-InGitignore "/docs/" $Gitignore

# Untrack already-tracked agent files
Write-Host "🧹 Untracking local agent files (keeping local copies)..." -ForegroundColor Yellow
Push-Location $RepoRoot
if (Test-Path ".git") {
    $TrackedFiles = git ls-files 'AGENT*.md' '.agentsmd' 2>$null
    if ($TrackedFiles) {
        git rm --cached $TrackedFiles 2>$null | Out-Null
        Write-Host "   Untracked: $TrackedFiles" -ForegroundColor Gray
    }
}
Pop-Location

# Create AGENTS.md if missing
Write-Host "📄 Checking AGENTS.md..." -ForegroundColor Yellow
$AgentsFile = Join-Path $RepoRoot "AGENTS.md"
if (-not (Test-Path $AgentsFile)) {
    Copy-Item (Join-Path $TemplateDir "repo\AGENTS.md.template") $AgentsFile
    Write-Host "   Created: AGENTS.md" -ForegroundColor Green
} else {
    Write-Host "   Preserved: AGENTS.md (already exists)" -ForegroundColor Gray
}

# Create AGENT_NOTES.md if missing
Write-Host "📄 Checking AGENT_NOTES.md..." -ForegroundColor Yellow
$NotesFile = Join-Path $RepoRoot "AGENT_NOTES.md"
if (-not (Test-Path $NotesFile)) {
    Copy-Item (Join-Path $TemplateDir "repo\AGENT_NOTES.md.template") $NotesFile
    Write-Host "   Created: AGENT_NOTES.md" -ForegroundColor Green
} else {
    Write-Host "   Preserved: AGENT_NOTES.md (already exists)" -ForegroundColor Gray
}

# Create skills.md if missing
Write-Host "📄 Checking skills.md..." -ForegroundColor Yellow
$SkillsFile = Join-Path $RepoRoot "skills.md"
if (-not (Test-Path $SkillsFile)) {
    @"
# Skills Index

- <skill name>: <when to use>
- <skill name>: <when to use>
"@ | Set-Content $SkillsFile -Encoding UTF8
    Write-Host "   Created: skills.md (optional)" -ForegroundColor Green
} else {
    Write-Host "   Preserved: skills.md (already exists)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✅ Opencode agent setup complete for: $RelativeRepo" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Summary:" -ForegroundColor Cyan
Write-Host "   - .gitignore configured for local agent files"
Write-Host "   - AGENTS.md created/preserved"
Write-Host "   - AGENT_NOTES.md created/preserved"
Write-Host "   - skills.md created/preserved"
Write-Host ""
Write-Host "🚀 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Review and customize AGENTS.md for this repository"
Write-Host "   2. Add repository-specific notes to AGENT_NOTES.md"
Write-Host "   3. Define reusable skills in skills.md (optional)"
Write-Host "   4. Commit changes: git add .gitignore && git commit -m 'Configure agent files'"
