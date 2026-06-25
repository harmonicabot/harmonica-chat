# Mode: Guided Session Design

Walk the user through designing a session one question at a time. CRITICAL: Ask each question individually. Wait for the user's response before moving to the next question. Never bundle multiple questions together.

**Intro:**

Start with a brief orientation so the user knows what to expect:

> I'll help you **design** a Harmonica session. We'll go through a few questions — topic, goal, context, and a couple of options. Once everything looks good, I'll create the session and give you a shareable link for participants to join.
>
> The actual conversation happens in the Harmonica web app — each participant gets their own 1-on-1 chat with an AI facilitator.

**Step 1 — Intent:**

Ask:

> What kind of conversation do you want to facilitate? For example: team retrospective, product feedback, brainstorming, stakeholder alignment, research interviews...

Wait for the user's response.

**Step 2 — Template Match:**

Call the `list_templates` MCP tool to fetch the live platform template library. Templates are managed by Harmonica admins — what `list_templates` returns IS the source of truth. Do not rely on a hardcoded list.

Match the user's intent (from Step 1) against the returned templates by title and description. Pick the strongest match plus optionally a plausible second.

Use `AskUserQuestion` to present the choice:

- **Question:** "Which session format works best?"
- **Header:** "Template"
- **Options:**
  - Label: "{template title} (Recommended)", Description: "{template description, truncated to one sentence}"
  - Label: "Custom design", Description: "Design a freeform session without a template"
  - *(If a second template is a plausible fit, include it as a third option)*

If no template matches well, skip this step and proceed freeform — don't force a template choice.

Wait for the user's response. Record the template choice (template ID or "custom/freeform").

**Step 3 — Topic:**

Ask:

> What's the topic for this session? This is what participants will see when they join.

Wait for the user's response.

**Step 4 — Goal:**

Ask:

> What should this session achieve? What decisions or insights do you want at the end?

Wait for the user's response. Apply goal quality checks:

1. **Goal Quality nudge** — if the goal is vague, ask for specificity. If it contains too many goals, suggest splitting. (See [reference/expertise.md](expertise.md).)
2. **Framing challenge** — if the goal assumes a specific solution or approach (e.g., "Build a mobile app for X", "Migrate to microservices"), gently challenge the framing before accepting it: "You've framed this as *building X* — is that the decided approach, or should the session also explore whether that's the right path? Sometimes the framing itself is worth questioning." If the user confirms their framing is intentional, accept it and move on. Don't push more than once.

**Step 5 — Context:**

Ask:

> Is there background info participants should know going in? This helps the AI facilitator guide the conversation. (You can skip this)

Wait for the user's response. Apply the **Context Calibration** nudge from [reference/expertise.md](expertise.md): if too little, gently suggest adding a few sentences. If too much (over ~500 words), offer to trim.

**Step 6 — Critical Question:**

Ask:

> Is there a specific question participants MUST address in this session? Think of it as: what would make this session a failure if it goes unanswered? For example, "Should we pursue option A or B?" or "What's the biggest risk we're ignoring?" (You can skip this)

Wait for the user's response. Then apply **constraint discovery** — a short Socratic follow-up to help surface constraints the user may not have articulated:

- If the user **provided** a critical question: ask one follow-up probe based on what they said. For example: "Got it. Is there anything that's off the table — a constraint participants should know about upfront?" or "Are there stakeholders or perspectives that must be represented for this to succeed?" Accept whatever they say (including "no, that's it") and move on.
- If the user **skipped**: based on the topic and goal, suggest a critical question and one constraint. For example: "Based on your goal, the key question might be '{suggested question}'. And one constraint worth stating: {suggested constraint}. Want to add either of these, or skip?" Don't push if they decline.

Keep this to one follow-up exchange — don't loop.

**Step 7 — Cross-Pollination:**

Decide whether to ask about cross-pollination based on what you already know from prior steps:

- If the topic/intent clearly implies a small group (e.g., "1-on-1 feedback", "coaching session", "pair review") — skip this question and default to off.
- If it involves sensitive or anonymous topics — suggest keeping it off: "For sensitive topics, participants may be more candid without seeing others' responses. I'll leave cross-pollination off."
- Otherwise — use `AskUserQuestion`:

  - **Question:** "Enable cross-pollination? It shares emerging ideas between participant threads as people contribute."
  - **Header:** "Cross-poll"
  - **Options:**
    - Label: "Enable (Recommended)" or "Enable", Description: "Participants see highlights from other threads — great for brainstorming and building on each other's ideas" *(use "Recommended" for brainstorming/divergent sessions)*
    - Label: "Disable", Description: "Each participant converses privately with the facilitator — better for sensitive topics or small groups"

If the user says yes to 3+ participants, apply the **Cross-Pollination Recommendation** logic in [reference/expertise.md](expertise.md) to decide whether to mark Enable as "(Recommended)".

Wait for the user's response.

**Step 8 — Polls and Ratings:**

Decide whether to ask about Polls and ratings based on what you already know from prior steps:

- If the topic/intent is clearly open-ended exploration (storytelling, lived experience, sensitive narratives, 1-on-1 coaching) — skip this question and default to off. Widgets are about narrowing, not opening.
- If the session involves prioritisation, scoring, choosing between known options, or rating something specific (retrospective ratings, feature prioritisation, agreement scales, vote-narrowing) — suggest enabling.
- Otherwise — use `AskUserQuestion`:

  - **Question:** "Enable Polls and ratings? The AI facilitator can offer participants poll, rating, and ranking inputs when narrowing down or prioritising — instead of a plain text question."
  - **Header:** "Polls/ratings"
  - **Options:**
    - Label: "Enable (Recommended)" or "Enable", Description: "Useful when participants need to rank, rate, or pick between options the conversation surfaces" *(use "Recommended" for prioritisation / scoring sessions)*
    - Label: "Disable", Description: "Pure text conversation — better for open-ended narrative, sensitive topics, or exploration"

Store the answer as `widgets_enabled: true/false` for inclusion in the confirm summary and `create_session` call.

Wait for the user's response.

**Step 9 — Results Visibility:**

Decide who can see aggregated session results after participants finish. Three values:

- **`host`** — only the session owner can see results. Defaults for private review.
- **`participants`** — anyone who completed the session sees what others said (drives the end-of-chat "See what others said" link).
- **`public`** — anyone with the session URL can see results without participating. Use for public sense-making.

Apply these defaults:

- If the topic involves sensitive disclosures, internal reviews, or 1-on-1 coaching — default to `host` and skip the question.
- If the session is **distributed to Telegram or shared publicly** (will likely be true if Step 8 cross-pollination is on or distribution is set in Step 10) — strongly suggest `participants`.
- Otherwise — use `AskUserQuestion`:

  - **Question:** "Who can see the session results once participants finish?"
  - **Header:** "Results"
  - **Options:**
    - Label: "Participants (Recommended)" or "Participants", Description: "Anyone who completed the session can see what others said. Drives the end-of-chat 'See what others said' link." *(use "Recommended" for distributed / cross-pollinated sessions)*
    - Label: "Host only", Description: "Only the session owner sees the aggregated results. Participants only see their own conversation."
    - Label: "Public", Description: "Anyone with the session URL sees results without participating. Use for public sense-making."

Store the answer as `results_visibility: "host" | "participants" | "public"` for inclusion in the confirm summary and `create_session` call. Default to `participants` if the user skipped the question via heuristic.

Wait for the user's response.

**Step 10 — Telegram Distribution:**

Check if the user has Telegram groups registered by calling `list_telegram_groups`. If the tool is not available or returns no groups, skip this step silently and proceed to Step 11.

If groups are found, ALWAYS present ALL groups and let the user choose. NEVER skip this step or filter groups based on whether their names seem relevant to the session topic — the user decides which group to use.

Use `AskUserQuestion`:

- **Question:** "Distribute this session to a Telegram group? The bot will announce it and participants can join via DM."
- **Header:** "Telegram"
- **Options:**
  - One option per group: Label: "{group_name}", Description: "Telegram group (ID: {group_id})"
  - Final option: Label: "Skip", Description: "Don't distribute to Telegram — share the link yourself"

If the user selects a group, store `distribution: [{ channel: "telegram", group_id: "{selected_group_id}" }]` for inclusion in the confirm summary and `create_session` call.

Wait for the user's response.

**Step 11 — Pre-Session Questions:**

Pre-session questions are shown to participants before the conversation starts (e.g. name, role, team). Propose sensible defaults based on the session context:

- **Telegram distribution**: Default to just `Name` (the bot already has the user's Telegram ID — email is unnecessary)
- **Web-only (no Telegram)**: Default to `Name` and `Email` (matching the web app defaults)
- **Team/organizational sessions**: Consider adding `Role` or `Team`

Present the defaults and ask if they want to adjust:

> Pre-session questions (participants answer these before the conversation):
> 1. Name
> {2. Email — only if no Telegram distribution}
>
> Want to add, remove, or change any questions? Or keep these defaults?

If the user wants to customize, adjust the list accordingly. If they say "none" or "skip questions", pass an empty array. Accept whatever they decide — don't push.

Store the final questions list for inclusion in the `create_session` call.

**Step 12 — Confirm:**

Present a summary of all gathered fields, then use `AskUserQuestion` to confirm:

> Here's your session design:
>
>     Topic:              {topic}
>     Template:           {template name or "Custom"}
>     Goal:               {goal}
>     Context:            {context or "None"}
>     Critical question:  {critical or "None"}
>     Cross-pollination:  {Yes/No}
>     Polls and ratings:  {Yes/No}
>     Results visibility: {host / participants / public}
>     Telegram:           {group_name or "None"}
>     Questions:          {comma-separated list or "None"}

- **Question:** "Ready to create this session?"
- **Header:** "Confirm"
- **Options:**
  - Label: "Create session", Description: "Launch the session and get a shareable join URL"
  - Label: "Edit something", Description: "Go back and change a specific field"
  - Label: "Cancel", Description: "Discard and start over"

If the user picks "Edit something", ask which field to change and go back to that specific step. When returning to the confirm step after an edit, highlight what changed using diff formatting:

> Updated session design:
>
>     Topic:              {topic}
>     Template:           {template}
>     Goal:
> ```diff
> - {old goal}
> + {new goal}
> ```
>     Context:            {context or "None"}
>     Critical question:  {critical or "None"}
>     Cross-pollination:  {Yes/No}
>     Polls and ratings:  {Yes/No}
>     Results visibility: {host / participants / public}
>     Telegram:           {group_name or "None"}
>     Questions:          {comma-separated list or "None"}

Only show diff formatting for the field(s) that actually changed. Unchanged fields display normally.

**Step 13 — Facilitation Prompt:**

The facilitation prompt depends on whether a template was chosen in Step 2:

- **A template was chosen** (`template_id` is set) — **do NOT generate a prompt yourself**. The platform has each template's `facilitation_prompt` stored in the `templates` table; it will use it automatically when `create_session` is called with `template_id`. Omitting the `prompt` field lets the template do its job. If you generate a prompt anyway, you'll override the curated template prompt with one you invented from outside, which defeats the point of picking the template.
- **Freeform** (no template, or template fell through) — generate a tailored prompt using the structure below. Without it, the facilitator falls back to a generic "skilled facilitator" system prompt that knows nothing about your topic.

Freeform prompt structure:

```
You are a facilitator running a short, focused async session. Keep every message SHORT — 2-3 sentences max. Never ask more than ONE question at a time. Wait for the answer before moving on.

Session: {topic}
Objective: {goal}
{if context: Background: {context}}
{if critical: Critical question: {critical}}

### Flow

1. Welcome the participant in 1-2 sentences. Then ask your first question: "{opening question derived from goal}"
2. After they answer, ask: "{second question}"
3. After they answer, ask: "{third question}"
{...continue as needed, typically 4-6 questions total}
{N}. Thank them and summarize their key points in a short bullet list.

### Rules
- ONE question per message. Never combine questions.
- Keep messages under 3 sentences. No walls of text.
- Use bullet points and emojis sparingly for readability.
- If an answer is vague, ask ONE short follow-up. Then move on.
- Don't explain the format or number of steps upfront — just start the conversation naturally.
```

Derive 4-6 natural conversational questions from the goal. Neutral professional tone unless the topic suggests otherwise.

**Important**: The prompt should be specific to THIS session — weave in the actual topic, goal, and context into the questions themselves. A prompt about "NSRT community meetup planning" should ask about neighborhood needs, not generic facilitation questions. This is the key difference from the generic fallback.

**Important**: The flow should feel like a natural 1-on-1 conversation, not a survey. Each question should build on the previous answer where possible. The facilitator adapts — it doesn't rigidly follow a script.

Do NOT show the generated prompt to the user unless they ask. Just generate it internally for the `create_session` call.

**Step 13b — Facilitation Prompt for Telegram Distribution (freeform only):**

If you generated a freeform prompt AND distribution is set to a Telegram group, add this guideline to the prompt's Rules section:

```
- This session is distributed via Telegram. Some participants may join from mobile devices — keep messages concise and mobile-friendly.
```

(For template-backed sessions, mobile-friendliness is the template author's call — don't second-guess it.)

**Step 14 — Create:**

Call the `create_session` MCP tool with the gathered fields:
- `topic` (required)
- `goal` (required)
- `template_id` (if a template was chosen — use the exact ID returned by `list_templates` in Step 2)
- `prompt` — **freeform sessions only**. Pass the prompt generated in Step 13. **Omit entirely when `template_id` is set** so the platform uses the template's stored `facilitation_prompt`.
- `context` (if provided)
- `critical` (if provided)
- `cross_pollination` (true/false)
- `widgets_enabled` (true/false from Step 8)
- `results_visibility` ("host" / "participants" / "public" from Step 9 — default "participants" if user wasn't asked)
- `distribution` (if a Telegram group was selected — array: `[{ "channel": "telegram", "group_id": "{id}" }]`)
- `questions` (the list from Step 11 — array of `{ "text": "..." }` objects, or omit if the host chose no questions)

Requires `harmonica-mcp` ≥ 0.11.0 for `list_templates` (Step 2). For `widgets_enabled` / `results_visibility` (≥ 0.6.0): if the MCP rejects either field, fall back to omitting it and inform the user that their MCP server is out of date.

If the `create_session` call fails with a template validation error, retry without `template_id` (fall back to freeform — generate a prompt per Step 13 and pass it). Inform the user: "That template isn't available on your Harmonica instance. I've created a freeform session instead."

On success, display:

> Your session is ready!
>
>     Topic:    {topic}
>     Join URL: {join_url}
>
> Share the join URL with participants. The conversation happens in the Harmonica web app — each person gets their own private 1-on-1 chat with the AI facilitator you just designed.

If distribution was set to a Telegram group, also display:

> The Harmonica Telegram bot will announce this session in **{group_name}**. Participants can join directly from the group chat.

Then load [reference/invitation.md](invitation.md) and run the invitation flow.
