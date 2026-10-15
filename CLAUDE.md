# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

harmonica-chat is a Claude Code skill (`/harmonica-chat`) that designs, creates, and manages [Harmonica](https://harmonica.chat) deliberation sessions. It's distributed as a thin entry router (`SKILL.md`) plus lazy-loaded reference files (`reference/*.md`) that users install to `~/.claude/skills/harmonica-chat/`.

The skill requires the [harmonica-mcp](https://github.com/harmonicabot/harmonica-mcp) server for API access.

## Repository Structure

- `SKILL.md` — Entry router (~120 lines). Frontmatter, prerequisites, session design laws, argument routing, commands menu. This file MUST stay thin; subcommand logic lives in `reference/`.
- `reference/` — subcommand reference files. Loaded on demand by the entry router.
  - `design.md` — Mode 1: guided session design, 14 steps
  - `accelerated.md` — Mode 2: topic-upfront flow + project-aware creation
  - `status.md`, `check.md`, `summary.md`, `edit.md`, `review.md`, `follow-up.md` — lifecycle commands
  - `invitation.md` — post-creation invitation flow (join URL, draft message, community feed)
  - `expertise.md` — soft-nudge session design heuristics (goal quality, context calibration, cross-pollination, critical questions)
  - `onboarding.md` — hosted-MCP continuation for a saved Shape C flow; ordinary local-npm sessions stay on existing routes

Templates are NOT in `reference/` — they're fetched at runtime via `mcp__harmonica__list_templates` (harmonica-mcp ≥ 0.11.0). The Harmonica admin panel is the single source of truth; the skill never hardcodes a template list. See [HAR-1227](https://linear.app/harmonica-pro/issue/HAR-1227).
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
   - onboarding continuation with a flow UUID → `reference/onboarding.md`
   - anything else → `reference/accelerated.md`
5. The agent **must load the matching reference file** before acting. This is non-negotiable — trying to reconstruct subcommand behavior from memory produces drift.

After session creation (design / accelerated / follow-up / onboarding), the agent loads `reference/invitation.md` to handle invitation drafting and optional community feed posting.

## Key Design Decisions

**Thin router + lazy-loaded references** (v3.0.0). Modeled on [pbakaus/impeccable](https://github.com/pbakaus/impeccable). Previously this was an 835-line monolithic command file; everything was always in context regardless of which subcommand the user invoked. The split keeps the always-loaded surface small (router + design laws) and pulls in subcommand logic only when used.

**Session Design Laws elevated to the router.** Previously rules like "English-only metadata", "ONE question per message", "always generate a tailored prompt", "don't show the prompt by default" were scattered across 13 steps and a "What NOT to Do" footer. Now they're top-level shared laws every subcommand inherits.

**Facilitation prompt generation is non-negotiable.** The Harmonica API does NOT generate prompts — it falls back to a generic "skilled facilitator" template. Skipping prompt generation produces low-engagement sessions. This is one of the Session Design Laws.

**Metadata language follows the participants (changed 2026-09-30).** This used to be an English-only rule claiming non-Latin characters get corrupted into `???`. A test on 2026-09-30 did not reproduce that. A session created through the MCP with Cyrillic in every field, prompt included, stored it intact, rendered it on the participant page, and the facilitator followed a Cyrillic-only instruction. A second law covers languages with grammatical gender: tell the facilitator to use the neutral register (Russian «вы») and never guess gender from a name.

**Version auto-update.** The version comment near the top of SKILL.md is `<!-- harmonica-chat vX.Y.Z -->`. Guided design checks GitHub and notifies users if outdated; every Harmonica MCP call includes this installed version (without `v`) as `client_version`. Bump the comment on functional changes. The version-check curl uses `grep -m1`, not `head -1`.

**Onboarding compatibility.** Dispatch onboarding intent before ordinary preflight, even with a missing flow ID. Its recovery must stay hosted-only; never recommend the local installer. Inspect connected tool schemas: hosted onboarding requires fingerprint and flow parameters, while ordinary local-npm calls omit unsupported fingerprint fields. Reusing design questions does not authorize their ordinary create/retry path.

## Development Workflow

No build step or linter. `node --test tests/onboarding.test.mjs tests/onboarding-fixture.test.mjs` checks onboarding route/install integrity and synthetic fixture behavior; it is not a substitute for fresh-profile Claude Code and OpenCode behavior checks.

**Manual paid smoke (Windows):** An explicit single case is required, for example `node tests/run-onboarding-smoke.mjs claude browser --budget-ms=120000`. Bare invocation and invalid selectors fail before profile creation or authentication reads. Obtain explicit model-usage approval immediately before each run. The default/maximum execution budget is five minutes, shared by authentication export/import and every agent turn; each child is additionally capped at two minutes or the remaining total time. Expiry independently rejects the awaited operation without needing child close, refuses further subprocesses, and attempts one process-tree termination with up to five seconds of OS cleanup grace. A bounded root-kill fallback and PID probe do not pretend to prove descendants stopped if tree termination failed. Unconfirmed processes are detached from the runner's wait, their PID/profile is reported for explicit follow-up, and that profile is **not deleted**. Cleanup failure blocks the run; no automatic retry or shared-service restart follows. Wall time is not a dollar/token/quota cap, and does not authorize another smoke. The runner reuses existing, unexpired OAuth identities only, never refreshes them, and removes profiles only when cleanup is confirmed safe. This is fixture-backed agent evidence, not production or a real hosted-contract pass.
Offline oracles require terminal `browser_required` routing with no extra design calls, exact-session recovery, and one post-confirmation create followed by a new continuation before recovery. `node --test tests/onboarding-fixture.test.mjs tests/onboarding-smoke-support.test.mjs` checks only these fixture/control paths without launching agents, reading credentials or installing packages.
`node --test tests/onboarding-process-control.test.mjs` separately exercises lifecycle failure paths using fake EventEmitter children, injected timers, kill outcomes and probes: no OS process, authentication or agent is invoked. It proves settlement/reporting, not actual Windows process-tree termination.
Any retained failure profile may contain a copied OAuth identity: keep it private, never upload it as diagnostic evidence, and resolve the reported process/cleanup issue explicitly before another smoke.
The restricted Claude profile exposes the candidate skill as an explicit session-local plugin (`--plugin-dir`); do not assume project skill discovery occurred or classify a missing-skill/fingerprint failure as product evidence before checking loading. Plugin-backed workflow evidence does not prove the skills-CLI installation path. Report actual MCP call order, fingerprint, and confirmation/recovery boundaries separately from skill-discovery metadata.
For OpenCode V2, inspect the consumer with `auth list`; current credentials live in SQLite, not legacy `auth.json`. The smoke captures a provider-scoped native `auth export` privately and imports the existing unexpired identity into its temporary DB, with refresh disabled. Never infer a live-auth outage from the legacy file or change the user's authentication to repair that stale-file reading.
Classify failures from the actual error/final reply, not keyword matches over the whole trace (which contains skill instructions). Preserve the session ID for confirmation turns; report missing tool visibility on resume as an unresolved harness/runtime question, not proof that the hosted Harmonica tool is absent. `--draft-only` limits a ready-flow diagnostic to the proposal/confirmation boundary.

**To test changes**: Run the install script (`bash install.sh`) to copy local SKILL.md + reference/ to `~/.claude/skills/harmonica-chat/`. Then invoke `/harmonica-chat` in Claude Code. The post-commit hook (if configured) does this automatically on commit.
Do not run the legacy installer to test the hosted onboarding recipe: it configures the local npm MCP server and modifies the user's global Claude settings. Use an isolated clean harness profile and the hosted endpoint instead, with explicit authorization for any shared-service restart or credential operation.

**To release**: Merge the reviewed PR into `master`. Users with auto-update enabled will be notified on their next guided design run. Update the version comment in SKILL.md when making functional changes. Use semver:
- Patch (v3.0.X) — typo fixes, small clarifications, no behavior change
- Minor (v3.X.0) — new subcommand, new option, additive change
- Major (vX.0.0) — install format changes, breaking changes to invocation

## Related Codebases

- **[harmonica-mcp](https://github.com/harmonicabot/harmonica-mcp)** — MCP server with `create_session`, `list_sessions`, `search_sessions`, `get_session`, `get_responses`, `get_summary`, `update_session`, `list_telegram_groups`. The skill's subcommands call these tools.
- **harmonica-web-app** — Main platform. Session creation API at `/api/v1/sessions`. Facilitation prompt pipeline in `src/lib/defaultPrompts.ts` and `src/app/api/builder/route.ts`.
- **community-admin** — Provides the community participation feed API (hardcoded Railway URL in `reference/invitation.md` Step 3).
