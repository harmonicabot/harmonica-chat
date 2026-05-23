# Lifecycle: `review <session reference>` — Review Facilitation Quality and Improve Prompts

Analyze participant transcripts to identify what worked, what didn't, and suggest specific prompt improvements.

**1. Resolve the session.** If a session ID is provided, use `get_session`. If topic text is provided, use `search_sessions`. If empty, use `list_sessions` with `limit: 10` and ask the user to pick.

**2. Pull all transcripts** via `get_responses`. Keep only participants with 3+ user messages — skip drive-bys who joined but didn't engage.

**3. Analyze each transcript across five dimensions:**

- **Structure adherence** — did the facilitator follow the prompt's question flow? Ask ONE question at a time? Keep messages to 2-3 sentences?
- **Engagement quality** — where did the participant give short / vague answers, and what preceded those moments? Where did they engage deeply, and what prompted that? Did they drop off, and at what point?
- **Cross-pollination** (if enabled) — did it trigger, how many times, was the timing appropriate (not too early, not interrupting a deep answer)? Were insights relevant and concise? Did the participant engage with the insight or ignore it?
- **Edge case handling** — "not sure" / vague answers (did the facilitator help or just rephrase?); meta questions like "how many people?" (handled honestly?); session ending (clean exit or awkward continuation?); fourth-wall breaks (did the facilitator reference "this group" or session mechanics?)
- **Goal alignment** — did the conversation serve the session's stated goal? Did the facilitator steer toward it, or drift?

**4. Aggregate patterns across transcripts.** Identify:

- **Common failure modes** — issues that appeared in 2+ transcripts
- **Common success patterns** — what consistently worked well
- **Cross-pollination effectiveness** — overall hit rate, quality, timing
- **Drop-off points** — where participants commonly disengage
- **Missing capabilities** — things the facilitator should do but can't

**5. For each pattern, propose a specific prompt fix.** Every pattern in step 4 must produce a concrete change. The connection between "participants kept doing X" and "change the prompt to handle X" must be explicit.

Examples of pattern → fix:
- "4/7 participants asked 'what group?'" → remove "this group" from question, name the actual cohort
- "3/7 said 'not sure' to the same question" → rephrase, or add a rule to offer other participants' answers as a starting point
- "5/7 gave 1-word answers to question 3" → the question is too abstract, make it concrete
- "Cross-pollination insight was ignored in 3/4 cases" → insights are too long or poorly timed, adjust generation prompt

Use this format for each issue:

```
## Issue: [description]
Evidence: [N/M transcripts]
Example: [participant] said "[quote]" in response to "[facilitator question]"

Current prompt: "[exact text causing the problem]"
Suggested change: "[new text]"
Reason: [why this fixes it, based on the transcript evidence]
```

Every Example must include both the literal participant quote AND the facilitator question that prompted it. No hand-waving with "participant X seemed disengaged at step 3" — quote the exchange.

Changes are one of:
- **Prompt rule additions** — new rules in the prompt's ### Rules section
- **Question rewrites** — modify specific questions in the prompt's ### Flow section
- **Systemic fixes** — needs code changes (create Linear issue with the right project)

**6. Present findings as:**

```markdown
## Session Review: "[topic]"

**Participants reviewed:** N of M (filtered to 3+ messages)
**Cross-pollination:** triggered N times across M participants
**Session goal:** [goal]

### What Worked
- [pattern]: seen in N/M transcripts

### Issues Found
1. **[issue]** (N/M transcripts)
   - Example: [participant] said "[quote]" in response to "[facilitator question]"
   - Suggested fix: [specific change]

### Prompt Changes
[Each change with before/after]

### Linear Issues
[Systemic issues needing code changes, with suggested project]
```

**7. Apply changes.** Ask the user:
- "Apply these prompt changes to the session?" → use `update_session`
- "Create Linear issues for systemic problems?" → create with the right project
- "Save findings for future reference?" → save to `docs/session-reviews/` in the relevant project

## Key principles

- **Evidence over opinion** — every finding cites a specific transcript moment, with both participant quote and the facilitator prompt that produced it.
- **Patterns over incidents** — single occurrences are notes; repeated issues (2+ transcripts) are findings.
- **Actionable over descriptive** — every issue gets a concrete fix proposal.
- **Prompt changes are cheap, code changes are expensive** — suggest prompt changes freely; gate code changes through Linear issues.
- **The facilitator is the product** — its behavior IS the user experience. Small wording shifts compound.
