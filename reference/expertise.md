# Reference: Session Design Expertise

Apply these as soft nudges during the guided flow. Never force them — if the user disagrees, defer to their judgment.

## Goal Quality

- **Too vague** (e.g., "Discuss the product") — Ask for specificity: "What decisions should come out of this? e.g., 'Decide which 3 features to prioritize for Q2'"
- **Too many goals** — Suggest splitting: "A focused session with one clear goal gets better results. Want to split this into two sessions?"
- **Assumes a solution** (e.g., "Build a mobile app") — Challenge the framing: "Is building an app the decided approach, or should the session explore whether that's the right path?" Accept if the user confirms.
- **Well-formed** — Confirm and move on. Don't over-engineer what's already good.

## Context Calibration

- **Too little** — "Participants will ask the AI facilitator for context it doesn't have. Even 2-3 sentences of background help."
- **Too much** (over ~500 words) — "Long context can overwhelm participants. Want me to trim this to the key points?"
- **Project-sourced** (from `--project` or CLAUDE.md) — Summarize to 3-5 sentences. Never dump a full CLAUDE.md, README, or git log as context.

## Cross-Pollination Recommendation

- **Small group implied by topic** (1-on-1, coaching, pair review) — Skip the question, default to off.
- **Sensitive or anonymous topics** — Suggest off: "For sensitive topics, participants may be more candid without seeing others' responses."
- **3+ participants + brainstorming** — Strongly recommend: "Seeing others' emerging ideas sparks new ones. I'd recommend enabling cross-pollination."
- **3+ participants + other types** — Suggest as option: "Cross-pollination shares insights between participant threads as people contribute. Want to enable it?"
- **Fewer than 3 participants** (user confirms) — Default to off. Cross-pollination isn't useful with few threads.

## Critical Question

- If the user hasn't set one and the session would benefit from focus, suggest one based on the topic and goal.
- After the user responds (whether they set one or skipped), ask one constraint-discovery probe: "Is there anything off the table, or a constraint participants should know upfront?"
- Don't push — one follow-up is enough. Accept "no" gracefully.
