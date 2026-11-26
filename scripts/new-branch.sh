#!/usr/bin/env bash
# Cut a work branch from the latest origin/develop (or local develop when offline).
#   scripts/new-branch.sh feat-sfu-simulcast        -> NVA-<next>/feat-sfu-simulcast
#   scripts/new-branch.sh NVA-020/fix-ice-restart   -> as given
set -euo pipefail
arg=${1:?usage: scripts/new-branch.sh <type>-<description> | NVA-NNN/<type>-<description>}
if [[ -n "$(git status --porcelain)" ]]; then
  echo "✖ Working tree is not clean. Commit or stash first." >&2
  exit 1
fi

base="develop"
if git remote get-url origin >/dev/null 2>&1; then
  git fetch --prune origin
  if git show-ref --verify --quiet refs/remotes/origin/develop; then
    base="origin/develop"
  fi
fi

if [[ "$arg" == NVA-* ]]; then
  name=$arg
else
  prs=$(command -v gh >/dev/null && gh pr list --state all --limit 1000 --json headRefName -q '.[].headRefName' 2>/dev/null || true)
  last=$({ git branch -a; echo "$prs"; } | grep -oE 'NVA-[0-9]+' | sed 's/NVA-//' | sort -n | tail -1 || true)
  next=$(printf '%03d' $(( 10#${last:-0} + 1 )))
  name="NVA-$next/$arg"
fi
"$(dirname "$0")/check-branch.sh" "$name"
git switch -c "$name" "$base"
echo "✔ On $name (from $base)"
