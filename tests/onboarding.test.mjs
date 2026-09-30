import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const router = read('SKILL.md');
const onboarding = read('reference/onboarding.md');

test('installed skill version and onboarding route are discoverable', () => {
  assert.match(router, /<!-- harmonica-chat v\d+\.\d+\.\d+ -->/);
  assert.match(router, /Onboarding continuation[\s\S]*reference\/onboarding\.md/);
  assert.match(router, /Read `<installed version>` from the `<!-- harmonica-chat vX\.Y\.Z -->` comment/);
  assert.match(router, /including preflight, template and project reads/);
});

test('onboarding does not silently bypass verification, consent, or recovery', () => {
  for (const status of ['browser_required', 'onboarding_skipped', 'expired', 'ready']) {
    assert.ok(onboarding.includes(`\`${status}\``), `Missing onboarding status: ${status}`);
  }
  for (const invariant of [
    'continue_onboarding', 'created_session_id', 'get_session', 'explicit host confirmation',
    'onboarding_flow_id', 'client_version', 'Do not retry creation blindly',
  ]) {
    assert.ok(onboarding.includes(invariant), `Missing onboarding contract: ${invariant}`);
  }
  assert.match(onboarding, /do not create again/i);
  assert.match(onboarding, /do not fall back to REST, the local npm MCP server/i);
});

test('both installers ship the route without auto-approving its verification write', () => {
  for (const installer of ['install.sh', 'install.ps1']) {
    const source = read(installer);
    assert.match(source, /"onboarding\.md"/);
    assert.doesNotMatch(source, /mcp__harmonica__continue_onboarding/);
  }
  assert.match(read('reference/opencode.md'), /tools\.harmonica\.continue_onboarding/);
});
