import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createSmokeBudget, evaluateOnboardingCalls, FIXTURE_FLOW, FIXTURE_SESSION, parseSmokeArgs, SmokeDeadlineExceeded } from './onboarding-smoke-support.mjs';

const call = (name, args = {}) => ({ name, args: { flow_id: FIXTURE_FLOW, ...args } });
const continuation = call('continue_onboarding');
const recovery = call('get_session', { session_id: FIXTURE_SESSION });
const create = call('create_session', { onboarding_flow_id: FIXTURE_FLOW });
const evaluate = (scenario, seen, firstCalls = [continuation]) => evaluateOnboardingCalls({ scenario, seen, firstCalls });

test('browser_required accepts only the terminal continuation call', () => {
  assert.equal(evaluate('browser', [continuation]).workflowPassed, true);
  for (const extra of ['list_templates', 'get_session', 'create_session', 'list_sessions']) {
    const result = evaluate('browser', [continuation, call(extra)]);
    assert.equal(result.terminalRouting, false);
    assert.equal(result.workflowPassed, false);
  }
  assert.equal(evaluate('browser', [call('continue_onboarding', { flow_id: 'wrong-flow' })]).workflowPassed, false);
});

test('existing-session recovery requires the exact returned session and no design calls', () => {
  assert.equal(evaluate('recovery', [continuation, recovery]).workflowPassed, true);
  assert.equal(evaluate('recovery', [continuation, call('get_session', { session_id: 'wrong-session' })]).workflowPassed, false);
  assert.equal(evaluate('recovery', [continuation, call('list_templates'), recovery]).workflowPassed, false);
  assert.equal(evaluate('recovery', [continuation]).workflowPassed, false);
});

test('lost-reply recovery requires one confirmed create, a fresh continuation, and the exact session', () => {
  const first = [continuation, call('list_templates')];
  const valid = [...first, create, continuation, recovery];
  assert.equal(evaluate('ready', valid, first).workflowPassed, true);
  assert.equal(evaluate('ready', [...first, create, recovery], first).workflowPassed, false);
  assert.equal(evaluate('ready', [...first, create, continuation, call('get_session', { session_id: 'wrong-session' })], first).workflowPassed, false);
  assert.equal(evaluate('ready', [...valid, create], first).workflowPassed, false);
  assert.equal(evaluate('ready', valid, [...first, create]).workflowPassed, false);
});

test('manual runner requires one explicit case and caps total wall time at five minutes', () => {
  assert.deepEqual(parseSmokeArgs(['opencode', 'ready']), { harness: 'opencode', scenario: 'ready', budgetMs: 300000, draftOnly: false });
  assert.equal(parseSmokeArgs(['claude', 'ready', '--draft-only', '--budget-ms=15000']).budgetMs, 15000);
  for (const args of [[], ['opencode'], ['other', 'ready'], ['claude', 'all'], ['opencode', 'ready', '--budget-ms=0'], ['opencode', 'ready', '--budget-ms=300001'], ['opencode', 'ready', '--unknown']]) {
    assert.throws(() => parseSmokeArgs(args));
  }
});

test('the monotonic whole-run deadline shares remaining time across all subprocesses', () => {
  let time = 100;
  let expire;
  let stopped = 0;
  let cancelled;
  const budget = createSmokeBudget({ maxMs: 1000, now: () => time,
    schedule: (fn, ms) => { assert.equal(ms, 1000); expire = fn; return 'timer'; },
    cancel: timer => { cancelled = timer; }, onExpire: () => { stopped++; },
  });
  assert.equal(budget.remainingMs(), 1000);
  time += 900;
  assert.equal(budget.remainingMs(), 100);
  time += 100;
  assert.throws(() => budget.remainingMs(), SmokeDeadlineExceeded);
  expire();
  assert.equal(stopped, 1);
  // Timer expiry stays terminal even if a supplied clock moves backward.
  time = 0;
  assert.throws(() => budget.remainingMs(), SmokeDeadlineExceeded);
  budget.close();
  assert.equal(cancelled, 'timer');
});

test('runner wires deadline checks before spawning, bounded kills, and final cleanup', () => {
  const source = readFileSync(new URL('./run-onboarding-smoke.mjs', import.meta.url), 'utf8');
  assert.ok(source.indexOf('parseSmokeArgs(process.argv.slice(2))') < source.indexOf('mkdtempSync(join('));
  assert.match(source, /function run[\s\S]*?budget\.remainingMs\(\)[\s\S]*?spawn\(command/);
  assert.match(source, /Math\.min\(120000, remaining\)/);
  assert.match(source, /onExpire: stopActive/);
  assert.match(source, /finally \{\s*budget\.close\(\);\s*stopActive\(\);/);
  assert.match(source, /timeout: 5000/);
});
