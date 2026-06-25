# Install harmonica-chat for Claude Code (v3.1.0+: end-to-end install incl. MCP + permissions)

$ErrorActionPreference = "Stop"

$Version = "3.1.0"
$RepoUrl = "https://raw.githubusercontent.com/harmonicabot/harmonica-chat/master"
$ClaudeDir = "$env:USERPROFILE\.claude"
$SkillDir = "$ClaudeDir\skills\harmonica-chat"
$SettingsFile = "$ClaudeDir\settings.json"
$ReferenceFiles = @(
  "design.md", "accelerated.md", "status.md", "check.md", "summary.md",
  "edit.md", "review.md", "follow-up.md", "invitation.md", "templates.md",
  "expertise.md"
)
$AutoApproveTools = @(
  "mcp__harmonica__list_sessions",
  "mcp__harmonica__search_sessions",
  "mcp__harmonica__get_session",
  "mcp__harmonica__get_responses",
  "mcp__harmonica__get_summary",
  "mcp__harmonica__list_telegram_groups"
)

Write-Host "harmonica-chat installer v$Version"
Write-Host ""

# --- 1. Prereq: HARMONICA_API_KEY ---
if (-not $env:HARMONICA_API_KEY) {
  Write-Host "X HARMONICA_API_KEY is not set."
  Write-Host ""
  Write-Host "Get your key at https://app.harmonica.chat/profile (Profile > API Keys > Generate API Key)."
  Write-Host "Then re-run with the key set:"
  Write-Host "  `$env:HARMONICA_API_KEY = 'hm_live_...'; irm $RepoUrl/install.ps1 | iex"
  exit 1
}
if (-not $env:HARMONICA_API_KEY.StartsWith("hm_live_")) {
  Write-Host "X HARMONICA_API_KEY doesn't look like a Harmonica key (expected hm_live_...)."
  exit 1
}
Write-Host "OK HARMONICA_API_KEY detected"

# --- 2. Prereq: claude CLI ---
if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  Write-Host "X claude CLI not found on PATH."
  Write-Host ""
  Write-Host "harmonica-chat runs inside Claude Code. Install it from https://claude.ai/code,"
  Write-Host "then re-run this installer."
  exit 1
}
$ClaudeVersion = (& claude --version 2>$null | Select-Object -First 1)
Write-Host "OK claude CLI found ($ClaudeVersion)"

# --- 3. Prereq: node ---
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "X node not found on PATH."
  Write-Host ""
  Write-Host "harmonica-chat needs Node.js to run the harmonica-mcp server via npx."
  Write-Host "Install Node.js (>=18) from https://nodejs.org, then re-run."
  exit 1
}
$NodeVersion = (& node --version)
Write-Host "OK node found ($NodeVersion)"

# --- 4. Configure harmonica-mcp ---
$McpList = & claude mcp list 2>$null
if ($McpList -match "^harmonica") {
  Write-Host "OK harmonica MCP already configured (skipping add-json)"
} else {
  $McpConfig = @{
    command = "npx"
    args = @("-y", "harmonica-mcp")
    env = @{ HARMONICA_API_KEY = $env:HARMONICA_API_KEY }
  } | ConvertTo-Json -Compress
  try {
    & claude mcp add-json harmonica $McpConfig -s user *> $null
    Write-Host "OK Configured harmonica MCP server (-s user)"
  } catch {
    Write-Host "X Failed to configure harmonica MCP. Run manually:"
    Write-Host "  claude mcp add-json harmonica '$McpConfig' -s user"
    exit 1
  }
}

# --- 5. Install SKILL.md + reference/ ---
New-Item -ItemType Directory -Force -Path "$SkillDir\reference" | Out-Null
Invoke-WebRequest -Uri "$RepoUrl/SKILL.md" -OutFile "$SkillDir\SKILL.md"
foreach ($file in $ReferenceFiles) {
  Invoke-WebRequest -Uri "$RepoUrl/reference/$file" -OutFile "$SkillDir\reference\$file"
}
Write-Host "OK Installed SKILL.md + $($ReferenceFiles.Count) reference files to $SkillDir"

# --- 6. Pre-approve read-only harmonica MCP tools ---
# Use os.homedir() inside the node script for consistency with install.sh (which
# needs it for Git Bash on Windows path translation). PowerShell wouldn't strictly
# need this, but the same script keeps both installers in sync.
$ToolsJson = ($AutoApproveTools | ForEach-Object { "`"$_`"" }) -join ","
$NodeScript = @"
const fs = require('fs');
const os = require('os');
const path = require('path');
const claudeDir = path.join(os.homedir(), '.claude');
const p = path.join(claudeDir, 'settings.json');
fs.mkdirSync(claudeDir, { recursive: true });
const tools = [$ToolsJson];
let cfg = {};
if (fs.existsSync(p)) {
  try { cfg = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) {
    console.error('  (settings.json exists but is unparseable - leaving permissions.allow alone)');
    process.exit(0);
  }
}
cfg.permissions = cfg.permissions || {};
cfg.permissions.allow = cfg.permissions.allow || [];
let added = 0;
for (const t of tools) if (!cfg.permissions.allow.includes(t)) { cfg.permissions.allow.push(t); added++; }
fs.writeFileSync(p, JSON.stringify(cfg, null, 2));
console.log('OK Pre-approved ' + tools.length + ' read-only MCP tools (' + added + ' newly added)');
"@
& node -e $NodeScript

# --- 7. Migration: remove the v2.x slash-command install if present ---
$LegacyCmd = "$ClaudeDir\commands\harmonica-chat.md"
if (Test-Path $LegacyCmd) {
  Remove-Item $LegacyCmd
  Write-Host "OK Removed legacy v2.x slash-command install"
}

# --- 8. Verify MCP registration ---
$McpListAfter = & claude mcp list 2>$null
if ($McpListAfter -match "^harmonica") {
  Write-Host "OK harmonica MCP registered"
} else {
  Write-Host "! Could not verify harmonica MCP registration (claude mcp list didn't show it)"
}

Write-Host ""
Write-Host "Installation complete."
Write-Host "Next: restart Claude Code, then ask it to design a Harmonica session - or run /harmonica-chat."
