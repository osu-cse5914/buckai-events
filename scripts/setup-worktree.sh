#!/usr/bin/env bash
# Copy .env files from the main repo into a new worktree.
# Usage: scripts/setup-worktree.sh [main-repo-path]
#
# Run this from the worktree root after creation:
#   git worktree add ../my-branch -b my-branch
#   cd ../my-branch && scripts/setup-worktree.sh
#   cd ../my-branch && scripts/setup-worktree.sh /path/to/main/repo

set -euo pipefail

MAIN_REPO="${1:-$(git worktree list --porcelain | head -1 | sed 's/^worktree //')}"
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

echo "generating prisma client"
bun run db:generate

echo "starting dev server"
bun run dev
