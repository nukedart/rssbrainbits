#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Feedbox sync script — applies a zip from Claude to your repo
# Usage:
#   ./sync.sh ~/Downloads/feedbox-v1.9.4.zip
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

TMPDIR=$(mktemp -d)
info "Extracting to $TMPDIR…"
unzip -q "$ZIP" -d "$TMPDIR"

EXTRACTED=$(ls "$TMPDIR")
SRC="$TMPDIR/$EXTRACTED"
info "Extracted: $EXTRACTED"

if [[ ! -f "package.json" ]] || ! grep -q "feedbox" package.json 2>/dev/null; then
  warn "package.json not found or doesn't contain 'feedbox'."
  warn "Make sure you're running this from inside your rssbrainbits/ folder."
  read -p "Continue anyway? (y/N): " CONFIRM
  [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]] && exit 1
fi

info "Syncing files…"
rsync -av --exclude='.git' \
          --exclude='.env.local' \
          --exclude='node_modules' \
          --exclude='dist' \
          "$SRC/" "./" \
          | grep -v "/$" | grep -v "^sending" | grep -v "^sent" | grep -v "^total" \
          | sed 's/^/  → /' || true

success "Files synced"

echo ""
info "Changed files:"
git diff --name-only 2>/dev/null | sed 's/^/  📝 /' || true
git ls-files --others --exclude-standard 2>/dev/null | sed 's/^/  ✨ /' || true
echo ""

rm -rf "$TMPDIR"

NEW_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "unknown")
success "Sync complete — repo is now at v$NEW_VERSION"
echo ""
echo "  Next steps:"
echo "  1. Review changes above"
echo "  2. Run: npm run dev    (test locally first)"
echo "  3. git add . && git commit -m \"v$NEW_VERSION\" && git push origin main"
echo ""
read -p "Run npm run dev now? (y/N): " DEV
if [[ "$DEV" == "y" || "$DEV" == "Y" ]]; then
  npm install --silent 2>/dev/null || true
  npm run dev
fi
ENDSYNC

chmod +x sync.sh
echo "✅ sync.sh created"