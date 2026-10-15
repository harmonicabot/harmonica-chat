// Injectable subprocess lifecycle. Importing this module starts no processes.
export class SmokeProcessTimeout extends Error {
  constructor() { super('Subprocess deadline exceeded; no further subprocess is allowed.'); }
}

export function createSmokeProcessRunner({ budget, spawn, terminateTree, isRunning, schedule = setTimeout, cancel = clearTimeout }) {
  const active = new Set();
  let stoppedReason;

  function stop(record, reason) {
    if (record.stopAttempted) return;
    record.stopAttempted = true;
    // Settle before attempting OS termination: close may never be emitted.
    record.finish(reason);
    let treeStopped = false;
    const knownPid = Number.isSafeInteger(record.child.pid) && record.child.pid > 0;
    try { treeStopped = knownPid && terminateTree(record.child.pid) === true; } catch { /* fail closed */ }
    let running = true;
    try { running = !knownPid || isRunning(record.child.pid) !== false; } catch { /* unknown is unsafe */ }
    if (running) {
      try { record.child.kill('SIGKILL'); } catch { /* report unconfirmed below */ }
      try { running = !knownPid || isRunning(record.child.pid) !== false; } catch { /* retain */ }
    }
    // Root exit alone does not prove its descendants stopped after a failed tree kill.
    if (treeStopped && !running) active.delete(record);
    // Do not let a surviving child or inherited pipes keep the runner waiting.
    record.child.stdin.destroy();
    record.child.stdout.destroy();
    record.child.stderr.destroy();
    record.child.unref();
  }

  function stopAll(reason) {
    stoppedReason ??= reason;
    for (const record of active) stop(record, stoppedReason);
  }

  function run(command, args, cwd, env, input) {
    if (stoppedReason) return Promise.reject(stoppedReason);
    const remaining = budget.remainingMs();
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { cwd, env, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
      let settled = false;
      let text = '';
      let timer;
      const record = {
        child, stopAttempted: false,
        finish(error, result) {
          if (settled) return;
          settled = true;
          cancel(timer);
          if (error) { text = ''; reject(error); }
          else resolve(result);
        },
      };
      active.add(record);
      child.stdin.on('error', () => {});
      child.stdout.on('data', chunk => { if (!settled) text += chunk; });
      child.stderr.on('data', chunk => { if (!settled) text += chunk; });
      child.on('error', () => {
        if (record.stopAttempted) return;
        if (Number.isSafeInteger(child.pid) && child.pid > 0) stopAll(new Error('Subprocess failed; termination requires verification.'));
        else { active.delete(record); record.finish(null, { code: -1, text: '' }); }
      });
      child.on('close', code => {
        // After a failed tree kill, keep its root recorded even if close arrives:
        // descendants are still unconfirmed, so the profile must be retained.
        if (!record.stopAttempted) active.delete(record);
        try { budget.remainingMs(); record.finish(null, { code, text }); }
        catch (error) { record.finish(error); }
      });
      timer = schedule(() => {
        const reason = new SmokeProcessTimeout();
        stopAll(reason);
        record.finish(reason); // also handles a spawn with no PID and no events
      }, Math.min(120000, remaining));
      child.stdin.end(input);
    });
  }

  return {
    run,
    stopAll,
    cleanupReport() {
      return { safeToRemoveProfile: active.size === 0,
        unconfirmedProcessIds: [...active].map(record => record.child.pid).filter(pid => Number.isSafeInteger(pid) && pid > 0),
        unknownProcessCount: [...active].filter(record => !Number.isSafeInteger(record.child.pid) || record.child.pid <= 0).length,
      };
    },
  };
}

export function cleanupSmokeProfile({ report, remove, exists }) {
  if (!report.safeToRemoveProfile) return { temporaryProfileRemoved: false, cleanupFailed: true };
  try {
    remove();
    const retained = exists();
    return { temporaryProfileRemoved: !retained, cleanupFailed: retained };
  } catch {
    return { temporaryProfileRemoved: false, cleanupFailed: true };
  }
}
