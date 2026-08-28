#!/bin/bash
# Move old AGENT_LOG.md rows into AGENT_LOG.archive.md, keeping the last N in place.
# Usage: scripts/trim-agent-log.sh [N]   (default N=40)
#
# AGENT_LOG.md is read during recon; at ~230KB it's a recurring context cost for
# rows nobody references. This keeps the recent tail hot and parks the rest in a
# sibling file (still git-tracked, fully reversible).

set -euo pipefail
cd "$(dirname "$0")/.."

KEEP="${1:-40}"
LOG="AGENT_LOG.md"
ARCHIVE="AGENT_LOG.archive.md"

# Header = every line up to and including the table header row (the "| Date | ..." line).
HEADER_END=$(grep -nE '^\| Date \|' "$LOG" | head -1 | cut -d: -f1)
if [ -z "${HEADER_END:-}" ]; then
  echo "trim-agent-log: couldn't find the '| Date |' header row in $LOG" >&2
  exit 1
fi

TOTAL=$(wc -l < "$LOG" | tr -d ' ')
DATA_ROWS=$((TOTAL - HEADER_END))
if [ "$DATA_ROWS" -le "$KEEP" ]; then
  echo "trim-agent-log: $DATA_ROWS data rows ≤ keep=$KEEP — nothing to do."
  exit 0
fi

MOVE=$((DATA_ROWS - KEEP))
SPLIT=$((HEADER_END + MOVE))

if [ ! -f "$ARCHIVE" ]; then
  {
    echo "# Agent Iteration Log — Archive"
    echo
    echo "Older rows moved out of AGENT_LOG.md to keep it small. Newest archived rows at the top."
    echo
    sed -n "1,${HEADER_END}p" "$LOG" | grep -E '^\| Date \|'
  } > "$ARCHIVE"
fi

# Prepend the rows being moved (oldest-first block) just under the archive header.
TMP=$(mktemp)
ARCHIVE_HEADER_END=$(grep -nE '^\| Date \|' "$ARCHIVE" | head -1 | cut -d: -f1)
sed -n "1,${ARCHIVE_HEADER_END}p" "$ARCHIVE" > "$TMP"
sed -n "$((HEADER_END + 1)),${SPLIT}p" "$LOG" >> "$TMP"
sed -n "$((ARCHIVE_HEADER_END + 1)),\$p" "$ARCHIVE" >> "$TMP"
mv "$TMP" "$ARCHIVE"

# Rewrite the live log: header + the last KEEP rows.
TMP2=$(mktemp)
sed -n "1,${HEADER_END}p" "$LOG" > "$TMP2"
sed -n "$((SPLIT + 1)),\$p" "$LOG" >> "$TMP2"
mv "$TMP2" "$LOG"

echo "trim-agent-log: moved $MOVE rows → $ARCHIVE; $KEEP kept in $LOG"
echo "  $LOG:     $(wc -c < "$LOG" | tr -d ' ') bytes"
echo "  $ARCHIVE: $(wc -c < "$ARCHIVE" | tr -d ' ') bytes"
