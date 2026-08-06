# Feedbox — Swift Rebuild Guide (iOS + macOS Universal App)

---

## The honest assessment first

The web app works on iOS Safari today. Native makes sense if you want:
- App Store distribution (discoverability)
- Push notifications for new articles
- Background feed refresh
- Widgets (home screen, lock screen)
- Better offline support
- That native iOS feel (swipe, haptics, scroll physics)

It does **not** make sense yet if you're still validating paying users. Ship to the App Store after you have ~50 paying web users — that proves the concept before a 3–6 month rebuild.

---

## Architecture mapping

| Current (Web) | Native Swift equivalent |
|---|---|
| React + Vite | SwiftUI (universal — one codebase for iOS + macOS) |
| Supabase auth | Supabase Auth REST endpoint via `URLSession` (JWT stored in Keychain) |
| Supabase DB | **SwiftData + CloudKit** (private DB) as the primary store, with a PostgREST dual-write bridge for web parity |
| Stripe payments | **StoreKit 2** (App Store) or Stripe (macOS direct) |
| Cloudflare Worker proxy | URLSession direct — no CORS in native apps |
| `@mozilla/readability` | `SwiftSoup` + custom extraction or headless WKWebView |
| Claude API (AI) | Same API, called via URLSession |
| CSS themes | SwiftUI `ColorScheme` + custom `Theme` environment object |
| React state/context | `@Observable` / `@Environment` / SwiftData |
| Service Worker (offline) | URLCache + SwiftData persistence |
| CHANGELOG / deploy script | Xcode versioning + TestFlight |

---

## Key decisions to make before starting

### 1. App Store vs direct distribution (macOS)

This is the most consequential decision:

**App Store (iOS required, macOS optional):**
- Apple takes **30%** on subscriptions year 1, **15%** year 2+
- $9/mo → you net **$6.30** (vs $8.44 with Stripe on web)
- Massive discoverability upside
- StoreKit 2 replaces Stripe entirely — simpler but less control
- Required for iOS. No choice.

**Mac App Store or direct macOS:**
- Can sell outside Mac App Store on macOS — keep 100% minus Stripe fees
- Direct = `pkg` installer or Homebrew, no discovery
- Mac App Store = same 30% cut but easier install

**Recommended:** iOS App Store (required) + Mac App Store for consistency. Accept the 30% cut — the distribution value is worth it at early stage. Raise price to $11.99/mo on App Store to net ~$8.40 (same as web).

---

### 2. SwiftUI universal vs separate targets

**Option A — Single SwiftUI target (recommended):**
- One codebase, compiles to both iOS and macOS natively
- Use `#if os(iOS)` / `#if os(macOS)` for platform-specific UI
- SwiftUI handles layout differences well
- Realistic for a reader app with minimal platform-specific UI

**Option B — iOS app + Mac Catalyst:**
- iOS app runs on macOS with minimal changes
- Feels slightly "off" on macOS but ships faster
- Good interim step if you want macOS fast

**Option C — Separate iOS and macOS targets:**
- Most native feel on both platforms
- Roughly 2x the UI work
- Not worth it until you have revenue justifying it

---

## Project structure

```
Feedbox/
├── Feedbox.xcodeproj
├── Shared/                          # Everything shared between platforms
│   ├── Models/
│   │   ├── Feed.swift               # mirrors your DB schema
│   │   ├── FeedItem.swift
│   │   ├── Folder.swift
│   │   └── SmartFeed.swift
│   ├── Services/
│   │   ├── SyncService.swift        # SwiftData + CloudKit local store
│   │   ├── SupabaseBridge.swift     # auth + PostgREST dual-write (URLSession)
│   │   ├── RSSService.swift         # feed fetching + parsing
│   │   ├── AIService.swift          # Claude summarization
│   │   ├── ArticleService.swift     # full-text extraction
│   │   └── StoreService.swift       # StoreKit 2
│   ├── Views/
│   │   ├── InboxView.swift
│   │   ├── ArticleView.swift        # reader
│   │   ├── SidebarView.swift
│   │   ├── SettingsView.swift
│   │   └── Components/
│   └── App/
│       ├── FeedboxApp.swift         # @main
│       └── Theme.swift
├── iOS/                             # iOS-specific (widgets, app delegate)
└── macOS/                           # macOS-specific (menu bar, window size)
```

---

## Key libraries

All available via Swift Package Manager — no CocoaPods needed.

```swift
// Package.swift dependencies

// RSS/Atom/JSON Feed parsing
.package(url: "https://github.com/nmdias/FeedKit", from: "10.0.0"),

// HTML parsing (replaces @mozilla/readability)
.package(url: "https://github.com/scinfu/SwiftSoup", from: "2.6.0"),

// Keychain wrapper (store API keys + tokens securely)
.package(url: "https://github.com/evgenyneu/keychain-swift", from: "20.0.0"),
```

StoreKit 2, SwiftData, CloudKit, and URLSession are built into the OS — no packages needed.

**No Supabase SDK.** Supabase is reached only through plain `URLSession` calls to its auto-generated REST endpoint (PostgREST) at `https://<project>.supabase.co/rest/v1/...`, with the user's JWT in an `Authorization: Bearer` header. Dropping `supabase-swift` keeps the dependency surface small and makes the bridge easy to reason about — it's just HTTP.

---

## The 5 hardest parts to rebuild

### 1. RSS fetching without CORS proxy

Good news: native apps don't have CORS restrictions. `URLSession` fetches any URL directly. Your entire proxy infrastructure (`PROXY_PRIMARY`, `PROXY_FALLBACK`, etc.) goes away. Feed fetching becomes ~20 lines of code.

```swift
func fetchFeed(url: URL) async throws -> Feed {
    let (data, _) = try await URLSession.shared.data(from: url)
    let parser = FeedParser(data: data)
    let result = parser.parse()
    // map to your Feed model
}
```

---

### 2. Full-text article extraction (Readability replacement)

Two options:

**Option A — SwiftSoup (pure Swift):**
Port your selector logic from `fetchers.js` to Swift. `SwiftSoup` mirrors jsoup's API closely.

```swift
import SwiftSoup

func extractArticle(html: String, url: URL) throws -> ArticleContent {
    let doc = try SwiftSoup.parse(html, url.absoluteString)
    let article = try doc.select("article, [itemprop='articleBody'], .post-content").first()
    // remove noise nodes
    try article?.select("script, style, nav, footer, aside, .ad").remove()
    let text = try article?.text() ?? ""
    let bodyHtml = try article?.html() ?? ""
    return ArticleContent(text: text, html: bodyHtml)
}
```

**Option B — Headless WKWebView + Readability.js (reuses your existing logic exactly):**

```swift
// Inject the actual Readability.js into a hidden WKWebView
let webView = WKWebView()
webView.loadHTMLString(rawHtml, baseURL: articleURL)
webView.evaluateJavaScript("""
    var article = new Readability(document).parse();
    JSON.stringify({ title: article.title, content: article.content, textContent: article.textContent })
""") { result, _ in
    if let json = result as? String,
       let data = json.data(using: .utf8) {
        let article = try? JSONDecoder().decode(ReadabilityResult.self, from: data)
    }
}
```

Option B is faster to ship since the logic is already proven.

---

### 3. Background feed refresh

Native apps can refresh feeds in the background even when closed. Use `BGAppRefreshTask`:

```swift
// Register in AppDelegate
BGTaskScheduler.shared.register(
    forTaskWithIdentifier: "com.feedbox.refresh",
    using: nil
) { task in
    Task {
        await FeedRefreshService.refreshAll()
        task.setTaskCompleted(success: true)
    }
}

// Schedule next refresh
func scheduleRefresh() {
    let request = BGAppRefreshTaskRequest(identifier: "com.feedbox.refresh")
    request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60) // 15 min
    try? BGTaskScheduler.shared.submit(request)
}
```

Users get new articles without opening the app — a major upgrade over the web version.

---

### 4. StoreKit 2 (replaces Stripe for iOS)

Products are defined in App Store Connect, not in code. The purchase flow:

```swift
import StoreKit

class StoreService: ObservableObject {
    @Published var isPro = false
    private var products: [Product] = []

    func loadProducts() async throws {
        products = try await Product.products(for: ["com.feedbox.pro.monthly"])
    }

    func purchase() async throws {
        guard let product = products.first else { return }
        let result = try await product.purchase()

        switch result {
        case .success(let verification):
            // Validate with your server
            await validateReceipt(verification)
            isPro = true
        case .userCancelled, .pending:
            break
        @unknown default:
            break
        }
    }

    // Restore on app launch
    func restorePurchases() async {
        for await result in Transaction.currentEntitlements {
            if case .verified(let transaction) = result {
                isPro = transaction.productID == "com.feedbox.pro.monthly"
            }
        }
    }
}
```

**Server-side validation:** Apple sends subscription events to an endpoint you register in App Store Connect (same concept as Stripe webhooks). You'd add a fourth Supabase Edge Function `apple-webhook` that handles `SUBSCRIBED`, `DID_RENEW`, `EXPIRED` events and updates `app_metadata.plan` in Supabase — same pattern as `stripe-webhook`.

---

### 5. Syncing read state across web + native

The native app owns its data locally in **SwiftData backed by CloudKit**, using the user's **private** CloudKit database. That gives multi-device sync across the user's own iPhone, iPad, and Mac for free, with no backend code and no server costs:

```swift
let config = ModelConfiguration(cloudKitDatabase: .private("iCloud.com.feedbox"))
let container = try ModelContainer(
    for: Feed.self, FeedItem.self, Highlight.self,
    configurations: config
)
```

CloudKit is the source of truth for the native app. The web app still reads from Supabase Postgres, so to keep the two in parity a `SupabaseBridgeService` **dual-writes**: every local change is applied to SwiftData first, then — if the device is online — pushed to Supabase's auto-generated PostgREST endpoint over plain `URLSession`. No SDK involved.

```swift
struct SupabaseBridgeService {
    let baseURL = URL(string: "https://<project>.supabase.co/rest/v1")!
    let anonKey: String
    var jwt: String   // from Keychain, set at sign-in

    // Upsert a read-state row. PATCH for updates, POST + Prefer: resolution for upserts.
    func pushRead(url: String, userId: String) async throws {
        var req = URLRequest(url: baseURL.appendingPathComponent("read_urls"))
        req.httpMethod = "POST"
        req.setValue(anonKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(jwt)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("resolution=merge-duplicates", forHTTPHeaderField: "Prefer")
        req.httpBody = try JSONEncoder().encode(["user_id": userId, "url": url])

        let (_, response) = try await URLSession.shared.data(for: req)
        guard (response as? HTTPURLResponse)?.statusCode ?? 500 < 300 else {
            throw BridgeError.pushFailed   // queue locally, retry on next foreground
        }
    }

    // Pull anything the web app changed since our last successful sync.
    func pullChanges(since: Date) async throws -> [RemoteRow] {
        let iso = ISO8601DateFormatter().string(from: since)
        var comps = URLComponents(
            url: baseURL.appendingPathComponent("read_urls"),
            resolvingAgainstBaseURL: false
        )!
        comps.queryItems = [
            .init(name: "select", value: "*"),
            .init(name: "updated_at", value: "gt.\(iso)")
        ]
        var req = URLRequest(url: comps.url!)
        req.setValue(anonKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(jwt)", forHTTPHeaderField: "Authorization")

        let (data, _) = try await URLSession.shared.data(for: req)
        return try JSONDecoder().decode([RemoteRow].self, from: data)
    }
}
```

Pulls run **on app foreground and on manual refresh** — not via a realtime subscription. A long-lived socket isn't worth the battery and complexity for a reader app where "fresh within a few seconds of opening" is plenty. Rows that come back get merged into the SwiftData store (last-write-wins on `updated_at`), and failed pushes are queued locally and retried on the next foreground.

Your existing DB schema (`read_urls`, `highlights`, `notes`) works unchanged; RLS still scopes every request to the signed-in user because the bridge sends their real JWT.

**Why not a server-side CloudKit ↔ Postgres bridge?** Reading a user's *private* CloudKit database from a server requires CloudKit Web Services and a per-user, OAuth-style consent flow — there is no admin or service-role key equivalent to Supabase's. That's a large amount of infrastructure for a single-developer, personal-use app.

**Accepted tradeoff:** because the dual-write happens on the client, the web app is only as fresh as the last time the native app was opened. If you spend a week reading only on your phone with the app closed, the web view lags. That's a known and accepted limitation of this design, not a bug to file.

---

## Mapping your current features to SwiftUI views

| Web component | SwiftUI equivalent |
|---|---|
| `InboxPage.jsx` (split panel) | `NavigationSplitView` with sidebar + detail |
| `Sidebar.jsx` | `List` in sidebar column with sections |
| `FeedItem.jsx` (swipe actions) | `.swipeActions()` modifier — built in |
| `ContentViewer.jsx` | `ScrollView` + `WKWebView` for rendered HTML |
| `AddModal.jsx` | `.sheet()` with `TextField` |
| Pull-to-refresh | `.refreshable {}` modifier — built in |
| Bottom nav (mobile) | `TabView` |
| Keyboard shortcuts | `.keyboardShortcut()` modifier |
| Theme system | `@Environment(\.colorScheme)` + custom `Theme` |
| Toast notifications | Custom overlay or `GroupBox` with `.transition()` |

---

## Handling the AI summary (Claude API)

No changes to the API calls — just port from `fetch()` to `URLSession`:

```swift
struct AIService {
    static func summarize(text: String, title: String, style: String) async throws -> String {
        var request = URLRequest(url: URL(string: "https://api.anthropic.com/v1/messages")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")
        // Key stored in Keychain, not bundled in app
        request.setValue(KeychainSwift().get("anthropic_key") ?? "", forHTTPHeaderField: "x-api-key")

        let body = AnthropicRequest(
            model: "claude-haiku-4-5-20251001",
            maxTokens: 512,
            messages: [.init(role: "user", content: buildPrompt(text: text, title: title, style: style))]
        )
        request.httpBody = try JSONEncoder().encode(body)

        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(AnthropicResponse.self, from: data)
        return response.content.first?.text ?? ""
    }
}
```

**Key difference from web:** Store the API key in the iOS Keychain, not in `localStorage` or a JS env var. Never bundle it in the app binary.

---

## Widgets

A major native advantage — not possible on web. Two useful widget types:

**Unread count widget (home screen):**
```swift
struct UnreadWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "UnreadCount", provider: UnreadProvider()) { entry in
            VStack {
                Text("\(entry.unreadCount)")
                    .font(.system(size: 40, weight: .bold))
                Text("unread")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .configurationDisplayName("Feedbox Unread")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
```

**Latest headlines widget (lock screen / home screen):**
Shows the 3 most recent unread article titles. Tapping opens the app directly to that article.

---

## Realistic timeline

Assuming part-time work (~20 hrs/week) with existing Swift/SwiftUI knowledge:

| Phase | What | Time |
|---|---|---|
| 1 | Project setup, Supabase auth, basic feed list | 2 weeks |
| 2 | RSS parsing, inbox view, article reader | 3 weeks |
| 3 | AI summaries, full-text extraction, highlights | 2 weeks |
| 4 | Smart feeds, folders, settings | 2 weeks |
| 5 | StoreKit 2 + paywall | 1 week |
| 6 | Background refresh, push notifications, widgets | 2 weeks |
| 7 | macOS polish, keyboard shortcuts, menu bar | 1 week |
| 8 | TestFlight beta, bug fixes, App Store submission | 2 weeks |
| **Total** | | **~15 weeks** |

Add 4–6 weeks if learning SwiftUI from scratch.

---

## App Store submission checklist

Things that catch people off guard:

- **Privacy manifest** (`PrivacyInfo.xcprivacy`) — required since iOS 17. Must declare all APIs used (URLSession, UserDefaults, etc.) and their purpose
- **App Privacy labels** in App Store Connect — declare what data you collect (email, usage data). Must match your Privacy Policy
- **Screenshots** — required for every device size: iPhone 6.9", 6.5", iPad 12.9". Use Simulator
- **Age rating** — "4+" unless your content warrants otherwise
- **Review notes** — if login is required for review, provide a test account
- **In-app purchase** — StoreKit products must be approved separately; submit product metadata at the same time as the app
- **Review time** — typically 24–48 hrs first submission, faster for updates

---

## Recommended path

**Now:** Keep shipping the web app. Get to 50 paying users. This validates the market and funds the native build.

**Month 2–3:** Start the iOS app. Use TestFlight — your existing web users become beta testers. They already know the product.

**Month 4:** Submit to App Store. Run web and native in parallel — native syncs its own devices over CloudKit and dual-writes to Supabase so the web app stays current.

**Month 6+:** Once App Store revenue covers costs, decide whether to build native macOS or keep Mac Catalyst.

The web app and native app are complementary, not competing — the native app mirrors its data to the same Supabase backend the web app reads. A user can sign up on web and continue on iOS with their highlights and read state intact. That's a selling point.

---

## Resources

| Topic | Resource |
|---|---|
| SwiftUI fundamentals | developer.apple.com/tutorials/swiftui |
| Supabase REST API (PostgREST) | supabase.com/docs/guides/api |
| SwiftData + CloudKit sync | developer.apple.com/documentation/swiftdata |
| FeedKit (RSS parsing) | github.com/nmdias/FeedKit |
| SwiftSoup (HTML parsing) | github.com/scinfu/SwiftSoup |
| StoreKit 2 guide | developer.apple.com/in-app-purchase |
| BGAppRefreshTask | developer.apple.com/documentation/backgroundtasks |
| App Store submission | appstoreconnect.apple.com |
| TestFlight | developer.apple.com/testflight |
| Privacy manifest guide | developer.apple.com/documentation/bundleresources/privacy_manifest_files |
