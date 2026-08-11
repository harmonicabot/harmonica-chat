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
5. Call `update_session` with only the changed fields (topic, goal, context, critical, prompt,
   template_id, questions, or other fields exposed by the current tool).
6. When detaching a template (`template_id: null`), review both the facilitation prompt and
   pre-session questions with the host. Template-derived questions are independent session data and
   are not cleared automatically. Include replacements in the same confirmed update when needed.
7. If updating the prompt, offer to regenerate it from scratch using the same approach as [reference/design.md](design.md) Step 13 (Generate Facilitation Prompt) with the current session metadata, or let the user provide specific edits.
8. Show the proposed changes and get explicit confirmation before the mutation.
9. Confirm: "Session updated. Changes take effect for new participants immediately."

**Note:** `update_session` is a deferred tool — it may not appear in the initial tool list. Search for it explicitly if not visible.
