// Draft, unverified — see ios/README.md.
// Skeleton port of InboxPage.jsx's split-panel layout (sidebar + item list +
// detail). This is the starting shell, not the feature-complete page — filters,
// smart feeds, folders, search, and swipe actions from the web version still
// need porting. See docs/ios-native-plan.md's phase table for build order.

import SwiftUI

struct InboxView: View {
    @EnvironmentObject var supabase: SupabaseService
    @State private var feeds: [Feed] = []
    @State private var selectedFeed: Feed?
    @State private var loadError: String?

    var body: some View {
        // NavigationSplitView replaces App.jsx's Sidebar (desktop) / BottomNav
        // (mobile) dual-layout — SwiftUI collapses to a single column
        // automatically on compact width, no separate mobile component needed.
        NavigationSplitView {
            List(feeds, selection: $selectedFeed) { feed in
                Label(feed.name ?? feed.url, systemImage: iconName(for: feed.type))
                    .tag(feed)
            }
            .navigationTitle("Feedbox")
            .task { await loadFeeds() }
            .refreshable { await loadFeeds() }   // built-in pull-to-refresh, no custom gesture handling needed
        } detail: {
            if let feed = selectedFeed {
                Text("Item list for \(feed.name ?? feed.url) — port of FeedItem.jsx list rendering")
            } else {
                Text("Select a feed")
                    .foregroundStyle(.secondary)
            }
        }
        .alert("Couldn't load feeds", isPresented: .constant(loadError != nil)) {
            Button("OK") { loadError = nil }
        } message: {
            Text(loadError ?? "")
        }
    }

    private func loadFeeds() async {
        do {
            feeds = try await supabase.getFeeds()
        } catch {
            loadError = error.localizedDescription
        }
    }

    private func iconName(for type: String) -> String {
        switch type {
        case "podcast": return "waveform"
        case "youtube": return "play.rectangle"
        default: return "dot.radiowaves.up.forward"
        }
    }
}

extension Feed: Hashable {
    static func == (lhs: Feed, rhs: Feed) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}
