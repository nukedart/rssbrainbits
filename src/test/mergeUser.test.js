import { describe, it, expect } from "vitest";
import { mergeUser } from "../lib/mergeUser";

const u = { id: "a", email: "x@y.z", updated_at: "1", user_metadata: { n: 1 }, app_metadata: { p: "free" } };

describe("mergeUser", () => {
  it("keeps identity for same id and equal content", () => {
    expect(mergeUser(u, { ...u, user_metadata: { n: 1 } })).toBe(u);
  });
  it("returns next when metadata changes", () => {
    const n = { ...u, app_metadata: { p: "pro" } };
    expect(mergeUser(u, n)).toBe(n);
  });
  it("returns next for different id or no prev", () => {
    const n = { ...u, id: "b" };
    expect(mergeUser(u, n)).toBe(n);
    expect(mergeUser(undefined, u)).toBe(u);
  });
  it("returns null on sign-out", () => {
    expect(mergeUser(u, null)).toBeNull();
    expect(mergeUser(u, undefined)).toBeNull();
  });
});
