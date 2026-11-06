import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('..', import.meta.url));
const fixtureKey = 'hm_live_installer_fixture_only';
const bashTest = (name, fn) => test(name, {
  skip: process.platform === 'win32' ? 'Run Bash installer tests in a POSIX environment; these do not test PowerShell.' : false,
}, fn);

function install(t, { existing = {}, failAdd = false, key = fixtureKey } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'harmonica-install-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const profile = join(root, 'profile');
  const bin = join(root, 'bin');
  mkdirSync(bin);
  mkdirSync(profile);
  writeFileSync(join(root, 'servers.json'), JSON.stringify(existing));
  writeFileSync(join(profile, 'settings.json'), JSON.stringify({
    theme: 'dark', permissions: { allow: ['Read'], deny: ['Write'] },
  }));
  writeFileSync(join(bin, 'claude'), `#!${process.execPath}
const fs = require('node:fs');
const path = require('node:path');
const root = process.env.INSTALLER_FIXTURE_ROOT;
const args = process.argv.slice(2);
fs.appendFileSync(path.join(root, 'calls.jsonl'), JSON.stringify(args) + '\\n');
const statePath = path.join(root, 'servers.json');
const servers = JSON.parse(fs.readFileSync(statePath, 'utf8'));
if (args[0] === '--version') { console.log('Claude Code fixture'); process.exit(0); }
if (args.join(' ') === 'mcp list') {
  console.log(Object.keys(servers).map(name => name + ': configured').join('\\n'));
  process.exit(0);
}
if (args[0] === 'mcp' && args[1] === 'get') {
  if (!(args[2] in servers)) process.exit(1);
  console.log(JSON.stringify(servers[args[2]])); process.exit(0);
}
if (args[0] === 'mcp' && args[1] === 'add-json') {
  if (process.env.INSTALLER_FAIL_ADD === '1') process.exit(1);
  if (args[2] in servers) process.exit(1);
  servers[args[2]] = JSON.parse(args[3]);
  fs.writeFileSync(statePath, JSON.stringify(servers)); process.exit(0);
}
process.exit(90);
`, { mode: 0o755 });
  // Downloads are the external boundary; installation and settings writes remain real.
  writeFileSync(join(bin, 'curl'), `#!${process.execPath}
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const output = args[args.indexOf('-o') + 1];
const profile = process.env.CLAUDE_CONFIG_DIR;
if (!output || !path.resolve(output).startsWith(path.resolve(profile) + path.sep)) process.exit(91);
const url = args.find(value => value.startsWith('https://'));
const relative = url.split('/master/')[1];
fs.copyFileSync(path.join(process.env.INSTALLER_FIXTURE_REPO, relative), output);
`, { mode: 0o755 });
  const env = {
    ...process.env,
    PATH: `${bin}:${process.env.PATH}`,
    CLAUDE_CONFIG_DIR: profile,
    INSTALLER_FIXTURE_ROOT: root,
    INSTALLER_FIXTURE_REPO: repo,
    INSTALLER_FAIL_ADD: failAdd ? '1' : '0',
  };
  delete env.HARMONICA_API_KEY;
  if (key !== undefined && key !== null) env.HARMONICA_API_KEY = key;
  const result = spawnSync('/bin/bash', [resolve(repo, 'install.sh')], {
    env, encoding: 'utf8', timeout: 10_000,
  });
  const calls = readFileSync(join(root, 'calls.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  return { ...result, root, profile, calls,
    servers: JSON.parse(readFileSync(join(root, 'servers.json'), 'utf8')) };
}

bashTest('failed registration exits without exposing the API key', t => {
  const result = install(t, { failAdd: true });
  assert.equal(result.status, 1);
  assert.ok(!`${result.stdout}${result.stderr}`.includes(fixtureKey), 'registration failure must not print the key');
});

bashTest('new installs register hosted HTTP with a runtime key reference and install the skill', t => {
  const result = install(t);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.servers.harmonica, {
    type: 'http', url: 'https://app.harmonica.chat/api/mcp/mcp',
    headers: { Authorization: 'Bearer ${HARMONICA_API_KEY}' },
  });
  assert.ok(!JSON.stringify(result.calls).includes(fixtureKey), 'the key must not enter CLI arguments');
  assert.ok(!`${result.stdout}${result.stderr}`.includes(fixtureKey));
  assert.match(readFileSync(join(result.profile, 'skills/harmonica-chat/SKILL.md'), 'utf8'), /name: harmonica-chat/);
  assert.match(readFileSync(join(result.profile, 'skills/harmonica-chat/reference/onboarding.md'), 'utf8'), /continue_onboarding/);
  const settings = JSON.parse(readFileSync(join(result.profile, 'settings.json'), 'utf8'));
  assert.equal(settings.theme, 'dark');
  assert.deepEqual(settings.permissions.deny, ['Write']);
  assert.ok(settings.permissions.allow.includes('Read'));
  assert.ok(settings.permissions.allow.includes('mcp__harmonica__list_sessions'));
  assert.ok(!settings.permissions.allow.includes('mcp__harmonica__continue_onboarding'));
});

bashTest('an existing local registration is preserved without requiring another key', t => {
  const existing = { harmonica: {
    type: 'stdio', command: 'node', args: ['/custom/mcp.js'],
    env: { HARMONICA_API_URL: 'http://localhost:3000', HARMONICA_API_KEY: 'hm_live_existing_fixture' },
  } };
  const result = install(t, { existing, key: null });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.servers, existing);
  assert.ok(!result.calls.some(args => args[1] === 'add-json'));
});

bashTest('another server whose name starts with harmonica does not suppress registration', t => {
  const other = { type: 'stdio', command: 'other-server' };
  const result = install(t, { existing: { 'harmonica-other': other } });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.servers['harmonica-other'], other);
  assert.equal(result.servers.harmonica.type, 'http');
});

bashTest('a new install without a key fails before registering a server', t => {
  const result = install(t, { key: null });
  assert.equal(result.status, 1);
  assert.deepEqual(result.servers, {});
  assert.ok(!result.calls.some(args => args[1] === 'add-json'));
});
