# Feedbox iOS — native rebuild scaffolding

**Unverified draft.** Everything under `Feedbox/` was written in a Linux container with
no Xcode, no Swift compiler, no Simulator. It has never been built. Treat it as a
starting point to open in Xcode and fix against real compiler errors, not as working code.

See `docs/ios-native-plan.md` at the repo root for the audit this was drafted from —
schema mapping, open decisions, and build sequence.

## Getting this into an actual Xcode project

This directory is source files only, not an `.xcodeproj` — generating a valid Xcode
project file by hand (outside Xcode) is not something to trust from an unverified draft.
In Xcode:

1. File → New → Project → iOS → App. Interface: SwiftUI. Name it `Feedbox`.
2. Add Swift Package dependencies (Xcode → File → Add Package Dependencies):
   - `https://github.com/supabase/supabase-swift` (from 2.0.0)
   - `https://github.com/nmdias/FeedKit` (from 9.0.0)
   - `https://github.com/scinfu/SwiftSoup` (from 2.6.0)
   - `https://github.com/evgenyneu/keychain-swift` (from 20.0.0)
3. Drag `Feedbox/Shared/` into the project navigator, "Copy items if needed" checked.
4. Fill in Supabase URL/anon key in `SupabaseService.swift` (from the same Supabase
   project the web app uses — `.env`'s `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`).
5. Build. Expect errors — supabase-swift's exact API surface (query builder method names,
   auth session shape) was written from memory/documentation patterns, not verified
   against a live compiler, and the SDK does change between versions.

## Layout

```
Feedbox/
├── Shared/
│   ├── Models/       # 1:1 with supabase-schema.sql — see docs/ios-native-plan.md §2
│   ├── Services/      # SupabaseService, PlanLimits, ZettelEngine
│   ├── Views/          # minimal InboxView starting point
│   └── App/            # @main entry
```

No `iOS/` or `macOS/` platform-specific subfolders yet — this build is iOS-only per the
decision recorded in `docs/ios-native-plan.md`, no universal-app split needed.
