import { describe, it, expect, vi, afterEach } from "vitest";
import { highlightsToMarkdown, highlightsToObsidian, feedsToOPML } from "../lib/exportUtils";

describe("highlightsToMarkdown", () => {
  it("returns empty string for empty/missing input", () => {
    expect(highlightsToMarkdown([], "T")).toBe("");
    expect(highlightsToMarkdown(null, "T")).toBe("");
    expect(highlightsToMarkdown(undefined)).toBe("");
  });

  it("renders title, url, singular count, passage and note", () => {
    const out = highlightsToMarkdown([{ passage: "P1", note: "N1" }], "My Title", "http://x.com");
    expect(out).toBe(
      ["# My Title", "> http://x.com", "", "*1 highlight*", "", "## Highlight 1", "", "> P1", "", "**Note:** N1", ""].join("\n")
    );
  });

  it("pluralises, numbers highlights, omits url/note when absent, defaults title", () => {
    const out = highlightsToMarkdown([{ passage: "A" }, { passage: "B" }]);
    expect(out).toContain("# Article\n");
    expect(out).toContain("*2 highlights*");
    expect(out).toContain("## Highlight 2");
    expect(out).not.toContain("**Note:**");
    expect(out).not.toMatch(/^> http/m);
  });
});

describe("highlightsToObsidian", () => {
  afterEach(() => vi.useRealTimers());

  it("returns empty string for empty input", () => {
    expect(highlightsToObsidian([], "T")).toBe("");
    expect(highlightsToObsidian(null, "T")).toBe("");
  });

  it("builds frontmatter with deduped tags, date, and wikilinks", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-04T12:00:00Z"));
    const out = highlightsToObsidian(
      [
        { passage: "P1", note: "N1", tags: ["a", "b"] },
        { passage: "P2", tags: ["b"] },
      ],
      "Title",
      "http://u"
    );
    expect(out).toBe(
      [
        "---", 'title: "Title"', 'source: "http://u"', "date: 2026-03-04", "tags: [feedbox, a, b]", "---", "",
        "> P1", "", "N1", "", "[[a]]  [[b]]", "",
        "> P2", "", "[[b]]", "",
      ].join("\n")
    );
  });

  it("escapes quotes in title and defaults title/source", () => {
    const out = highlightsToObsidian([{ passage: "P" }], 'Say "hi"');
    expect(out).toContain('title: "Say \\"hi\\""');
    expect(out).toContain('source: ""');
    expect(out).toContain("tags: [feedbox]");
    expect(highlightsToObsidian([{ passage: "P" }])).toContain('title: "Article"');
  });
});

describe("feedsToOPML", () => {
  it("emits one outline per feed with xmlUrl", () => {
    const out = feedsToOPML([
      { name: "A", url: "http://a/rss" },
      { name: "B", url: "http://b/rss" },
    ]);
    expect(out.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0">')).toBe(true);
    expect(out).toContain('<outline type="rss" text="A" title="A" xmlUrl="http://a/rss" />');
    expect(out).toContain('xmlUrl="http://b/rss"');
    expect(out.match(/type="rss"/g)).toHaveLength(2);
    expect(out.trim().endsWith("</opml>")).toBe(true);
  });

  it("escapes XML special chars and falls back to url when name missing", () => {
    const out = feedsToOPML([{ name: 'Tom & "Jerry" <x>', url: "http://a?x=1&y=2" }, { url: "http://n" }]);
    expect(out).toContain('text="Tom &amp; &quot;Jerry&quot; &lt;x&gt;"');
    expect(out).toContain('xmlUrl="http://a?x=1&amp;y=2"');
    expect(out).toContain('text="http://n" title="http://n"');
  });

  it("handles empty feed list", () => {
    const out = feedsToOPML([]);
    expect(out).toContain("<opml");
    expect(out).not.toContain("type=\"rss\"");
  });
});

describe("highlightsToObsidian YAML safety", () => {
  const h = [{ passage: "p", tags: ["ok", "two words", "a,b"] }];
  it("quotes tags that are not plain words", () => {
    const out = highlightsToObsidian(h, "T", "https://x.test/");
    expect(out).toContain('tags: [feedbox, ok, "two words", "a,b"]');
  });
  it("escapes quotes and backslashes in title and source", () => {
    const out = highlightsToObsidian(h, 'a\\b "q"', 'https://x.test/?a="1"');
    expect(out).toContain('title: "a\\\\b \\"q\\""');
    expect(out).toContain('source: "https://x.test/?a=\\"1\\""');
  });
});
