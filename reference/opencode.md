# OpenCode Adapter

Use this adapter when running harmonica-chat inside OpenCode.

New connections should use the hosted endpoint at
`https://app.harmonica.chat/api/mcp/mcp`, with `type: "remote"`, `oauth: false`,
and `Authorization: "Bearer {env:HARMONICA_API_KEY}"` in `headers`. Keep the key
in OpenCode's launch environment. In OpenCode V2, put the entry under
`mcp.servers.harmonica`; V1 uses `mcp.harmonica`. The README has the complete
configuration and the V2 documentation link.
Preserve working local npm connections for ordinary design/lifecycle operations;
onboarding continuation requires the hosted tools.

## MCP Operations

The Harmonica server is exposed under `tools.harmonica`. Translate the semantic operation names in
the other references as follows:

- `list_sessions` -> `tools.harmonica.list_sessions`
- `list_templates` -> `tools.harmonica.list_templates`
- `create_session` -> `tools.harmonica.create_session`
- `continue_onboarding` -> `tools.harmonica.continue_onboarding` (hosted MCP only)
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

For onboarding, follow [onboarding.md](onboarding.md) instead; do not apply the ordinary connection recovery below.

For ordinary design or lifecycle operations, call `tools.harmonica.list_sessions` with `limit: 1` and the installed skill fingerprint. If that fails, tell the user
to reload the Harmonica MCP connection and stop rather than falling back to raw HTTP.
