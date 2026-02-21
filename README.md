# harmonica-chat

A conversational [Harmonica](https://harmonica.chat) companion for [Claude Code](https://claude.ai/code) that helps you design, create, and manage deliberation sessions.

[Harmonica](https://harmonica.chat) is a structured deliberation platform where groups coordinate through AI-facilitated async conversations. You create a session with a topic and goal, share a link with participants, and each person has a private 1:1 conversation with an AI facilitator. Responses are then synthesized into actionable insights. [Learn more](https://docs.harmonica.chat).

Unlike a simple session creator, harmonica-chat is a guided session designer. It walks you through template selection, goal refinement, and context calibration — then handles the full session lifecycle from creation through follow-up.

## Prerequisites

harmonica-chat requires the [harmonica-mcp](https://github.com/harmonicabot/harmonica-mcp) server to be installed. If it's not set up, the command will guide you through installation automatically.

To install manually:

1. **Get a Harmonica account** — [Sign up free](https://app.harmonica.chat) if you don't have one.
2. **Generate an API key** — Go to [Profile](https://app.harmonica.chat/profile) > API Keys > Generate API Key. Copy the `hm_live_...` key.
3. **Install the MCP server** (replace with your actual key):
   ```
   claude mcp add-json harmonica '{"command":"npx","args":["-y","harmonica-mcp"],"env":{"HARMONICA_API_KEY":"hm_live_..."}}' -s user
   ```
4. Restart Claude Code to load the new MCP server.

## Installation

### Quick Install (bash)

```bash
curl -fsSL https://raw.githubusercontent.com/zhiganov/harmonica-chat/main/install.sh | bash
```

### Quick Install (PowerShell)

```powershell
irm https://raw.githubusercontent.com/zhiganov/harmonica-chat/main/install.ps1 | iex
```

### Manual Installation

Copy `harmonica-chat.md` to `~/.claude/commands/harmonica-chat.md`

## Usage

### Guided session design

```
/harmonica-chat
```

Walks you through the full design flow: intent, template matching, topic, goal, context, critical question, and cross-pollination. Each question is asked one at a time.

### Accelerated creation

```
/harmonica-chat "Q1 retrospective"
```

Provide a topic upfront to skip the intent and topic questions. The command suggests a template based on your topic and moves through the remaining steps faster.

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
/harmonica-chat follow-up "Q1 retro"      # Design a follow-up session
```

## Features

- **Guided session design** with template matching across 9 templates (Retrospective, Brainstorming, SWOT, Theory of Change, OKRs, Action Planning, Community Policy, Weekly Check-ins, Risk Assessment)
- **Session design expertise** — goal quality nudges, context calibration, cross-pollination recommendations
- **Project-aware context** — reads CLAUDE.md and git history to auto-fill session context
- **Full session lifecycle** — status, check, summary, and follow-up commands
- **Invitation drafting** with tone adapted to session type, plus integration with communication tools (Zapier, Slack) when available
- **Community participation feed** integration for publishing sessions to community dashboards

## See Also

- **[harmonica-mcp](https://github.com/harmonicabot/harmonica-mcp)** — MCP server for full API access to Harmonica sessions
- **[Harmonica docs](https://docs.harmonica.chat)** — Platform documentation
- **[Harmonica](https://harmonica.chat)** — Main website

## License

MIT
