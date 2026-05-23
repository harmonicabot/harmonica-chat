# Mode: Accelerated Creation

The user provided a topic in `$ARGUMENTS`. Skip the intent and topic questions and proceed with a faster flow.

**Step 1 — Template Match:**

Using the topic text and [reference/templates.md](templates.md), identify the best-matching template. If no template matches well, proceed freeform without asking.

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

Wait for the user's response. Apply goal quality nudges from [reference/expertise.md](expertise.md).

**Step 3 — Remaining Questions:**

Ask about context, critical question, cross-pollination, Polls and ratings, Results visibility, and Telegram distribution only if relevant. If the topic and goal give enough signal, you can propose sensible defaults and ask for confirmation rather than asking each one individually. For example:

> I'll skip the context since the topic is self-explanatory, enable cross-pollination since this is a brainstorming session with likely multiple participants, leave Polls and ratings off because the session is open-ended exploration, and set Results visibility to "participants" so completed participants can see what others said. Sound good?

Apply the same defaults as [reference/design.md](design.md) Step 8 for Polls and ratings (enable for prioritisation / scoring / ranking) and Step 9 for Results visibility (default `participants`; `host` only if sensitive / internal review; `public` if explicitly public sense-making).

**Telegram distribution:** Call `list_telegram_groups`. If groups exist, ALWAYS present ALL groups via `AskUserQuestion` (same pattern as design.md Step 10) — never filter or skip based on group name relevance. If no groups or tool unavailable, skip silently.

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
>     Polls and ratings:  {Yes/No}
>     Results visibility: {host / participants / public}
>     Telegram:           {group_name or "None"}

- **Question:** "Ready to create this session?"
- **Header:** "Confirm"
- **Options:**
  - Label: "Create session", Description: "Launch the session and get a shareable join URL"
  - Label: "Edit something", Description: "Go back and change a specific field"
  - Label: "Cancel", Description: "Discard and start over"

If the user picks "Edit something", ask which field to change and go back to that step. When returning to confirm after an edit, use diff formatting to highlight what changed (same approach as design.md Step 12).

**Generate the facilitation prompt** using the same approach as [reference/design.md](design.md) Step 13. Adapt the steps and questions to the session's topic, goal, and context.

Call the `create_session` MCP tool with the gathered fields:
- `topic` (required)
- `goal` (required)
- `prompt` (the generated facilitation prompt)
- `template_id` (if a template was chosen — use the exact ID from [reference/templates.md](templates.md))
- `context` (if provided)
- `critical` (if provided)
- `cross_pollination` (true/false)
- `widgets_enabled` (true/false)
- `results_visibility` ("host" / "participants" / "public" — default "participants")
- `distribution` (if a Telegram group was selected — array: `[{ "channel": "telegram", "group_id": "{id}" }]`)
- `questions` (same defaults as design.md Step 11: just `Name` for Telegram sessions, `Name` + `Email` for web-only. Ask the host if they want to adjust.)

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

Then load [reference/invitation.md](invitation.md) and run the invitation flow.

## Project-Aware Creation

If `--project <dir>` was provided, or if a workspace directory name appears in the topic text, enrich the session with project context.

**Project resolution order:**
1. Explicit `--project <dir>` flag value
2. Directory name mentioned in the topic, matched against sibling directories in the current workspace
3. Current working directory if it is inside a project subdirectory

**When a project is detected:**

If the resolved directory doesn't exist, tell the user ("I couldn't find a '{dir}' directory") and fall back to standard accelerated mode without project context.

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

Then continue with the remaining accelerated steps (goal, confirm, create).
