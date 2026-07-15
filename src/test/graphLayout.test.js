import { describe, it, expect } from "vitest";
import { buildThemeGraph, layoutGraph } from "../lib/graphLayout";

const H = (id, tags) => ({ id, tags });

describe("buildThemeGraph", () => {
  it("counts nodes per tag", () => {
    const { nodes } = buildThemeGraph([H(1, ["a", "b"]), H(2, ["a"])]);
    expect(nodes).toContainEqual({ tag: "a", count: 2 });
    expect(nodes).toContainEqual({ tag: "b", count: 1 });
  });
  it("weights edges by co-occurrence", () => {
    const { edges } = buildThemeGraph([H(1, ["a", "b"]), H(2, ["b", "a"]), H(3, ["a", "c"])]);
    expect(edges).toContainEqual({ a: "a", b: "b", weight: 2 });
    expect(edges).toContainEqual({ a: "a", b: "c", weight: 1 });
  });
  it("handles multi-word tags", () => {
    const { edges } = buildThemeGraph([H(1, ["machine learning", "deep work"])]);
    expect(edges).toEqual([{ a: "deep work", b: "machine learning", weight: 1 }]);
  });
  it("dedupes tags within one card and handles empties", () => {
    const { nodes, edges } = buildThemeGraph([H(1, ["a", "a"]), H(2, [])]);
    expect(nodes).toEqual([{ tag: "a", count: 1 }]);
    expect(edges).toEqual([]);
  });
});

describe("layoutGraph", () => {
  const g = buildThemeGraph([H(1, ["a", "b"]), H(2, ["b", "c"]), H(3, ["d"])]);
  it("positions every node inside the frame", () => {
    const pts = layoutGraph(g.nodes, g.edges, { width: 600, height: 400 });
    expect(pts).toHaveLength(g.nodes.length);
    for (const p of pts) {
      expect(p.x).toBeGreaterThanOrEqual(30);
      expect(p.x).toBeLessThanOrEqual(570);
      expect(p.y).toBeGreaterThanOrEqual(30);
      expect(p.y).toBeLessThanOrEqual(370);
    }
  });
  it("is deterministic for a fixed seed", () => {
    const a = layoutGraph(g.nodes, g.edges, { seed: 7 });
    const b = layoutGraph(g.nodes, g.edges, { seed: 7 });
    expect(a).toEqual(b);
  });
  it("pulls connected nodes closer than unconnected ones", () => {
    const pts = layoutGraph(g.nodes, g.edges, { seed: 7 });
    const by = Object.fromEntries(pts.map(p => [p.tag, p]));
    const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
    expect(dist(by.a, by.b)).toBeLessThan(dist(by.a, by.d));
  });
  it("handles empty and single-node graphs", () => {
    expect(layoutGraph([], [])).toEqual([]);
    const single = layoutGraph([{ tag: "x", count: 1 }], [], { width: 100, height: 100 });
    expect(single).toEqual([{ tag: "x", count: 1, x: 50, y: 50 }]);
  });
});
