import { describe, it, expect } from "vitest";
import { relationScore, relatedHighlights, coOccurringTags } from "../lib/zettel";

const H = (id, tags, url) => ({ id, tags, article_url: url });

describe("relationScore", () => {
  it("scores 2 per shared tag", () => {
    expect(relationScore(H(1, ["a", "b"]), H(2, ["a", "b", "c"]))).toBe(4);
  });
  it("scores 1 for same article", () => {
    expect(relationScore(H(1, [], "u"), H(2, [], "u"))).toBe(1);
  });
  it("returns 0 for self", () => {
    expect(relationScore(H(1, ["a"]), H(1, ["a"]))).toBe(0);
  });
  it("handles missing tags", () => {
    expect(relationScore({ id: 1 }, { id: 2 })).toBe(0);
  });
});

describe("relatedHighlights", () => {
  it("ranks shared-tag cards above same-article cards", () => {
    const h = H(1, ["a"], "u");
    const rel = relatedHighlights(h, [h, H(2, [], "u"), H(3, ["a"], "v")]);
    expect(rel.map(x => x.id)).toEqual([3, 2]);
  });
  it("excludes unrelated and respects limit", () => {
    const h = H(1, ["a"]);
    const all = [H(2, ["a"]), H(3, ["b"]), H(4, ["a"]), H(5, ["a"])];
    expect(relatedHighlights(h, all, 2)).toHaveLength(2);
  });
});

describe("coOccurringTags", () => {
  it("counts co-occurrence, most common first", () => {
    const all = [H(1, ["a", "b"]), H(2, ["a", "b"]), H(3, ["a", "c"]), H(4, ["c"])];
    expect(coOccurringTags("a", all)).toEqual([{ tag: "b", count: 2 }, { tag: "c", count: 1 }]);
  });
  it("returns empty for unknown tag", () => {
    expect(coOccurringTags("zzz", [H(1, ["a"])])).toEqual([]);
  });
});
