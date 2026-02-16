# Repo Agent Instructions

1. At the start of every conversation in this repository, read `AGENT_NOTES.md` before proposing or writing changes.
2. This repository contains opencode-specific agent configurations; treat it as the canonical reference for opencode agent setups.
3. On the first conversation of each new local date, pull latest changes from `https://github.com/khizarahmedb/my-opencode-conf` before applying setup guidance.
4. Record daily refresh using `last_config_sync_date` in the global notes file used by the local environment.
5. If `AGENTS.override.md` and `AGENTS.md` both exist in a directory, `AGENTS.override.md` takes precedence.
6. Prefer nearest-local instructions over broader instructions.
7. Keep instruction payloads compact; for large documentation, use index + retrieval instead of full inline docs.
8. If `skills.md` exists in a target repository, review it and use applicable workflows.
9. When repo-level notes are insufficient, consult `/Users/khizar/Documents/GitHub/AGENT_NOTES_GLOBAL.md`.
10. Do not copy global notes into local notes unless explicitly requested; reference them instead.
11. Only the owner updates canonical remote instructions; all other agents consume and follow them.
12. For opencode-specific features (MCP, custom tools), prefer opencode's native capabilities over generic workarounds.
13. When setting up new repositories, run the bootstrap scripts from `scripts/` directory rather than manual file creation when possible.

## Review Guidelines

Use these for GitHub PR reviews:
- Prioritize correctness, security, and regression risk over style-only feedback.
- Keep each finding actionable with concrete impact and minimal noise.
- Require tests (or explicit risk notes) for behavior changes.
- Keep comments concise and line-specific.
- For opencode-specific integrations, verify MCP configurations are valid JSON.

## Opencode-Specific Guidance

### MCP Server Management
- MCP configurations belong in `~/.config/opencode/mcp.json`
- Validate JSON syntax before suggesting MCP changes
- Prefer stdio-based MCP servers for local tools
- Document required environment variables or paths in setup instructions

### Context Retrieval
- Default to Obsidian-first hybrid mode for context retrieval
- Use `obsidian_fast_context.sh` when available (from agents-config)
- Fall back to file glob/grep patterns when Obsidian unavailable
- Maintain fast startup: avoid blocking operations during initialization

### Tool Compatibility
This repository's configurations target multiple tools:
- **opencode** (primary): Full MCP support, native integrations
- **Codex**: AGENTS.md compatibility, standard markdown
- **Claude Code**: Symlink-based configuration sharing
- **Gemini CLI**: Settings.json integration

When creating configurations, ensure cross-tool compatibility or document tool-specific requirements.
