#!/usr/bin/env bash
# Copy .env files from the main repo into a new worktree.
# Usage: scripts/setup-worktree.sh
#
# Run this from the worktree root after creation:
#   git worktree add ../my-branch -b my-branch
#   cd ../my-branch && scripts/setup-worktree.sh

set -euo pipefail

MAIN_REPO="$HOME/src/social-osu-app"
WORKTREE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

env_files=(
  "apps/api/.env"
  "apps/web/.env"
)

for f in "${env_files[@]}"; do
  src="$MAIN_REPO/$f"
  dst="$WORKTREE_ROOT/$f"
  if [ -f "$src" ]; then
    cp "$src" "$dst"
    echo "copied $f"
  else
    echo "skipped $f (not found in main repo)"
  fi
done

echo "done — installing dependencies"
cd "$WORKTREE_ROOT" && bun install
