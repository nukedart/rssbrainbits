// ── Theme graph builder + layout ─────────────────────────────
// Pure functions powering the Cards "Map" view. No dependencies.

// Build nodes/edges from highlights: nodes are tags (count = #cards),
// edges connect tags that co-occur on the same card (weight = #cards).
export function buildThemeGraph(highlights) {
  const counts = new Map();
  const pairs = new Map();
  for (const h of highlights || []) {
    const tags = [...new Set(h.tags || [])];
    for (const t of tags) counts.set(t, (counts.get(t) || 0) + 1);
    for (let i = 0; i < tags.length; i++) {
      for (let j = i + 1; j < tags.length; j++) {
        const [a, b] = [tags[i], tags[j]].sort();
        const key = a + "\u0000" + b; // NUL separator — tags may contain spaces
        pairs.set(key, (pairs.get(key) || 0) + 1);
      }
    }
  }
  const nodes = [...counts.entries()].map(([tag, count]) => ({ tag, count }));
  const edges = [...pairs.entries()].map(([key, weight]) => {
    const [a, b] = key.split("\u0000");
    return { a, b, weight };
  });
  return { nodes, edges };
}

// Deterministic seeded PRNG (mulberry32)
function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Position nodes with a tiny force simulation. Pure & deterministic
// for a given seed. Returns new array [{tag, count, x, y}].
export function layoutGraph(nodes, edges, { width = 600, height = 400, iterations = 150, seed = 42 } = {}) {
  const n = nodes.length;
  if (n === 0) return [];
  const rand = mulberry32(seed);
  const pts = nodes.map(node => ({
    ...node,
    x: width / 2 + (rand() - 0.5) * width * 0.6,
    y: height / 2 + (rand() - 0.5) * height * 0.6,
  }));
  if (n === 1) return [{ ...pts[0], x: width / 2, y: height / 2 }];
  const idx = new Map(pts.map((p, i) => [p.tag, i]));
  const k = Math.sqrt((width * height) / n);
  for (let iter = 0; iter < iterations; iter++) {
    const cool = 1 - iter / iterations;
    const fx = new Array(n).fill(0), fy = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
        let d2 = dx * dx + dy * dy || 0.01;
        const f = (k * k) / d2;
        fx[i] += dx * f; fy[i] += dy * f;
        fx[j] -= dx * f; fy[j] -= dy * f;
      }
    }
    for (const e of edges) {
      const i = idx.get(e.a), j = idx.get(e.b);
      if (i === undefined || j === undefined) continue;
      const dx = pts[j].x - pts[i].x, dy = pts[j].y - pts[i].y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.1;
      const f = (d / k) * (0.5 + 0.25 * Math.min(e.weight, 5));
      fx[i] += dx * f; fy[i] += dy * f;
      fx[j] -= dx * f; fy[j] -= dy * f;
    }
    const pad = 30;
    for (let i = 0; i < n; i++) {
      pts[i].x = Math.min(width - pad, Math.max(pad, pts[i].x + fx[i] * 0.02 * cool));
      pts[i].y = Math.min(height - pad, Math.max(pad, pts[i].y + fy[i] * 0.02 * cool));
    }
  }
  return pts;
}
