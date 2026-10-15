import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { test } from 'node:test';
import { cleanupSmokeProfile, createSmokeProcessRunner, SmokeProcessTimeout } from './onboarding-process-control.mjs';
import { createSmokeBudget, SmokeDeadlineExceeded } from './onboarding-smoke-support.mjs';

function fixture({ treeStopped = false, running = true, pid = 424242 } = {}) {
  const child = new EventEmitter();
  const counts = { spawns: 0, trees: 0, kills: 0, unrefs: 0, destroyed: 0 };
  const stream = () => Object.assign(new EventEmitter(), { destroy() { counts.destroyed++; }, end() {} });
  Object.assign(child, { pid, stdin: stream(), stdout: stream(), stderr: stream(),
    kill() { counts.kills++; return false; }, unref() { counts.unrefs++; },
  });
  const timers = [];
  const runner = createSmokeProcessRunner({ budget: { remainingMs: () => 1000 },
    spawn: () => { counts.spawns++; return child; },
    terminateTree: () => { counts.trees++; return treeStopped; },
    isRunning: () => running,
    schedule: (fn, ms) => { const timer = {fn, ms, cancelled:false}; timers.push(timer); return timer; },
    cancel: timer => { if (timer) timer.cancelled = true; },
  });
  return { child, counts, timers, runner, start: () => runner.run('synthetic-only', [], '.', {}, '') };
}

test('normal child completion preserves output and permits profile cleanup', async () => {
  const f = fixture();
  const pending = f.start();
  f.child.stdout.emit('data', 'synthetic result');
  f.child.emit('close', 0);
  assert.deepEqual(await pending, {code:0,text:'synthetic result'});
  assert.equal(f.runner.cleanupReport().safeToRemoveProfile, true);
  assert.equal(f.timers[0].cancelled, true);
  assert.equal(f.counts.trees, 0);
});

test('deadline settles a never-closing child even when tree and fallback kills fail', async () => {
  const f = fixture();
  const pending = f.start();
  const rejected = assert.rejects(pending, SmokeDeadlineExceeded);
  f.runner.stopAll(new SmokeDeadlineExceeded());
  await rejected; // No close event, OS process, or real timer is needed.
  assert.deepEqual(f.runner.cleanupReport(), {safeToRemoveProfile:false,unconfirmedProcessIds:[424242],unknownProcessCount:0});
  assert.equal(f.counts.trees, 1);
  assert.equal(f.counts.kills, 1);
  assert.equal(f.counts.destroyed, 3);
  assert.equal(f.counts.unrefs, 1);
  await assert.rejects(f.start(), SmokeDeadlineExceeded);
  f.runner.stopAll(new Error('final cleanup'));
  assert.equal(f.counts.trees, 1); // No repeated blocking kill in final cleanup.
  assert.equal(f.counts.spawns, 1);
});

test('whole-run budget callback rejects its active operation without child close', async () => {
  const f = fixture();
  let expire;
  const budget = createSmokeBudget({maxMs:1000,now:()=>0,schedule:fn=>{expire=fn;return 1;},cancel() {},
    onExpire:()=>f.runner.stopAll(new SmokeDeadlineExceeded()),
  });
  const rejected = assert.rejects(f.start(), SmokeDeadlineExceeded);
  expire();
  await rejected;
  budget.close();
});

test('per-child limit also settles without close and verifies a successful tree stop', async () => {
  const f = fixture({treeStopped:true,running:false});
  const pending = f.start();
  const rejected = assert.rejects(pending, SmokeProcessTimeout);
  assert.equal(f.timers[0].ms, 1000);
  f.timers[0].fn();
  await rejected;
  assert.equal(f.runner.cleanupReport().safeToRemoveProfile, true);
  assert.equal(f.counts.kills, 0);
});

test('root close after failed tree termination does not erase unconfirmed descendants', async () => {
  const f = fixture({running:false});
  const rejected = assert.rejects(f.start(), SmokeProcessTimeout);
  f.timers[0].fn();
  f.child.emit('close', 1);
  await rejected;
  assert.equal(f.runner.cleanupReport().safeToRemoveProfile, false);
});

test('successful kill status with a still-running root is not confirmed cleanup', async () => {
  const f = fixture({treeStopped:true,running:true});
  const rejected = assert.rejects(f.start(), SmokeProcessTimeout);
  f.timers[0].fn();
  await rejected;
  assert.equal(f.runner.cleanupReport().safeToRemoveProfile, false);
  assert.equal(f.counts.kills, 1);
});

test('a missing PID and absent spawn events cannot leave the awaited operation pending', async () => {
  const f = fixture({pid:null});
  const rejected = assert.rejects(f.start(), SmokeDeadlineExceeded);
  f.runner.stopAll(new SmokeDeadlineExceeded());
  await rejected;
  assert.equal(f.counts.trees, 0); // Never call a tree killer with an invalid PID.
  assert.deepEqual(f.runner.cleanupReport(), {safeToRemoveProfile:false,unconfirmedProcessIds:[],unknownProcessCount:1});
});

test('spawn failure without a PID settles and does not retain a nonexistent process', async () => {
  const f = fixture({pid:null});
  const pending = f.start();
  f.child.emit('error', new Error('synthetic spawn failure'));
  assert.deepEqual(await pending, {code:-1,text:''});
  assert.equal(f.runner.cleanupReport().safeToRemoveProfile, true);
});

test('profile deletion is skipped for unconfirmed trees and deletion errors are reported', () => {
  let removed = 0;
  const remove = () => { removed++; };
  assert.deepEqual(cleanupSmokeProfile({report:{safeToRemoveProfile:false},remove,exists:()=>true}), {temporaryProfileRemoved:false,cleanupFailed:true});
  assert.equal(removed, 0);
  assert.deepEqual(cleanupSmokeProfile({report:{safeToRemoveProfile:true},remove:()=>{throw new Error('synthetic file lock');},exists:()=>true}), {temporaryProfileRemoved:false,cleanupFailed:true});
  assert.deepEqual(cleanupSmokeProfile({report:{safeToRemoveProfile:true},remove,exists:()=>false}), {temporaryProfileRemoved:true,cleanupFailed:false});
});
