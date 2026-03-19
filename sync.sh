#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Feedbox sync script — applies a zip from Claude to your repo
# Usage:
#   ./sync.sh ~/Downloads/feedbox-v1.3.0.zip
#
# What it does:
#   1. Extracts the zip to a temp folder
#   2. Copies src/, public/, and config files into your repo
#   3. Preserves your .git/, .env.local, and node_modules
#   4. Shows you a diff of what changed
#   5. Optionally runs deploy.sh immediately
# ─────────────────────────────────────────────────────────────

set -e

GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()    { echo -e "${BLUE}ℹ${NC}  $1"; }
success() { echo -e "${GREEN}✅${NC} $1"; }
warn()    { echo -e "${YELLOW}⚠️ ${NC} $1"; }
error()   { echo -e "${RED}❌${NC} $1"; exit 1; }

ZIP="$1"
[[ -z "$ZIP" ]] && error "Usage: ./sync.sh path/to/feedbox-vX.Y.Z.zip"
[[ ! -f "$ZIP" ]] && error "File not found: $ZIP"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Feedbox Sync — applying $(basename $ZIP)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── Extract zip to temp dir ───────────────────────────────────
TMPDIR=$(mktemp -d)
info "Extracting to $TMPDIR…"
unzip -q "$ZIP" -d "$TMPDIR"

# The zip contains a single folder (brainbits/)
EXTRACTED=$(ls "$TMPDIR")
SRC="$TMPDIR/$EXTRACTED"
info "Extracted: $EXTRACTED"

# ── Safety: check we're in the right repo ────────────────────
if [[ ! -f "package.json" ]] || ! grep -q "feedbox" package.json 2>/dev/null; then
  warn "package.json not found or doesn't contain 'feedbox'."
  warn "Make sure you're running this from inside your brainbits/ repo folder."
  read -p "Continue anyway? (y/N): " CONFIRM
  [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]] && exit 1
fi

# ── Copy files — preserve .git, .env.local, node_modules ─────
info "Syncing files…"

# Files/dirs to copy from zip (everything except protected items)
rsync -av --exclude='.git' \
          --exclude='.env.local' \
          --exclude='node_modules' \
          --exclude='dist' \
          "$SRC/" "./" \
          | grep -v "/$" | grep -v "^sending" | grep -v "^sent" | grep -v "^total" \
          | sed 's/^/  → /' || true

success "Files synced"

# ── Show git diff summary ─────────────────────────────────────
echo ""
info "Changed files:"
git diff --name-only 2>/dev/null | sed 's/^/  📝 /' || true
git ls-files --others --exclude-standard 2>/dev/null | sed 's/^/  ✨ /' || true
echo ""

# ── Cleanup ───────────────────────────────────────────────────
rm -rf "$TMPDIR"

# ── Offer to deploy ───────────────────────────────────────────
NEW_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "unknown")
success "Sync complete — repo is now at v$NEW_VERSION"
echo ""
echo "  Next steps:"
echo "  1. Review changes above"
echo "  2. Run: npm run dev    (test locally first)"
echo "  3. Run: ./deploy.sh    (push to GitHub Pages)"
echo ""
read -p "Run npm run dev now? (y/N): " DEV
if [[ "$DEV" == "y" || "$DEV" == "Y" ]]; then
  npm install --silent 2>/dev/null || true
  npm run dev
fi
