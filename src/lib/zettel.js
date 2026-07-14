// ── Zettelkasten helpers ─────────────────────────────────────
// Pure functions for connecting cards (highlights) into a knowledge graph.

// Score how related two highlights are: +2 per shared tag, +1 for same article.
export function relationScore(a, b) {
  if (!a || !b || a.id === b.id) return 0;
  const tagsA = a.tags || [], tagsB = new Set(b.tags || []);
  let score = 0;
  for (const t of tagsA) if (tagsB.has(t)) score += 2;
  if (a.article_url && a.article_url === b.article_url) score += 1;
  return score;
}

// Top related highlights for `h` among `all`, strongest first.
export function relatedHighlights(h, all, limit = 5) {
  return (all || [])
    .map(other => [relationScore(h, other), other])
    .filter(([s]) => s > 0)
    .sort((x, y) => y[0] - x[0])
    .slice(0, limit)
    .map(([, other]) => other);
}

// Tags that co-occur with `tag` across all highlights, most common first.
// Returns [{ tag, count }].
export function coOccurringTags(tag, all, limit = 6) {
  const counts = new Map();
  for (const h of all || []) {
    const tags = h.tags || [];
    if (!tags.includes(tag)) continue;
    for (const t of tags) {
      if (t === tag) continue;
      counts.set(t, (counts.get(t) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([t, count]) => ({ tag: t, count }));
}
