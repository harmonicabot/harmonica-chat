# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

harmonica-chat is a Claude Code slash command (`/harmonica-chat`) that designs, creates, and manages [Harmonica](https://harmonica.chat) deliberation sessions through conversation. It's distributed as a single Markdown file (`harmonica-chat.md`) that users install to `~/.claude/commands/`.

The command requires the [harmonica-mcp](https://github.com/harmonicabot/harmonica-mcp) server for API access to Harmonica sessions.

## Repository Structure

- `harmonica-chat.md` — The slash command itself. This is the entire product.
- `install.sh` / `install.ps1` — One-line installers that download `harmonica-chat.md` to `~/.claude/commands/`
- `docs/plans/` — Design docs for major rewrites (reference only, not part of the product)

## How the Slash Command Works

The command has three modes:
1. **Guided (no args)** — Walks through 10 steps: intent → template → topic → goal → context → critical question → cross-pollination → confirm → generate facilitation prompt → create session
2. **Accelerated (topic arg)** — Skips intent/topic questions, suggests template from topic text, faster flow
3. **Lifecycle (action keyword)** — `status`, `check`, `summary`, `follow-up` for existing sessions

After creation, an **Invitation Flow** offers to draft shareable messages and optionally post to community participation feeds.

## Key Design Decisions

**Facilitation prompt generation**: The Harmonica API falls back to a generic `BASIC_FACILITATION_PROMPT` if no custom prompt is provided. The slash command generates a tailored prompt (Mode 1 Step 9) with session-specific structure, questions, and tone — this is the main value over calling `create_session` directly.

**English-only metadata**: Topic, goal, context, critical question, and prompt must all be in English. Non-Latin characters (Cyrillic, CJK) get corrupted into `???` in session metadata. Only participant chat supports other languages.

**Version auto-update**: The file starts with `<!-- harmonica-chat vX.Y.Z -->`. On each run, it fetches the latest from GitHub and notifies users if outdated. Bump this version comment when making changes.

## Development Workflow

There is no build step, linter, or test suite. The product is a single Markdown file interpreted by Claude Code at runtime.

**To test changes**: Copy `harmonica-chat.md` to `~/.claude/commands/harmonica-chat.md` and run `/harmonica-chat` in Claude Code. The post-commit hook does this automatically on commit.

**To release**: Push to `master`. Users with auto-update will be notified on next run. Update the version comment in line 1 when making functional changes.

**Post-commit hook** (`.git/hooks/post-commit`): Copies `harmonica-chat.md` to `~/.claude/commands/` on every commit so the developer's local Claude Code always has the latest version.

## Related Codebases

- **[harmonica-mcp](https://github.com/harmonicabot/harmonica-mcp)** — MCP server with `create_session`, `list_sessions`, `search_sessions`, `get_session`, `get_responses`, `get_summary` tools. The slash command calls these tools.
- **harmonica-web-app** — Main platform. Session creation API at `/api/v1/sessions`. Facilitation prompt pipeline in `src/lib/defaultPrompts.ts` and `src/app/api/builder/route.ts`.
- **community-admin** — Provides the community participation feed API (hardcoded Railway URL in the Invitation Flow section).
