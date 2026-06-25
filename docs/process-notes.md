# harmonica-chat — Process Notes

## 2026-03-06 — Context layer blog post edits
- **Done:** Revised blog post "The Context Layer Needs a Facilitator" — reworked closing paragraph, wove in Cutler's principles, fixed "not just A — it's B" slop patterns, rewrote compounding section, tightened Maria/OFL framing. Synced to Notion. Published to Paragraph. Wrote social posts for Bluesky (published), Twitter/X (published), LinkedIn (draft).
- **Decisions:** Subtitle = "Surfacing tacit organizational knowledge requires structured conversation". Dropped API bug story paragraph. No chained templates announcement in this post.
- **State:** Blog post live. LinkedIn draft pending in `docs/blog-context-layer-social.md`.
- **Next:** Post LinkedIn version.

## 2026-05-23 — v3.0→v3.3 architecture overhaul + install rewrite + templates sync
- **Done:** Five releases shipped in one session.
  - v3.0.0: impeccable-pattern split — 835-line monolith → 98-line SKILL.md + 11 `reference/*.md` files. Skill format (was slash-command), install moved to `~/.claude/skills/harmonica-chat/`. Session Design Laws elevated to entry. Categorized commands menu. (commit ec7658a)
  - v3.1.0: install rewrite (HAR-731). Installer now configures harmonica-mcp via `claude mcp add-json`, pre-approves 6 read-only `mcp__harmonica__*` tools in `~/.claude/settings.json` `permissions.allow`, migrates legacy slash-command install. README reframed to lead with what the tool does, not "Claude Code companion". (commits e60897f + a07cab8)
  - v3.2.0: railway-skills audit bundle (HAR-1225). `allowed-tools` frontmatter, intent-first preflight (skip version check on lifecycle + accelerated paths), URL parsing for session references in lifecycle commands, explicit Tool Routing section. (commit c8419b2)
  - v3.3.0: templates sync (HAR-1227 Phase 3). Deleted hardcoded `reference/templates.md` (5 of 9 entries didn't exist on platform, 12 platform templates were missing). All template matching now runs through `mcp__harmonica__list_templates` at runtime. Step 13 prompt-generation became conditional — omit `prompt` field when `template_id` is set so platform uses stored `facilitation_prompt`. (commits 98dea0c + 408f842)
  - Cleanup pass (no version bump): grepped for stale template names + `templates.md` references, fixed 5 leftover hardcoded refs in accelerated/follow-up/invitation/expertise/CLAUDE.md to use category-language. (commit dc385ba)
- **Also shipped:** harmonica-mcp 0.11.0 with new `list_templates` tool (HAR-1227 Phase 2). harmonica-session-review repo was created mid-session then archived a few turns later when we recognized it duplicated the built-in `review` mode — folded back as a richer `review` subcommand.
- **Decisions:** Skill format kept invokable as `/harmonica-chat` (skills can be `/`-invoked). `$ARGUMENTS` routing kept (architecture depends on it for picking which reference to load — not a CLI-era leftover). `allowed-tools` deliberately includes integration MCPs (Zapier/Slack/Discord) only via runtime-prompt path, not in the allowlist. `permissions.allow` chosen over Claude Code hooks for pre-approval (cleaner contract for "this tool is pre-approved").
- **State:** master clean + pushed @ dc385ba; v3.3.0 live; install verified end-to-end on Windows Git Bash; macOS/Linux untested but same logic.
- **Next:** HAR-1226 (telemetry + freshness check, Low) pending in queue. Side-finding HAR-1229 filed (admin templates route has no auth — confirm intentional or fix).
- **Lesson:** When dropping a hardcoded reference, grep the WHOLE repo for related names BEFORE claiming done. Caught 5 leftover references only when user asked "anything else?". `verification-before-completion` would have caught this — should have run a verification grep after deleting templates.md.
