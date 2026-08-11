# OpenCode Adapter

Use this adapter when running harmonica-chat inside OpenCode.

## MCP Operations

The Harmonica server is exposed under `tools.harmonica`. Translate the semantic operation names in
the other references as follows:

- `list_sessions` -> `tools.harmonica.list_sessions`
- `list_templates` -> `tools.harmonica.list_templates`
- `create_session` -> `tools.harmonica.create_session`
- `update_session` -> `tools.harmonica.update_session`
- `get_session` -> `tools.harmonica.get_session`
- `get_responses` -> `tools.harmonica.get_responses`
- `get_summary` -> `tools.harmonica.get_summary`

Call the operation directly. Do not use `npx`, `curl`, or a Claude-specific `mcp__harmonica__*`
name when the connected MCP server exposes it.

## Questions and Files

Use OpenCode's native question affordance for choices and one-question-at-a-time prompts. Use the
native file-reading affordance for project context. Preserve the same session design laws and
confirmation boundaries as the shared references.

## Connection Check

Before acting, call `tools.harmonica.list_sessions` with `limit: 1`. If that fails, tell the user
to reload the Harmonica MCP connection and stop rather than falling back to raw HTTP.
