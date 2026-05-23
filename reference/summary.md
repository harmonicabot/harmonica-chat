# Lifecycle: `summary <session reference>` — Get Session Summary

1. Resolve the session using `search_sessions` (same matching and disambiguation logic as [reference/check.md](check.md))
2. Call `get_summary` with the session ID
3. If a summary exists, display it formatted clearly
4. If no summary yet: "No summary yet — the session has {N} participants still in conversation. Want me to show you the raw responses instead, or check back later?"
