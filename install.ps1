# Install harmonica-chat for Claude Code

$ErrorActionPreference = "Stop"

$RepoUrl = "https://raw.githubusercontent.com/harmonicabot/harmonica-chat/main"
$ClaudeDir = "$env:USERPROFILE\.claude"

Write-Host "Installing harmonica-chat..."

# Create directories
New-Item -ItemType Directory -Force -Path "$ClaudeDir\commands" | Out-Null

# Download command file
Invoke-WebRequest -Uri "$RepoUrl/harmonica-chat.md" -OutFile "$ClaudeDir\commands\harmonica-chat.md"
Write-Host "Installed harmonica-chat.md -> ~/.claude/commands/"

Write-Host ""
Write-Host "Installation complete!"
Write-Host ""
Write-Host "harmonica-chat requires the harmonica-mcp server."
Write-Host "Run /harmonica-chat in Claude Code - it will guide you through setup if needed."
