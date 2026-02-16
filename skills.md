# Skills Index

This repository includes reusable workflows and skills for opencode agent configuration.

## Available Skills

### `setup-opencode-env`
**When to use**: Initial setup of opencode agent environment on a new machine or fresh install.
**What it does**: 
- Installs global AGENTS.md and AGENT_NOTES_GLOBAL.md
- Configures MCP servers (Obsidian, filesystem, etc.)
- Sets up cross-tool compatibility (symlinks for Codex, Claude, Gemini)
- Validates configuration completeness

### `bootstrap-repo`
**When to use**: Creating AGENTS.md and AGENT_NOTES.md in a new repository.
**What it does**:
- Copies repo templates from `templates/repo/`
- Configures .gitignore for local agent files
- Untracks existing agent files if they were previously tracked
- Applies repository-specific customizations based on project type

### `validate-config`
**When to use**: Verifying configuration consistency across workspace.
**What it does**:
- Checks all required files exist (AGENTS.md, AGENT_NOTES_GLOBAL.md)
- Validates MCP configuration JSON syntax
- Ensures .gitignore properly excludes local files
- Reports missing or inconsistent configurations

### `sync-configs`
**When to use**: Daily maintenance or when updating from canonical repositories.
**What it does**:
- Pulls latest from my-opencode-conf (this repo)
- Pulls latest from agents-config (base config)
- Updates `last_config_sync_date` in global notes
- Applies any new templates or scripts

### `mcp-server-setup`
**When to use**: Adding or modifying MCP server configurations.
**What it does**:
- Updates ~/.config/opencode/mcp.json
- Validates MCP server connectivity
- Documents required environment variables
- Tests MCP tool availability

## Usage

To use a skill, reference it in your AGENTS.md or explicitly ask the agent:

```
"Run the bootstrap-repo skill for this new React project"
```

Or include in repository AGENTS.md:

```markdown
## Skills
- Use `bootstrap-repo` when creating new repositories
- Use `validate-config` before committing configuration changes
```
