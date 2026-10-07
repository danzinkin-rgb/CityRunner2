# Mac session brief — finish the Founder Unlock IAP and submit

**Read this file first, in full, before touching anything.** It is written so a
fresh Claude Code session on this Mac has everything it needs without the user
having to copy/paste context from a Windows machine. It assumes nothing about
what a prior session on this Mac knew — Claude Code sessions are local and
don't share memory across machines.

---

## 0. What this project is, in one paragraph

CityRunner ("CityRunner: Landmark Run") is a Capacitor-wrapped iOS game,
bundle ID `uk.co.zinkin.cityrunner`, App Store Connect app ID `6806808248`.
Repo: `github.com/danzinkin-rgb/CityRunner2`, branch `main`. It already has a
build (Build 2) uploaded and validated in App Store Connect, Game Center fully
wired and verified end-to-end on a real device, and most of the App Store
Connect submission form filled in. **The one thing standing between "ready"
and "submitted" is finishing the in-app purchase (IAP) flow**, which is what
this session is for.

## 1. What was just done on Windows (already committed, pull it first)

The Windows side of this work — the JS/TS logic, which needs no native
toolchain — is finished and pushed:

- `src/core/iap.js` — `loadStore()` is now a real implementation using
  `cordova-plugin-purchase`, not a stub. It reads `window.CdvPurchase`
  (injected by the plugin's native bridge at launch — nothing to import), and
  registers `OFFER_ORDER` from `src/core/entitlements.js`.
- `package.json` — added `"cordova-plugin-purchase": "^13.18.0"` as a
  dependency and ran `npm install` (Windows can install pure-JS npm packages
  fine; it just cannot build or run the native iOS half).
- `npm test` was re-run after the change and **all gates still pass**,
  including `test/entitlements.mjs` (the 30-check entitlement gate) — because
  `window.CdvPurchase` does not exist in Playwright's headless browser,
  `loadStore()` still correctly returns `null` there, so nothing about the
  test suite's behaviour changed. This is expected and fine — it means the
  code degrades safely, not that it's proven to work. **Only a real device can
  prove the actual purchase flow works.**

None of this has been tested against real StoreKit. That is exactly the work
left for this session.

**First step: `git pull`.** Do not re-implement `loadStore()` — read the
current file first, since it already reflects the plan below.

## 2. The full spec — read this before doing anything else

**[`docs/FREEMIUM-IAP.md`](FREEMIUM-IAP.md) is the authoritative document.**
It covers the product model (three free cities forever, Rome paid, a
time-limited £1.99 Founder price falling back to a standing unlock price),
the Children's Code constraints baked into the UI (no urgency language, no
timers, "NOT NOW" the same visual weight as "buy"), and — critically —
**§4 "Mac tasks"** and **§7 "Sandbox testing"**, which are the two sections
this session needs to execute. Read the whole file; it's short and everything
below assumes you have.

**One correction to §4.1**: the `npm install cordova-plugin-purchase@13` step
described there has already been done (see §1 above) — skip straight to
`npm run ios:sync` / `pod install`.

## 3. Exact steps for this session

Run these in order. Stop and report back (don't guess past an error) if any
step fails in a way not covered by §5 below.

```bash
git pull --no-rebase --no-edit
npm install
npm run ios:sync
```

`ios:sync` runs `vite build && cap sync ios`, which copies `dist/` into the
Capacitor app **and runs `pod install`**, pulling in `cordova-plugin-purchase`'s
native iOS code. Confirm it completes with no red CocoaPods errors before
moving on.

```bash
npx cap open ios
```

In Xcode:

1. Select the **App** target → **Signing & Capabilities** → **+ Capability**
   → add **In-App Purchase**. (Confirm Team is still set from last session —
   if Xcode complains about no account/profile, re-add the Apple ID under
   Xcode → Settings → Accounts, same as before.)
2. Build to a **real device**, not the simulator — sandbox StoreKit 1 flows
   don't work in the simulator, and this plugin's default path is StoreKit 1
   compatibility even though it talks to StoreKit 2 under the hood. (A local
   `.storekit` configuration file would let you test in the simulator, but
   that's extra setup not required here — a real device is simpler and is
   what a reviewer will actually use.)
3. Run it.

Then work through **docs/FREEMIUM-IAP.md §7, "Sandbox testing"**, in full,
in order. It is a 7-item checklist (paywall shows a real price, buy unlocks
Rome, force-quit/relaunch keeps it unlocked, delete/reinstall + Restore
Purchases gets it back, cancelling the sheet does nothing, aeroplane mode
degrades to "store not reachable", a second never-purchased sandbox account
stays locked). **Item 4's reinstall-then-restore is what Apple's reviewer
will try — it's also the one most likely to be broken, so don't skip it.**

Before any of this works at all, check **docs/FREEMIUM-IAP.md §5.5**: the
Paid Applications Agreement (App Store Connect → Business — banking/tax forms
must be complete and *accepted*) is the single most common reason IAP returns
nothing even in sandbox. Check this first if the paywall stays blank on
device with everything else set up correctly.

## 4. App Store Connect — what's already there, what's left

The "Founder Unlock" in-app purchase product **already exists** in App Store
Connect (Product ID `uk.co.zinkin.cityrunner.founder`, Reference Name
"Founder Unlock", Non-Consumable), status **Draft / Prepare for Submission**.
Pricing and localization are already filled in. The one thing blocking it
from being submittable is the **Review Screenshot** — App Store Connect
requires one before the IAP can be added for review, and it can't be a
meaningful one until the paywall shows a real price, which needs this
session's device testing to be working first.

Once the sandbox checklist above passes:

1. Take a screenshot of the paywall showing a real localised price (the
   device you're testing on, or `npm run shots:store` if that script can be
   pointed at a native build — check before assuming it applies here, it was
   written for the web/marketing screenshot set, not necessarily this).
2. App Store Connect → Monetization → In-App Purchases → Founder Unlock →
   Review Information → upload that screenshot. Suggested Review Notes text
   is drafted in FREEMIUM-IAP.md §5.4 — use it or edit it, don't invent new
   copy without checking it against the Children's Code constraints in §3 of
   that doc.
3. Click **Add for Review** on the Founder Unlock IAP page itself (this is a
   separate action from the app version's own "Add for Review" — confirmed by
   direct observation this session: the IAP page has its own button).

**Do not click "Add for Review" on the main app version, and do not click it
on the IAP, without telling the user exactly what you're about to submit and
getting an explicit yes first.** This is a real App Store submission with
real review consequences — treat every submit-for-review click as requiring
the same confirmation a `git push --force` would.

## 5. Pitfalls hit repeatedly in the Windows↔Mac sessions so far — read before you hit them again

These cost real time in earlier sessions. Check for them proactively rather
than rediscovering them:

- **VPN silently blocks Xcode's device tunnel** (CoreDevice tunneling, used
  even over USB since Xcode 15/iOS 17+). Symptom: "tunnel connection failed"
  or endless "waiting to reconnect" with no other error. Fix: turn the VPN
  off. This also silently broke Game Center achievement *reporting*
  specifically (leaderboard submission worked, achievements failed with a
  DNS-style "server with the specified hostname could not be found" error) —
  if IAP sandbox calls fail the same way, check VPN first before assuming the
  plugin is broken.
- **Low disk space** causes `dyld_shared_cache_extract_dylibs failed` during
  device-support symbol extraction. Needs several GB free. Check `df -h /`
  and clear `~/Library/Developer/Xcode/DerivedData` if tight.
- **Git commit identity**: make sure `git config user.name` / `user.email`
  are Dan Zinkin's, not anyone else's, before committing — this drifted once
  already on a shared Mac.
- **No Apple ID / no Team in Xcode** on a Mac that hasn't been used for this
  project before → "no account/profile" build failure. Fix: Xcode → Settings
  → Accounts → add Apple ID, then select the Team in Signing & Capabilities.
- **`npm run ios:sync` failing silently / stale bundle**: if debug output you
  just added doesn't show up on device, verify the sync actually completed
  (no ENOENT/folder-path errors) rather than assuming the rebuild picked up
  your change. `grep` the built JS in `dist/assets/*.js` for a distinctive
  string if in doubt.
- **This project's own git workflow reminder**: prefer `git pull --no-rebase
  --no-edit` over a bare `git pull` if the local and remote branches have
  diverged, and never force-push.

## 6. What NOT to do

- Don't re-derive or re-plan the product model (pricing, which cities are
  free, the founder-window mechanism) — it's a finished decision, fully
  written up in FREEMIUM-IAP.md §1. If something there seems wrong, ask the
  user rather than changing it unilaterally.
- Don't add RevenueCat, `@capacitor-community/in-app-purchases` (doesn't
  exist on npm), or any other IAP library — `cordova-plugin-purchase` was
  deliberately chosen; the reasons are in `src/core/iap.js`'s own header
  comment and FREEMIUM-IAP.md §4.1.
- Don't touch the Children's Code UI constraints (no urgency language, equal-
  weight "not now" button, no hardcoded price) — they're deliberate, not
  oversights, and they're why the app can carry a 4+ rating.
- Don't click any App Store Connect "Add for Review" / "Submit" control
  without explicit per-action user confirmation, per §4 above.
