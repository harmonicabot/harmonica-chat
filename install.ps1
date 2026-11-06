# Install harmonica-chat for Claude Code (hosted MCP by default)

$ErrorActionPreference = "Stop"

$Version = "3.6.0"
$RepoUrl = "https://raw.githubusercontent.com/harmonicabot/harmonica-chat/master"
$ClaudeDir = if ($env:CLAUDE_CONFIG_DIR) { $env:CLAUDE_CONFIG_DIR } else { "$env:USERPROFILE\.claude" }
$SkillDir = "$ClaudeDir\skills\harmonica-chat"
$SettingsFile = "$ClaudeDir\settings.json"
$ReferenceFiles = @(
  "design.md", "accelerated.md", "status.md", "check.md", "summary.md",
  "edit.md", "review.md", "follow-up.md", "invitation.md", "expertise.md",
  "opencode.md", "onboarding.md"
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

# --- 1. Prereq: claude CLI ---
if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  Write-Host "X claude CLI not found on PATH."
  Write-Host ""
  Write-Host "harmonica-chat runs inside Claude Code. Install it from https://claude.ai/code,"
  Write-Host "then re-run this installer."
  exit 1
}
$ClaudeVersion = (& claude --version 2>$null | Select-Object -First 1)
Write-Host "OK claude CLI found ($ClaudeVersion)"

# --- 2. Prereq: node (for the settings.json merge, not a local MCP server) ---
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "X node not found on PATH."
  Write-Host ""
  Write-Host "The installer uses Node.js to update Claude Code's read-only tool permissions."
  Write-Host "Install Node.js from https://nodejs.org, then re-run."
  exit 1
}
$NodeVersion = (& node --version)
Write-Host "OK node found ($NodeVersion)"

# --- 3. Configure hosted MCP only when no exact registration exists ---
$McpExists = $false
try {
  & claude mcp get harmonica *> $null
  $McpExists = ($LASTEXITCODE -eq 0)
} catch {
  # Missing registrations may throw on native stderr in Windows PowerShell 5.1.
  $McpExists = $false
}
if ($McpExists) {
  Write-Host "OK harmonica MCP already configured (preserving the existing connection)"
} else {
  if (-not $env:HARMONICA_API_KEY) {
    Write-Host "X HARMONICA_API_KEY is not set."
    Write-Host "Get your key at https://app.harmonica.chat/profile (Profile > API Keys > Generate API Key)."
    Write-Host "Set it in the PowerShell session you use to start Claude Code, then re-run:"
    Write-Host "  `$env:HARMONICA_API_KEY = 'hm_live_...'"
    exit 1
  }
  if (-not $env:HARMONICA_API_KEY.StartsWith("hm_live_")) {
    Write-Host "X HARMONICA_API_KEY doesn't look like a Harmonica key (expected hm_live_...)."
    exit 1
  }
  $McpConfig = @{
    type = "http"
    url = "https://app.harmonica.chat/api/mcp/mcp"
    headers = @{ Authorization = 'Bearer ${HARMONICA_API_KEY}' }
  } | ConvertTo-Json -Compress
  try {
    & claude mcp add-json harmonica $McpConfig -s user *> $null
    if ($LASTEXITCODE -ne 0) { throw "MCP registration failed." }
    Write-Host "OK Configured hosted Harmonica MCP (-s user)"
    Write-Host "Keep HARMONICA_API_KEY set when starting Claude Code."
  } catch {
    Write-Host "X Failed to register hosted Harmonica MCP. Check Claude Code's MCP configuration and retry."
    exit 1
  }
}

# --- 5. Install SKILL.md + reference/ ---
New-Item -ItemType Directory -Force -Path "$SkillDir\reference" | Out-Null
Invoke-WebRequest -Uri "$RepoUrl/SKILL.md" -OutFile "$SkillDir\SKILL.md"
# Clean stale reference files first so removed-upstream files (like templates.md
# in v3.3.0) don't linger on update.
Get-ChildItem -Path "$SkillDir\reference" -Filter "*.md" -ErrorAction SilentlyContinue | Remove-Item -Force
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
const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
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
$McpRegistered = $false
try {
  & claude mcp get harmonica *> $null
  $McpRegistered = ($LASTEXITCODE -eq 0)
} catch {
  $McpRegistered = $false
}
if ($McpRegistered) {
  Write-Host "OK harmonica MCP registered"
} else {
  Write-Host "! Could not verify harmonica MCP registration (claude mcp get harmonica failed)"
}

Write-Host ""
Write-Host "Installation complete."
Write-Host "Next: restart Claude Code, then ask it to design a Harmonica session - or run /harmonica-chat."
