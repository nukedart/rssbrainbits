import { describe, it, expect } from "vitest";
import { getPlan, getPlanName, isProUser, checkLimit, PLANS } from "../lib/plan.js";

const freeUser = { app_metadata: { plan: "free" } };
const proUser  = { app_metadata: { plan: "pro" } };
const noMeta   = { app_metadata: {} };

describe("getPlan", () => {
  it("returns free plan for null user", () => expect(getPlan(null)).toBe(PLANS.free));
  it("returns free plan for user with no plan", () => expect(getPlan(noMeta)).toBe(PLANS.free));
  it("returns pro plan for pro user", () => expect(getPlan(proUser)).toBe(PLANS.pro));
  it("prefers app_metadata over user_metadata", () => {
    const u = { app_metadata: { plan: "pro" }, user_metadata: { plan: "free" } };
    expect(getPlan(u)).toBe(PLANS.pro);
  });
});

describe("isProUser", () => {
  it("returns false for free user", () => expect(isProUser(freeUser)).toBe(false));
  it("returns true for pro user",  () => expect(isProUser(proUser)).toBe(true));
  it("returns false for null",     () => expect(isProUser(null)).toBe(false));
});

describe("checkLimit", () => {
  it("allows when under limit", () =>
    expect(checkLimit(freeUser, "feeds", 5).allowed).toBe(true));

  it("blocks at limit", () =>
    expect(checkLimit(freeUser, "feeds", 10).allowed).toBe(false));

  it("includes limit value in blocked result", () => {
    const r = checkLimit(freeUser, "feeds", 10);
    expect(r.limit).toBe(10);
    expect(r.reason).toMatch(/10/);
  });

  it("pro user is never blocked", () =>
    expect(checkLimit(proUser, "feeds", 9999).allowed).toBe(true));

  it("pro user unlimited aiSummaries", () =>
    expect(checkLimit(proUser, "aiSummaries", 99999).allowed).toBe(true));

  it("free user blocked at aiSummaries limit", () =>
    expect(checkLimit(freeUser, "aiSummaries", 5).allowed).toBe(false));
});
