# `/process-calls` Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a slash command that automatically processes Harmonica-related Fireflies transcripts into Linear issues with overlap detection, Notion logging, and optional Calendar cross-referencing.

**Architecture:** Single markdown file (`process-calls.md`) in `~/.claude/commands/`. Follows the same patterns as `process-standup.md` — Fireflies search, structured extraction, Linear overlap checking, user confirmation before mutations. Uses Agent tool to dispatch per-call transcript processing. Persistent state file tracks last run and processed IDs.

**Tech Stack:** Claude Code slash command (markdown), Fireflies MCP, Linear MCP, Notion MCP, Google Calendar MCP (optional), Agent tool for extraction.

---

### Task 1: Create process-calls.md with header, usage, and argument parsing

**Files:**
- Create: `C:/Users/temaz/claude-project/.claude/commands/process-calls.md`

**Step 1: Write the command file with header and usage section**

```markdown
# Process Calls

Process Harmonica-related calls from Fireflies into Linear issues, with overlap detection and Notion logging.

## Usage

` ` `
/process-calls [--since YYYY-MM-DD] [--dry-run]
` ` `

- `/process-calls` — Process calls since last run (or last 14 days on first run)
- `/process-calls --since 2026-02-20` — Process calls since a specific date
- `/process-calls --dry-run` — Show discovery table only, don't process

Arguments: $ARGUMENTS
```

**Step 2: Add argument parsing section**

```markdown
## Instructions

### Step 1: Parse Arguments and Load State

Parse `$ARGUMENTS`:
- If `--since YYYY-MM-DD` is present, use that date as the start
- If `--dry-run` is present, set dry_run mode (show discovery only)
- If no arguments, read `~/.claude/process-calls-state.json` for `last_run` timestamp

**State file** (`~/.claude/process-calls-state.json`):
` ` `json
{
  "last_run": "2026-03-02T14:30:00Z",
  "processed_ids": ["fireflies_id_1", "fireflies_id_2"]
}
` ` `

- If the state file doesn't exist, default to 14 days ago
- Read `processed_ids` to skip already-processed transcripts

Read the state file with the Read tool. If it doesn't exist, use defaults:
- `since_date`: 14 days before today
- `processed_ids`: empty array
```

**Step 3: Commit**

```bash
git -C "C:/Users/temaz/claude-project" add .claude/commands/process-calls.md
git -C "C:/Users/temaz/claude-project" commit -m "feat: add process-calls command — header, usage, arg parsing"
```

---

### Task 2: Add Phase 1 — Discovery (Fireflies search + Calendar + confirmation)

**Files:**
- Modify: `C:/Users/temaz/claude-project/.claude/commands/process-calls.md`

**Step 1: Add the Fireflies search step**

Append after Step 1 in the Instructions section:

```markdown
### Step 2: Discover Harmonica Calls

Search Fireflies for Harmonica-related calls:

` ` `
keyword:"harmonica" from:{since_date} limit:20
` ` `

Filter out any transcripts whose Fireflies ID appears in `processed_ids` from the state file.

For each result, extract:
- Title
- Date
- Duration
- Participants
- Fireflies transcript ID
```

**Step 2: Add the Calendar cross-reference step**

```markdown
### Step 3: Cross-Reference Calendar (Optional)

If Google Calendar MCP tools are available (`google-calendar` server), fetch calendar events since `since_date` that contain "harmonica" in the title.

For each calendar event, check if a matching Fireflies transcript exists (match by title similarity and date ±1 day). Flag unmatched calendar events as "No recording" — these appear in the discovery table as reminders but cannot be processed.

If Google Calendar is not available, skip this step silently and proceed with Fireflies results only.
```

**Step 3: Add the discovery table and confirmation step**

```markdown
### Step 4: Present Discovery Table

Show the user what was found:

**Calls since {since_date}:**

| # | Call | Date | Duration | Source | Status |
|---|------|------|----------|--------|--------|
| 1 | Gabriel user testing | 2026-02-24 | 45 min | Fireflies | Ready |
| 2 | Chris product weekly | 2026-02-26 | 84 min | Fireflies | Ready |
| 3 | Metagov governance sync | 2026-02-27 | 30 min | Calendar | No recording |

- **Ready**: Has a Fireflies transcript, can be processed
- **No recording**: Calendar event without a transcript (shown as reminder only)

If no calls are found, inform the user and stop:
> No Harmonica-related calls found since {since_date}. Try `/process-calls --since YYYY-MM-DD` with an earlier date.

If `--dry-run` was set, show the table and stop here.

Otherwise, ask the user via `AskUserQuestion`:
- **Question:** "Which calls should I process?"
- **Header:** "Calls"
- **Options:**
  - Label: "Process all (Recommended)", Description: "Process all {count} calls with Fireflies transcripts"
  - Label: "Skip some", Description: "Choose which calls to skip before processing"
  - Label: "Cancel", Description: "Don't process any calls right now"

If "Skip some": follow up by asking which numbers to skip, then proceed with the rest.
If "Cancel": stop execution.
```

**Step 4: Commit**

```bash
git -C "C:/Users/temaz/claude-project" add .claude/commands/process-calls.md
git -C "C:/Users/temaz/claude-project" commit -m "feat(process-calls): add discovery phase — Fireflies search, Calendar cross-ref, confirmation"
```

---

### Task 3: Add Phase 2 — Extraction pipeline (agent dispatch, overlap checking, action plan)

**Files:**
- Modify: `C:/Users/temaz/claude-project/.claude/commands/process-calls.md`

**Step 1: Add the agent dispatch step**

```markdown
### Step 5: Extract Findings (Per Call)

For each selected call, dispatch an Agent (subagent_type: "general-purpose") with this prompt:

> Fetch the full transcript for Fireflies transcript ID "{id}" using `fireflies_get_transcript`.
> Also fetch the summary using `fireflies_get_summary`.
>
> Extract all product-relevant findings — bugs, feature requests, UX issues, positive feedback, strategic insights.
>
> For each finding, return a structured entry:
> - **title**: Concise issue title (imperative form, e.g., "Add session preview before publish")
> - **description**: 2-3 sentence description of the finding with context
> - **quote**: Direct quote from the transcript that supports this finding
> - **priority**: urgent / high / normal / low (based on speaker emphasis and impact)
> - **target_project**: Best matching Linear project from the reference table below
> - **type**: bug / feature / improvement / insight / positive_feedback
>
> Skip vague or off-topic items. Include positive feedback (marked as type: positive_feedback) — these won't become issues but help track what's working.
>
> Reference — Linear projects:
> {include the project reference table from this command}

Wait for the agent to return results before proceeding.
```

**Step 2: Add the overlap checking step**

```markdown
### Step 6: Check for Existing Linear Issues

For each extracted finding (excluding positive_feedback), search Linear for potential overlaps:

` ` `json
{
  "team": "Harmonica Pro",
  "query": "{key words from finding title}",
  "limit": 5
}
` ` `

Run searches in parallel for all findings from a single call.

**Overlap classification:**
- **New issue**: No relevant Linear issues found
- **Enrich existing**: An existing issue covers the same area — append finding as additional evidence
- **Skip**: Finding is purely positive feedback or too vague

For "Enrich" matches, note the existing issue ID and title.
```

**Step 3: Add the action plan presentation and confirmation**

```markdown
### Step 7: Present Action Plan

For each call, show the action plan:

**{call_title}** ({date}, {duration})
Participants: {participants}

| # | Finding | Type | Action | Target |
|---|---------|------|--------|--------|
| 1 | Add session preview | feature | New issue | AI Orchestration |
| 2 | Improve onboarding flow | improvement | Enrich HAR-134 | Platform Core |
| 3 | Mobile layout broken | bug | New issue | User Experience |
| 4 | Likes the template picker | positive | Skip | — |

Ask the user via `AskUserQuestion`:
- **Question:** "Action plan for {call_title} — proceed?"
- **Header:** "Actions"
- **Options:**
  - Label: "Execute plan (Recommended)", Description: "Create {n} new issues, enrich {m} existing issues"
  - Label: "Edit first", Description: "Change actions before executing (e.g., skip an item or change target)"
  - Label: "Skip this call", Description: "Don't process this call, move to next"

If "Edit first": ask what to change, apply edits, re-display the table, and confirm again.
If "Skip this call": mark as skipped and continue to the next call.
```

**Step 4: Commit**

```bash
git -C "C:/Users/temaz/claude-project" add .claude/commands/process-calls.md
git -C "C:/Users/temaz/claude-project" commit -m "feat(process-calls): add extraction pipeline — agent dispatch, overlap checking, action plan"
```

---

### Task 4: Add Phase 2 continued — Execute actions (Linear + Notion)

**Files:**
- Modify: `C:/Users/temaz/claude-project/.claude/commands/process-calls.md`

**Step 1: Add the execution step for Linear issues**

```markdown
### Step 8: Execute Actions

**For new issues:**

Use `save_issue` to create:
` ` `json
{
  "title": "{finding title}",
  "team": "Harmonica Pro",
  "project": "{target_project}",
  "priority": "{priority_number}",
  "description": "**Source**: {call_title} ({call_date})\n\n{finding description}\n\n> {direct quote from transcript}\n\n---\n_Created via /process-calls from [{call_title}]_",
  "state": "Backlog"
}
` ` `

**For enriching existing issues:**

Use `create_comment` to add context:
` ` `json
{
  "issueId": "{existing_issue_id}",
  "body": "**Additional insight from {call_title}** ({call_date}):\n\n{finding description}\n\n> {direct quote}\n\n_Via /process-calls_"
}
` ` `

If an enrichment target is in Done or Canceled state, flag to user: "{issue_id} is closed but was mentioned again. Add comment anyway, reopen, or create new?"

Record all created/enriched issue IDs for the Notion entry.
```

**Step 2: Add the Notion logging step**

```markdown
### Step 9: Log to Notion

After processing each call, create an entry in the User Interviews database.

Use `notion-create-pages` with parent `data_source_id: "6d28eb6d-6a46-4348-9c54-b49c698d781d"`:

Properties:
- **Name** (title): Call title
- **Date** (date): Call date (ISO format)
- **Participant** (rich_text): Participant names from Fireflies
- **Product** (select): "Harmonica"
- **Recording** (url): Fireflies transcript URL (construct as `https://app.fireflies.ai/view/{transcript_id}`)
- **Linear Issues** (rich_text): Comma-separated issue IDs (e.g., "HAR-270, HAR-271, HAR-134")
- **Key Findings** (rich_text): One-sentence summary per finding, bulleted
- **Status** (select): "Processed"

Page body: Include the full action plan table from Step 7 as markdown content.
```

**Step 3: Commit**

```bash
git -C "C:/Users/temaz/claude-project" add .claude/commands/process-calls.md
git -C "C:/Users/temaz/claude-project" commit -m "feat(process-calls): add execution — Linear create/enrich + Notion logging"
```

---

### Task 5: Add Phase 3 — Completion (summary, state update) and safety rules

**Files:**
- Modify: `C:/Users/temaz/claude-project/.claude/commands/process-calls.md`

**Step 1: Add completion steps**

```markdown
### Step 10: Summary Report

After all calls are processed, show:

**Processing complete — {total_calls} calls**

| Call | New Issues | Enriched | Skipped | Notion |
|------|------------|----------|---------|--------|
| Gabriel user testing (Feb 24) | 3 | 2 | 1 | ✓ |
| Chris product weekly (Feb 26) | 2 | 6 | 4 | ✓ |

**New issues created:** HAR-270, HAR-271, HAR-272
**Existing issues enriched:** HAR-134 (added context), HAR-202 (added context)

### Step 11: Update State File

Write the updated state to `~/.claude/process-calls-state.json`:

` ` `json
{
  "last_run": "{current_ISO_timestamp}",
  "processed_ids": ["{all previously processed IDs}", "{newly processed IDs}"]
}
` ` `

- Append new Fireflies transcript IDs to `processed_ids`
- If the array exceeds 50 entries, keep only the 50 most recent (FIFO)
- Use the Write tool to save the file

If any calls failed during processing (agent error, MCP timeout), mention them:
> ⚠ 1 call skipped due to errors: "{call_title}" — will be retried on next run.

Failed calls are NOT added to `processed_ids` so they'll be picked up next time.
```

**Step 2: Add reference data and safety rules**

```markdown
## Linear Project Reference

| Project | Keywords (for auto-mapping) |
|---------|-----------------------------|
| Chain Templates | chain, template, pipeline, multi-step, workflow chain |
| Template Library | template library, template catalog, preset, Wardley, SWOT, retro template |
| HARMONICA.md | harmonica.md, guidelines, system prompt, facilitation prompt |
| Cross-Pollination Engine | cross-pollination, cross-poll, deliberation linking, bridging |
| Session Reports | report, summary, export, session results, PDF |
| Analytics Dashboard | analytics, dashboard, metrics, PostHog, tracking |
| PostHog Instrumentation | instrumentation, events, posthog, telemetry, logging |
| Infrastructure | infra, deploy, CI/CD, database, migration, Neon, Vercel, auth |
| Workflow Automation | automation, digest, bot, cron, webhook, scheduled |
| Avatar SDK | avatar, CAP, knowledge avatar, conversational avatar |
| Harmonica API & MCP | API, MCP, endpoint, integration, SDK, harmonica-mcp |
| MCP & CLI Tools | CLI, slash command, harmonica-chat, harmonica-sync, tool |
| AI Orchestration | AI, LLM, orchestration, facilitator, bot behavior, prompt |
| Agentic Facilitation | agent, agentic, autonomous facilitation |
| Settings & Profile | settings, profile, preferences, account, user settings |
| Pricing & Billing | pricing, billing, stripe, subscription, plan, credits |
| Harmonica Website | website, landing page, marketing site |
| Marketing & Outreach | marketing, outreach, email, campaign, content |
| Sales & BizDev | sales, business development, partnership, enterprise |
| Product Growth | growth, onboarding, retention, activation, funnel |
| Marketing Research | competitor, market research, positioning, differentiation |

## Priority Mapping

| Language signals | Linear priority |
|------------------|----------------|
| "blocker", "critical", "ASAP", "before release", "urgent" | 1 (Urgent) |
| "important", "this week", "needs to happen", "high priority" | 2 (High) |
| "should", "next sprint", "would be good", no urgency signal | 3 (Normal) |
| "nice to have", "eventually", "low priority", "when we get to it" | 4 (Low) |

## Safety Rules

- **NEVER create or modify Linear issues without user confirmation** — always show action plan (Step 7) first
- **NEVER update issue status automatically** — only create new issues or add comments to existing ones
- **NEVER delete or close Linear issues**
- **Flag ambiguous overlaps** for user decision — when unsure if a finding matches an existing issue, ask
- **Preserve original quotes** from transcripts for traceability
- **Skip positive feedback** — log it in the action plan but don't create Linear issues for it
- **Idempotency** — `processed_ids` in the state file prevents reprocessing; if run twice in the same window, overlap search catches issues created in the first run
- **Error resilience** — if one call fails, continue processing the rest; failed calls are retried on next run
```

**Step 3: Commit**

```bash
git -C "C:/Users/temaz/claude-project" add .claude/commands/process-calls.md
git -C "C:/Users/temaz/claude-project" commit -m "feat(process-calls): add completion phase + reference tables + safety rules"
```

---

### Task 6: Register command in root CLAUDE.md and test

**Files:**
- Modify: `C:/Users/temaz/claude-project/CLAUDE.md` (add `/process-calls` to Custom Commands table)

**Step 1: Update CLAUDE.md custom commands table**

Add this row to the Custom Commands table in the root CLAUDE.md:

```markdown
| `/process-calls` | Process Harmonica calls from Fireflies → extract findings → create/enrich Linear issues → log to Notion |
```

**Step 2: Test the command**

Run `/process-calls --dry-run` in Claude Code to verify:
1. State file is read (or defaults are used)
2. Fireflies search returns results
3. Discovery table renders correctly
4. Dry-run stops after the table (no processing)

**Step 3: Run a real test**

Run `/process-calls --since 2026-02-24` to test the full pipeline on known calls (Gabriel and Chris from last week). Verify:
1. Both calls appear in discovery table
2. Agent extraction produces sensible findings
3. Overlap detection finds existing issues (HAR-134, HAR-202, etc.)
4. Action plan looks correct
5. After confirmation: issues are created/enriched, Notion entry is made, state file is written

**Step 4: Commit registration**

```bash
git -C "C:/Users/temaz/claude-project" add CLAUDE.md
git -C "C:/Users/temaz/claude-project" commit -m "docs: register /process-calls command in root CLAUDE.md"
```

**Step 5: Push harmonica-chat repo**

```bash
git -C "C:/Users/temaz/claude-project/harmonica-chat" push
```
