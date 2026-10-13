// Manual, paid agent smoke. Run only with explicit approval immediately beforehand.
// The MCP server and all session data are synthetic. Auth is reused in temporary
// consumer-native stores; it is never printed or copied into this repository.
import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const repo = fileURLToPath(new URL('../', import.meta.url));
const realHome = process.env.USERPROFILE;
const root = mkdtempSync(join(process.env.LOCALAPPDATA, 'Temp', 'opencode', 'onboarding-smoke-'));
const flow = '123e4567-e89b-42d3-a456-426614174000';
const results = [];
const active = new Set();
const preamble = 'This is an isolated synthetic test. Use only the installed harmonica-chat skill, its files, and the synthetic Harmonica MCP. Do not use network, shell, other servers, or subagents. In this non-interactive harness, present a question in text and wait if the native question tool is unavailable. Do not invent user replies.';
function readAuth(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch { return null; } // Never print a potentially secret-bearing parser error.
}
function run(command, args, cwd, env) {
  return new Promise((done) => {
    const child = spawn(command, args, { cwd, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    active.add(child.pid);
    let text = '';
    child.stdout.on('data', b => { text += b; });
    child.stderr.on('data', b => { text += b; });
    const timer = setTimeout(() => {
      spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    }, 120000);
    child.on('error', () => { clearTimeout(timer); active.delete(child.pid); done({ code: -1, text: '' }); });
    child.on('close', code => { clearTimeout(timer); active.delete(child.pid); done({ code, text }); });
  });
}
function calls(audit) {
  return existsSync(audit) ? readFileSync(audit, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
}
try {
  for (const harness of (process.argv[2] ? [process.argv[2]] : ['claude', 'opencode'])) {
    const home = join(root, harness, 'home');
    mkdirSync(home, { recursive: true });
    const env = { ...process.env, HOME: home, USERPROFILE: home,
      XDG_CONFIG_HOME: join(root, harness, 'config'), XDG_DATA_HOME: join(root, harness, 'data'),
      XDG_CACHE_HOME: join(root, harness, 'cache'), XDG_STATE_HOME: join(root, harness, 'state'),
      CLAUDE_CONFIG_DIR: join(home, '.claude'), OPENCODE_DB: ':memory:',
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
      const auth = readAuth(join(realHome, '.local', 'share', 'opencode', 'auth.json'));
      if (!auth?.openai) { results.push({ harness, blocked: 'No readable existing OpenAI identity' }); continue; }
      if (!(auth.openai.expires > Date.now() + 15 * 60000)) { results.push({ harness, blocked: 'Existing OpenAI access token expired or expires too soon; no refresh attempted' }); continue; }
      mkdirSync(join(env.XDG_DATA_HOME, 'opencode'), { recursive: true });
      writeFileSync(join(env.XDG_DATA_HOME, 'opencode', 'auth.json'), JSON.stringify({ openai: { ...auth.openai, refresh: '' } }));
    }
    for (const scenario of (process.argv[3] ? [process.argv[3]] : ['browser', 'recovery', 'ready'])) {
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
      const prompt = `Continue my Harmonica onboarding for flow ${flow}. For any new session I prefer freeform, host-only results, no cross-pollination, no widgets, no distribution, and no pre-session questions. Show the full draft and ask before creating. Do not invite anyone.`;
      let first, second, firstCalls;
      if (harness === 'claude') {
        writeFileSync(join(cwd, 'mcp.json'), JSON.stringify({ mcpServers: { harmonica: mcp } }));
        const cli = join(realHome, '.local', 'bin', 'claude.exe');
        const sessionId = randomUUID();
        const args = ['--restricted', '--plugin-dir', plugin, '--strict-mcp-config', '--mcp-config', join(cwd, 'mcp.json'), '--setting-sources', 'project', '--tools', 'Read,Skill,AskUserQuestion', '--allowedTools', 'Read,Skill,mcp__harmonica__*', '--permission-mode', 'dontAsk', '--max-budget-usd', '1', '--output-format', 'stream-json', '--verbose', '--append-system-prompt', preamble];
        first = await run(cli, [...args, '--session-id', sessionId, '-p', prompt], cwd, env);
        firstCalls = calls(audit);
        if (scenario === 'ready' && first.code === 0 && !firstCalls.some(c => c.name === 'create_session')) {
          second = await run(cli, [...args, '--resume', sessionId, '-p', 'Yes, create the exact session design you just proposed with those settings. Do not send invitations.'], cwd, env);
        }
      } else {
        const config = { '$schema': 'https://opencode.ai/config.json', snapshots: false, plugins: [], skills: [],
          mcp: { servers: { harmonica: { type: 'local', command: [mcp.command, ...mcp.args] } } },
          agents: { build: { system: preamble, permissions: [
            { action: '*', resource: '*', effect: 'deny' },
            ...['read', 'skill', 'glob', 'grep', 'execute', 'harmonica_*'].map(action => ({ action, resource: '*', effect: 'allow' })),
          ] } },
        };
        writeFileSync(join(cwd, 'opencode.json'), JSON.stringify(config));
        const cli = join(realHome, 'AppData', 'Roaming', 'npm', 'opencode2.ps1');
        const args = ['-NoProfile', '-File', cli, 'run', '--standalone', '--format', 'json', '--model', 'openai/gpt-6.1-sol'];
        env.OPENCODE_DB = join(cwd, 'smoke.db');
        first = await run('pwsh', [...args, prompt], cwd, env);
        firstCalls = calls(audit);
        if (scenario === 'ready' && first.code === 0 && !firstCalls.some(c => c.name === 'create_session')) {
          second = await run('pwsh', [...args, '--continue', 'Yes, create the exact session design you just proposed with those settings. Do not send invitations.'], cwd, env);
        }
      }
      const seen = calls(audit);
      const names = seen.map(c => c.name);
      const creates = seen.filter(c => c.name === 'create_session');
      const events = first.text.split('\n').flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
      const tools = events.flatMap(e => e.message?.content ?? []).filter(c => c.type === 'tool_use');
      const toolResults = events.flatMap(e => e.message?.content ?? []).filter(c => c.type === 'tool_result');
      const last = events.findLast(e => e.type === 'result');
      const init = events.find(e => e.type === 'system' && e.subtype === 'init');
      const firstMcp = tools.findIndex(t => t.name?.startsWith('mcp__harmonica__'));
      const skillReadBeforeMcp = tools.some((t, index) => t.name === 'Read'
        && index < firstMcp && t.input?.file_path?.replaceAll('\\', '/') === join(skill, 'SKILL.md').replaceAll('\\', '/')
        && toolResults.some(r => r.tool_use_id === t.id && !r.is_error));
      const skillCalls = tools.filter(t => t.name === 'Skill');
      const nativeSkillInvocationSucceeded = skillCalls.some(t => toolResults.some(r => r.tool_use_id === t.id && !r.is_error));
      const fingerprinted = seen.length > 0 && seen.every(c => c.args.client === 'harmonica-chat' && c.args.client_version === '3.5.0');
      const consentHeld = !firstCalls.some(c => c.name === 'create_session');
      const passed = first.code === 0 && fingerprinted && consentHeld && (scenario === 'browser'
        ? names.includes('continue_onboarding') && creates.length === 0
        : scenario === 'recovery' ? creates.length === 0 && names.includes('get_session')
        : second?.code === 0 && creates.length === 1 && creates[0].args.onboarding_flow_id === flow
          && names.indexOf('list_templates') >= 0 && names.indexOf('list_templates') < names.indexOf('create_session')
          && names.includes('get_session'));
      results.push({ harness, scenario, firstExit: first.code, secondExit: second?.code ?? null,
        passed, calls: names, allFingerprinted: fingerprinted, noCreationBeforeConfirmation: consentHeld,
        fingerprintArguments: seen.map(c => ({ operation: c.name, fields: Object.keys(c.args), clientMatches: c.args.client === 'harmonica-chat', version: /^\d+\.\d+\.\d+$/.test(c.args.client_version ?? '') ? c.args.client_version : null })),
        builtInTools: tools.map(t => t.name), skillInvoked: tools.some(t => t.name === 'Skill'),
        nativeSkillInvocationSucceeded, skillReadBeforeMcp,
        resultSubtype: last?.subtype ?? null, reportedCostUsd: last?.total_cost_usd ?? null,
        resultIsError: last?.is_error ?? null,
        installedSkillDiscovered: Array.isArray(init?.skills) && init.skills.some(s => /(^|:)harmonica-chat$/.test(typeof s === 'string' ? s : s.name)),
        limitOrQuotaMentioned: /hit your limit|usage limit|quota|credit balance|rate limit|too many requests|429/i.test(first.text),
        authenticationMentioned: /authentication|oauth|not logged in|log in|401|unauthorized/i.test(last?.result ?? ''),
        configurationErrorMentioned: /invalid settings|invalid.*permission|not supported|not allowed.*restricted|must.*verbose/i.test(last?.result ?? ''),
        skillMissing: skillCalls.some(t => toolResults.some(r => r.tool_use_id === t.id && r.is_error)),
        created: creates.length, recovered: names.includes('get_session'),
        attributionCorrect: creates.length === 0 ? null : creates.every(c => c.args.onboarding_flow_id === flow),
        outputMentionsAuthFailure: /not logged in|authentication failed|unauthorized|login required|API key missing|credentials not found/i.test(first.text),
      });
      // Fail fast: another scenario cannot fix auth/quota or discovery failure.
      if (!passed) break;
    }
  }
} finally {
  for (const pid of active) spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
  // Task-owned directory only; credentials and transcripts never persist in repo.
  rmSync(root, { recursive: true, force: true });
}
console.log(JSON.stringify({ results, temporaryProfileRemoved: !existsSync(root) }, null, 2));
if (results.some(r => r.blocked || !r.passed)) process.exitCode = 1;
