# Lifecycle: `edit <session reference>` — Edit Session Metadata

1. Resolve the session — same logic as [reference/check.md](check.md) step 1 (UUID-shaped → `get_session` directly; otherwise `search_sessions` + disambiguation).
2. (If you took the search path) Call `get_session` with the matched session ID to show current metadata.
3. Present the current session fields:

> **"{Topic}"** — current settings:
>
>     Topic:              {topic}
>     Goal:               {goal}
>     Context:            {context or "None"}
>     Critical question:  {critical or "None"}
>     Template:           {template id or "Freeform"}
>     Prompt:             {first 100 chars of prompt}...
>     Questions:          {pre-session questions or "None"}
>
> What would you like to change?

4. Based on what the user wants to change, gather the new value(s)
5. Prepare only the changed fields (topic, goal, context, critical, prompt,
   template_id, questions, or other fields exposed by the current tool). When the goal, context or
   template changes, check whether existing custom summary instructions still fit. Load
   [summary.md](summary.md) before authoring or repairing `summary_prompt`; it is different from
   the facilitation recap field `prompt_summary`. Do not overwrite a suitable template default.
6. When detaching a template (`template_id: null`), review both the facilitation prompt and
   pre-session questions with the host. Template-derived questions are independent session data and
   are not cleared automatically. Include replacements in the same confirmed update when needed.
7. If updating the prompt, offer to regenerate it from scratch using the same approach as [reference/design.md](design.md) Step 13 (Generate Facilitation Prompt) with the current session metadata, or let the user provide specific edits.
8. Show the proposed changes and obtain confirmation if it has not already been supplied for this
   agreed update. Then call `update_session` with only those fields.
9. Read back supported fields and report the actual change. If an accepted field is omitted by
   the read API, disclose the readback gap rather than claiming an exact match. A settings update
   does not by itself regenerate an existing summary.

**Note:** `update_session` is a deferred tool — it may not appear in the initial tool list. Search for it explicitly if not visible.
