---
name: harmonica-chat
description: Design, create, and manage Harmonica deliberation sessions. Use when the user wants to set up a structured async conversation, run a retrospective / brainstorming / SWOT / risk-assessment session, check or review an existing session's responses, get its summary, edit its metadata, or design a follow-up. Subcommands are loaded on demand from reference/.
allowed-tools: mcp__harmonica__*, AskUserQuestion, Read, Bash(git:*), Bash(echo:*), Bash(curl:*)
---

<!-- harmonica-chat v3.4.4 -->

# Harmonica — Session Companion

Design, create, and manage [Harmonica](https://harmonica.chat) deliberation sessions through conversation. Each subcommand has its own reference file that **must be loaded** before acting.

## Session Design Laws

Shared rules every subcommand inherits. Don't violate them per local convenience.

- **English-only metadata.** Topic, goal, context, critical question, and the generated facilitation prompt MUST be in English, even if the conversation with the user is in another language. Harmonica's facilitation layer is English-only; non-Latin characters (Cyrillic, CJK, etc.) get corrupted into `???` in titles, descriptions, and prompts. Only the actual participant chat during the session supports other languages.
- **ONE question per message** in any flow that asks the user (design, accelerated) AND in any facilitation prompt you generate. Never bundle questions. Wait for the answer before moving on.
- **Facilitation prompt comes from the right place.** If a template was chosen, omit `prompt` so Harmonica generates a tailored session prompt from the brief while preserving the template binding and runtime behavior. The v1/MCP create path does not directly copy the template's stored `facilitation_prompt`. Only generate and pass a prompt for a deliberately freeform session.
- **Don't generate verbose prompts.** No sub-questions, no multi-part questions, no "Step X of Y" structures inside the prompt. Messages are 2-3 sentences max. Participants are on mobile and won't write essays. Think chat, not survey.
- **Don't show the generated prompt by default.** Generate it internally for the `create_session` call. Only show it if the user explicitly asks to see or edit it.
- **Don't override template structure unilaterally.** If a template is selected, preserve `template_id` and omit `prompt`; do not claim the stored template prompt was copied into the session. Generate a replacement only when the host explicitly switches to freeform.
- **Don't push templates on freeform users.** If someone wants a custom session, help them design it without a template. Don't force a template choice for the sake of structure.
- **Never create or mutate without confirmation.** Inference can fill obvious fields, but the host must see the proposed session design and explicitly approve it before `create_session` or a material `update_session` call.
- **Use `AskUserQuestion` for known options** (template selection, cross-pollination, results visibility, confirmation). The tool always includes an "Other" option, so the user can type freely if needed.

## Routing

Route by intent FIRST. Preflight ceremony (version check, MCP check) is only run when needed — see [Preflight](#preflight) below.

Parse `$ARGUMENTS` to determine which reference to load:

1. **Empty or no arguments** — Run **full preflight**, then load [reference/design.md](reference/design.md) and follow it (guided session design, 14 steps).
2. **First word is a lifecycle keyword** (`status`, `check`, `summary`, `follow-up`, `edit`, `review`) — Skip the GitHub version check (fast lifecycle ops don't need it). Run **MCP check only**, then [resolve the session reference](#session-reference-resolution) and load `reference/<keyword>.md`. Everything after the keyword is the session reference (URL, ID, topic text, or partial match).
3. **Anything else** (topic text, flags, etc.) — Skip the GitHub version check (user has clear intent, don't slow them down). Run **MCP check only**, then load [reference/accelerated.md](reference/accelerated.md) and follow it.
   - Extract the topic: first quoted string, or all text before the first `--` flag.
   - Extract `--project <dir>` if present (triggers the Project-Aware Creation flow inside accelerated.md).
   - If only `--project <dir>` is present with no topic text, still load accelerated.md — detect the project first and ask for a topic based on the project context.

**Loading the reference file is non-negotiable.** It's what keeps subcommand behavior consistent across sessions. Don't try to reconstruct a subcommand from memory or from this entry file — read the reference.

When a subcommand finishes session creation (design / accelerated / follow-up), load [reference/invitation.md](reference/invitation.md) and run the invitation flow.

### Session reference resolution

Lifecycle commands (`check`, `summary`, `edit`, `review`, `follow-up`) accept any of:

- **A Harmonica session URL.** The two URL families encode the id **differently**, so a single pattern across both is wrong:

  | Form | Where the id is | Encoding |
  |---|---|---|
  | `/chat?s=<id>` (participate, results) | the `s` query param | raw |
  | `/sessions/<segment>` (host view) | the path segment | **base64** |

  So `…/sessions/MDcyODYxNDEtZDMwOC00MmY5LTkyZGItZDgyMzU4ZGY1N2Vl` is the host link for session `07286141-d308-42f9-92db-d82358df57ee`. Decode the segment; do not use it as-is.

  Resolve like this:

  1. Parse the URL. If there is an `s` query param, that value **is** the id.
  2. Otherwise, if the path ends `/sessions/<segment>`, base64-decode the segment (URL-decode first, since it may be percent-encoded). If the decoded value is a valid id, use it. If not, fall back to using the segment as a raw id — some tools have emitted `/sessions/<raw-id>` links.
  3. Validate before using: an id matches `^(?:hst_[0-9a-zA-Z]+|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$`. **This validation is the whole guard** — base64 decoding returns junk rather than failing on non-base64 input, so a successful decode proves nothing on its own.

  Works for `app.harmonica.chat`, `pro.harmonica.chat` (legacy, still redirects) and `oss.harmonica.chat`.

- **A bare session id** — either format: prefixed (`hst_22185567b69d`) or UUID (`abc123de-4567-890f-…`). Use `get_session` with it directly. Note the underscore in the prefixed form: a character class of `[a-zA-Z0-9-]` silently truncates `hst_22185567b69d` to `hst`.
- **Topic text** ("Q1 retro", "the brainstorming session") — pass to `search_sessions`; disambiguate if multiple match.

Each lifecycle reference handles its own disambiguation; SKILL.md's job is just to normalize URL → ID before handing off.

## Harness Compatibility

The workflow names Harmonica operations semantically. Resolve each operation through the active
harness's MCP namespace instead of copying Claude Code's tool name literally:

| Harness | Harmonica MCP operation form |
|---|---|
| Claude Code | `mcp__harmonica__<operation>` |
| OpenCode | `tools.harmonica.<operation>` |
| Codex / Pi agent | Use the namespace shown by the connected MCP server |

Use the harness's native question and file-reading affordances in place of `AskUserQuestion` and
`Read`. Never shell out to Harmonica's API when the MCP operation exists. If the connected server
does not expose an operation, stop and report the missing capability instead of guessing a raw HTTP
endpoint.

## Preflight

Run these checks based on the routing path above.

### Version Check (design path only)

Only on the no-args guided path (path 1). Fetch the latest version from GitHub:

```bash
curl -sf https://raw.githubusercontent.com/harmonicabot/harmonica-chat/master/SKILL.md | grep -m1 '<!-- harmonica-chat v'
```

Compare the version in the response (`<!-- harmonica-chat vX.Y.Z -->`) against the version comment near the top of THIS file (line 6). Read it from the file; never compare against a version literal written elsewhere in this document. If the remote version is newer, inform the user before proceeding:

> **Update available:** harmonica-chat `v{remote}` is out (you have `v{local}`). Run this to update:
> ```
> curl -fsSL https://raw.githubusercontent.com/harmonicabot/harmonica-chat/master/install.sh | bash
> ```

If the fetch fails (network error, timeout), skip silently and proceed — don't block session creation over an update check.

### MCP Check (all paths)

Check if harmonica-mcp is available by attempting to call the `list_sessions` operation with
`limit: 1`, using the active harness's namespace from the table above.

If the tool responds successfully, proceed.

If the tool is not available (tool not found, connection error, or similar failure), guide the user through setup:

> **Harmonica MCP server not found.** The fastest way to fix this:
>
> ```
> HARMONICA_API_KEY=hm_live_... bash <(curl -fsSL https://raw.githubusercontent.com/harmonicabot/harmonica-chat/master/install.sh)
> ```
>
> (Get an API key at https://app.harmonica.chat/profile if you don't have one. Then restart the active agent.)

Then STOP. Do not proceed with any other step until harmonica-mcp is available and responding.

## Tool Routing

When multiple paths could accomplish the same job, choose the one that preserves needed context and avoids state coupling:

- **harmonica-mcp operations** — canonical path for ALL session operations: list, search, get, get_responses, get_summary, create, update, chat_message, list_telegram_groups. Resolve the operation name through the active harness namespace. Always prefer over raw HTTP.
- **Raw `curl`** — only for endpoints harmonica-mcp doesn't wrap. Currently the sole legitimate case is the community-admin participation feed in [reference/invitation.md](reference/invitation.md) Step 3 (the community-admin service is intentionally separate from the Harmonica API). Don't use `curl` to hit Harmonica's own API — use the MCP.
- **Direct database access** (Neon MCP, etc.) — **never**. The Harmonica DB has internal invariants enforced through the API; bypassing them via direct SQL produces broken sessions. If the data you need isn't exposed by harmonica-mcp, file an issue against [harmonica-mcp](https://github.com/harmonicabot/harmonica-mcp) rather than reaching for the DB.
- **Other MCPs** (Zapier, Slack, Discord, Linear, etc.) — used at-runtime by [reference/invitation.md](reference/invitation.md) for distribution, IF the user has them configured and pre-approved. If they're not in the user's `~/.claude/settings.json` `permissions.allow`, those calls will prompt — that's expected.

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

For lifecycle commands, `<ref>` can be a Harmonica session URL, a bare UUID, or topic text — see [Session reference resolution](#session-reference-resolution) above.

Supporting references (load when needed):

- [reference/expertise.md](reference/expertise.md) — Session design expertise (goal quality nudges, context calibration, cross-pollination recommendation, critical-question constraint discovery)
- [reference/invitation.md](reference/invitation.md) — Post-creation invitation flow (join URL, draft message, community feed, follow-up prompt)

Note on templates: the template list is fetched at runtime via `mcp__harmonica__list_templates` (harmonica-mcp ≥ 0.11.0). The platform admin panel is the source of truth; this skill never hardcodes a template list.
