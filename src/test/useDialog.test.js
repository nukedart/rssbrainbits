import { describe, it, expect } from "vitest";
import { nextTabTarget } from "../hooks/useDialog";

const a = {}, b = {}, c = {};
describe("nextTabTarget", () => {
  it("returns null for empty list", () => expect(nextTabTarget([], a, false)).toBeNull());
  it("wraps forward from last to first", () => expect(nextTabTarget([a, b, c], c, false)).toBe(a));
  it("wraps backward from first to last", () => expect(nextTabTarget([a, b, c], a, true)).toBe(c));
  it("lets browser move within the list", () => {
    expect(nextTabTarget([a, b, c], b, false)).toBeNull();
    expect(nextTabTarget([a, b, c], b, true)).toBeNull();
  });
  it("pulls outside focus in", () => {
    expect(nextTabTarget([a, b], {}, false)).toBe(a);
    expect(nextTabTarget([a, b], {}, true)).toBe(b);
  });
});
