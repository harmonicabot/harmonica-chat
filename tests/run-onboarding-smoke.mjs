// Manual, paid agent smoke. Run only with explicit approval immediately beforehand.
// The MCP server and all session data are synthetic. Auth is reused in temporary
// consumer-native stores; it is never printed or copied into this repository.
import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createSmokeBudget, evaluateOnboardingCalls, FIXTURE_FLOW, parseSmokeArgs, SmokeDeadlineExceeded } from './onboarding-smoke-support.mjs';
import { cleanupSmokeProfile, createSmokeProcessRunner, SmokeProcessTimeout } from './onboarding-process-control.mjs';
import { claudeSmokeLoopArgs, createSmokeInputRunner, SMOKE_LOOP_LIMITS, SmokeInputBlocked, successfulSmokeInput, withOpenCodeSmokeLoopLimit } from './onboarding-smoke-limits.mjs';

// Validate before profile creation or touching any existing authentication.
const selection = parseSmokeArgs(process.argv.slice(2));
const repo = fileURLToPath(new URL('../', import.meta.url));
const realHome = process.env.USERPROFILE;
const root = mkdtempSync(join(process.env.LOCALAPPDATA, 'Temp', 'opencode', 'onboarding-smoke-'));
const flow = FIXTURE_FLOW;
const results = [];
const draftOnly = selection.draftOnly;
let processes;
let cleanup;
const budget = createSmokeBudget({ maxMs: selection.budgetMs,
  onExpire: () => processes.stopAll(new SmokeDeadlineExceeded()),
});
processes = createSmokeProcessRunner({ budget, spawn,
  terminateTree(pid) {
    const result = spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', timeout: 5000 });
    return result.status === 0 && !result.error && !result.signal;
  },
  isRunning(pid) {
    try { process.kill(pid, 0); return true; }
    catch (error) { return error.code === 'ESRCH' ? false : undefined; }
  },
});
const preamble = 'This is an isolated synthetic test. Use only the installed harmonica-chat skill, its files, and the synthetic Harmonica MCP. Do not use network, shell, other servers, or subagents. In this non-interactive harness, present a question in text and wait if the native question tool is unavailable. Do not invent user replies.';
function readAuth(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch { return null; } // Never print a potentially secret-bearing parser error.
}
function run(command, args, cwd, env, input) {
  return processes.run(command, args, cwd, env, input);
}
// Auth export/import use run directly; only actual user/model inputs consume this budget.
const modelInputs = createSmokeInputRunner(run);
function calls(audit) {
  return existsSync(audit) ? readFileSync(audit, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
}
try {
  for (const harness of [selection.harness]) {
    const home = join(root, harness, 'home');
    mkdirSync(home, { recursive: true });
    const env = { ...process.env, HOME: home, USERPROFILE: home,
      XDG_CONFIG_HOME: join(root, harness, 'config'), XDG_DATA_HOME: join(root, harness, 'data'),
      XDG_CACHE_HOME: join(root, harness, 'cache'), XDG_STATE_HOME: join(root, harness, 'state'),
      CLAUDE_CONFIG_DIR: join(home, '.claude'), OPENCODE_DB: join(root, harness, 'smoke.db'),
    };
    // Remove config overrides so the child cannot reconnect a real MCP server.
    for (const key of ['OPENCODE_CONFIG', 'OPENCODE_CONFIG_CONTENT', 'OPENCODE_CONFIG_DIR', 'OPENCODE_CLI_CONFIG_CONTENT']) delete env[key];
    if (harness === 'claude') {
      const authPath = join(realHome, '.claude', '.credentials.json');
      const auth = readAuth(authPath);
      if (!auth?.claudeAiOauth) { results.push({ harness, blocked: 'No readable existing Claude OAuth identity' }); continue; }
      if (!(auth.claudeAiOauth.expiresAt > Date.now() + 15 * 60000)) { results.push({ harness, blocked: 'Existing Claude access token expires too soon; no refresh attempted' }); continue; }
      mkdirSync(env.CLAUDE_CONFIG_DIR, { recursive: true });
      writeFileSync(join(env.CLAUDE_CONFIG_DIR, '.credentials.json'), JSON.stringify({ claudeAiOauth: { ...auth.claudeAiOauth, refreshToken: '' } }));
    } else {
      // V2's native store is SQLite; legacy auth.json may be stale. Capture a
      // scoped native export in memory, never on the terminal or in the repo.
      const cli = join(realHome, 'AppData', 'Roaming', 'npm', 'opencode2.ps1');
      const exported = await run('pwsh', ['-NoProfile', '-File', cli, 'auth', 'export', 'openai'], repo, process.env);
      let accounts;
      try { const value = JSON.parse(exported.text); accounts = Array.isArray(value) ? value : [value]; } catch { accounts = []; }
      const auth = accounts.find(a => a.integrationID === 'openai' && a.active && a.value?.type === 'oauth');
      if (exported.code !== 0 || !auth) { results.push({ harness, blocked: 'No native active OpenAI OAuth identity exported' }); continue; }
      if (!(auth.value.expires > Date.now() + 15 * 60000)) { results.push({ harness, blocked: 'Native OpenAI access expires too soon; no refresh attempted' }); continue; }
      const imported = await run('pwsh', ['-NoProfile', '-File', cli, 'auth', 'import', '--standalone'], home, env,
        JSON.stringify([{ ...auth, value: { ...auth.value, refresh: '' } }]));
      if (imported.code !== 0) {
        results.push({ harness, blocked: 'Native credential import into isolated test DB failed', importExit: imported.code,
          importDiagnostic: {
            validation: /schema|validation|invalid|expected/i.test(imported.text),
            array: /array/i.test(imported.text), refresh: /refresh/i.test(imported.text),
            stdin: /stdin|standard input|input file/i.test(imported.text),
            database: /database|sqlite|migration/i.test(imported.text),
            timeout: imported.code === null,
          } });
        continue;
      }
    }
    for (const scenario of [selection.scenario]) {
      const cwd = join(root, harness, scenario);
      mkdirSync(cwd, { recursive: true });
      const plugin = join(cwd, 'fixture-plugin');
      const skill = harness === 'claude' ? join(plugin, 'skills', 'harmonica-chat') : join(cwd, '.opencode', 'skills', 'harmonica-chat');
      mkdirSync(skill, { recursive: true });
      copyFileSync(join(repo, 'SKILL.md'), join(skill, 'SKILL.md'));
      cpSync(join(repo, 'reference'), join(skill, 'reference'), { recursive: true });
      if (harness === 'claude') {
        mkdirSync(join(plugin, '.claude-plugin'), { recursive: true });
        writeFileSync(join(plugin, '.claude-plugin', 'plugin.json'), JSON.stringify({ name: 'onboarding-fixture', version: '1.0.0' }));
      }
      const audit = join(cwd, 'calls.jsonl');
      const state = join(cwd, 'synthetic-created.json');
      const mcp = { command: process.execPath, args: [join(repo, 'tests', 'fixtures', 'onboarding-mcp.mjs'), scenario, audit, state, harness === 'claude' ? 'claude_code' : 'opencode'] };
      const prompt = `Continue my Harmonica onboarding for flow ${flow}. For any new session I prefer freeform, host-only results, no cross-pollination, no widgets, no distribution, and no pre-session questions. Show the session fields and settings, keep the generated facilitation prompt internal, and ask before creating. Do not invite anyone.`;
      let first, second, firstCalls;
      if (harness === 'claude') {
        writeFileSync(join(cwd, 'mcp.json'), JSON.stringify({ mcpServers: { harmonica: mcp } }));
        const cli = join(realHome, '.local', 'bin', 'claude.exe');
        const sessionId = randomUUID();
        const args = ['--restricted', '--plugin-dir', plugin, '--strict-mcp-config', '--mcp-config', join(cwd, 'mcp.json'), '--setting-sources', 'project', '--tools', 'Read,Skill,AskUserQuestion', '--allowedTools', 'Read,Skill,mcp__harmonica__*', '--permission-mode', 'dontAsk', '--max-budget-usd', '1', ...claudeSmokeLoopArgs(), '--output-format', 'stream-json', '--verbose', '--append-system-prompt', preamble];
        first = await modelInputs.run(cli, [...args, '--session-id', sessionId, '-p', prompt], cwd, env);
        firstCalls = calls(audit);
        if (scenario === 'ready' && !draftOnly && successfulSmokeInput(first) && !firstCalls.some(c => c.name === 'create_session')) {
          second = await modelInputs.run(cli, [...args, '--resume', sessionId, '-p', 'Yes, create the exact session design you just proposed with those settings. Do not send invitations.'], cwd, env);
        }
      } else {
        const config = withOpenCodeSmokeLoopLimit({ '$schema': 'https://opencode.ai/config.json', snapshots: false, plugins: [], skills: [],
          mcp: { servers: { harmonica: { type: 'local', command: [mcp.command, ...mcp.args] } } },
          agents: { build: { system: preamble, permissions: [
            { action: '*', resource: '*', effect: 'deny' },
            ...['read', 'skill', 'glob', 'grep', 'execute', 'harmonica_*'].map(action => ({ action, resource: '*', effect: 'allow' })),
          ] } },
        });
        writeFileSync(join(cwd, 'opencode.json'), JSON.stringify(config));
        const cli = join(realHome, 'AppData', 'Roaming', 'npm', 'opencode2.ps1');
        const args = ['-NoProfile', '-File', cli, 'run', '--standalone', '--format', 'json', '--model', 'openai/gpt-6.1-sol'];
        first = await modelInputs.run('pwsh', [...args, prompt], cwd, env);
        firstCalls = calls(audit);
        if (scenario === 'ready' && !draftOnly && successfulSmokeInput(first) && !firstCalls.some(c => c.name === 'create_session')) {
          const firstEvents = first.text.split('\n').flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
          const sessionId = firstEvents.find(e => /^ses_/.test(e.sessionID ?? ''))?.sessionID;
          if (sessionId) second = await modelInputs.run('pwsh', [...args, '--session', sessionId, `Continue my Harmonica onboarding for flow ${flow}. Yes, create the exact session design you just proposed with those settings. Do not send invitations.`], cwd, env);
        }
      }
      const seen = calls(audit);
      const names = seen.map(c => c.name);
      const creates = seen.filter(c => c.name === 'create_session');
      const events = first.text.split('\n').flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
      const secondEvents = (second?.text ?? '').split('\n').flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
      const eventShapes = items => [...new Map(items.map(e => [e.type, { type: e.type, fields: Object.keys(e), partFields: e.part ? Object.keys(e.part) : [] }])).values()];
      // Only model-authored replies to the synthetic fixture, never raw logs,
      // auth output, system metadata, or credential-store content.
      const syntheticReply = items => {
        const text = items.filter(e => e.type === 'text').map(e => e.part?.text ?? '').join('\n');
        return /hm_live_|sk-[a-z0-9]|Bearer\s|accessToken|refreshToken/i.test(text) ? '[withheld]' : text.slice(0, 2000);
      };
      const tools = harness === 'claude' ? events.flatMap(e => e.message?.content ?? []).filter(c => c.type === 'tool_use')
        : events.filter(e => e.type === 'tool_use').map(e => ({ name: e.part.tool, id: e.part.id, input: e.part.state?.input }));
      const toolResults = harness === 'claude' ? events.flatMap(e => e.message?.content ?? []).filter(c => c.type === 'tool_result')
        : events.filter(e => e.type === 'tool_use').map(e => ({ tool_use_id: e.part.id, is_error: e.part.state?.status === 'error' }));
      const last = events.findLast(e => e.type === 'result');
      const init = events.find(e => e.type === 'system' && e.subtype === 'init');
      const firstMcp = tools.findIndex(t => t.name?.startsWith('mcp__harmonica__') || t.name === 'execute' && /harmonica/.test(t.input?.code ?? ''));
      const skillReadBeforeMcp = tools.some((t, index) => t.name?.toLowerCase() === 'read'
        && index < firstMcp && (t.input?.file_path ?? t.input?.path)?.replaceAll('\\', '/') === join(skill, 'SKILL.md').replaceAll('\\', '/')
        && toolResults.some(r => r.tool_use_id === t.id && !r.is_error));
      const skillCalls = tools.filter(t => t.name?.toLowerCase() === 'skill');
      const nativeSkillInvocationSucceeded = skillCalls.some(t => toolResults.some(r => r.tool_use_id === t.id && !r.is_error));
      const fingerprinted = seen.length > 0 && seen.every(c => c.args.client === 'harmonica-chat' && c.args.client_version === '3.5.0');
      const oracle = evaluateOnboardingCalls({ scenario, firstCalls, seen, draftOnly });
      const consentHeld = oracle.consentHeld;
      const draftText = harness === 'opencode' ? syntheticReply(events) : last?.result ?? '';
      const promptDisplayed = /^#{1,6}\s+Facilitation prompt/im.test(draftText);
      const passed = successfulSmokeInput(first) && fingerprinted && oracle.workflowPassed
        && (scenario !== 'ready' || !promptDisplayed)
        && (scenario !== 'ready' || draftOnly || successfulSmokeInput(second));
      budget.remainingMs(); // Parsing/scoring cannot turn an expired run into a pass.
      results.push({ harness, scenario, firstExit: first.code, secondExit: second?.code ?? null,
        passed, scope: draftOnly ? 'draft_only' : 'workflow', calls: names, allFingerprinted: fingerprinted, noCreationBeforeConfirmation: consentHeld, promptDisplayed,
        terminalRoutingCorrect: oracle.terminalRouting, exactRecoveryTarget: oracle.exactRecoveryTarget,
        fingerprintArguments: seen.map(c => ({ operation: c.name, fields: Object.keys(c.args), clientMatches: c.args.client === 'harmonica-chat', version: /^\d+\.\d+\.\d+$/.test(c.args.client_version ?? '') ? c.args.client_version : null })),
        builtInTools: tools.map(t => t.name), skillInvoked: skillCalls.length > 0,
        ...(harness === 'opencode' && !passed ? { eventShapes: eventShapes(events), secondEventShapes: eventShapes(secondEvents),
          syntheticFirstReply: syntheticReply(events), syntheticSecondReply: syntheticReply(secondEvents),
          secondOutputIndicators: { permission: /permission|denied|not allowed/i.test(second?.text ?? ''),
            missingPreviousContext: /no.*previous|cannot.*previous|can.t.*previous|don.t.*previous|no.*draft|can.t.*draft/i.test(second?.text ?? ''),
            auth: /401|unauthorized|not authenticated/i.test(second?.text ?? ''),
            needsConfirmation: /confirm|approval/i.test(second?.text ?? ''),
          } } : {}),
        nativeSkillInvocationSucceeded, skillReadBeforeMcp,
        resultSubtype: last?.subtype ?? null, reportedCostUsd: last?.total_cost_usd ?? null,
        resultIsError: last?.is_error ?? null,
        installedSkillDiscovered: harness === 'opencode' ? nativeSkillInvocationSucceeded
          : Array.isArray(init?.skills) && init.skills.some(s => /(^|:)harmonica-chat$/.test(typeof s === 'string' ? s : s.name)),
        limitOrQuotaMentioned: /hit your limit|usage limit|quota|credit balance|rate limit|too many requests|429/i.test(draftText),
        authenticationMentioned: /authentication|oauth|not logged in|log in|401|unauthorized/i.test(last?.result ?? ''),
        configurationErrorMentioned: /invalid settings|invalid.*permission|not supported|not allowed.*restricted|must.*verbose/i.test(last?.result ?? ''),
        skillMissing: skillCalls.some(t => toolResults.some(r => r.tool_use_id === t.id && r.is_error)),
        created: creates.length, recovered: names.includes('get_session'),
        attributionCorrect: creates.length === 0 ? null : creates.every(c => c.args.onboarding_flow_id === flow),
        outputMentionsAuthFailure: /not logged in|authentication failed|unauthorized|login required|API key missing|credentials not found/i.test(draftText),
      });
      // Fail fast: another scenario cannot fix auth/quota or discovery failure.
      if (!passed) break;
    }
  }
} catch (error) {
  const blocked = error instanceof SmokeDeadlineExceeded || error instanceof SmokeProcessTimeout || error instanceof SmokeInputBlocked
    ? error.message : 'Runner failed; no further subprocess is allowed.';
  results.push({ harness: selection.harness, scenario: selection.scenario, blocked });
} finally {
  budget.close();
  processes.stopAll(new Error('Runner cleanup stopped further subprocesses.'));
  const report = processes.cleanupReport();
  // Never delete an unconfirmed process tree's potentially active profile.
  cleanup = cleanupSmokeProfile({ report,
    remove: () => rmSync(root, { recursive: true, force: true }), exists: () => existsSync(root),
  });
  if (cleanup.cleanupFailed) results.push({ blocked: 'Cleanup incomplete; process/profile requires explicit follow-up. Keep the retained profile private; it may contain credentials.',
    unconfirmedProcessIds: report.unconfirmedProcessIds, unknownProcessCount: report.unknownProcessCount, temporaryProfilePath: root,
  });
}
console.log(JSON.stringify({ results, wholeRunBudgetMs: selection.budgetMs, loopLimits: SMOKE_LOOP_LIMITS, ...modelInputs.summary(), ...cleanup }, null, 2));
if (results.some(r => r.blocked || !r.passed)) process.exitCode = 1;
