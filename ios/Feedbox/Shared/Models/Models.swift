// Draft, unverified — see ios/README.md. Mirrors supabase-schema.sql 1:1.
// One file for now; split per-type once the project actually builds and the
// team has a feel for which models grow independent logic.

import Foundation

struct Feed: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    var url: String
    var type: String        // "rss" | "podcast" | "youtube"
    var name: String?
    var folderId: UUID?
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id, url, type, name
        case userId = "user_id"
        case folderId = "folder_id"
        case createdAt = "created_at"
    }
}

struct FeedFolder: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    var name: String
    var color: String
    var position: Int
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id, name, color, position
        case userId = "user_id"
        case createdAt = "created_at"
    }
}

struct HistoryEntry: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    var url: String
    var title: String?
    var source: String?
    let readAt: Date

    enum CodingKeys: String, CodingKey {
        case id, url, title, source
        case userId = "user_id"
        case readAt = "read_at"
    }
}

struct SavedItem: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    var url: String
    var title: String?
    var source: String?
    var summary: String?
    var isReadLater: Bool   // false = "Saved", true = "Read Later" — same table, one flag
    let savedAt: Date

    enum CodingKeys: String, CodingKey {
        case id, url, title, source, summary
        case userId = "user_id"
        case isReadLater = "is_read_later"
        case savedAt = "saved_at"
    }
}

// The core "card" unit — highlight + annotation. Front of the card is `passage`,
// back is `note`, per Feedbox's Zettelkasten product philosophy.
struct Highlight: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    var articleUrl: String
    var articleTitle: String?
    var passage: String
    var note: String?
    var color: String
    var position: Int
    var tags: [String]
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id, passage, note, color, position, tags
        case userId = "user_id"
        case articleUrl = "article_url"
        case articleTitle = "article_title"
        case createdAt = "created_at"
    }
}

struct ArticleTag: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    var articleUrl: String
    var articleTitle: String?
    var tag: String
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id, tag
        case userId = "user_id"
        case articleUrl = "article_url"
        case articleTitle = "article_title"
        case createdAt = "created_at"
    }
}

// Presence of a row = read. Absence = unread. No boolean column by design —
// matches the web app's read_items table exactly, keep that semantics native-side too.
struct ReadItem: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    var url: String
    var feedId: UUID?
    let readAt: Date

    enum CodingKeys: String, CodingKey {
        case id, url
        case userId = "user_id"
        case feedId = "feed_id"
        case readAt = "read_at"
    }
}

struct SmartFeed: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    var name: String
    var keywords: [String]
    var color: String
    var feedIds: [String]?  // nil = matches all feeds
    var matchMode: String   // "any" | "all" — verify default against smart_feeds usage in supabase.js before relying on it
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id, name, keywords, color
        case userId = "user_id"
        case feedIds = "feed_ids"
        case matchMode = "match_mode"
        case createdAt = "created_at"
    }
}

// Composite primary key (user_id, article_url) on the Postgres side — no synthetic id.
struct ReadingProgress: Codable {
    let userId: UUID
    var articleUrl: String
    var progress: Int  // 0-100
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case progress
        case userId = "user_id"
        case articleUrl = "article_url"
        case updatedAt = "updated_at"
    }
}

// SM-2-style spaced repetition state. `interval` is in days.
struct HighlightReview: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    let highlightId: UUID
    var ease: Double
    var interval: Int
    var nextReview: Date   // DATE column, not TIMESTAMPTZ — watch decoding strategy
    let reviewedAt: Date

    enum CodingKeys: String, CodingKey {
        case id, ease, interval
        case userId = "user_id"
        case highlightId = "highlight_id"
        case nextReview = "next_review"
        case reviewedAt = "reviewed_at"
    }
}
