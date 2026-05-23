# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

harmonica-chat is a Claude Code skill (`/harmonica-chat`) that designs, creates, and manages [Harmonica](https://harmonica.chat) deliberation sessions. It's distributed as a thin entry router (`SKILL.md`) plus 11 subcommand reference files (`reference/*.md`) that users install to `~/.claude/skills/harmonica-chat/`.

The skill requires the [harmonica-mcp](https://github.com/harmonicabot/harmonica-mcp) server for API access.

## Repository Structure

- `SKILL.md` — Entry router (~120 lines). Frontmatter, prerequisites, session design laws, argument routing, commands menu. This file MUST stay thin; subcommand logic lives in `reference/`.
- `reference/` — 11 subcommand reference files. Loaded on demand by the entry router.
  - `design.md` — Mode 1: guided session design, 14 steps
  - `accelerated.md` — Mode 2: topic-upfront flow + project-aware creation
  - `status.md`, `check.md`, `summary.md`, `edit.md`, `review.md`, `follow-up.md` — lifecycle commands
  - `invitation.md` — post-creation invitation flow (join URL, draft message, community feed)
  - `templates.md` — template matching reference table (9 templates)
  - `expertise.md` — soft-nudge session design heuristics (goal quality, context calibration, cross-pollination, critical questions)
- `install.sh` / `install.ps1` — One-line installers. Download SKILL.md + all reference files. v3.0.0+ also migrates the legacy v2.x slash-command install (removes `~/.claude/commands/harmonica-chat.md` if present).
- `docs/plans/` — Design docs for major rewrites (reference only, not part of the product).

## How the Skill Works

Triggers when the user invokes `/harmonica-chat` or asks Claude Code to do something matching the description ("design a Harmonica session", "check on the brainstorming session", etc.).

The entry router (`SKILL.md`):
1. Checks the skill version against GitHub and notifies if an update is available
2. Verifies harmonica-mcp is installed (blocks until it is)
3. Surfaces shared Session Design Laws that apply to all subcommands
4. Routes `$ARGUMENTS` to the matching reference file:
   - empty → `reference/design.md`
   - lifecycle keyword (`status` / `check` / `summary` / `edit` / `review` / `follow-up`) → matching `reference/<keyword>.md`
   - anything else → `reference/accelerated.md`
5. The agent **must load the matching reference file** before acting. This is non-negotiable — trying to reconstruct subcommand behavior from memory produces drift.

After session creation (design / accelerated / follow-up), the agent loads `reference/invitation.md` to handle invitation drafting and optional community feed posting.

## Key Design Decisions

**Thin router + lazy-loaded references** (v3.0.0). Modeled on [pbakaus/impeccable](https://github.com/pbakaus/impeccable). Previously this was an 835-line monolithic command file; everything was always in context regardless of which subcommand the user invoked. The split keeps the always-loaded surface small (router + design laws) and pulls in subcommand logic only when used.

**Session Design Laws elevated to the router.** Previously rules like "English-only metadata", "ONE question per message", "always generate a tailored prompt", "don't show the prompt by default" were scattered across 13 steps and a "What NOT to Do" footer. Now they're top-level shared laws every subcommand inherits.

**Facilitation prompt generation is non-negotiable.** The Harmonica API does NOT generate prompts — it falls back to a generic "skilled facilitator" template. Skipping prompt generation produces low-engagement sessions. This is one of the Session Design Laws.

**English-only metadata.** Topic, goal, context, critical question, and prompt must all be in English. Non-Latin characters (Cyrillic, CJK) get corrupted into `???` in session metadata. Only participant chat supports other languages.

**Version auto-update.** Line 6 of SKILL.md is `<!-- harmonica-chat vX.Y.Z -->`. On each run, the skill fetches the latest from GitHub and notifies users if outdated. Bump this version comment when making changes. (Pre-v3.0.0 the comment was on line 1, but YAML frontmatter is now line 1 — the version-check curl uses `grep -m1` instead of `head -1`.)

## Development Workflow

No build step, linter, or test suite. The product is markdown interpreted by Claude Code at runtime.

**To test changes**: Run the install script (`bash install.sh`) to copy local SKILL.md + reference/ to `~/.claude/skills/harmonica-chat/`. Then invoke `/harmonica-chat` in Claude Code. The post-commit hook (if configured) does this automatically on commit.

**To release**: Push to `master`. Users with auto-update enabled will be notified on next run. Update the version comment in line 6 of SKILL.md when making functional changes. Use semver:
- Patch (v3.0.X) — typo fixes, small clarifications, no behavior change
- Minor (v3.X.0) — new subcommand, new option, additive change
- Major (vX.0.0) — install format changes, breaking changes to invocation

## Related Codebases

- **[harmonica-mcp](https://github.com/harmonicabot/harmonica-mcp)** — MCP server with `create_session`, `list_sessions`, `search_sessions`, `get_session`, `get_responses`, `get_summary`, `update_session`, `list_telegram_groups`. The skill's subcommands call these tools.
- **harmonica-web-app** — Main platform. Session creation API at `/api/v1/sessions`. Facilitation prompt pipeline in `src/lib/defaultPrompts.ts` and `src/app/api/builder/route.ts`.
- **community-admin** — Provides the community participation feed API (hardcoded Railway URL in `reference/invitation.md` Step 3).
