# Install harmonica-chat for Claude Code (v3.0.0+: skill format with reference/)

$ErrorActionPreference = "Stop"

$RepoUrl = "https://raw.githubusercontent.com/harmonicabot/harmonica-chat/master"
$ClaudeDir = "$env:USERPROFILE\.claude"
$SkillDir = "$ClaudeDir\skills\harmonica-chat"
$ReferenceFiles = @(
  "design.md",
  "accelerated.md",
  "status.md",
  "check.md",
  "summary.md",
  "edit.md",
  "review.md",
  "follow-up.md",
  "invitation.md",
  "templates.md",
  "expertise.md"
)

Write-Host "Installing harmonica-chat (skill format)..."

# Create directories
New-Item -ItemType Directory -Force -Path "$SkillDir\reference" | Out-Null

# Download SKILL.md (entry point)
Invoke-WebRequest -Uri "$RepoUrl/SKILL.md" -OutFile "$SkillDir\SKILL.md"
Write-Host "  Installed SKILL.md"

# Download each reference file
foreach ($file in $ReferenceFiles) {
  Invoke-WebRequest -Uri "$RepoUrl/reference/$file" -OutFile "$SkillDir\reference\$file"
  Write-Host "  Installed reference/$file"
}

# Migration: remove the old v2.x slash-command install if present
$LegacyCmd = "$ClaudeDir\commands\harmonica-chat.md"
if (Test-Path $LegacyCmd) {
  Remove-Item $LegacyCmd
  Write-Host ""
  Write-Host "Migrated: removed legacy slash-command install at $LegacyCmd"
  Write-Host "  (v3.0.0+ runs as a skill from $SkillDir\)"
}

Write-Host ""
Write-Host "Installation complete!"
Write-Host ""
Write-Host "harmonica-chat requires the harmonica-mcp server."
Write-Host "Run /harmonica-chat in Claude Code - it will guide you through setup if needed."
