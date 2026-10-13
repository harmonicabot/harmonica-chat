// Synthetic-only stdio MCP. No network, credentials, or production writes.
import { createInterface } from 'node:readline';
import { appendFileSync, existsSync, writeFileSync } from 'node:fs';

const [scenario, audit, stateFile, harness] = process.argv.slice(2);
const flow = '123e4567-e89b-42d3-a456-426614174000';
const session = 'fixture-created-session';
const fields = {
  client: { type: 'string' }, client_version: { type: 'string' },
};
const defs = {
  list_sessions: { limit: { type: 'integer' } },
  list_templates: {},
  list_telegram_groups: {},
  continue_onboarding: { flow_id: { type: 'string' } },
  get_session: { session_id: { type: 'string' } },
  create_session: {
    topic: { type: 'string' }, goal: { type: 'string' }, context: { type: 'string' },
    critical: { type: 'string' }, prompt: { type: 'string' }, template_id: { type: 'string' },
    onboarding_flow_id: { type: 'string' }, results_visibility: { type: 'string' },
    cross_pollination: { type: 'boolean' }, widgets_enabled: { type: 'boolean' },
    distribution: { type: 'array', items: { type: 'object', properties: { channel: { type: 'string' }, group_id: { type: 'string' } } } },
    questions: { type: 'array', items: { type: 'object', properties: { text: { type: 'string' } } } },
  },
};
const required = {
  continue_onboarding: ['flow_id'], get_session: ['session_id'],
  create_session: ['topic', 'goal', 'onboarding_flow_id'],
};
function call(name, args) {
  appendFileSync(audit, JSON.stringify({ name, args }) + '\n');
  if (args.client !== 'harmonica-chat' || args.client_version !== '3.5.0') {
    return { error: 'Fixture rejects missing or mismatched installed skill fingerprint.' };
  }
  if (name === 'list_sessions') return { sessions: [] };
  if (name === 'list_templates') return { templates: [] };
  if (name === 'list_telegram_groups') return { groups: [] };
  if (name === 'get_session') return { id: session, status: 'active', join_url: 'https://example.invalid/chat?s=fixture-created-session' };
  if (name === 'continue_onboarding') {
    if (args.flow_id !== flow) return { error: 'Fixture flow mismatch.' };
    const base = { flow_id: flow, access_mode: 'mcp', harness };
    if (scenario === 'browser') return { ...base, status: 'browser_required', next_step: 'host-gaps' };
    return {
      ...base, status: 'ready', expires_at: new Date(Date.now() + 3600000).toISOString(),
      handoff: {
        topic: 'Synthetic planning retrospective', goal: 'Understand why planning changes are unclear.',
        critical: 'What would help clarify decision ownership?', context: 'Synthetic test data only; intended participants: a fictional team.',
        branch: 'concrete_host', model_source: 'managed', byom_provider: null, include_meeting_context: false,
      },
      ...(scenario === 'recovery' || existsSync(stateFile) ? { created_session_id: session } : {}),
    };
  }
  if (name === 'create_session') {
    if (args.onboarding_flow_id !== flow) return { error: 'Fixture requires server-returned flow.' };
    if (existsSync(stateFile)) return { error: 'Fixture duplicate creation blocked.' };
    writeFileSync(stateFile, JSON.stringify({ id: session }));
    // Persist the synthetic result but lose the reply, to exercise recovery.
    return { error: 'Synthetic response lost after creation; outcome unknown. Check saved onboarding state before retrying.' };
  }
  return { error: 'Unsupported fixture operation.' };
}
for await (const line of createInterface({ input: process.stdin })) {
  let req;
  try { req = JSON.parse(line); } catch { continue; }
  if (!('id' in req)) continue;
  let result;
  if (req.method === 'initialize') {
    result = { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'harmonica-fixture', version: '1.0.0' } };
  } else if (req.method === 'tools/list') {
    result = { tools: Object.entries(defs).map(([name, shape]) => ({
      name, description: `Synthetic Harmonica ${name.replaceAll('_', ' ')}.`,
      inputSchema: { type: 'object', properties: { ...shape, ...fields }, required: required[name] ?? [] },
    })) };
  } else if (req.method === 'tools/call') {
    const value = call(req.params.name, req.params.arguments ?? {});
    result = { content: [{ type: 'text', text: JSON.stringify(value) }], ...(value.error ? { isError: true } : {}) };
  } else if (req.method === 'ping') result = {};
  else {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, error: { code: -32601, message: 'Method not found' } }) + '\n');
    continue;
  }
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, result }) + '\n');
}
