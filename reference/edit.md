# Lifecycle: `edit <session reference>` — Edit Session Metadata

1. Resolve the session using `search_sessions` (same matching and disambiguation logic as [reference/check.md](check.md))
2. Call `get_session` with the matched session ID to show current metadata
3. Present the current session fields:

> **"{Topic}"** — current settings:
>
>     Topic:              {topic}
>     Goal:               {goal}
>     Context:            {context or "None"}
>     Critical question:  {critical or "None"}
>     Prompt:             {first 100 chars of prompt}...
>
> What would you like to change?

4. Based on what the user wants to change, gather the new value(s)
5. Call `update_session` with only the changed fields (topic, goal, context, critical, prompt)
6. If updating the prompt, offer to regenerate it from scratch using the same approach as [reference/design.md](design.md) Step 13 (Generate Facilitation Prompt) with the current session metadata, or let the user provide specific edits
7. Confirm: "Session updated. Changes take effect for new participants immediately."

**Note:** `update_session` is a deferred tool — it may not appear in the initial tool list. Search for it explicitly if not visible.
