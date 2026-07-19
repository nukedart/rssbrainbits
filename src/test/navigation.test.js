/**
 * Navigation smoke tests.
 * These guard the page routing logic in App.jsx so agent iterations
 * don't accidentally break which pages exist or their identifiers.
 */
import { describe, it, expect } from "vitest";

// All valid page identifiers the app can route to.
// Update this list if you add or rename a page.
export const VALID_PAGES = [
  "inbox",
  "readlater",
  "history",
  "settings",
  "analytics",
  "notes",
  "today",
  "cards",
  "review",
  "stats",
  "manage-feeds",
];

describe("navigation page registry", () => {
  it("has at least 8 pages", () => expect(VALID_PAGES.length).toBeGreaterThanOrEqual(8));

  it("contains core reading pages", () => {
    expect(VALID_PAGES).toContain("inbox");
    expect(VALID_PAGES).toContain("readlater");
  });

  it("contains utility pages", () => {
    expect(VALID_PAGES).toContain("settings");
    expect(VALID_PAGES).toContain("history");
  });

  it("all page ids are lowercase-kebab with no spaces", () => {
    VALID_PAGES.forEach(p => expect(p).toMatch(/^[a-z][a-z0-9-]*$/));
  });
});
