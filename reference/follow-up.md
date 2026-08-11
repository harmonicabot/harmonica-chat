# Lifecycle: `follow-up <session reference>` — Design a Follow-Up Session

1. Resolve the session — same logic as [reference/check.md](check.md) step 1 (UUID-shaped → `get_session` directly; otherwise `search_sessions` + disambiguation).
2. Call `get_summary` with the session ID to get the original session's findings
3. If no summary exists, call `get_responses` and synthesize the key findings yourself
4. Call `list_templates` to fetch the current platform template library. Propose a follow-up session that builds on the findings:
   - Suggest a natural next-step template from the live `list_templates` result. Look for category-level chains: a looking-back template's findings typically suggest a planning template next; a divergent template suggests a narrowing or planning one; a risk-assessment template suggests a planning/mitigation one. Pick the closest available template, or propose freeform if nothing fits.
   - Auto-fill `context` with a summary of the previous session's key findings
   - Propose a topic: e.g., "Action items from: {original topic}"
   - Propose a goal based on the summary themes

Present the proposal:

> Based on your "{original topic}" session, here's a follow-up I'd suggest:
>
>     Topic:              {proposed topic}
>     Template:           {suggested template}
>     Goal:               {proposed goal}
>     Context:            {summary of previous session findings}
>     Cross-pollination:  {recommendation}
>
> Want to create this, or adjust anything?

If confirmed, **handle the facilitation prompt per [reference/design.md](design.md) Step 13** — only generate a freeform prompt when no template was chosen; when `template_id` is set, omit `prompt` from `create_session` so Harmonica generates it from the brief while retaining template behavior. For freeform follow-ups, incorporate the previous session's findings into the prompt's Background. Call `create_session` with the proposed fields, `distribution` (if a Telegram group was selected), display the result, and load [reference/invitation.md](invitation.md) for the invitation flow.
