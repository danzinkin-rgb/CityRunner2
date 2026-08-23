# CityRunner — App Store Submission Guide

**Working checklist, in submission order, with exact text to paste into every App Store Connect field. Written 23 August 2026.**
Screenshot specifications, the Developer Program fee and the age-rating questionnaire were checked against `developer.apple.com` on 23 August 2026 and are cited where used — Apple changes all three periodically, so re-verify if this document sits unused for more than a couple of months.

Authoritative sources used, deferred to on any conflict: `docs/COMPLIANCE.md` (§2.1 privacy answers, §2.2 age rating, §3.0 competitor-naming rule, §4 security), `docs/LAUNCH-CHECKLIST.md` (item list only — its statuses are dated 02 August 2026 and are **not** treated as current fact here), `docs/PRODUCT-ROADMAP.md`, `capacitor.config.json`, `privacy.html`, `docs/MAC-SETUP.md`.

---

## 0. App icons — done today

Ran `npx @capacitor/assets generate --ios` against `assets/icon-1024.png` (copied, not moved, to `assets/icon.png`, which is the filename the tool requires).

**Result: succeeded.**

```
CREATE ios icon    Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png   (1.03 MB)
CREATE ios splash  Assets.xcassets/Splash.imageset/Default@1x~universal~anyany.png       (124.52 KB)
CREATE ios splash  Assets.xcassets/Splash.imageset/Default@2x~universal~anyany.png       (124.52 KB)
CREATE ios splash  Assets.xcassets/Splash.imageset/Default@3x~universal~anyany.png       (124.52 KB)
CREATE ios splash-dark  Assets.xcassets/Splash.imageset/Default@1x~universal~anyany-dark.png (240.28 KB)
CREATE ios splash-dark  Assets.xcassets/Splash.imageset/Default@2x~universal~anyany-dark.png (240.28 KB)
CREATE ios splash-dark  Assets.xcassets/Splash.imageset/Default@3x~universal~anyany-dark.png (240.28 KB)
ios: 7 generated, 2.1 MB total
```

Only one icon file is produced (`AppIcon-512@2x.png`, 1024×1024) because the asset catalogue uses the modern single-size **"universal" idiom** — Xcode derives every smaller icon from this one file at build time. `Contents.json` now reads:

```json
{
  "images": [
    { "idiom": "universal", "size": "1024x1024", "filename": "AppIcon-512@2x.png", "platform": "ios" }
  ],
  "info": { "author": "xcode", "version": 1 }
}
```

**Verified, not assumed:**
- Dimensions: confirmed 1024×1024 by opening the file with Pillow.
- Alpha channel: confirmed **absent**. The source `assets/icon-1024.png` is RGBA (has an alpha channel) — the generator flattened it during resize. The output file `AppIcon-512@2x.png` is RGB. This was checked directly (`PIL.Image.open(...).mode == 'RGB'`), not inferred. Apple rejects a marketing icon with alpha, so this specific check mattered.

**Not verified, flagged rather than assumed:** the splash screen images were generated from the same alpha-bearing source; splash screens are not subject to the same alpha rule as the marketing icon, so this was not checked and does not need to be.

**Effect on the checklist:** LAUNCH-CHECKLIST item #14 ("iOS app icon set") is stale at **PARTIAL** — it is now done, at least for the icon itself. It does not cover screenshots (#15) or the App Store Connect 1024×1024 marketing icon upload, which is a separate manual step in §3 below (same file, uploaded directly to App Store Connect, not read from the Xcode project).

**Only these files changed**, all inside the paths this task was scoped to touch:
```
M  ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png
M  ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json
M  ios/App/App/Assets.xcassets/Splash.imageset/Contents.json
?? assets/icon.png   (new copy — the source `icon-1024.png` was not moved or altered)
?? ios/App/App/Assets.xcassets/Splash.imageset/Default@*.png  (6 new files)
```
Nothing has been committed. Commit these once the owner has reviewed the images.

---

## Top three things blocking submission right now

1. **Trademark search on "CityRunner" is still open.** COMPLIANCE §2.3 and §3.0 both list it as required before committing to the name, and it has not been done. This gates the App Store Connect app-record step (§2 below) — if the name is unavailable or contested, the record has to be created under a different name before anything else proceeds.
2. **Screenshots do not exist yet.** `test/store-shots.mjs` is reportedly being built by another agent; until it runs, there is nothing to upload. See §7.
3. **No Apple Developer Program enrolment yet**, which blocks creating the App Store Connect record at all (§1–2), and everything downstream of it — Xcode signing, TestFlight, submission — needs a Mac in any case (see **Needs a Mac**, below).

Export compliance (§6) and the age-rating questionnaire (§4) are *not* on this list — both are answerable in minutes once the app record exists, and the answers are already worked out below.

---

## 1. Apple Developer Program enrolment

| | |
|---|---|
| **Fee** | **$99/year USD**, billed in local currency — GBP typically comes out around **£79/year**, matching the figure already used in `PRODUCT-ROADMAP.md` §3. The exact GBP amount is fixed at checkout by Apple's FX rate on the day; do not be surprised if it is not precisely £79.00 |
| **Individual vs organisation** | **Individual.** He is enrolling as a person, not a company, and the `uk.co.zinkin` domain is a personal identifier, not a registered business — organisation enrolment additionally requires a D-U-N-S number, a legal entity, and a domain-matched work email, none of which apply here |
| **Identity needed** | A valid government photo ID (matching the legal name on the Apple ID exactly — no nicknames or aliases), a two-factor-authentication-enabled Apple ID, and a payment card for the fee. No business paperwork for individual enrolment |
| **Approval time** | Typically **within 24 hours** of payment for individuals; Apple emails confirmation. Occasionally Apple requests additional identity verification, which extends this — budget a few days of slack before any date you're planning around |

*Source: `developer.apple.com/help/account/membership/program-enrollment/` and `developer.apple.com/programs/enroll/`, checked 23 August 2026.*

**Action:** enrol at [developer.apple.com/programs/enroll](https://developer.apple.com/programs/enroll/) using the Apple ID intended to own this app long-term (not a throwaway or a family member's — see the note in `docs/MAC-SETUP.md` Step 5 about using different Apple IDs for local testing versus the one that should actually own the App Store listing).

---

## 2. App Store Connect — create the app record

| Field | Value |
|---|---|
| **Bundle ID** | `uk.co.zinkin.cityrunner` — from `capacitor.config.json`. Register this exact string under Certificates, Identifiers & Profiles *before* creating the app record; App Store Connect will only offer bundle IDs already registered to the account |
| **SKU** | A unique internal string, never shown to users. Recommend `cityrunner-ios-01` — simple, and won't collide if a second SKU is ever needed |
| **Primary language** | English (U.K.) |
| **Name availability** | Cannot be checked in advance except by trying to type it into the "Name" field when creating the record — App Store Connect rejects it live if taken. This is a weaker check than a trademark search (see blocker #1 above) — a name can be unclaimed on the App Store and still infringe a trademark elsewhere. Do the trademark search first; use App Store Connect's live rejection only as a secondary confirmation |

---

## 3. Store metadata — text to paste

### App name (30 characters)

| Option | Chars | Note |
|---|---|---|
| `CityRunner` | 10 | Plain brand name. Matches the Capacitor `appName`, the web app title, and every existing doc. Leaves 20 characters of prime search-ranked real estate unused |
| **`CityRunner: City Dash`** | 21 | **Recommended.** The App Name field is weighted heavily in App Store search — Apple's own ASO guidance is to use it, not just the keywords field, for search terms. "Dash" adds a second searchable term without repeating a word already in "Runner" |
| `CityRunner: Landmark Run` | 24 | Leans on the puzzle-mode differentiator instead of pace. Also viable — "Landmark" is a stronger, less contested search term than "City" |

All three are pending the trademark search in blocker #1 — a clash on "CityRunner" forces a rename before any of them can be used.

### Subtitle (30 characters)

| Option | Chars |
|---|---|
| **`Run the World's Landmarks`** | 25 — **recommended**, pairs with the "Landmark Run" or "City Dash" name options above without repeating "City" or "Dash" |
| `Endless Runner, No Ads` | 22 |
| `Puzzle Streets, Real Cities` | 27 |

### Promotional text (170 characters)

```
New puzzles and souvenirs across real city streets. Offline play, no ads, no accounts, no tracking. Free to play.
```
113 characters. Promotional text can be edited without a full app-review resubmission, so keep this current with whatever is genuinely newest rather than treating it as fixed at launch.

### Description (4000 characters)

Ready to paste as-is (1,945 characters — well inside the limit; the field doesn't need filling, since description text has no effect on App Store search ranking, unlike the name, subtitle and keywords fields, which do):

```
Run real streets. Build real monuments. No ads, no accounts, no tracking.

CityRunner is a fast, three-lane endless runner set on street-accurate recreations of New York, London, Paris and Rome. Swipe to change lane, jump, and roll past traffic, market stalls and street furniture as the pace builds. Every building, vehicle and sign is generated by our own code — nothing borrowed, nothing stock.

Reach a landmark and the run stops being a runner: a 60-second puzzle mode asks you to tap scattered blocks into place and rebuild the monument — the Colosseum, the Eiffel Tower, Big Ben, the Brooklyn Bridge — before the clock runs out. Finish it and a short, plain-language fact about the real landmark appears.

Collect city souvenirs as you run — a croissant in Paris, a red phone box in London, a Caesar bust in Rome — and unlock new streets and cities as you go.

What makes CityRunner different from the genre it sits in:
- An original monument-building puzzle mode, not a reskin of a generic runner
- Named real streets, each with bespoke architecture, not a repeating generic backdrop
- Short, factual interstitials about the landmark you just rebuilt
- Every asset — every character, vehicle, building and sound — procedurally generated in-house

Built for families:
- No account, no sign-up, no email, no password — just open it and play
- No advertising, no third-party trackers, no in-app purchases
- Nicknames are generated for you, never typed, so nothing personal ever has to be entered
- Fully playable offline — no connection required, ever
- Bright, non-violent, no jump-scares, no loot boxes

CityRunner plays entirely on your device. Progress, scores and souvenirs are stored locally and can be erased at any time from within the game.

CityRunner is an independent game and is not affiliated with, sponsored by, or endorsed by any city, landmark, business or brand depicted. All shops, signs and products shown are fictional.
```

**One honesty check before pasting this**: it deliberately does not mention leaderboards, Game Center, achievements or a daily challenge, because per `LAUNCH-CHECKLIST.md` those are not built yet (items #4–6, #16, #21 are TODO/PARTIAL as of the checklist's last edit, and this document does not trust that checklist's *statuses* — but no other evidence in the repo shows them built either). **If any of those ship before submission, add one line for each and re-check the description still matches reality** — a store listing claiming a feature that doesn't exist is a rejection risk (Guideline 2.3, misleading metadata) independent of anything else in this document.

### Keywords (100 characters, comma-separated, no spaces)

```
endless,arcade,puzzle,parkour,offline,kids,family,travel,monument,street,collect,swipe,lane,cities
```
98 characters.

**Competitor-name check (COMPLIANCE §3.0 requirement): confirmed clean.** Checked this exact string against "subway", "surfer", "temple run", "crossy road", "sonic", "mario", "minecraft", "roblox", "fortnite", "stumble guys" and "jetpack joyride" — none present. Deliberately excludes "runner", "city", "run", "world" and "dash" too, since those already appear in the recommended app name and subtitle above and Apple indexes name + subtitle + keywords together — repeating them there would waste characters rather than add reach.

### Support URL

```
https://github.com/danzinkin-rgb/CityRunner2/issues
```
Per COMPLIANCE §2.3, a GitHub issues page is sufficient. LAUNCH-CHECKLIST #23 suggests a dedicated support page would "look more finished" — true, but not a blocker; treat as an optional post-launch polish item, not something to build before submitting.

### Marketing URL

```
https://danzinkin-rgb.github.io/CityRunner2/
```
This is the live web build (confirmed by reading `index.html` — it serves the game itself, not a placeholder). Optional field; include it since it costs nothing and gives reviewers and players something real to look at.

### Copyright

```
© 2026 Dan Zinkin
```

---

## 4. Age rating questionnaire

**Apple substantially rewrote this questionnaire since `LAUNCH-CHECKLIST.md` was last touched.** The old 4+/9+/12+/17+ scale was replaced in 2025 with **4+/9+/13+/16+/18+**, and Apple turned on a further round of new questions — including social-media-related ones — in App Store Connect in July 2026 (optional to answer today, becoming required for new apps from September 2026). None of this changes the expected outcome below, but the form the owner sees will not look like whatever he may remember from an older app. *Checked against `developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/`, 23 August 2026 — this is the area of the whole submission most likely to have moved again by the time this is used; re-check the live form.*

**Expected outcome: 4+.** This rests on one specific, load-bearing fact per COMPLIANCE §2.2: **there is no user-generated content anywhere in the game.** Every question below should be answered "None" *specifically because* that fact is true today.

| Category | Question | Answer | Basis |
|---|---|---|---|
| In-app controls | Parental controls / age assurance present? | None (or leave unset) | Not applicable — no age-restricted content exists to gate |
| Capabilities | Unrestricted web access? | **None** | COMPLIANCE §2.3 lists this explicitly |
| Capabilities | User-generated content? | **None** | COMPLIANCE §2.2's whole basis for 4+. Display names are generated from a curated list, never typed — see §1.4 of the DPIA |
| Capabilities | Social media / messaging and chat? | None | No social features exist |
| Capabilities | Advertising? | None | COMPLIANCE §1.2: "No third-party SDKs... no analytics, no advertising" |
| Mature themes | Profanity or crude humour? | None | — |
| Mature themes | Horror/fear themes? | None | — |
| Mature themes | Alcohol, tobacco or drug references? | None | — |
| Sexuality/nudity | All three sub-questions | None | — |
| Violence | Cartoon/fantasy, realistic, prolonged/graphic, weapons | None | Collisions in-game are impact-and-bounce, not combat |
| Chance-based | Gambling, simulated gambling, loot boxes | None | PRODUCT-ROADMAP §6 explicitly rules out loot boxes on Children's Code grounds |
| Chance-based | Contests | None | No contests run through the app |
| Medical/wellness | Both sub-questions | None | — |

**Do not opt into the Kids Category.** COMPLIANCE §2.2 is explicit on this: it adds restrictions (no third-party analytics, parental gates on links) for no benefit here, since the standard 4+ rating already reaches the same audience.

**This entire section is a live constraint, not a one-off form-fill.** Two things would invalidate it and require redoing both this questionnaire and COMPLIANCE §1.4's risk assessment:
- **Adding any free-text input** — a name field, a comment box, a "request a city" text field. PRODUCT-ROADMAP §7 discusses exactly this trap and resolves it as a tap-only poll for that reason.
- **Adding an in-app purchase.** PROPOSALS.md §4 has a freemium design ready for when this happens; it does not change the age rating by itself, but the "Chance-Based Activities → Contests" and "Advertising" answers above would need re-checking against whatever the IAP flow actually does, and the Children's Code constraints in PROPOSALS §4 ("show the offer once", "no urgency language") become live at that point too.

---

## 5. App Privacy ("nutrition label")

**Answer: "Data Not Collected."**

**Reasoning, stated rather than just asserted:** the label's three-way distinction (Not Collected / Not Linked to You / Linked to You) turns on whether data *leaves the device*. Today, nothing does — COMPLIANCE §1.2 confirms all data (random UUID, generated display name, scores, progress, souvenirs) lives in device `localStorage` only, and §1.2 also confirms no third-party SDKs are present to collect anything independently. "Not Collected" is the only category that means *nothing is transmitted*, so it is the correct answer for the app as it stands, not merely the safest one.

**This is not a permanent answer.** COMPLIANCE §2.1 already anticipates the change: the moment online leaderboards ship (PRODUCT-ROADMAP Tranche 1, not yet built), the correct label becomes **"Data Not Linked to You"**, declaring:
- **Identifiers** (the UUID, now sent to Supabase) — purpose: **App Functionality**
- **Usage Data** (score, run outcome, city vote) — purpose: **App Functionality and Analytics** — COMPLIANCE §2.1 is explicit that the analytics purpose must be declared even though no analytics SDK is involved, because the run-outcome columns function as analytics regardless of vendor
- **Tracking: No** in both cases — data is never combined with third-party data for advertising, so the App Tracking Transparency prompt is not required either now or after leaderboards ship

**Flag for revisiting, not yet relevant:** if Supabase **anonymous auth** lands (COMPLIANCE §1.4 records this as a known, currently-unmitigated gap — "Anon caller posts scores under another player's id"), check whether the auth provider's own identifier changes this analysis. A provider-issued auth ID that persists across sessions is a stronger candidate for "Linked to You" than a self-generated UUID with no login step, depending on exactly how Supabase's anonymous auth is implemented. Do not assume "Not Linked" still holds without checking at that point.

---

## 6. Export compliance

**Answer path in App Store Connect, when submitting a build:**

> "Does your app use encryption?" → **Yes** (HTTPS/TLS counts as using encryption)
> "Does your app qualify for any of the exemptions provided in Category 5, Part 2 of the U.S. Export Administration Regulations?" → **Yes** — select the standard exemption for apps that use only encryption exempt under the EAR (HTTPS, and no proprietary/non-standard cryptography)

**Basis:** COMPLIANCE §2.3 and §4 both confirm the app uses only standard HTTPS (currently to nothing — the app is fully offline; HTTPS will apply once Supabase calls exist) and no custom cryptography. This is the single most common encryption profile in the App Store and is unambiguously exempt.

**To stop being asked on every build**, add this key to `ios/App/App/Info.plist` (this was checked directly — **the key is not currently present** in the file):

```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

This is an Info.plist edit and was left undone deliberately — it falls outside this document's file scope (docs + generated assets only) and outside Windows entirely in practice, since the file is normally edited from Xcode on the Mac. Add it during the next Mac session, before the first archive.

---

## 7. Screenshots

**Apple's requirement changed since `LAUNCH-CHECKLIST.md` (dated 02 August 2026) was written, and it no longer matches this document's original brief either — both said "6.7-inch and 6.5-inch are mandatory". Checked directly against `developer.apple.com/help/app-store-connect/reference/screenshot-specifications/` on 23 August 2026:**

| Display | Status | Sizes (portrait) |
|---|---|---|
| **6.9"** (iPhone 17 Pro Max, 16 Pro Max, 15 Pro Max, 15 Plus, etc.) | **Required**, unless 6.5" is provided instead | 1290×2796 px (the current standard; 1260×2736 and 1320×2868 are also accepted depending on exact device) |
| 6.5" (iPhone 14 Plus, 11, XS Max, etc.) | Required **only if 6.9" is not supplied** — otherwise Apple auto-scales it down from the 6.9" set | 1284×2778 px |
| Everything smaller (6.3", 6.1", 5.5", 4.7", 4", 3.5") | Auto-scaled down automatically | — |
| **13" iPad** (Pro, Air) | **Required — because this app targets it.** Checked `TARGETED_DEVICE_FAMILY` in `ios/App/App.xcodeproj/project.pbxproj`: it is set to `"1,2"`, meaning the Xcode project is built as a **universal iPhone+iPad app**, not iPhone-only | 2064×2752 px |

**Practical read: supply one 6.9" iPhone set and one 13" iPad set; do not bother separately producing 6.7" or 6.5" — Apple derives them.** No alpha channel/transparency is permitted in any screenshot (same rule as the marketing icon). 1–10 images per size.

**The iPad requirement is worth a decision, not just an action.** LAUNCH-CHECKLIST #18 marks iPad layout as untested ("Responsive CSS exists but is untested at tablet aspect"). Two honest options:
1. **Test and ship iPad now** — since the project is already configured as universal, this is the path of least resistance, but it means the untested layout needs a real look on an iPad simulator before screenshots are taken of it.
2. **Restrict to iPhone only for this submission** — set `TARGETED_DEVICE_FAMILY = "1"` in Xcode, drop the iPad screenshot requirement entirely, and add iPad support in a later update once it's actually been tested. This is a Mac-side Xcode change, not something this document can make from Windows.

This document does not choose between them — it is a genuine trade-off between shipping sooner and shipping something untested. Decide before the Mac session in §7, since it changes what `test/store-shots.mjs` needs to produce.

**What each screenshot should show** (five to six is normal; more than that has rapidly diminishing returns):
1. Mid-run gameplay in a strong lighting moment — establishes the visual identity fastest
2. The monument-puzzle mode mid-solve — the single strongest differentiator per COMPLIANCE §3.0, worth leading with, not burying
3. A completed monument with its fact interstitial — shows the educational hook
4. A second city, for variety (e.g. Rome or London, contrasting with whichever led in #1)
5. A souvenir-collection or progress moment — shows there's a game loop beyond one run
6. *(iPad set only, if Option 1 above is taken)* the same beats, re-shot at tablet aspect — do not just stretch the iPhone captures

**Tool: `test/store-shots.mjs`** is being built by another agent in this repository at the time of writing and is the intended way to generate these. This document does not create or edit that file — once it exists, run it, review the output against the five beats above, and upload.

---

## 8. Review notes / demo account

**No account exists in the app, so there is nothing to give a reviewer.** State plainly in the "App Review Information" notes field:

```
No login or account is required. The app is fully playable offline with no setup. Tap Play from the main menu to begin.
```

If Game Center or online leaderboards ship before submission, revisit this — a reviewer testing a leaderboard from a fresh install needs to know there's no seed data to expect.

---

## 9. Pre-submission checklist

- [ ] Trademark search on "CityRunner" completed and clear
- [ ] Apple Developer Program enrolment approved (§1)
- [ ] Bundle ID `uk.co.zinkin.cityrunner` registered in Certificates, Identifiers & Profiles
- [ ] App Store Connect record created (§2)
- [ ] App name, subtitle, promotional text, description, keywords, URLs and copyright pasted in (§3)
- [ ] Decision made on iPad support for this release (§7) and `TARGETED_DEVICE_FAMILY` set accordingly
- [ ] Screenshots generated via `test/store-shots.mjs` and uploaded for every required size (§7)
- [ ] 1024×1024 marketing icon uploaded to App Store Connect (the same file already verified alpha-free in §0 — `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`)
- [ ] Age rating questionnaire completed (§4) — expect 4+
- [ ] App Privacy nutrition label completed — "Data Not Collected" (§5)
- [ ] Export compliance declared (§6); `ITSAppUsesNonExemptEncryption` added to Info.plist on the Mac
- [ ] Privacy policy URL entered: `https://danzinkin-rgb.github.io/CityRunner2/privacy.html`
- [ ] Review notes entered (§8)
- [ ] Guideline 4.2 substance in place — at minimum haptics and offline play confirmed working on a real device (see `docs/MAC-SETUP.md`'s device-testing checklist); Game Center is strongly recommended but not mandatory (see below)
- [ ] Build archived and uploaded from Xcode on the Mac
- [ ] Submitted for review

---

## Needs a Mac

Everything in this section is impossible from the Windows PC — not just inconvenient. Cross-referenced against `docs/MAC-SETUP.md`, which already covers the first four in more detail:

- **Xcode itself** — signing, capabilities, and the whole build toolchain only run on macOS
- **Code signing** — MAC-SETUP.md §5: choosing a Team, resolving bundle-identifier conflicts
- **Archive and upload to App Store Connect** — done from Xcode's Product → Archive, then the Organizer window; there is no command-line-only path from Windows
- **Adding `ITSAppUsesNonExemptEncryption` to Info.plist** (§6 above) — a small edit, but it's an Xcode-managed file normally touched inside Xcode
- **Setting/confirming `TARGETED_DEVICE_FAMILY`** (§7 above) — Xcode project setting, iPhone-only vs universal decision
- **Real-device testing** — MAC-SETUP.md's whole "What to look for while testing" section: haptics, safe-area/notch behaviour, audio unlock on first tap, backgrounding/interruption, rotation. The simulator cannot test haptics at all
- **Game Center configuration** — enabling the capability, creating leaderboard and achievement IDs in App Store Connect, wiring `GKLocalPlayer` authentication — none of this has a Windows-side equivalent
- **TestFlight builds** — uploaded the same way as a release build, via Xcode/Organizer
- **Any native StoreKit work** — the freemium IAP design in `PROPOSALS.md` §4, if and when it's built, needs Xcode for the IAP capability and product configuration, plus sandbox-account testing that only works on a real device or simulator signed in with a sandbox Apple ID

Everything else in this document — the app record, metadata, questionnaires, privacy label, export-compliance answer — is filled in through the App Store Connect *website*, which works from any browser on Windows.

---

## Game Center — not a blocker, a risk mitigation

**Game Center is not required to submit and is not required to pass review by name.** It is listed in `LAUNCH-CHECKLIST.md` #16 and `COMPLIANCE.md` §2.4 because it is the **strongest available answer to App Review Guideline 4.2 (Minimum Functionality)** — the rule Apple uses to reject Capacitor/web-wrapper apps that don't do anything a plain website couldn't do. `PRODUCT-ROADMAP.md` §3 puts it plainly: "a wrapped website has no Game Center."

**What actually happens without it:** the app is judged on the sum of its native integration — haptics, offline play, native pause-on-interruption (already done), iPad layout if shipped. Game Center is the single biggest, cheapest item in that list, not a separate gate. Submitting without it is a real option, particularly for a first submission meant to test the process — it raises 4.2 rejection risk from low to moderate, per `PRODUCT-ROADMAP.md` §10's own risk table, rather than guaranteeing a rejection.

**Recommendation:** if the goal of this first submission is to learn the process and get *something* live, haptics plus confirmed offline play is a defensible minimum. If a rejection-and-resubmission cycle is something to avoid, add Game Center first — `PROPOSALS.md` §3 has the full design (leaderboards per city, ~15 achievements) ready to build, and it only needs the Capacitor wrapper, which already exists.
