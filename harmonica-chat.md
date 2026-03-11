<!-- harmonica-chat v2.8.0 -->
# Harmonica — Session Companion

Design, create, and manage Harmonica deliberation sessions through conversation.

## Arguments

- `$ARGUMENTS` — optional. Can be empty (guided mode), a topic for quick creation, or a lifecycle command (`status`, `check`, `summary`, `follow-up`).

## Prerequisites

### Version Check

Fetch the latest version from GitHub to check if this command is up to date:

```bash
curl -sf https://raw.githubusercontent.com/harmonicabot/harmonica-chat/master/harmonica-chat.md | head -1
```

Compare the version in the first line of the response (`<!-- harmonica-chat vX.Y.Z -->`) against `v2.5.0` (this file's version). If the remote version is newer, inform the user before proceeding:

> **Update available:** harmonica-chat `v{remote}` is out (you have `v2.5.0`). Run this to update:
> ```
> curl -sL https://raw.githubusercontent.com/harmonicabot/harmonica-chat/master/harmonica-chat.md -o ~/.claude/commands/harmonica-chat.md
> ```

If the fetch fails (network error, timeout), skip silently and proceed — don't block session creation over an update check.

### MCP Check

Check if harmonica-mcp is available by attempting to call the `list_sessions` tool with `limit: 1`.

If the tool responds successfully, proceed to **Instructions**.

If the tool is not available (tool not found, connection error, or similar failure), guide the user through setup:

> **Harmonica MCP server not found.** Let me help you set it up:
>
> 1. **Get a Harmonica account** — [Sign up free](https://app.harmonica.chat) if you don't have one
> 2. **Generate an API key** — Go to [Profile](https://app.harmonica.chat/profile) > API Keys > Generate API Key. Copy the `hm_live_...` key.
> 3. **Install the MCP server** — Run this command (replace with your actual key):
>    ```
>    claude mcp add-json harmonica '{"command":"npx","args":["-y","harmonica-mcp"],"env":{"HARMONICA_API_KEY":"hm_live_YOUR_KEY_HERE"}}' -s user
>    ```
> 4. **Restart Claude Code** to load the new MCP server.
>
> Then run `/harmonica-chat` again.

Then STOP. Do not proceed with any other step until harmonica-mcp is available and responding.

## Instructions

### Language Rule

All session metadata — topic, goal, context, critical question, and facilitation prompt — **MUST be in English**. Even if the conversation with the user is in another language, translate all fields to English before creating the session. Harmonica's facilitation layer is English-only; non-Latin characters (Cyrillic, CJK, etc.) get corrupted into `???` in titles, descriptions, and prompts. Only the actual participant chat during the session supports other languages.

### Argument Parsing

Parse `$ARGUMENTS` to determine which mode to enter:

1. **Empty or no arguments** — Go to **Mode 1: Guided Session Design**
2. **First word is an action keyword** (`status`, `check`, `summary`, `follow-up`) — Go to **Mode 3: Lifecycle Commands**
   - Everything after the keyword is the session reference (topic text or partial match)
3. **Anything else** (topic text, flags, etc.) — Go to **Mode 2: Accelerated Creation**
   - Extract the topic: first quoted string, or all text before the first `--` flag
   - Extract `--project <dir>` if present
   - If only `--project <dir>` is present with no topic text, still go to Mode 2 — detect the project first and ask for a topic based on the project context

### Structured Choices

For steps with known options (template selection, cross-pollination, confirmation), use the `AskUserQuestion` tool to present structured choices instead of free-text prompts. This makes the flow faster and less ambiguous. The tool always includes an "Other" option for custom input, so users can still type freely if none of the options fit.

### Mode 1: Guided Session Design

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

Using the user's intent and the **Template Matching** reference table below, identify the best-matching template. Use `AskUserQuestion` to present the choice:

- **Question:** "Which session format works best?"
- **Header:** "Template"
- **Options:**
  - Label: "{template name} (Recommended)", Description: "{1-2 sentence explanation of what this template does}"
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

1. **Goal Quality nudge** — if the goal is vague, ask for specificity. If it contains too many goals, suggest splitting. (See Session Design Expertise below.)
2. **Framing challenge** — if the goal assumes a specific solution or approach (e.g., "Build a mobile app for X", "Migrate to microservices"), gently challenge the framing before accepting it: "You've framed this as *building X* — is that the decided approach, or should the session also explore whether that's the right path? Sometimes the framing itself is worth questioning." If the user confirms their framing is intentional, accept it and move on. Don't push more than once.

**Step 5 — Context:**

Ask:

> Is there background info participants should know going in? This helps the AI facilitator guide the conversation. (You can skip this)

Wait for the user's response. Apply the **Context Calibration** nudge: if too little, gently suggest adding a few sentences. If too much (over ~500 words), offer to trim.

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

If the user says yes to 3+ participants, apply the **Cross-Pollination Recommendation** logic from Session Design Expertise to decide whether to mark Enable as "(Recommended)".

Wait for the user's response.

**Step 8 — Telegram Distribution:**

Check if the user has Telegram groups registered by calling `list_telegram_groups`. If the tool is not available or returns no groups, skip this step silently and proceed to Step 9.

If groups are found, use `AskUserQuestion`:

- **Question:** "Distribute this session to a Telegram group? The bot will announce it and participants can join via DM."
- **Header:** "Telegram"
- **Options:**
  - One option per group: Label: "{group_name}", Description: "Telegram group (ID: {group_id})"
  - Final option: Label: "Skip", Description: "Don't distribute to Telegram — share the link yourself"

If the user selects a group, store `distribution: [{ channel: "telegram", group_id: "{selected_group_id}" }]` for inclusion in the confirm summary and `create_session` call.

Wait for the user's response.

**Step 9 — Pre-Session Questions:**

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

**Step 10 — Confirm:**

Present a summary of all gathered fields, then use `AskUserQuestion` to confirm:

> Here's your session design:
>
>     Topic:              {topic}
>     Template:           {template name or "Custom"}
>     Goal:               {goal}
>     Context:            {context or "None"}
>     Critical question:  {critical or "None"}
>     Cross-pollination:  {Yes/No}
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
>     Telegram:           {group_name or "None"}
>     Questions:          {comma-separated list or "None"}

Only show diff formatting for the field(s) that actually changed. Unchanged fields display normally.

**Step 11 — Generate Facilitation Prompt:**

Before creating the session, generate a tailored facilitation prompt so the AI facilitator understands the specific session context. Without this, the facilitator only gets a generic "skilled facilitator" system prompt that knows nothing about the topic.

Generate a prompt following this structure:

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

Design the flow questions to match the session's purpose:
- **Retrospective**: What went well → what didn't → what to change → who owns what. Reflective tone.
- **Brainstorming**: Open idea prompt → build on it → any more? → which is your favorite. Energetic tone.
- **SWOT**: Biggest strength → biggest weakness → opportunity → threat. Analytical tone.
- **Action Planning**: What's the problem → what's one fix → impact/effort → who owns it. Practical tone.
- **Risk Assessment**: What could go wrong → how likely → how to mitigate. Serious tone.
- **Freeform**: Derive 4-6 natural conversational questions from the goal. Neutral professional tone.

**Important**: The prompt should be specific to THIS session — weave in the actual topic, goal, and context into the questions themselves. A prompt about "NSRT community meetup planning" should ask about neighborhood needs, not generic facilitation questions. This is the key difference from the generic fallback.

**Important**: The flow should feel like a natural 1-on-1 conversation, not a survey. Each question should build on the previous answer where possible. The facilitator adapts — it doesn't rigidly follow a script.

Do NOT show the generated prompt to the user unless they ask. Just generate it internally for the `create_session` call.

**Step 11b — Facilitation Prompt for Telegram Distribution:**

If distribution is set to a Telegram group, add this guideline to the generated facilitation prompt's Guidelines section:

```
- This session is distributed via Telegram. Some participants may join from mobile devices — keep messages concise and mobile-friendly.
```

**Step 12 — Create:**

Call the `create_session` MCP tool with the gathered fields:
- `topic` (required)
- `goal` (required)
- `prompt` (the facilitation prompt generated in Step 11)
- `template_id` (if a template was chosen — use the exact ID from the Template Matching table)
- `context` (if provided)
- `critical` (if provided)
- `cross_pollination` (true/false)
- `distribution` (if a Telegram group was selected — array: `[{ "channel": "telegram", "group_id": "{id}" }]`)
- `questions` (the list from Step 9 — array of `{ "text": "..." }` objects, or omit if the host chose no questions)

If the `create_session` call fails with a template validation error, retry without `template_id` (fall back to freeform). Inform the user: "That template isn't available on your Harmonica instance. I've created a freeform session instead."

On success, display:

> Your session is ready!
>
>     Topic:    {topic}
>     Join URL: {join_url}
>
> Share the join URL with participants. The conversation happens in the Harmonica web app — each person gets their own private 1-on-1 chat with the AI facilitator you just designed.

If distribution was set to a Telegram group, also display:

> The Harmonica Telegram bot will announce this session in **{group_name}**. Participants can join directly from the group chat.

Then proceed to the **Invitation Flow** section.

### Mode 2: Accelerated Creation

The user provided a topic in `$ARGUMENTS`. Skip the intent and topic questions and proceed with a faster flow.

**Step 1 — Template Match:**

Using the topic text and the **Template Matching** reference table, identify the best-matching template. If no template matches well, proceed freeform without asking.

If a template matches, use `AskUserQuestion`:

- **Question:** "Which session format works best for '{topic}'?"
- **Header:** "Template"
- **Options:**
  - Label: "{template name} (Recommended)", Description: "{1-2 sentence explanation}"
  - Label: "Freeform", Description: "No template — I'll design the session structure from your goal"

Wait for the user's response.

**Step 2 — Goal:**

Ask:

> What should this session achieve?

Wait for the user's response. Apply goal quality nudges.

**Step 3 — Remaining Questions:**

Ask about context, critical question, cross-pollination, and Telegram distribution only if relevant. If the topic and goal give enough signal, you can propose sensible defaults and ask for confirmation rather than asking each one individually. For example:

> I'll skip the context since the topic is self-explanatory, and enable cross-pollination since this is a brainstorming session with likely multiple participants. Sound good?

**Telegram distribution:** Call `list_telegram_groups`. If groups exist, ask the user whether to distribute to one (same `AskUserQuestion` pattern as Mode 1 Step 8). If no groups or tool unavailable, skip silently.

**Step 4 — Confirm & Create:**

Present a summary of all gathered fields, then use `AskUserQuestion` to confirm:

> Here's your session design:
>
>     Topic:              {topic}
>     Template:           {template name or "Freeform"}
>     Goal:               {goal}
>     Context:            {context or "None"}
>     Critical question:  {critical or "None"}
>     Cross-pollination:  {Yes/No}
>     Telegram:           {group_name or "None"}

- **Question:** "Ready to create this session?"
- **Header:** "Confirm"
- **Options:**
  - Label: "Create session", Description: "Launch the session and get a shareable join URL"
  - Label: "Edit something", Description: "Go back and change a specific field"
  - Label: "Cancel", Description: "Discard and start over"

If the user picks "Edit something", ask which field to change and go back to that step. When returning to confirm after an edit, use diff formatting to highlight what changed (same approach as Mode 1 Step 9).

**Generate the facilitation prompt** using the same approach as Mode 1 Step 11 (Generate Facilitation Prompt). Adapt the steps and questions to the session's topic, goal, and context.

Call the `create_session` MCP tool with the gathered fields:
- `topic` (required)
- `goal` (required)
- `prompt` (the generated facilitation prompt)
- `template_id` (if a template was chosen — use the exact ID from the Template Matching table)
- `context` (if provided)
- `critical` (if provided)
- `cross_pollination` (true/false)
- `distribution` (if a Telegram group was selected — array: `[{ "channel": "telegram", "group_id": "{id}" }]`)
- `questions` (same defaults as Mode 1 Step 9: just `Name` for Telegram sessions, `Name` + `Email` for web-only. Ask the host if they want to adjust.)

If the `create_session` call fails with a template validation error, retry without `template_id` (fall back to freeform). Inform the user: "That template isn't available on your Harmonica instance. I've created a freeform session instead."

On success, display:

> Your session is ready!
>
>     Topic:    {topic}
>     Join URL: {join_url}
>
> Share the join URL with participants. The conversation happens in the Harmonica web app — each person gets their own private 1-on-1 chat with the AI facilitator you just designed.

If distribution was set to a Telegram group, also display:

> The Harmonica Telegram bot will announce this session in **{group_name}**. Participants can join directly from the group chat.

Then proceed to the **Invitation Flow** section.

#### Project-Aware Creation

If `--project <dir>` was provided, or if a workspace directory name appears in the topic text, enrich the session with project context.

**Project resolution order:**
1. Explicit `--project <dir>` flag value
2. Directory name mentioned in the topic, matched against sibling directories in the current workspace
3. Current working directory if it is inside a project subdirectory

**When a project is detected:**

If the resolved directory doesn't exist, tell the user ("I couldn't find a '{dir}' directory") and fall back to standard Mode 2 without project context.

1. Read the project's `CLAUDE.md` using the Read tool to understand what the project is about. If no `CLAUDE.md` exists, try `README.md` instead. If neither exists, ask the user to briefly describe the project.
2. Check recent git history by running `git log --oneline --since='2 weeks ago'` in the project directory. If the directory is not a git repo (command fails), skip activity-based suggestions and proceed with whatever context you gathered from step 1.
3. Summarize the project and recent work in 2-3 sentences
4. Auto-fill the session's `context` field with this summary (keep it to 3-5 sentences — never dump the full CLAUDE.md or git log). **Expand all abbreviations and jargon**: if the project is "NSRT" explain it as "Novi Sad Relational Tech — community tools for Novi Sad residents"; if it's "OFL" say "Open Facilitation Library". The facilitation prompt will be built from this context, so ambiguous terms like "relational" must be disambiguated explicitly.
5. Suggest a session type based on recent activity patterns (skip if git history was unavailable):
   - Many recent commits or a completed milestone — Retrospective
   - New feature branch or early design work — Brainstorming
   - Bug fixes or incident responses — Risk Assessment
   - No recent activity — skip the suggestion, ask normally

Present the auto-generated context and session type suggestion to the user for confirmation before proceeding:

> I read the {project name} project. Here's what I'd suggest:
>
>     Topic:    {suggested topic}
>     Template: {suggested template}
>     Context:  {auto-generated summary}
>
> Want to go with this, or adjust anything?

Then continue with the remaining Mode 2 steps (goal, confirm, create).

### Mode 3: Lifecycle Commands

The first word of `$ARGUMENTS` is an action keyword. Parse the rest as the session reference.

#### `status` — List Recent Sessions

Call `list_sessions` with `limit: 20`. Group the results by status and display:

> Your recent sessions:
>
> **Active ({count}):**
> - "{Topic}" — {N} participants, created {relative time ago}
> - "{Topic}" — {N} participants, created {relative time ago}
>
> **Completed ({count}):**
> - "{Topic}" — {N} participants, summary ready
> - "{Topic}" — {N} participants, summary ready

Do not show session UUIDs. Users reference sessions by topic text in other commands.

If there are no sessions, say: "You don't have any sessions yet. Run `/harmonica-chat` to create your first one."

#### `check <session reference>` — Check on a Session

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

#### `summary <session reference>` — Get Session Summary

1. Resolve the session using `search_sessions` (same matching and disambiguation logic as `check`)
2. Call `get_summary` with the session ID
3. If a summary exists, display it formatted clearly
4. If no summary yet: "No summary yet — the session has {N} participants still in conversation. Want me to show you the raw responses instead, or check back later?"

#### `follow-up <session reference>` — Design a Follow-Up Session

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

If confirmed, **generate a facilitation prompt** using the same approach as Mode 1 Step 11 (Generate Facilitation Prompt), incorporating the previous session's findings into the context. Then call `create_session` with the proposed fields plus the generated `prompt` and `distribution` (if a Telegram group was selected), display the result, and proceed to **Invitation Flow**.

## Invitation Flow

Run this section after any successful session creation (from Mode 1, Mode 2, or Mode 3 follow-up).

### Step 1: Show the Join URL

Always display the join URL prominently:

> **Join URL:** {join_url}
>
> Share this with participants. Each person gets their own 1-on-1 conversation with the AI facilitator.

### Step 2: Offer Invitation Options

Ask:

> How do you want to invite participants?
> - **"I'll share it myself"** — I'll stop here
> - **"Draft a message"** — I'll write an invite you can copy-paste

**If the user wants a draft message**, generate a short, context-aware invitation:

> Hey team — I've set up a structured conversation on **{topic}**.
>
> It takes about 10 minutes: you'll have a 1-on-1 chat with an AI facilitator about {goal, rephrased briefly}. Your responses help build a shared summary.
>
> Join here: {join_url}

Adapt the tone to the template type:
- Brainstorming — energetic, encouraging wild ideas
- Retrospective — reflective, safe space
- Risk Assessment — serious, thorough
- Community Policy — inclusive, democratic
- Other — neutral and professional

**If communication MCP tools are detected**, offer additional options. Check at runtime which tools are available:

- **Zapier MCP available** — Offer: "I can send this via Telegram, Discord, or Slack through Zapier. Which channel or group?"
- **Slack MCP available** — Offer: "I can post this directly to a Slack channel. Which one?"
- **Neither available** — Only offer "draft a message" and "share it yourself"

### Step 3: Community Participation Feed

Ask:

> Want to add this to a community's participation feed?

If the user says no, skip to Step 4.

If the user says yes:

1. First, check if `HARMONICA_API_KEY` is already set in the environment by running `echo "${HARMONICA_API_KEY:+set}"`. If it returns "set", use it directly. Otherwise, ask the user: "To post to a community feed, I need your Harmonica API key (the `hm_live_...` key you used when setting up harmonica-mcp). Can you share it?"
2. Use the Bash tool to call community-admin's API with `curl`. Note: the community-admin URL below is hardcoded — if the Railway deployment changes, update it here.

```bash
curl -s -H "Authorization: Bearer $HARMONICA_API_KEY" \
  https://community-admin-production.up.railway.app/api/communities
```

3. Handle failure cases:
   - **API unreachable or network error:** "Community participation feeds aren't available right now. Share the join URL directly instead."
   - **Auth error (401/403):** "Your API key doesn't have access to the community platform. Share the join URL directly instead."
   - **Empty list (0 communities):** "You're not an organizer for any communities. Share the join URL directly, or ask a community admin to add you."
4. If communities are returned, list them and ask the user to pick one
5. Use the Bash tool to post to community-admin:

```bash
curl -s -X POST \
  -H "Authorization: Bearer $HARMONICA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "community": "{selected_community_slug}",
    "title": "{session_topic}",
    "description": "{session_goal}",
    "type": "deliberation",
    "url": "{join_url}",
    "datetime": "{current ISO 8601 timestamp}"
  }' \
  https://community-admin-production.up.railway.app/api/events/manual
```

6. On success: "Added to {community name}'s participation feed. Members will see it in My Community and Dear Neighbors."
7. On auth error (403): "You don't have permission to post to {community name}. Ask the community admin to add you as an organizer."

### Step 4: Offer Follow-Up Check

After invitations are handled:

> Want to check on this session later? Just run:
>
> `/harmonica-chat check "{topic}"`
>
> to see who's joined and read responses anytime.

## Reference: Template Matching

Use this table to match user intent to the best template. If multiple templates could fit, suggest the strongest match and briefly mention alternatives. If nothing matches well, say so and proceed freeform.

| Template | ID | Trigger Intents | When to Suggest |
|----------|-----|-----------------|-----------------|
| Retrospective | `retrospective` | retro, review, reflect, post-mortem, lessons learned, what went well | Looking back at completed work |
| Brainstorming | `brainstorming` | ideate, explore, generate ideas, creative, possibilities, what if | Divergent thinking, generating options |
| SWOT Analysis | `swot-analysis` | strengths, weaknesses, assess, evaluate position, competitive | Strategic assessment of a project or product |
| Theory of Change | `theory-of-change` | impact, outcomes, logic model, how do we get to X | Planning how actions lead to desired outcomes |
| OKRs Planning | `okrs-planning` | goals, objectives, key results, quarterly planning, metrics | Setting measurable targets |
| Action Planning | `action-planning` | next steps, roadmap, what do we do, prioritize, action items | Converting decisions into tasks |
| Community Policy | `community-policy-proposal` | rules, guidelines, governance, community standards, norms | Group norm-setting or policy design |
| Weekly Team Check-ins | `weekly-checkins` | standup, sync, how's everyone, weekly pulse, check-in | Regular team health check |
| Risk Assessment | `risk-assessment` | risks, concerns, what could go wrong, mitigation, threats | Identifying and planning for risks |

**Important:** Template IDs must match exactly what the Harmonica API accepts. If `create_session` returns a validation error for a template ID, fall back to creating a freeform session (omit `template_id`) and inform the user.

## Reference: Session Design Expertise

Apply these as soft nudges during the guided flow. Never force them — if the user disagrees, defer to their judgment.

### Goal Quality

- **Too vague** (e.g., "Discuss the product") — Ask for specificity: "What decisions should come out of this? e.g., 'Decide which 3 features to prioritize for Q2'"
- **Too many goals** — Suggest splitting: "A focused session with one clear goal gets better results. Want to split this into two sessions?"
- **Assumes a solution** (e.g., "Build a mobile app") — Challenge the framing: "Is building an app the decided approach, or should the session explore whether that's the right path?" Accept if the user confirms.
- **Well-formed** — Confirm and move on. Don't over-engineer what's already good.

### Context Calibration

- **Too little** — "Participants will ask the AI facilitator for context it doesn't have. Even 2-3 sentences of background help."
- **Too much** (over ~500 words) — "Long context can overwhelm participants. Want me to trim this to the key points?"
- **Project-sourced** (from `--project` or CLAUDE.md) — Summarize to 3-5 sentences. Never dump a full CLAUDE.md, README, or git log as context.

### Cross-Pollination Recommendation

- **Small group implied by topic** (1-on-1, coaching, pair review) — Skip the question, default to off.
- **Sensitive or anonymous topics** — Suggest off: "For sensitive topics, participants may be more candid without seeing others' responses."
- **3+ participants + brainstorming** — Strongly recommend: "Seeing others' emerging ideas sparks new ones. I'd recommend enabling cross-pollination."
- **3+ participants + other types** — Suggest as option: "Cross-pollination shares insights between participant threads as people contribute. Want to enable it?"
- **Fewer than 3 participants** (user confirms) — Default to off. Cross-pollination isn't useful with few threads.

### Critical Question

- If the user hasn't set one and the session would benefit from focus, suggest one based on the topic and goal.
- After the user responds (whether they set one or skipped), ask one constraint-discovery probe: "Is there anything off the table, or a constraint participants should know upfront?"
- Don't push — one follow-up is enough. Accept "no" gracefully.

### What NOT to Do

- **Don't skip prompt generation** — the Harmonica API does NOT generate tailored prompts; it falls back to a generic facilitator. Always generate a session-specific facilitation prompt using the gathered fields (see Mode 1, Step 11).
- **Don't generate verbose prompts** — NEVER include sub-questions, multi-part questions, or "Step X of Y" structures. The facilitator must ask ONE question per message in 2-3 sentences max. Participants are on mobile and won't write essays. Think chat, not survey.
- **Don't use non-English metadata** — topic, goal, context, critical, and prompt must all be in English. Translate if the conversation is in another language.
- **Don't override template structure** — if a template is selected, use its structure as a guide for your generated prompt's step themes, but still generate the prompt (templates provide defaults for goal/context, not facilitation instructions).
- **Don't push templates on freeform users** — if someone wants a custom session, help them design it without a template.
- **Don't show the generated prompt by default** — generate it internally. Only show it if the user asks to see or edit it.
