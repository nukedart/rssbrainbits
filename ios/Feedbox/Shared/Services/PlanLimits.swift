// Draft, unverified — see ios/README.md.
// Mirrors src/lib/plan.js exactly. Do not change these numbers during the port —
// this is a translation, not a redesign. If limits need to change, change plan.js
// and this file together, in a separate change with its own reasoning.

import Foundation

struct PlanLimits {
    let name: String
    let feeds: Int?          // nil = unlimited (was `Infinity` in plan.js)
    let smartFeeds: Int?
    let folders: Int?
    let readLater: Int?
    let aiSummariesPerDay: Int?
    let fullTextFetch: Bool
    let exportData: Bool
    let readingStats: Bool
    let highlights: Bool

    static let free = PlanLimits(
        name: "Free",
        feeds: 10,
        smartFeeds: 3,
        folders: 2,
        readLater: 25,
        aiSummariesPerDay: 5,
        fullTextFetch: false,
        exportData: true,
        readingStats: false,
        highlights: true
    )

    static let pro = PlanLimits(
        name: "Pro",
        feeds: nil,
        smartFeeds: nil,
        folders: nil,
        readLater: nil,
        aiSummariesPerDay: nil,
        fullTextFetch: true,
        exportData: true,
        readingStats: true,
        highlights: true
    )
}

enum PlanResource {
    case feeds, smartFeeds, folders, readLater, aiSummariesPerDay
}

struct PlanChecker {
    // Reads app_metadata.plan, NOT user_metadata — GitHub/Google OAuth re-login
    // overwrites user_metadata on every sign-in, which would silently downgrade
    // Pro users back to Free if read from the wrong field. Same footgun as the
    // web app (src/lib/plan.js:2-3) — do not "simplify" this by reading userMetadata.
    static func plan(forAppMetadata appMetadata: [String: Any]?) -> PlanLimits {
        guard let raw = appMetadata?["plan"] as? String, raw == "pro" else { return .free }
        return .pro
    }

    static func limit(_ resource: PlanResource, in plan: PlanLimits) -> Int? {
        switch resource {
        case .feeds: return plan.feeds
        case .smartFeeds: return plan.smartFeeds
        case .folders: return plan.folders
        case .readLater: return plan.readLater
        case .aiSummariesPerDay: return plan.aiSummariesPerDay
        }
    }

    // nil limit == unlimited. Mirrors checkLimit() in plan.js:55-67.
    static func isAllowed(_ resource: PlanResource, currentCount: Int, plan: PlanLimits) -> Bool {
        guard let limit = limit(resource, in: plan) else { return true }
        return currentCount < limit
    }
}
