import { describe, it, expect, beforeEach } from "vitest";
import { loadStartup, saveStartup } from "../lib/startupCache.js";

function stub() {
  const m = new Map();
  globalThis.localStorage = {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: k => { m.delete(k); },
    clear: () => m.clear(),
  };
}

describe("startupCache", () => {
  beforeEach(stub);
  it("round-trips per user", () => {
    saveStartup("feeds", "u1", [{ id: 1 }]);
    expect(loadStartup("feeds", "u1")).toEqual([{ id: 1 }]);
    expect(loadStartup("feeds", "u2")).toBeNull();
  });
  it("returns null for missing uid, garbage, or non-arrays", () => {
    expect(loadStartup("feeds", undefined)).toBeNull();
    localStorage.setItem("fb-feeds-u1", "{oops");
    expect(loadStartup("feeds", "u1")).toBeNull();
    localStorage.setItem("fb-feeds-u1", "{}");
    expect(loadStartup("feeds", "u1")).toBeNull();
  });
  it("drops oversized snapshots", () => {
    saveStartup("feeds", "u1", [{ id: 1 }]);
    saveStartup("feeds", "u1", [{ x: "a".repeat(500_000) }]);
    expect(loadStartup("feeds", "u1")).toBeNull();
  });
});
