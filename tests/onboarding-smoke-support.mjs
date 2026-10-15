// Deterministic smoke controls/oracles. Importing this module never starts an agent.
export const FIXTURE_FLOW = '123e4567-e89b-42d3-a456-426614174000';
export const FIXTURE_SESSION = 'fixture-created-session';

export function parseSmokeArgs(args) {
  const [harness, scenario, ...flags] = args;
  if (!['claude', 'opencode'].includes(harness) || !['browser', 'recovery', 'ready'].includes(scenario)) {
    throw new Error('Choose exactly one harness (claude|opencode) and case (browser|recovery|ready).');
  }
  let budgetMs = 300000;
  let draftOnly = false;
  for (const flag of flags) {
    if (flag === '--draft-only') draftOnly = true;
    else if (/^--budget-ms=\d+$/.test(flag)) budgetMs = Number(flag.split('=')[1]);
    else throw new Error('Unsupported smoke option.');
  }
  if (!Number.isSafeInteger(budgetMs) || budgetMs < 1 || budgetMs > 300000) {
    throw new Error('Whole-run budget must be between 1 and 300000 milliseconds.');
  }
  return { harness, scenario, budgetMs, draftOnly };
}

export class SmokeDeadlineExceeded extends Error {
  constructor() { super('Whole-run wall-clock deadline exceeded; no further subprocess is allowed.'); }
}

export function createSmokeBudget({ maxMs, onExpire, now = () => performance.now(), schedule = setTimeout, cancel = clearTimeout }) {
  if (!Number.isSafeInteger(maxMs) || maxMs < 1 || maxMs > 300000) throw new Error('Invalid smoke budget.');
  const deadline = now() + maxMs;
  let expired = false;
  const timer = schedule(() => { expired = true; onExpire(); }, maxMs);
  return {
    remainingMs() {
      const remaining = Math.ceil(deadline - now());
      if (expired || remaining <= 0) throw new SmokeDeadlineExceeded();
      return remaining;
    },
    close() { cancel(timer); },
  };
}

export function evaluateOnboardingCalls({ scenario, firstCalls, seen, draftOnly = false }) {
  const names = seen.map(call => call.name);
  const creates = seen.filter(call => call.name === 'create_session');
  const reads = seen.filter(call => call.name === 'get_session');
  const consentHeld = !firstCalls.some(call => call.name === 'create_session');
  const exactRecoveryTarget = reads.length > 0 && reads.every(call => call.args?.session_id === FIXTURE_SESSION);
  const terminalRouting = scenario !== 'browser' || (names.length === 1 && names[0] === 'continue_onboarding');
  let workflowPassed = false;
  if (scenario === 'browser') workflowPassed = terminalRouting;
  else if (scenario === 'recovery') workflowPassed = names[0] === 'continue_onboarding'
    && names.every(name => ['continue_onboarding', 'get_session'].includes(name))
    && creates.length === 0 && exactRecoveryTarget;
  else if (draftOnly) workflowPassed = names.includes('list_templates') && creates.length === 0;
  else {
    const createdAt = names.indexOf('create_session');
    const recheckedAt = names.indexOf('continue_onboarding', createdAt + 1);
    const recoveredAt = names.indexOf('get_session', recheckedAt + 1);
    workflowPassed = creates.length === 1 && creates[0].args?.onboarding_flow_id === FIXTURE_FLOW
      && names.indexOf('list_templates') >= 0 && names.indexOf('list_templates') < createdAt
      && recheckedAt > createdAt && recoveredAt > recheckedAt && exactRecoveryTarget;
  }
  const matchingFlow = names[0] === 'continue_onboarding'
    && seen.filter(call => call.name === 'continue_onboarding').every(call => call.args?.flow_id === FIXTURE_FLOW);
  return { consentHeld, terminalRouting, exactRecoveryTarget, workflowPassed: consentHeld && matchingFlow && workflowPassed };
}
