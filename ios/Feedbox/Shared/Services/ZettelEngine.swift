// Draft, unverified — see ios/README.md.
// Direct port of src/lib/zettel.js — pure functions, no I/O, no dependencies.
// This one should need the least fixing up of anything in this scaffold.

import Foundation

enum ZettelEngine {
    // +2 per shared tag, +1 for same source article. Mirrors zettel.js:5-12.
    static func relationScore(_ a: Highlight, _ b: Highlight) -> Int {
        guard a.id != b.id else { return 0 }
        let tagsB = Set(b.tags)
        var score = 0
        for tag in a.tags where tagsB.contains(tag) { score += 2 }
        if !a.articleUrl.isEmpty && a.articleUrl == b.articleUrl { score += 1 }
        return score
    }

    // Top related highlights for `h` among `all`, strongest first. Mirrors zettel.js:15-22.
    static func relatedHighlights(_ h: Highlight, in all: [Highlight], limit: Int = 5) -> [Highlight] {
        all
            .map { (relationScore(h, $0), $0) }
            .filter { $0.0 > 0 }
            .sorted { $0.0 > $1.0 }
            .prefix(limit)
            .map { $0.1 }
    }

    // Tags that co-occur with `tag` across all highlights, most common first.
    // Mirrors zettel.js:26-40.
    static func coOccurringTags(_ tag: String, in all: [Highlight], limit: Int = 6) -> [(tag: String, count: Int)] {
        var counts: [String: Int] = [:]
        for h in all where h.tags.contains(tag) {
            for t in h.tags where t != tag {
                counts[t, default: 0] += 1
            }
        }
        return counts
            .sorted { $0.value > $1.value }
            .prefix(limit)
            .map { (tag: $0.key, count: $0.value) }
    }
}
