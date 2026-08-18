#!/bin/bash
# Install harmonica-chat for Claude Code (v3.1.0+: end-to-end install incl. MCP + permissions)

set -e

VERSION="3.1.0"
REPO_URL="https://raw.githubusercontent.com/harmonicabot/harmonica-chat/master"
CLAUDE_DIR="$HOME/.claude"
SKILL_DIR="$CLAUDE_DIR/skills/harmonica-chat"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"
REFERENCE_FILES=(
  "design.md"
  "accelerated.md"
  "status.md"
  "check.md"
  "summary.md"
  "edit.md"
  "review.md"
  "follow-up.md"
  "invitation.md"
  "expertise.md"
  "opencode.md"
)
AUTO_APPROVE_TOOLS=(
  "mcp__harmonica__list_sessions"
  "mcp__harmonica__search_sessions"
  "mcp__harmonica__get_session"
  "mcp__harmonica__get_responses"
  "mcp__harmonica__get_summary"
  "mcp__harmonica__list_telegram_groups"
)

echo "harmonica-chat installer v$VERSION"
echo ""

# --- 1. Prereq: HARMONICA_API_KEY ---
if [ -z "$HARMONICA_API_KEY" ]; then
  echo "✗ HARMONICA_API_KEY is not set."
  echo ""
  echo "Get your key at https://app.harmonica.chat/profile (Profile > API Keys > Generate API Key)."
  echo "Then re-run with the key set:"
  echo "  HARMONICA_API_KEY=hm_live_... bash <(curl -fsSL $REPO_URL/install.sh)"
  exit 1
fi
case "$HARMONICA_API_KEY" in
  hm_live_*) ;;
  *) echo "✗ HARMONICA_API_KEY doesn't look like a Harmonica key (expected hm_live_...)."; exit 1 ;;
esac
echo "✓ HARMONICA_API_KEY detected"

# --- 2. Prereq: claude CLI ---
if ! command -v claude >/dev/null 2>&1; then
  echo "✗ claude CLI not found on PATH."
  echo ""
  echo "harmonica-chat runs inside Claude Code. Install it from https://claude.ai/code,"
  echo "then re-run this installer."
  exit 1
fi
echo "✓ claude CLI found ($(claude --version 2>/dev/null | head -1))"

# --- 3. Prereq: node (for npx harmonica-mcp + settings.json merge) ---
if ! command -v node >/dev/null 2>&1; then
  echo "✗ node not found on PATH."
  echo ""
  echo "harmonica-chat needs Node.js to run the harmonica-mcp server via npx."
  echo "Install Node.js (≥18) from https://nodejs.org, then re-run."
  exit 1
fi
echo "✓ node found ($(node --version))"

# --- 4. Configure harmonica-mcp ---
if claude mcp list 2>/dev/null | grep -q "^harmonica"; then
  echo "✓ harmonica MCP already configured (skipping add-json)"
else
  MCP_JSON=$(cat <<JSON
{"command":"npx","args":["-y","harmonica-mcp"],"env":{"HARMONICA_API_KEY":"$HARMONICA_API_KEY"}}
JSON
)
  if claude mcp add-json harmonica "$MCP_JSON" -s user >/dev/null 2>&1; then
    echo "✓ Configured harmonica MCP server (-s user)"
  else
    echo "✗ Failed to configure harmonica MCP. Run manually:"
    echo "  claude mcp add-json harmonica '$MCP_JSON' -s user"
    exit 1
  fi
fi

# --- 5. Install SKILL.md + reference/ ---
mkdir -p "$SKILL_DIR/reference"
curl -fsSL "$REPO_URL/SKILL.md" -o "$SKILL_DIR/SKILL.md"
# Clean stale reference files first so removed-upstream files (like templates.md
# in v3.3.0) don't linger on update.
rm -f "$SKILL_DIR/reference/"*.md
for file in "${REFERENCE_FILES[@]}"; do
  curl -fsSL "$REPO_URL/reference/$file" -o "$SKILL_DIR/reference/$file"
done
echo "✓ Installed SKILL.md + ${#REFERENCE_FILES[@]} reference files to $SKILL_DIR"

# --- 6. Pre-approve read-only harmonica MCP tools ---
# Use os.homedir() inside the node script — bash $HOME on Git Bash for Windows
# is POSIX-form (/c/Users/...) which Node misinterprets as a relative path
# under the drive root, producing C:\c\Users\... and failing to write.
TOOLS_JSON=$(printf '"%s",' "${AUTO_APPROVE_TOOLS[@]}")
TOOLS_JSON="[${TOOLS_JSON%,}]"
node -e "
const fs = require('fs');
const os = require('os');
const path = require('path');
const claudeDir = path.join(os.homedir(), '.claude');
const p = path.join(claudeDir, 'settings.json');
fs.mkdirSync(claudeDir, { recursive: true });
const tools = $TOOLS_JSON;
let cfg = {};
if (fs.existsSync(p)) {
  try { cfg = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) {
    console.error('  (settings.json exists but is unparseable — leaving permissions.allow alone)');
    process.exit(0);
  }
}
cfg.permissions = cfg.permissions || {};
cfg.permissions.allow = cfg.permissions.allow || [];
let added = 0;
for (const t of tools) if (!cfg.permissions.allow.includes(t)) { cfg.permissions.allow.push(t); added++; }
fs.writeFileSync(p, JSON.stringify(cfg, null, 2));
console.log('✓ Pre-approved ' + tools.length + ' read-only MCP tools (' + added + ' newly added)');
"

# --- 7. Migration: remove the v2.x slash-command install if present ---
LEGACY_CMD="$CLAUDE_DIR/commands/harmonica-chat.md"
if [ -f "$LEGACY_CMD" ]; then
  rm "$LEGACY_CMD"
  echo "✓ Removed legacy v2.x slash-command install"
fi

# --- 8. Verify MCP registration ---
if claude mcp list 2>/dev/null | grep -q "^harmonica"; then
  echo "✓ harmonica MCP registered"
else
  echo "⚠ Could not verify harmonica MCP registration (claude mcp list didn't show it)"
fi

echo ""
echo "Installation complete."
echo "Next: restart Claude Code, then ask it to design a Harmonica session — or run /harmonica-chat."
