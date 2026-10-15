// Offline-safe main-loop policy. These are not token, spend or OAuth-quota caps.
export const SMOKE_LOOP_LIMITS = Object.freeze({
  modelStepsPerInput: 6,
  userInputsPerCase: 2,
  mainModelStepsPerCase: 12,
  automaticCaseRetries: 0,
  exactTokenSpendOrQuotaCap: false,
  nativeRuntimeEnforcementVerified: false,
});

export function claudeSmokeLoopArgs() {
  return ['--max-turns', String(SMOKE_LOOP_LIMITS.modelStepsPerInput)];
}

export function withOpenCodeSmokeLoopLimit(config) {
  return {
    ...config,
    default_agent: 'build',
    agents: {
      ...config.agents,
      build: { ...config.agents?.build, steps: SMOKE_LOOP_LIMITS.modelStepsPerInput },
    },
  };
}

export function successfulSmokeInput(result) {
  if (result?.code !== 0) return false;
  // Only structured native errors, not keyword matches over instruction/tool text.
  return !(result.text ?? '').split('\n').some(line => {
    try {
      const event = JSON.parse(line);
      return event?.type === 'error' || (event?.type === 'result'
        && (event.is_error === true || /^error(?:_|$)/.test(event.subtype ?? '')));
    } catch { return false; }
  });
}

export class SmokeInputBlocked extends Error {
  constructor(reason) { super(reason); }
}

export function createSmokeInputRunner(run) {
  let started = 0;
  let failed = false;
  return {
    async run(...args) {
      if (failed) throw new SmokeInputBlocked('A model input failed; automatic retry is forbidden.');
      if (started >= SMOKE_LOOP_LIMITS.userInputsPerCase) {
        throw new SmokeInputBlocked('Two model inputs were already started; no further input is allowed.');
      }
      started++; // Reserve before spawning; a failed start still consumes this input.
      try {
        const result = await run(...args);
        if (!successfulSmokeInput(result)) failed = true;
        return result;
      } catch (error) {
        failed = true;
        throw error;
      }
    },
    summary() { return { userInputsStarted: started, stoppedAfterFailure: failed }; },
  };
}
