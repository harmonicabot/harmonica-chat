import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const flow = '123e4567-e89b-42d3-a456-426614174000';
const fingerprint = { client: 'harmonica-chat', client_version: '3.5.0' };
async function withServer(scenario, body) {
  const dir = mkdtempSync(join(tmpdir(), 'onboarding-fixture-'));
  const state = join(dir, 'created.json');
  const child = spawn(process.execPath, [fileURLToPath(new URL('./fixtures/onboarding-mcp.mjs', import.meta.url)), scenario, join(dir, 'audit.jsonl'), state, 'claude_code']);
  const lines = createInterface({ input: child.stdout });
  const responses = lines[Symbol.asyncIterator]();
  let id = 0;
  async function request(method, params) {
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }) + '\n');
    const { value } = await responses.next();
    return JSON.parse(value).result;
  }
  const call = async (name, args = fingerprint) => {
    const reply = await request('tools/call', { name, arguments: args });
    return { error: reply.isError === true, value: JSON.parse(reply.content[0].text) };
  };
  try { await body({ request, call, state }); }
  finally {
    child.stdin.end();
    await new Promise(resolve => child.once('close', resolve));
    lines.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

test('fixture exposes hosted fingerprint and flow fields and rejects absent fingerprint', { timeout: 5000 }, async () => {
  await withServer('browser', async ({ request, call }) => {
    const { tools } = await request('tools/list', {});
    const create = tools.find(t => t.name === 'create_session');
    for (const field of ['client', 'client_version', 'onboarding_flow_id']) assert.ok(create.inputSchema.properties[field]);
    assert.equal((await call('continue_onboarding', { flow_id: flow })).error, true);
    assert.equal((await call('continue_onboarding', { ...fingerprint, flow_id: flow })).value.status, 'browser_required');
  });
});

test('fixture persists one synthetic creation before losing its reply, then recovers', { timeout: 5000 }, async () => {
  await withServer('ready', async ({ call, state }) => {
    const initial = await call('continue_onboarding', { ...fingerprint, flow_id: flow });
    assert.equal(initial.value.created_session_id, undefined);
    const created = await call('create_session', { ...fingerprint, onboarding_flow_id: flow, topic: 'Synthetic', goal: 'Test' });
    assert.equal(created.error, true);
    assert.equal(existsSync(state), true);
    const recovered = await call('continue_onboarding', { ...fingerprint, flow_id: flow });
    assert.equal(recovered.value.created_session_id, 'fixture-created-session');
    assert.equal((await call('get_session', { ...fingerprint, session_id: 'wrong-session' })).error, true);
    const session = await call('get_session', { ...fingerprint, session_id: recovered.value.created_session_id });
    assert.equal(session.error, false);
    assert.equal(session.value.id, recovered.value.created_session_id);
    assert.match((await call('create_session', { ...fingerprint, onboarding_flow_id: flow })).value.error, /duplicate/);
  });
});

test('fixture refuses recovery before creation and browser reads for a nonexistent session', { timeout: 5000 }, async () => {
  await withServer('browser', async ({ call }) => {
    assert.equal((await call('get_session', { ...fingerprint, session_id: 'fixture-created-session' })).error, true);
  });
});
