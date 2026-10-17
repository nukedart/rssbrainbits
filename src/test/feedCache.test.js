import { describe, it, expect, beforeEach } from "vitest";
import { setCachedFeed, getCachedFeed } from "../lib/feedCache.js";

function installStorage({ quotaBytes = Infinity } = {}) {
  const m = new Map();
  const size = () => [...m.values()].reduce((n, v) => n + v.length, 0);
  const ls = {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem(k, v) {
      const prev = m.has(k) ? m.get(k).length : 0;
      if (size() - prev + v.length > quotaBytes) {
        const e = new Error("quota"); e.name = "QuotaExceededError"; throw e;
      }
      m.set(k, String(v));
    },
    removeItem: k => m.delete(k),
  };
  // Object.keys(localStorage) must list entries
  const proxy = new Proxy(ls, { ownKeys: () => [...m.keys()], getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }) });
  globalThis.localStorage = proxy;
  return m;
}

describe("feedCache", () => {
  beforeEach(() => installStorage());

  it("round-trips and reports fresh", () => {
    setCachedFeed("u1", { title: "t", items: [] });
    expect(getCachedFeed("u1")).toEqual({ data: { title: "t", items: [] }, isStale: false });
  });

  it("evicts oldest beyond MAX_ENTRIES without parsing entries", () => {
    for (let i = 0; i < 65; i++) setCachedFeed("u" + i, { i });
    expect(getCachedFeed("u0")).toBeNull();
    expect(getCachedFeed("u64")).not.toBeNull();
  });

  it("evicts oldest and retries once on QuotaExceededError", () => {
    const m = installStorage({ quotaBytes: 2500 });
    const big = { x: "y".repeat(300) };
    for (let i = 0; i < 6; i++) setCachedFeed("u" + i, big);
    setCachedFeed("new", big);
    expect(getCachedFeed("new")).not.toBeNull();
    expect(getCachedFeed("u0")).toBeNull();
    expect(m.has("fb-feed-new")).toBe(true);
  });

  it("rebuilds a missing index from legacy entries", () => {
    const m = installStorage();
    m.set("fb-feed-legacy", JSON.stringify({ data: { a: 1 }, timestamp: Date.now() }));
    setCachedFeed("n", { b: 2 });
    expect(getCachedFeed("legacy").data).toEqual({ a: 1 });
    expect(JSON.parse(m.get("fb-feed-index")).legacy).toBeTypeOf("number");
  });
});
