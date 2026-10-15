import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { claudeSmokeLoopArgs, createSmokeInputRunner, SMOKE_LOOP_LIMITS, SmokeInputBlocked, successfulSmokeInput, withOpenCodeSmokeLoopLimit } from './onboarding-smoke-limits.mjs';

const success = { code: 0, text: '{"type":"result","subtype":"success","is_error":false}' };

test('fixed six-step/two-input policy does not claim exact cost or runtime evidence', () => {
  assert.equal(SMOKE_LOOP_LIMITS.modelStepsPerInput, 6);
  assert.equal(SMOKE_LOOP_LIMITS.userInputsPerCase, 2);
  assert.equal(SMOKE_LOOP_LIMITS.mainModelStepsPerCase, 12);
  assert.equal(SMOKE_LOOP_LIMITS.automaticCaseRetries, 0);
  assert.equal(SMOKE_LOOP_LIMITS.exactTokenSpendOrQuotaCap, false);
  assert.equal(SMOKE_LOOP_LIMITS.nativeRuntimeEnforcementVerified, false);
  assert.ok(Object.isFrozen(SMOKE_LOOP_LIMITS));
  assert.deepEqual(claudeSmokeLoopArgs(), ['--max-turns', '6']);
});

test('OpenCode uses native steps and preserves permissions, system, MCP, and other agents', () => {
  const config = { default_agent: 'other', snapshots: false, mcp: { servers: { fixture: {} } }, agents: {
    build: { system: 'synthetic only', steps: 99, permissions: [{ action: '*', effect: 'deny' }] },
    other: { steps: 20 },
  } };
  const bounded = withOpenCodeSmokeLoopLimit(config);
  assert.equal(bounded.agents.build.steps, 6);
  assert.equal(bounded.default_agent, 'build');
  assert.equal(bounded.agents.build.maxSteps, undefined);
  assert.deepEqual(bounded.agents.build.permissions, config.agents.build.permissions);
  assert.equal(bounded.agents.build.system, config.agents.build.system);
  assert.deepEqual(bounded.mcp, config.mcp);
  assert.deepEqual(bounded.agents.other, config.agents.other);
  assert.equal(config.agents.build.steps, 99);
  assert.equal(config.default_agent, 'other');
});

test('a third input is rejected before an injected subprocess can start', async () => {
  const calls = [];
  const inputs = createSmokeInputRunner(async (...args) => { calls.push(args); return success; });
  await inputs.run('first');
  await inputs.run('confirmed resume');
  for (let attempt = 0; attempt < 2; attempt++) await assert.rejects(inputs.run('extra'), SmokeInputBlocked);
  assert.deepEqual(calls, [['first'], ['confirmed resume']]);
  assert.deepEqual(inputs.summary(), { userInputsStarted: 2, stoppedAfterFailure: false });
});

test('failed starts and structured native errors stop further inputs without retry', async () => {
  const failures = [
    { code: 1, text: '' },
    { code: 0, text: '{"type":"result","subtype":"error_max_turns","is_error":true}' },
    { code: 0, text: '{"type":"result","subtype":"error_max_budget_usd"}' },
    { code: 0, text: '{"type":"error","error":{"name":"synthetic"}}' },
  ];
  for (const result of failures) {
    let calls = 0;
    const inputs = createSmokeInputRunner(async () => { calls++; return result; });
    assert.equal(successfulSmokeInput(await inputs.run()), false);
    await assert.rejects(inputs.run(), SmokeInputBlocked);
    assert.equal(calls, 1);
    assert.equal(inputs.summary().stoppedAfterFailure, true);
  }
  let calls = 0;
  const inputs = createSmokeInputRunner(async () => { calls++; throw new Error('synthetic spawn failure'); });
  await assert.rejects(inputs.run(), /synthetic spawn failure/);
  await assert.rejects(inputs.run(), SmokeInputBlocked);
  assert.equal(calls, 1);
  assert.equal(inputs.summary().userInputsStarted, 1);
});

test('instruction keywords and expected nested lost-reply tool errors are not native run errors', () => {
  assert.equal(successfulSmokeInput({ code: 0, text: 'Instructions mention error_max_turns and quota limits.\n{"type":"assistant","message":{"content":[{"type":"tool_result","is_error":true}]}}' }), true);
  assert.equal(successfulSmokeInput(success), true);
  assert.equal(successfulSmokeInput(undefined), false);
});

test('runner routes all four model invocation sites through one limiter without changing auth calls', () => {
  const source = readFileSync(new URL('./run-onboarding-smoke.mjs', import.meta.url), 'utf8');
  assert.equal((source.match(/await modelInputs\.run\(/g) ?? []).length, 4);
  assert.equal((source.match(/await run\(/g) ?? []).length, 2);
  assert.match(source, /const modelInputs = createSmokeInputRunner\(run\)/);
  assert.match(source, /\.\.\.claudeSmokeLoopArgs\(\)/);
  assert.match(source, /const config = withOpenCodeSmokeLoopLimit\(/);
  assert.equal((source.match(/!draftOnly && successfulSmokeInput\(first\)/g) ?? []).length, 2);
  assert.match(source, /loopLimits: SMOKE_LOOP_LIMITS, \.\.\.modelInputs\.summary\(\)/);
  assert.match(source, /budget\.remainingMs\(\); \/\/ Parsing\/scoring/);
});
