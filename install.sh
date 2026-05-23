#!/bin/bash
# Install harmonica-chat for Claude Code (v3.0.0+: skill format with reference/)

set -e

REPO_URL="https://raw.githubusercontent.com/harmonicabot/harmonica-chat/master"
CLAUDE_DIR="$HOME/.claude"
SKILL_DIR="$CLAUDE_DIR/skills/harmonica-chat"
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
  "templates.md"
  "expertise.md"
)

echo "Installing harmonica-chat (skill format)..."

# Create directories
mkdir -p "$SKILL_DIR/reference"

# Download SKILL.md (entry point)
curl -fsSL "$REPO_URL/SKILL.md" -o "$SKILL_DIR/SKILL.md"
echo "  Installed SKILL.md"

# Download each reference file
for file in "${REFERENCE_FILES[@]}"; do
  curl -fsSL "$REPO_URL/reference/$file" -o "$SKILL_DIR/reference/$file"
  echo "  Installed reference/$file"
done

# Migration: remove the old v2.x slash-command install if present
LEGACY_CMD="$CLAUDE_DIR/commands/harmonica-chat.md"
if [ -f "$LEGACY_CMD" ]; then
  rm "$LEGACY_CMD"
  echo ""
  echo "Migrated: removed legacy slash-command install at $LEGACY_CMD"
  echo "  (v3.0.0+ runs as a skill from $SKILL_DIR/)"
fi

echo ""
echo "Installation complete!"
echo ""
echo "harmonica-chat requires the harmonica-mcp server."
echo "Run /harmonica-chat in Claude Code — it will guide you through setup if needed."
