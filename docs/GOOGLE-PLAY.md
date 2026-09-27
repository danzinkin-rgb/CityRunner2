# Publishing to Google Play

What it takes to ship CityRunner on Android, written 27 September 2026.
Nothing here has been started. Google's rules change each year: check the
current Play Console requirements (target API level, testing rules) before
starting.

## The short version

The game itself is ready: it is a web app in Capacitor, and Capacitor builds
Android as well as iOS. What does not carry over is everything that talks to
Apple: purchases, Game Center, and the App Store listing. Android can be built
entirely on Windows (Android Studio); no Mac is needed.

The long pole is not code. **A new personal Play developer account has to run
a closed test with at least 12 testers, opted in for 14 days in a row, before
it can publish to production.** Recruit testers early.

## 1. Accounts and paperwork (Dan)

- Google Play developer account: one-off USD 25 fee, with identity
  verification (government ID). Choose a personal account unless there is a
  company.
- Payments profile, if the unlock purchase is to be sold on Android.
- Privacy policy URL: already live (`privacy.html`).
- Content rating: the IARC questionnaire in Play Console. Expect "Everyone"
  / PEGI 3 with the same answers as Apple's 4+.
- Data safety form: declare that no data is collected, as on the App Store.
  Only true while the rule in `docs/COMPLIANCE.md` §4 (no third-party SDKs)
  holds.
- Target audience: the game is suitable for children, so it falls under
  Google's **Families policy**. That fits how the game is already built (no
  ads, no tracking, no accounts, no external links) but the policy has to be
  read and its declarations made.

## 2. Code changes (Claude)

- **Add the Android project**: `npm i @capacitor/android`, `npx cap add
  android`, and an `android:sync` script next to `ios:sync`. The existing
  plugins (app, haptics, splash screen, status bar) support Android.
- **Purchases**: `src/core/iap.js` registers the products for
  `Platform.APPLE_APPSTORE` only. `cordova-plugin-purchase` also supports
  Google Play Billing, so this is a platform switch plus creating the same
  products (Founder, full unlock) in Play Console. Restore behaves
  differently on Google Play and needs its own device test.
- **Game Center** is Apple-only. The Swift plugin
  (`ios/App/App/GameCenterPlugin.swift`) does not exist on Android, so every
  call must no-op there. Google Play Games Services is the equivalent, but
  it is optional and can come later; the local leaderboard still works.
- **Android back button**: Android has a system back gesture that iOS does
  not. It should close an open overlay, pause a run, or leave the app from
  the menu (`@capacitor/app` `backButton` event).
- **Target API level**: build against the level Google currently requires
  (API 35 at minimum; it is raised every August).
- **Tests**: add Android to the release-build checks (no debug hooks, no
  tester section), as for iOS.
- **Performance**: test on a mid-range Android phone, not just a flagship.
  The GPU memory work (`releaseStreetCaches`) matters more on Android, where
  many devices have less memory than recent iPhones.

## 3. Store listing (Dan, with Claude drafting)

- App name, short description (80 characters), full description (4,000).
- Icon 512×512; feature graphic 1024×500 (new: iOS has no equivalent).
- Screenshots: phone (at least 2) and 7" and 10" tablet sets.
  `npm run shots:store` can be extended for the Android sizes.
- An Android App Bundle (`.aab`), signed. Use Play App Signing: Google keeps
  the release key, you keep an upload key. Back the upload key up; losing it
  means a support request to reset.

## 4. Order of work

1. Dan: create the developer account and start identity verification (can
   take days).
2. Claude: Android project, purchases switch, Game Center no-op, back button,
   tests. About a day of work, all on Windows.
3. Dan: build in Android Studio, install on an Android phone, test.
4. Dan: upload to a closed test track; recruit 12+ testers; wait 14 days.
5. Dan: store listing, forms, then apply for production access and submit.

Realistically three to four weeks from starting, mostly the testing window.
