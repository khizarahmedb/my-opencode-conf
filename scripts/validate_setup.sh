#!/bin/bash
# validate_setup.sh - Validate opencode agent configuration consistency
# Usage: bash validate_setup.sh

set -e

WORKSPACE_ROOT="${WORKSPACE_ROOT:-$HOME/Documents/GitHub}"
ERRORS=0

echo "🔍 Validating opencode agent setup..."
echo "   Workspace: $WORKSPACE_ROOT"
echo ""

# Check global AGENTS.md
echo "📋 Checking global configuration..."
if [ -f "$WORKSPACE_ROOT/AGENTS.md" ]; then
    echo "   ✅ Global AGENTS.md exists"
else
    echo "   ❌ Global AGENTS.md missing at $WORKSPACE_ROOT/AGENTS.md"
    ((ERRORS++))
fi

# Check global AGENT_NOTES_GLOBAL.md
if [ -f "$WORKSPACE_ROOT/AGENT_NOTES_GLOBAL.md" ]; then
    echo "   ✅ Global AGENT_NOTES_GLOBAL.md exists"
else
    echo "   ❌ Global AGENT_NOTES_GLOBAL.md missing"
    ((ERRORS++))
fi

# Check MCP configuration
echo ""
echo "📋 Checking MCP configuration..."
if [ -f "$HOME/.config/opencode/mcp.json" ]; then
    echo "   ✅ MCP config exists"
    if python3 -m json.tool "$HOME/.config/opencode/mcp.json" > /dev/null 2>&1; then
        echo "   ✅ MCP config is valid JSON"
    else
        echo "   ❌ MCP config has invalid JSON"
        ((ERRORS++))
    fi
else
    echo "   ⚠️  MCP config not found at ~/.config/opencode/mcp.json (optional but recommended)"
fi

# Check cross-tool symlinks
echo ""
echo "📋 Checking cross-tool compatibility..."

if [ -L "$HOME/.codex/AGENTS.md" ]; then
    echo "   ✅ Codex symlink exists"
else
    echo "   ⚠️  Codex symlink missing (run setup-opencode-agent-standards.sh)"
fi

if [ -L "$HOME/.claude/CLAUDE.md" ]; then
    echo "   ✅ Claude Code symlink exists"
else
    echo "   ⚠️  Claude Code symlink missing"
fi

if [ -L "$HOME/.gemini/AGENTS.md" ]; then
    echo "   ✅ Gemini CLI symlink exists"
else
    echo "   ⚠️  Gemini CLI symlink missing"
fi

# Check my-opencode-conf repository
echo ""
echo "📋 Checking configuration repositories..."
if [ -d "$WORKSPACE_ROOT/my-opencode-conf" ]; then
    echo "   ✅ my-opencode-conf repository exists"
    cd "$WORKSPACE_ROOT/my-opencode-conf"
    if git rev-parse --git-dir > /dev/null 2>&1; then
        echo "   ✅ my-opencode-conf is a git repository"
    else
        echo "   ⚠️  my-opencode-conf is not a git repository"
    fi
else
    echo "   ❌ my-opencode-conf repository missing"
    ((ERRORS++))
fi

# Check base agents-config repository
if [ -d "$WORKSPACE_ROOT/agents-config" ]; then
    echo "   ✅ agents-config repository exists"
else
    echo "   ⚠️  agents-config repository missing (base configuration)"
fi

# Sample repository checks
echo ""
echo "📋 Checking sample repositories..."
REPO_COUNT=0
for repo in "$WORKSPACE_ROOT"/*/; do
    if [ -d "$repo/.git" ]; then
        REPO_NAME=$(basename "$repo")
        if [ "$REPO_NAME" = "my-opencode-conf" ] || [ "$REPO_NAME" = "agents-config" ]; then
            continue
        fi
        
        ((REPO_COUNT++))
        
        # Check .gitignore
        if [ -f "$repo/.gitignore" ]; then
            if grep -q "AGENT\*.md" "$repo/.gitignore" 2>/dev/null; then
                echo "   ✅ $REPO_NAME: .gitignore configured"
            else
                echo "   ⚠️  $REPO_NAME: .gitignore missing AGENT*.md"
            fi
        else
            echo "   ⚠️  $REPO_NAME: .gitignore missing"
        fi
        
        # Check AGENTS.md
        if [ -f "$repo/AGENTS.md" ]; then
            echo "   ✅ $REPO_NAME: AGENTS.md exists"
        else
            echo "   ⚠️  $REPO_NAME: AGENTS.md missing"
        fi
        
        # Check AGENT_NOTES.md
        if [ -f "$repo/AGENT_NOTES.md" ]; then
            echo "   ✅ $REPO_NAME: AGENT_NOTES.md exists"
        else
            echo "   ⚠️  $REPO_NAME: AGENT_NOTES.md missing"
        fi
    fi
done

if [ $REPO_COUNT -eq 0 ]; then
    echo "   ℹ️  No repositories found in workspace (except config repos)"
fi

# Summary
echo ""
echo "═══════════════════════════════════════════════════════"
if [ $ERRORS -eq 0 ]; then
    echo "✅ Validation complete: No critical errors found"
    echo ""
    echo "💡 Tips:"
    echo "   - Run setup_opencode_agent.sh for new repositories"
    echo "   - Keep configurations in sync with daily pulls"
    echo "   - Update AGENT_NOTES.md with repository-specific preferences"
else
    echo "❌ Validation complete: $ERRORS critical error(s) found"
    echo ""
    echo "🔧 To fix:"
    echo "   1. Ensure global files exist (AGENTS.md, AGENT_NOTES_GLOBAL.md)"
    echo "   2. Clone my-opencode-conf repository"
    echo "   3. Run setup-opencode-agent-standards.sh for cross-tool setup"
    exit 1
fi
