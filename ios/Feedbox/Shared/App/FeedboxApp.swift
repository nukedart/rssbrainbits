// Draft, unverified — see ios/README.md.

import SwiftUI

@main
struct FeedboxApp: App {
    @StateObject private var supabase = SupabaseService.shared

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(supabase)
        }
    }
}

struct RootView: View {
    @EnvironmentObject var supabase: SupabaseService

    var body: some View {
        // Mirrors App.jsx's top-level branch on `user` — LoginView vs the main
        // NavigationSplitView. No React-Router-style state machine needed here;
        // SwiftUI's own view identity + NavigationSplitView selection replaces
        // App.jsx's `currentPage` string-based routing (see docs/ios-native-plan.md
        // mapping table for the rest of the page → view correspondences).
        if supabase.currentUserId != nil {
            InboxView()
        } else {
            LoginView()
        }
    }
}

struct LoginView: View {
    var body: some View {
        Text("Sign in — port of LoginPage.jsx")
            .padding()
        // TODO: GitHub/Google OAuth buttons, calling
        // SupabaseService.shared.signInWithGitHub() / .signInWithGoogle()
    }
}
