#!/usr/bin/env zsh
# Launch the UX Scout agent in a VS Code terminal
# Usage: .agents/run-ux-agent.sh

SCRIPT_DIR="${0:a:h}"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
AGENT_DIR="$SCRIPT_DIR/ux"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  UX Scout — geknee.com  [claude-opus-4-6]"
echo "  Reviewing from: $AGENT_DIR"
echo "  Shared workspace: $SCRIPT_DIR/shared/"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Partner: Dev Scout should be running in another terminal"
echo "Findings will be written to .agents/shared/ux-findings.md"
echo "Plan at: .agents/shared/PLAN.md"
echo ""

# Change into the UX agent directory so CLAUDE.md is picked up
cd "$AGENT_DIR"

# Launch Claude Code — CLAUDE.md in this dir sets the agent persona
/Users/geknee/.local/bin/claude --dangerously-skip-permissions --model claude-opus-4-6
