import { describe, it, expect, beforeEach } from "vitest";
import { enqueue, dequeue, flush, loadQueue } from "../lib/reviewQueue.js";

beforeEach(() => {
  const store = {};
  globalThis.localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
  };
});

describe("reviewQueue", () => {
  it("dedupes by highlight id keeping latest", () => {
    enqueue({ userId: "u", highlightId: "a", payload: { interval: 1 } });
    enqueue({ userId: "u", highlightId: "a", payload: { interval: 2 } });
    const q = loadQueue();
    expect(q).toHaveLength(1);
    expect(q[0].payload.interval).toBe(2);
  });
  it("caps at 200", () => {
    for (let i = 0; i < 210; i++) enqueue({ userId: "u", highlightId: "h" + i, payload: {} });
    expect(loadQueue()).toHaveLength(200);
  });
  it("dequeue removes entry", () => {
    enqueue({ userId: "u", highlightId: "a", payload: {} });
    dequeue("a", "u");
    expect(loadQueue()).toHaveLength(0);
  });
  it("flush removes successes and stops on failure", async () => {
    enqueue({ userId: "u", highlightId: "a", payload: {} });
    enqueue({ userId: "u", highlightId: "b", payload: {} });
    enqueue({ userId: "u", highlightId: "c", payload: {} });
    let calls = 0;
    const n = await flush(async () => { if (++calls === 2) throw new Error("x"); }, "u");
    expect(n).toBe(1);
    expect(loadQueue().map(e => e.highlightId)).toEqual(["b", "c"]);
  });
  it("tolerates corrupt storage", () => {
    localStorage.setItem("fb-review-queue", "{bad");
    expect(loadQueue()).toEqual([]);
  });
});
