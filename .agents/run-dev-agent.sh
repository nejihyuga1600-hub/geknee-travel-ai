#!/usr/bin/env zsh
# Launch the Dev Scout agent in a VS Code terminal
# Usage: .agents/run-dev-agent.sh

SCRIPT_DIR="${0:a:h}"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
AGENT_DIR="$SCRIPT_DIR/dev"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Dev Scout — geknee.com  [claude-opus-4-6]"
echo "  Reviewing from: $AGENT_DIR"
echo "  Shared workspace: $SCRIPT_DIR/shared/"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Partner: UX Scout should be running in another terminal"
echo "Findings will be written to .agents/shared/dev-findings.md"
echo "Plan at: .agents/shared/PLAN.md"
echo ""

# Change into the Dev agent directory so CLAUDE.md is picked up
cd "$AGENT_DIR"

# Launch Claude Code — CLAUDE.md in this dir sets the agent persona
/Users/geknee/.local/bin/claude --dangerously-skip-permissions --model claude-opus-4-6
