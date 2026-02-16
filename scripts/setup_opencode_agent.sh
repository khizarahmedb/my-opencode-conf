#!/bin/bash
# setup_opencode_agent.sh - Bootstrap opencode agent configuration for a repository
# Usage: bash setup_opencode_agent.sh --workspace-root /path/to/workspace --repo-root /path/to/repo

set -e

WORKSPACE_ROOT=""
REPO_ROOT=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --workspace-root)
            WORKSPACE_ROOT="$2"
            shift 2
            ;;
        --repo-root)
            REPO_ROOT="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

if [ -z "$WORKSPACE_ROOT" ] || [ -z "$REPO_ROOT" ]; then
    echo "Usage: bash setup_opencode_agent.sh --workspace-root /path/to/workspace --repo-root /path/to/repo"
    exit 1
fi

# Ensure repo exists
if [ ! -d "$REPO_ROOT" ]; then
    echo "❌ Repository not found: $REPO_ROOT"
    exit 1
fi

# Determine relative path from workspace
cd "$WORKSPACE_ROOT"
RELATIVE_REPO=$(realpath --relative-to="$WORKSPACE_ROOT" "$REPO_ROOT" 2>/dev/null || echo "$REPO_ROOT")

echo "🔧 Setting up opencode agent configuration for: $RELATIVE_REPO"

# Source templates from my-opencode-conf
TEMPLATE_DIR="$WORKSPACE_ROOT/my-opencode-conf/templates"
if [ ! -d "$TEMPLATE_DIR" ]; then
    echo "⚠️  my-opencode-conf templates not found, using base agents-config"
    TEMPLATE_DIR="$WORKSPACE_ROOT/agents-config/templates"
fi

# Create/update .gitignore
echo "📝 Configuring .gitignore..."
GITIGNORE="$REPO_ROOT/.gitignore"

ensure_in_gitignore() {
    local pattern="$1"
    local file="$2"
    if ! grep -q "^${pattern}$" "$file" 2>/dev/null; then
        echo "$pattern" >> "$file"
        echo "   Added: $pattern"
    fi
}

if [ ! -f "$GITIGNORE" ]; then
    touch "$GITIGNORE"
fi

ensure_in_gitignore "AGENT*.md" "$GITIGNORE"
ensure_in_gitignore ".agentsmd" "$GITIGNORE"
ensure_in_gitignore "/docs/" "$GITIGNORE"

# Untrack already-tracked agent files if they exist
echo "🧹 Untracking local agent files (keeping local copies)..."
cd "$REPO_ROOT"
if git rev-parse --git-dir > /dev/null 2>&1; then
    git ls-files -z -- 'AGENT*.md' '.agentsmd' 2>/dev/null | \
        xargs -0 -r git rm --cached --ignore-unmatch 2>/dev/null || true
fi

# Create AGENTS.md if missing
echo "📄 Checking AGENTS.md..."
AGENTS_FILE="$REPO_ROOT/AGENTS.md"
if [ ! -f "$AGENTS_FILE" ]; then
    cp "$TEMPLATE_DIR/repo/AGENTS.md.template" "$AGENTS_FILE"
    echo "   Created: AGENTS.md"
else
    echo "   Preserved: AGENTS.md (already exists)"
fi

# Create AGENT_NOTES.md if missing
echo "📄 Checking AGENT_NOTES.md..."
NOTES_FILE="$REPO_ROOT/AGENT_NOTES.md"
if [ ! -f "$NOTES_FILE" ]; then
    cp "$TEMPLATE_DIR/repo/AGENT_NOTES.md.template" "$NOTES_FILE"
    echo "   Created: AGENT_NOTES.md"
else
    echo "   Preserved: AGENT_NOTES.md (already exists)"
fi

# Create skills.md if missing (optional)
echo "📄 Checking skills.md..."
SKILLS_FILE="$REPO_ROOT/skills.md"
if [ ! -f "$SKILLS_FILE" ]; then
    cat > "$SKILLS_FILE" << 'EOF'
# Skills Index

- <skill name>: <when to use>
- <skill name>: <when to use>
EOF
    echo "   Created: skills.md (optional)"
else
    echo "   Preserved: skills.md (already exists)"
fi

echo ""
echo "✅ Opencode agent setup complete for: $RELATIVE_REPO"
echo ""
echo "📋 Summary:"
echo "   - .gitignore configured for local agent files"
echo "   - AGENTS.md created/preserved"
echo "   - AGENT_NOTES.md created/preserved"
echo "   - skills.md created/preserved"
echo ""
echo "🚀 Next steps:"
echo "   1. Review and customize AGENTS.md for this repository"
echo "   2. Add repository-specific notes to AGENT_NOTES.md"
echo "   3. Define reusable skills in skills.md (optional)"
echo "   4. Commit changes: git add .gitignore && git commit -m 'Configure agent files'"
