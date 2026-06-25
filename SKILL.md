---
name: harmonica-chat
description: Design, create, and manage Harmonica deliberation sessions. Use when the user wants to set up a structured async conversation, run a retrospective / brainstorming / SWOT / risk-assessment session, check or review an existing session's responses, get its summary, edit its metadata, or design a follow-up. Subcommands are loaded on demand from reference/.
---

<!-- harmonica-chat v3.1.0 -->

# Harmonica — Session Companion

Design, create, and manage [Harmonica](https://harmonica.chat) deliberation sessions through conversation. Each subcommand has its own reference file that **must be loaded** before acting.

## Prerequisites

### Version Check

Fetch the latest version from GitHub to check if this skill is up to date:

```bash
curl -sf https://raw.githubusercontent.com/harmonicabot/harmonica-chat/master/SKILL.md | grep -m1 '<!-- harmonica-chat v'
```

Compare the version in the response (`<!-- harmonica-chat vX.Y.Z -->`) against `v3.1.0` (this file's version). If the remote version is newer, inform the user before proceeding:

> **Update available:** harmonica-chat `v{remote}` is out (you have `v3.1.0`). Run this to update:
> ```
> curl -fsSL https://raw.githubusercontent.com/harmonicabot/harmonica-chat/master/install.sh | bash
> ```

If the fetch fails (network error, timeout), skip silently and proceed — don't block session creation over an update check.

### MCP Check

Check if harmonica-mcp is available by attempting to call the `list_sessions` tool with `limit: 1`.

If the tool responds successfully, proceed to **Routing**.

If the tool is not available (tool not found, connection error, or similar failure), guide the user through setup:

> **Harmonica MCP server not found.** Let me help you set it up:
>
> 1. **Get a Harmonica account** — [Sign up free](https://app.harmonica.chat) if you don't have one
> 2. **Generate an API key** — Go to [Profile](https://app.harmonica.chat/profile) > API Keys > Generate API Key. Copy the `hm_live_...` key.
> 3. **Install the MCP server** — Run this command (replace with your actual key):
>    ```
>    claude mcp add-json harmonica '{"command":"npx","args":["-y","harmonica-mcp"],"env":{"HARMONICA_API_KEY":"hm_live_YOUR_KEY_HERE"}}' -s user
>    ```
> 4. **Restart Claude Code** to load the new MCP server.
>
> Then run `/harmonica-chat` again.

Then STOP. Do not proceed with any other step until harmonica-mcp is available and responding.

## Session Design Laws

Shared rules every subcommand inherits. Don't violate them per local convenience.

- **English-only metadata.** Topic, goal, context, critical question, and the generated facilitation prompt MUST be in English, even if the conversation with the user is in another language. Harmonica's facilitation layer is English-only; non-Latin characters (Cyrillic, CJK, etc.) get corrupted into `???` in titles, descriptions, and prompts. Only the actual participant chat during the session supports other languages.
- **ONE question per message** in any flow that asks the user (design, accelerated) AND in any facilitation prompt you generate. Never bundle questions. Wait for the answer before moving on.
- **Always generate a tailored facilitation prompt** before `create_session`. The Harmonica API does NOT generate prompts itself — it falls back to a generic "skilled facilitator" template that knows nothing about your topic. Skipping prompt generation produces generic, low-engagement sessions.
- **Don't generate verbose prompts.** No sub-questions, no multi-part questions, no "Step X of Y" structures inside the prompt. Messages are 2-3 sentences max. Participants are on mobile and won't write essays. Think chat, not survey.
- **Don't show the generated prompt by default.** Generate it internally for the `create_session` call. Only show it if the user explicitly asks to see or edit it.
- **Don't override template structure unilaterally.** If a template is selected, use it as a guide for the generated prompt's step themes — but still generate a session-specific prompt. Templates provide defaults for goal/context, not facilitation instructions.
- **Don't push templates on freeform users.** If someone wants a custom session, help them design it without a template. Don't force a template choice for the sake of structure.
- **Use `AskUserQuestion` for known options** (template selection, cross-pollination, results visibility, confirmation). The tool always includes an "Other" option, so the user can type freely if needed.

## Routing

Parse `$ARGUMENTS` to determine which reference to load:

1. **Empty or no arguments** — Load [reference/design.md](reference/design.md) and follow it (guided session design, 14 steps).
2. **First word is a lifecycle keyword** (`status`, `check`, `summary`, `follow-up`, `edit`, `review`) — Load the matching `reference/<keyword>.md` and follow it. Everything after the keyword is the session reference (topic text or partial match).
3. **Anything else** (topic text, flags, etc.) — Load [reference/accelerated.md](reference/accelerated.md) and follow it.
   - Extract the topic: first quoted string, or all text before the first `--` flag.
   - Extract `--project <dir>` if present (triggers the Project-Aware Creation flow inside accelerated.md).
   - If only `--project <dir>` is present with no topic text, still load accelerated.md — detect the project first and ask for a topic based on the project context.

**This is non-negotiable.** Loading the reference file before acting is what keeps subcommand behavior consistent across sessions. Don't try to reconstruct a subcommand from memory or from this entry file — read the reference.

When a subcommand finishes session creation (design / accelerated / follow-up), load [reference/invitation.md](reference/invitation.md) and run the invitation flow.

## Commands

| Category | Command | Reference | What it does |
|----------|---------|-----------|--------------|
| **Create** | *(no args)* | [reference/design.md](reference/design.md) | Guided session design, 14 steps, one question at a time |
| **Create** | `<topic>` | [reference/accelerated.md](reference/accelerated.md) | Faster flow with topic upfront; supports `--project <dir>` for project-aware context |
| **Manage** | `status` | [reference/status.md](reference/status.md) | List recent sessions grouped by Active / Completed |
| **Manage** | `check <ref>` | [reference/check.md](reference/check.md) | Thematic preview of a session's responses so far |
| **Manage** | `summary <ref>` | [reference/summary.md](reference/summary.md) | Get the AI-generated synthesis once the session is done |
| **Iterate** | `edit <ref>` | [reference/edit.md](reference/edit.md) | Change topic, goal, context, critical question, or prompt |
| **Iterate** | `review <ref>` | [reference/review.md](reference/review.md) | Analyze transcripts for facilitation issues + propose prompt fixes |
| **Iterate** | `follow-up <ref>` | [reference/follow-up.md](reference/follow-up.md) | Design a next-step session built on the previous one's findings |

Supporting references (load when needed):

- [reference/templates.md](reference/templates.md) — Template matching table (9 templates: Retrospective, Brainstorming, SWOT, Theory of Change, OKRs, Action Planning, Community Policy, Weekly Check-ins, Risk Assessment)
- [reference/expertise.md](reference/expertise.md) — Session design expertise (goal quality nudges, context calibration, cross-pollination recommendation, critical-question constraint discovery)
- [reference/invitation.md](reference/invitation.md) — Post-creation invitation flow (join URL, draft message, community feed, follow-up prompt)
