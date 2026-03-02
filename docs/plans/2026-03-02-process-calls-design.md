# `/process-calls` — Automated Fireflies-to-Linear Pipeline

**Date:** 2026-03-02
**Status:** Approved
**Scope:** New slash command in `~/.claude/commands/process-calls.md`

## Problem

After user testing calls and product discussions, we manually process Fireflies transcripts to extract findings, create/enrich Linear issues, and log to Notion. This takes ~20 minutes per call and follows a repeatable pattern. We want a slash command that automates the full pipeline for all Harmonica-related calls since last run.

## Command Interface

```
/process-calls [--since YYYY-MM-DD] [--dry-run]
```

- **No flags**: processes calls since `last_run` in state file (or 14 days ago on first run)
- **`--since`**: override start date
- **`--dry-run`**: show discovery table only, no processing

**State file:** `~/.claude/process-calls-state.json`

```json
{
  "last_run": "2026-03-02T14:30:00Z",
  "processed_ids": ["abc123", "def456"]
}
```

- `processed_ids` is a FIFO array capped at 50 most recent
- Prevents reprocessing calls from overlapping time windows

## Pipeline

### Phase 1 — Discovery & Confirmation

1. **Search Fireflies** with `keyword:"harmonica"` from `since_date`. Filter out already-processed IDs.
2. **Cross-reference Google Calendar** — fetch events since `since_date`, match against Fireflies results by title/date. Flag calendar events without matching Fireflies transcripts as "No recording" gaps.
3. **Present discovery table:**

```
| # | Call                          | Date       | Duration | Source     | Status       |
|---|-------------------------------|------------|----------|------------|--------------|
| 1 | Gabriel user testing          | 2026-02-24 | 45 min   | Fireflies  | Ready        |
| 2 | Chris product weekly          | 2026-02-26 | 84 min   | Fireflies  | Ready        |
| 3 | Metagov governance sync       | 2026-02-27 | 30 min   | Calendar   | No recording |
```

4. **User chooses** via AskUserQuestion:
   - "Process all" (recommended) — process all Ready calls
   - "Skip some" — follow-up to select which to skip
   - "Cancel" — abort

Calendar-only entries are shown as reminders but cannot be processed (no transcript).

### Phase 2 — Extraction (per call)

For each selected call:

1. **Dispatch Agent** to fetch full transcript and extract findings. Agent returns structured list:

```
- title: "Add session preview before publish"
  description: "User expected to see a preview..."
  quote: "I thought I'd be able to see what it looks like before sending"
  priority: high
  target_project: "User Experience > AI Orchestration"
```

2. **Check existing Linear issues** for overlap (search by keywords from each finding).

3. **Present action plan** per call:

```
| # | Finding                      | Action          | Target              |
|---|------------------------------|-----------------|---------------------|
| 1 | Add session preview          | New issue        | AI Orchestration    |
| 2 | Improve onboarding flow      | Enrich HAR-134   | Platform Core       |
| 3 | Mobile layout broken         | New issue        | User Experience     |
| 4 | Likes the template picker    | Skip (positive)  | —                   |
```

4. **User confirms** via AskUserQuestion: "Execute plan" / "Edit first" / "Skip this call"

5. **Execute**: create new issues, enrich existing ones (append "Additional insight from [call name]" section + quote), log call to Notion User Interviews DB.

### Phase 3 — Completion

1. **Summary table:**

```
| Call                          | New Issues | Enriched | Skipped | Notion |
|-------------------------------|------------|----------|---------|--------|
| Gabriel user testing (Feb 24) | 3          | 2        | 1       | yes    |
| Chris product weekly (Feb 26) | 2          | 6        | 4       | yes    |
```

2. **Update state file** — set `last_run` to current timestamp, append processed Fireflies IDs.

3. **Error handling** — if a call fails (agent timeout, MCP error), log error, skip it, continue with rest. Failed calls are NOT added to `processed_ids` (retried on next run).

## Dependencies

- **Fireflies MCP**: `fireflies_search`, `fireflies_get_transcript`
- **Linear MCP**: `list_issues`, `save_issue`, `create_comment`
- **Notion MCP**: `notion-create-pages` (User Interviews DB: `6d28eb6d-6a46-4348-9c54-b49c698d781d`)
- **Google Calendar**: native MCP connector at `https://gcal.mcp.claude.com/mcp` (or Zapier fallback)
- **Agent tool**: dispatches per-call extraction agents to keep main context clean

## Notion User Interviews DB Schema

| Property | Type | Usage |
|----------|------|-------|
| Name | title | Call title |
| Date | date | Call date |
| Participant | rich_text | Who was on the call |
| Product | select | "Harmonica" / "OFL" / etc. |
| Recording | url | Fireflies link |
| Linear Issues | rich_text | Comma-separated issue IDs |
| Key Findings | rich_text | Brief summary |
| Status | select | Raw → Processed → Actioned |

## Non-goals

- Processing non-Harmonica calls (use keyword filter)
- Automatic processing without confirmation (always confirm action plan)
- Replacing manual deep-dive analysis (this handles the mechanical extraction; nuanced strategic insights still need human review)
