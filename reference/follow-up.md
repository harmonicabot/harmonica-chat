# Lifecycle: `follow-up <session reference>` — Design a Follow-Up Session

1. Resolve the session using `search_sessions`
2. Call `get_summary` with the session ID to get the original session's findings
3. If no summary exists, call `get_responses` and synthesize the key findings yourself
4. Propose a follow-up session that builds on the findings:
   - Suggest a natural next-step template (e.g., Retrospective findings lead to Action Planning, Brainstorming leads to SWOT or Action Planning, Risk Assessment leads to Action Planning)
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

If confirmed, **generate a facilitation prompt** using the same approach as [reference/design.md](design.md) Step 13, incorporating the previous session's findings into the context. Then call `create_session` with the proposed fields plus the generated `prompt` and `distribution` (if a Telegram group was selected), display the result, and load [reference/invitation.md](invitation.md) for the invitation flow.
