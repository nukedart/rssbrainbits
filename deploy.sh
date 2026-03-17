#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Feedbox deploy script
# Usage:
#   ./deploy.sh                  → patch bump (1.2.1 → 1.2.2), build, push
#   ./deploy.sh minor            → minor bump (1.2.1 → 1.3.0), build, push
#   ./deploy.sh major            → major bump (1.2.1 → 2.0.0), build, push
#   ./deploy.sh --dry-run        → show what would happen, don't push
#   ./deploy.sh --local          → build only, no push (test the build)
#
# What it does:
#   1. Checks you're on main branch with no uncommitted changes
#   2. Bumps version in package.json
#   3. Updates version string in src/ files
#   4. Appends a timestamped entry to CHANGELOG.md
#   5. Runs npm run build to verify it compiles
#   6. Commits everything with a version tag
#   7. Pushes to origin/main → GitHub Actions deploys automatically
# ─────────────────────────────────────────────────────────────

set -e  # exit on any error

# ── Config ────────────────────────────────────────────────────
BUMP_TYPE="${1:-patch}"
DRY_RUN=false
LOCAL_ONLY=false

if [[ "$1" == "--dry-run" ]]; then BUMP_TYPE="patch"; DRY_RUN=true; fi
if [[ "$1" == "--local"   ]]; then BUMP_TYPE="patch"; LOCAL_ONLY=true; fi

# ── Colors ────────────────────────────────────────────────────
GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()    { echo -e "${BLUE}ℹ${NC}  $1"; }
success() { echo -e "${GREEN}✅${NC} $1"; }
warn()    { echo -e "${YELLOW}⚠️ ${NC} $1"; }
error()   { echo -e "${RED}❌${NC} $1"; exit 1; }

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Feedbox Deploy Script${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── Step 1: Git checks ────────────────────────────────────────
if [[ "$LOCAL_ONLY" == false && "$DRY_RUN" == false ]]; then
  BRANCH=$(git rev-parse --abbrev-ref HEAD)
  if [[ "$BRANCH" != "main" ]]; then
    error "You must be on the main branch to deploy. Currently on: $BRANCH"
  fi
  info "Branch: main ✓"
fi

# ── Step 2: Version bump ──────────────────────────────────────
CURRENT=$(node -p "require('./package.json').version")
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

case "$BUMP_TYPE" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
  *)     error "Invalid bump type: $BUMP_TYPE. Use patch, minor, or major." ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
info "Version: $CURRENT → $NEW_VERSION"

if [[ "$DRY_RUN" == true ]]; then
  warn "Dry run — would bump to v$NEW_VERSION and push. Exiting."
  exit 0
fi

# Update package.json
node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  pkg.version = '$NEW_VERSION';
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"
success "package.json → v$NEW_VERSION"

# Update version string in src/ files
find src -name "*.jsx" -o -name "*.js" | xargs grep -l "v$CURRENT" 2>/dev/null | while read file; do
  sed -i.bak "s/v$CURRENT/v$NEW_VERSION/g" "$file" && rm "$file.bak"
  info "Updated version in $(basename $file)"
done

# ── Step 3: CHANGELOG entry ───────────────────────────────────
DATE=$(date +%Y-%m-%d)
TEMP_ENTRY=$(mktemp)

echo "## [$NEW_VERSION] — $DATE" > "$TEMP_ENTRY"
echo "" >> "$TEMP_ENTRY"

# Collect git changes since last tag for the changelog
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
if [[ -n "$LAST_TAG" ]]; then
  echo "### Changes since $LAST_TAG" >> "$TEMP_ENTRY"
  git log "$LAST_TAG"..HEAD --oneline --no-merges | \
    sed 's/^[a-f0-9]* /- /' >> "$TEMP_ENTRY" || true
else
  echo "### Changes" >> "$TEMP_ENTRY"
  git log --oneline --no-merges -10 | \
    sed 's/^[a-f0-9]* /- /' >> "$TEMP_ENTRY" || true
fi

echo "" >> "$TEMP_ENTRY"
echo "---" >> "$TEMP_ENTRY"
echo "" >> "$TEMP_ENTRY"

# Prepend to CHANGELOG.md (after the header lines)
HEADER=$(head -5 CHANGELOG.md)
BODY=$(tail -n +6 CHANGELOG.md)
{
  echo "$HEADER"
  echo ""
  cat "$TEMP_ENTRY"
  echo "$BODY"
} > CHANGELOG.tmp && mv CHANGELOG.tmp CHANGELOG.md
rm "$TEMP_ENTRY"
success "CHANGELOG.md updated"

# ── Step 4: Build ─────────────────────────────────────────────
info "Running npm run build…"
npm run build
success "Build passed ✓"

if [[ "$LOCAL_ONLY" == true ]]; then
  success "Local build complete. Skipping push (--local flag)."
  echo ""
  echo "  To preview: npm run preview"
  echo ""
  exit 0
fi

# ── Step 5: Commit + tag + push ───────────────────────────────
git add -A
git commit -m "v$NEW_VERSION

$(grep -A 10 "## \[$NEW_VERSION\]" CHANGELOG.md | tail -n +3 | head -8)"

git tag "v$NEW_VERSION"
git push origin main
git push origin "v$NEW_VERSION"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Deployed! v$NEW_VERSION → rss.brainbits.us${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  GitHub Actions: https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]//' | sed 's/\.git//')/actions"
echo "  Live site:      https://rss.brainbits.us"
echo ""
