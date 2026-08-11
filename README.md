# harmonica-chat

Design and manage [Harmonica](https://harmonica.chat) deliberation sessions from your coding agent. Guided session design, template matching across the live platform library, full lifecycle commands (check, summary, edit, review, follow-up), and post-session facilitation-quality analysis.

[Harmonica](https://app.harmonica.chat) is a structured-conversations platform where groups align via AI-facilitated async conversations. You create a session with a topic and goal, share a link with participants, and each person has a private 1:1 chat with an AI facilitator. Responses are then synthesized into actionable insights. [Learn more](https://help.harmonica.chat).

Unlike a one-shot session creator, harmonica-chat is a guided designer — it walks you through template selection, goal refinement, and context calibration, then handles the full lifecycle from creation through follow-up.

## Works with

- **[Claude Code](https://claude.ai/code)** — fully supported today, via `~/.claude/skills/harmonica-chat/`. Quick install below.
- Cursor, Codex, Grok Build, OpenCode, Pi agent, … — the skill is plain Markdown using the [Agent Skills](https://agentskills.io) format. Manual install (copy `SKILL.md` + `reference/` to the agent's skills directory) should work. OpenCode-specific MCP mapping is documented in [`reference/opencode.md`](reference/opencode.md); first-class installers for other harnesses are tracked in [HAR-1231](https://linear.app/harmonica-pro/issue/HAR-1231).

## Prerequisites

- A Harmonica account — [sign up free](https://app.harmonica.chat) if you don't have one.
- An API key — generate at [Profile > API Keys](https://app.harmonica.chat/profile). You'll get a `hm_live_...` value.
- [Node.js](https://nodejs.org) ≥18 on PATH (needed to run [harmonica-mcp](https://github.com/harmonicabot/harmonica-mcp) via npx).
- [Claude Code](https://claude.ai/code) on PATH (for the v3.1 installer; manual install works without it).

## Installation

### Quick install — bash (macOS / Linux / Git Bash on Windows)

```bash
HARMONICA_API_KEY=hm_live_... bash <(curl -fsSL https://raw.githubusercontent.com/harmonicabot/harmonica-chat/master/install.sh)
```

### Quick install — PowerShell (Windows)

```powershell
$env:HARMONICA_API_KEY = 'hm_live_...'
irm https://raw.githubusercontent.com/harmonicabot/harmonica-chat/master/install.ps1 | iex
```

### What the installer does

1. Verifies `HARMONICA_API_KEY` is set, `claude` CLI is on PATH, `node` is available.
2. Configures the `harmonica` MCP server in Claude Code (`claude mcp add-json harmonica … -s user`) with your key — idempotent; skips if already configured.
3. Installs `SKILL.md` + 11 `reference/*.md` files to `~/.claude/skills/harmonica-chat/`.
4. Pre-approves the 6 read-only `mcp__harmonica__*` tools (`list_sessions`, `search_sessions`, `get_session`, `get_responses`, `get_summary`, `list_telegram_groups`) by adding them to `~/.claude/settings.json` `permissions.allow` — fewer prompts during use; mutations (`create_session`, `update_session`) still require confirmation.
5. Removes the legacy v2.x slash-command install at `~/.claude/commands/harmonica-chat.md` if present.
6. Verifies the MCP is registered.

Then restart Claude Code and you're done — invoke `/harmonica-chat`, or just describe what you want to facilitate.

### OpenCode installation

OpenCode can use the shared skill files directly. Copy `SKILL.md`, `reference/`, and
`reference/opencode.md` into the OpenCode skills directory, configure the `harmonica-mcp` server in
OpenCode's MCP settings with `npx -y harmonica-mcp`, and reload the MCP connection. The skill uses
`tools.harmonica.<operation>` for Harmonica calls.

### Manual installation

If you can't run the script or are installing for a non-Claude-Code agent:

1. Configure the MCP server:
   ```bash
   claude mcp add-json harmonica '{"command":"npx","args":["-y","harmonica-mcp"],"env":{"HARMONICA_API_KEY":"hm_live_..."}}' -s user
   ```
   (or the equivalent for your agent — see its docs for MCP configuration.)
2. Copy `SKILL.md` and the `reference/` directory to your agent's skills location (Claude Code: `~/.claude/skills/harmonica-chat/`).
3. Restart your agent.

### Updating from v2.x

v3.0.0 moved the install path from `~/.claude/commands/harmonica-chat.md` to `~/.claude/skills/harmonica-chat/SKILL.md + reference/`. The v3.1+ installer removes the legacy file automatically. Re-run the quick-install command.

### Updating (v3.0.0+)

The skill checks for updates on each run and suggests updating if a newer version is available. You can also update manually with the same quick-install command.

### Why pre-approve read-only MCP tools?

By default Claude Code prompts before running any MCP tool. For harmonica-chat that means a prompt every time it lists or fetches a session — fast to dismiss but death by paper cuts during a `check` / `summary` / `review` flow. The installer pre-approves the 6 read-only tools so you only get prompted for mutations (creating, updating, sending chat messages). To opt out: remove the entries from `~/.claude/settings.json` `permissions.allow` after install.

## Usage

Invoke as `/harmonica-chat` (the skill is exposed as a slash command). The entry router parses your input and loads the matching subcommand reference on demand.

### Guided session design

```
/harmonica-chat
```

Walks you through the full design flow: intent, template matching, topic, goal, context, critical question, cross-pollination, results visibility, and confirmation. Each question asked one at a time.

### Accelerated creation

```
/harmonica-chat "Q1 retrospective"
```

Topic upfront skips the intent / topic questions. Template suggestion + faster confirm flow.

### Project-aware creation

```
/harmonica-chat "retro on the API redesign" --project harmonica-web-app
```

Reads the project's CLAUDE.md and recent git history to auto-generate session context. Suggests a session type based on recent activity patterns.

### Session lifecycle

```
/harmonica-chat status                    # List your recent sessions
/harmonica-chat check "Q1 retro"          # Check participant progress and themes
/harmonica-chat summary "Q1 retro"        # Get the AI-generated synthesis
/harmonica-chat edit "Q1 retro"           # Update topic / goal / context / prompt
/harmonica-chat review "Q1 retro"         # Analyze transcripts + propose prompt fixes
/harmonica-chat follow-up "Q1 retro"      # Design a follow-up session
```

## Architecture

v3.0.0 splits the skill into a thin entry router (`SKILL.md`, ~120 lines) plus 11 subcommand reference files in `reference/` that load on demand. The router parses your input, decides which reference to load, and follows that reference's instructions.

```
harmonica-chat/
├── SKILL.md                  Entry router: prerequisites, design laws, routing, commands menu
└── reference/
    ├── design.md             Guided session design (14 steps)
    ├── accelerated.md        Topic-upfront flow + project-aware creation
    ├── status.md             List recent sessions
    ├── check.md              Thematic preview of responses
    ├── summary.md            AI-generated synthesis
    ├── edit.md               Update session metadata
    ├── review.md             Facilitation quality analysis + prompt fixes
    ├── follow-up.md          Design a next-step session
    ├── invitation.md         Post-creation invitation flow
    └── expertise.md          Soft-nudge session design heuristics
```

Templates are NOT hardcoded — fetched at runtime via `mcp__harmonica__list_templates` (harmonica-mcp ≥ 0.11.0). The Harmonica admin panel is the single source of truth.

This keeps context lean — the router loads when you invoke the skill, references load only when you use the matching subcommand. Inspired by [pbakaus/impeccable](https://github.com/pbakaus/impeccable)'s architecture.

## Features

- **Guided session design** with template matching against the live Harmonica template library (fetched at runtime via `list_templates`; whatever the platform admin panel publishes is what you'll see)
- **Session design expertise** — goal quality nudges, context calibration, cross-pollination recommendations, constraint discovery
- **Project-aware context** — reads CLAUDE.md and git history to auto-fill session context
- **Full session lifecycle** — status, check, summary, edit, review, follow-up
- **Facilitation quality review** — analyzes transcripts across 5 dimensions, proposes specific prompt fixes with literal-quote citations (v2.11.0+)
- **Telegram distribution** — sessions can be announced to Telegram groups via the Harmonica bot
- **Pre-session questions** — configure what participants answer before the conversation; defaults are smart per distribution channel
- **Invitation drafting** with tone adapted to template type, plus integration with communication tools (Zapier, Slack) when available
- **Community participation feed** integration for publishing sessions to community dashboards

## See Also

- **[harmonica-mcp](https://github.com/harmonicabot/harmonica-mcp)** — MCP server for full API access to Harmonica sessions
- **[Harmonica docs](https://help.harmonica.chat)** — Platform documentation
- **[Harmonica](https://harmonica.chat)** — Main website

## License

MIT
