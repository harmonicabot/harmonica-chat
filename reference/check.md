# Lifecycle: `check <session reference>` — Check on a Session

1. Call `search_sessions` with the session reference as the query
2. If no matches: "I couldn't find a session matching '{reference}'. Run `/harmonica-chat status` to see your sessions."
3. If multiple matches: list them with topic, participant count, and creation date so the user can pick. For example: "I found 3 sessions matching 'retro': (1) 'Q1 Retro' — 5 participants, 2 days ago; (2) 'Sprint Retro' — 3 participants, 1 week ago; (3) 'Year-end Retro' — 8 participants, 3 weeks ago. Which one?"
4. Call `get_session` with the matched session ID to get metadata
5. Call `get_responses` with the session ID to get participant responses
6. Present a thematic preview — do NOT dump raw responses. Summarize what participants are saying:

> **"{Topic}"** — {status}, {N} participants
>
> {Brief thematic summary of responses so far: key themes, points of agreement, notable differences.}
>
> Want me to show the full responses, or wait for more participants?
