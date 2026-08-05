// Draft, unverified — see ios/README.md.
// Skeleton only: auth + a representative slice of the 55-function query surface
// in src/lib/supabase.js (feeds, highlights — the core "card" flow). The rest
// follow the same pattern; port them incrementally against real compiler/API
// errors rather than transcribing all 55 blind. See docs/ios-native-plan.md §1.2
// for the full function inventory to work through.
//
// supabase-swift's exact method names/signatures (`.from()`, `.select()`, session
// shape) were written from documented patterns, not verified against a live
// compiler — expect to fix call sites once this actually builds.

import Foundation
import Supabase

@MainActor
final class SupabaseService: ObservableObject {
    static let shared = SupabaseService()

    // Same project the web app uses — copy from .env's VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
    // Do not hardcode real values in source; load from an .xcconfig or Info.plist entry
    // that's gitignored, same spirit as the web app's .env being gitignored.
    private let client = SupabaseClient(
        supabaseURL: URL(string: "https://YOUR_PROJECT.supabase.co")!,
        supabaseKey: "YOUR_ANON_KEY"
    )

    @Published var currentUserId: UUID?
    @Published var plan: PlanLimits = .free

    private init() {}

    // MARK: - Auth
    // GitHub/Google only — matches web app's LoginPage.jsx (email/password and
    // magic-link were removed there in v1.46.443, keep native consistent).

    func signInWithGitHub() async throws {
        try await client.auth.signInWithOAuth(provider: .github)
        try await refreshSessionAndPlan()
    }

    func signInWithGoogle() async throws {
        try await client.auth.signInWithOAuth(provider: .google)
        try await refreshSessionAndPlan()
    }

    func signOut() async throws {
        try await client.auth.signOut()
        currentUserId = nil
        plan = .free
    }

    // CRITICAL: read plan from app_metadata, never user_metadata.
    // See PlanLimits.swift's comment — user_metadata is overwritten by OAuth
    // providers on every login and would silently downgrade Pro users.
    private func refreshSessionAndPlan() async throws {
        let session = try await client.auth.session
        currentUserId = session.user.id
        plan = PlanChecker.plan(forAppMetadata: session.user.appMetadata)
    }

    // MARK: - Feeds
    // Mirrors getFeeds/addFeed/updateFeedSettings/deleteFeed in supabase.js:37-76.

    func getFeeds() async throws -> [Feed] {
        guard let userId = currentUserId else { return [] }
        return try await client
            .from("feeds")
            .select()
            .eq("user_id", value: userId)
            .execute()
            .value
    }

    func addFeed(url: String, type: String, name: String?) async throws -> Feed {
        guard let userId = currentUserId else { throw SupabaseServiceError.notAuthenticated }
        struct NewFeed: Encodable {
            let user_id: UUID
            let url: String
            let type: String
            let name: String?
        }
        return try await client
            .from("feeds")
            .insert(NewFeed(user_id: userId, url: url, type: type, name: name))
            .select()
            .single()
            .execute()
            .value
    }

    func deleteFeed(id: UUID) async throws {
        try await client.from("feeds").delete().eq("id", value: id).execute()
    }

    // MARK: - Highlights
    // Mirrors getHighlights/addHighlight/updateHighlightNote/updateHighlightTags/
    // deleteHighlight in supabase.js:123-157.

    func getHighlights(articleUrl: String) async throws -> [Highlight] {
        guard let userId = currentUserId else { return [] }
        return try await client
            .from("highlights")
            .select()
            .eq("user_id", value: userId)
            .eq("article_url", value: articleUrl)
            .order("position", ascending: true)
            .execute()
            .value
    }

    func getAllHighlights(limit: Int = 500) async throws -> [Highlight] {
        guard let userId = currentUserId else { return [] }
        return try await client
            .from("highlights")
            .select()
            .eq("user_id", value: userId)
            .order("created_at", ascending: false)
            .limit(limit)
            .execute()
            .value
    }

    func addHighlight(articleUrl: String, articleTitle: String?, passage: String, color: String) async throws -> Highlight {
        guard let userId = currentUserId else { throw SupabaseServiceError.notAuthenticated }
        struct NewHighlight: Encodable {
            let user_id: UUID
            let article_url: String
            let article_title: String?
            let passage: String
            let color: String
        }
        return try await client
            .from("highlights")
            .insert(NewHighlight(user_id: userId, article_url: articleUrl, article_title: articleTitle, passage: passage, color: color))
            .select()
            .single()
            .execute()
            .value
    }

    func updateHighlightNote(id: UUID, note: String) async throws {
        try await client.from("highlights").update(["note": note]).eq("id", value: id).execute()
    }

    func deleteHighlight(id: UUID) async throws {
        try await client.from("highlights").delete().eq("id", value: id).execute()
    }
}

enum SupabaseServiceError: Error {
    case notAuthenticated
}
