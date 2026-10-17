#!/usr/bin/env bash
# Project status dashboard — run at the start of a new Claude Code session.
#   ./scripts/status.sh   (or: npm run status)
set -euo pipefail
cd "$(dirname "$0")/.."

bold=$(printf '\033[1m'); dim=$(printf '\033[2m'); yellow=$(printf '\033[33m')
green=$(printf '\033[32m'); reset=$(printf '\033[0m')

section() { printf '\n%s── %s ──%s\n' "$bold" "$1" "$reset"; }

# --- Git ---------------------------------------------------------------
section "git"
branch=$(git rev-parse --abbrev-ref HEAD)
dirty=$(git status --porcelain | wc -l | tr -d ' ')
ahead=$(git rev-list --count '@{upstream}..HEAD' 2>/dev/null || echo '?')
behind=$(git rev-list --count 'HEAD..@{upstream}' 2>/dev/null || echo '?')
printf 'branch %s%s%s   %suncommitted files:%s %s   ahead %s / behind %s\n' \
  "$green" "$branch" "$reset" "$dim" "$reset" "$dirty" "$ahead" "$behind"
if [ "$dirty" != "0" ]; then git status --short | sed 's/^/  /'; fi
printf '%slast 5 commits:%s\n' "$dim" "$reset"
git log -5 --format='  %C(auto)%h%Creset %C(dim)%cd%Creset %s' --date=short

# --- Web app ---------------------------------------------------------------
section "web app"
webver=$(node -p "require('./package.json').version")
printf 'version %s%s%s\n' "$green" "$webver" "$reset"
web_unrel=$(awk '/^## \[Unreleased\]/{f=1;next} /^## \[/{f=0} f && NF' CHANGELOG.md)
if [ -n "$web_unrel" ]; then
  printf '%s⚠ CHANGELOG has an unreleased entry (pending deploy):%s\n' "$yellow" "$reset"
  printf '%s\n' "$web_unrel" | sed 's/^/  /'
else
  printf '%sCHANGELOG [Unreleased] is empty — nothing pending%s\n' "$dim" "$reset"
fi

# --- Native app ---------------------------------------------------------------
section "native app"
natver=$(grep -E 'MARKETING_VERSION:' native/project.yml | head -1 | sed -E 's/.*"(.*)".*/\1/')
natbuild=$(grep -E 'CURRENT_PROJECT_VERSION:' native/project.yml | head -1 | sed -E 's/.*"(.*)".*/\1/')
printf 'version %s%s%s  (build %s)\n' "$green" "$natver" "$reset" "$natbuild"
nat_unrel=$(awk '/^## \[Unreleased\]/{f=1;next} /^## \[/{f=0} f && NF' native/CHANGELOG.md)
if [ -n "$nat_unrel" ]; then
  printf '%s⚠ native/CHANGELOG has an unreleased entry (pending ship):%s\n' "$yellow" "$reset"
  printf '%s\n' "$nat_unrel" | sed 's/^/  /'
else
  printf '%snative/CHANGELOG [Unreleased] is empty — nothing pending%s\n' "$dim" "$reset"
fi

# --- Recent agent log ---------------------------------------------------------------
section "last 5 AGENT_LOG rows"
grep -E '^\| 20[0-9]{2}-' AGENT_LOG.md | tail -5 | cut -c1-160

printf '\n'
