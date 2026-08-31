# CityRunner — App Store Submission Guide

**Working checklist, in submission order, with exact text to paste into every App Store Connect field. Written 23 August 2026, updated 30 August 2026.**
Screenshot specifications, the Developer Program fee and the age-rating questionnaire were checked against `developer.apple.com` on 23 August 2026 and are cited where used — Apple changes all three periodically, so re-verify if this document sits unused for more than a couple of months.

**As of 30 August 2026: trademark search is clear, Developer Program enrolment is done, iPad support is confirmed shipping, and screenshots are generated.** The three blockers this document originally opened with are gone — what's left is filling in App Store Connect itself, §2 onward.

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

**Effect on the checklist:** LAUNCH-CHECKLIST item #14 ("iOS app icon set") reflects this and is now **DONE**. Screenshots (#15) are a separate item, covered in §7 below — now also generated. Uploading this same 1024×1024 file to App Store Connect's Media Manager is still a separate manual step (not read from the Xcode project automatically).

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

## What's left

Everything through §6 below (record creation, metadata, age rating, privacy label, export compliance, review notes) is fillable today, from any browser, now that the account exists. What still needs a Mac — signing, the Info.plist encryption key, the actual archive/upload — is listed at the bottom in **Needs a Mac** and can't be done from App Store Connect no matter what.

---

## 1. Apple Developer Program enrolment — done

| | |
|---|---|
| **Fee** | **$99/year USD**, billed in local currency — GBP typically comes out around **£79/year**, matching the figure already used in `PRODUCT-ROADMAP.md` §3. The exact GBP amount is fixed at checkout by Apple's FX rate on the day; do not be surprised if it is not precisely £79.00 |
| **Individual vs organisation** | **Individual.** He is enrolling as a person, not a company, and the `uk.co.zinkin` domain is a personal identifier, not a registered business — organisation enrolment additionally requires a D-U-N-S number, a legal entity, and a domain-matched work email, none of which apply here |
| **Identity needed** | A valid government photo ID (matching the legal name on the Apple ID exactly — no nicknames or aliases), a two-factor-authentication-enabled Apple ID, and a payment card for the fee. No business paperwork for individual enrolment |
| **Approval time** | Typically **within 24 hours** of payment for individuals; Apple emails confirmation. Occasionally Apple requests additional identity verification, which extends this — budget a few days of slack before any date you're planning around |

*Source: `developer.apple.com/help/account/membership/program-enrollment/` and `developer.apple.com/programs/enroll/`, checked 23 August 2026.*

**Done as of 30 August 2026** — you're logged into App Store Connect, which confirms enrolment is approved.

---

## 2. App Store Connect — create the app record

| Field | Value |
|---|---|
| **Bundle ID** | `uk.co.zinkin.cityrunner` — from `capacitor.config.json`. Register this exact string under Certificates, Identifiers & Profiles *before* creating the app record; App Store Connect will only offer bundle IDs already registered to the account |
| **SKU** | A unique internal string, never shown to users. Recommend `cityrunner-ios-01` — simple, and won't collide if a second SKU is ever needed |
| **Primary language** | English (U.K.) |
| **Name availability** | Trademark search (COMPLIANCE §2.3/§3.0) is clear as of 30 August 2026. App Store Connect will still reject the "Name" field live if it happens to be taken by another app — that's a separate, weaker check (unclaimed on the App Store ≠ trademark-clear elsewhere), but at this point it's the only remaining check, not a gate on top of an open trademark question |

---

## 3. Store metadata — text to paste

### App name (30 characters)

**Decided: `CityRunner: Landmark Run`** (24 chars), 30 August 2026. An existing App Store title, "NeonCity: Cityrunner", was found during name entry — a different exact string, so it doesn't block registration or conflict with the clear trademark search, but it's reason enough to differentiate rather than use the plain `CityRunner` or `CityRunner: City Dash` options (both lean on "City", which the existing app already uses). "Landmark Run" leans on the puzzle-mode differentiator instead — a stronger, less contested search term with no overlap with the existing title.

| Option | Chars | Note |
|---|---|---|
| `CityRunner` | 10 | Plain brand name. Not used — see decision above |
| `CityRunner: City Dash` | 21 | Not used — "City" overlaps with the existing "NeonCity" title |
| **`CityRunner: Landmark Run`** | 24 | **Decided.** See rationale above |

### Subtitle (30 characters)

**Decided: `Run the World's Landmarks`** (25 chars) — pairs with "Landmark Run" without repeating "Landmark" or "Run".

| Option | Chars |
|---|---|
| **`Run the World's Landmarks`** | 25 — **decided** |
| `Endless Runner, No Ads` | 22 |
| `Puzzle Streets, Real Cities` | 27 |

### Promotional text (170 characters)

**Live in App Store Connect as of 30 August 2026 — this is what's actually in the field, not a draft:**

```
Sprint the streets of famous cities across the world. Rebuild real monuments against the clock and learn facts about the cities and buildings.
```
142 characters, 28 remaining. Promotional text can be edited without a full app-review resubmission.

### Description (4000 characters)

**The user rewrote this by hand in the live ASC field on 30 August 2026** — the earlier draft below read as too dry/compliance-focused ("too compliancy/boring"). This is a transcript of what's actually live, kept here so the doc doesn't go stale — **do not regenerate or overwrite this field without being asked**:

```
Run real streets. Build real monuments. Learn facts about the cities and buildings.

CityRunner is a fast, three-lane endless runner set on street-accurate recreations of New York, London, Paris and Rome. Swipe to change lane, jump, and roll past traffic, market stalls and street furniture as the pace builds. Every building, vehicle and sign is generated by our own code — nothing borrowed, nothing stock.

Reach a landmark and the run stops being a runner: a 60-second puzzle mode asks you to tap scattered blocks into place and rebuild the monument — the Colosseum, the Eiffel Tower, Big Ben, the Brooklyn Bridge — before the clock runs out. Finish it and a short, plain-language fact about the real landmark appears.

Collect city souvenirs as you run — a croissant in Paris, a red phone box in London, a Caesar bust in Rome — and unlock new streets and cities as you go.

Come back for a fresh daily challenge — and see how your best run stacks up on the leaderboard.

What makes CityRunner different from other runner games:
- An original monument-building puzzle mode
- Named real streets, each with bespoke architecture
- Learn facts about the landmark you just rebuilt

Built for families:
- No account, no sign-up, no email, no password — just open it and play
- No advertising, no third-party trackers, no in-app purchases
- Nicknames are generated for you, so no data entry

CityRunner is an independent game and is not affiliated with, sponsored by, or endorsed by any city, landmark, business or brand depicted.
All shops, signs and products shown are fictional.
```
1,577 characters.

**Honesty check, updated 30 August 2026**: the leaderboard and daily-challenge line above is accurate — both are DONE per `LAUNCH-CHECKLIST.md` #4 and #5, verified by `test/determinism.mjs`. Still deliberately **not** mentioned: Game Center and achievements — both genuinely TODO (checklist #16, #6). **If either ships before submission, add a line for it and re-check the description still matches reality** — a store listing claiming a feature that doesn't exist is a rejection risk (Guideline 2.3, misleading metadata) independent of anything else in this document.

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

## 7. Screenshots — generated, ready to upload

**Done.** `npm run shots:store` has been run; 24 images sit in `test/shots/store/` (`test/shots/store/index.html` is a contact sheet for reviewing them before upload). Apple's size classes, checked against `developer.apple.com/help/app-store-connect/reference/screenshot-specifications/` on 23 August 2026:

| Display | Status | Required px | What's on disk |
|---|---|---|---|
| **6.5"** — the slot ASC's own UI shows for this app, confirmed by opening the version page directly on 30 August 2026 | **Required, and the one in use** | 1242×2688 or 1284×2778 (both accepted per the live upload dialog) | `6.5in-*` files, generated at exactly 1242×2688 — matches directly |
| 6.9" (iPhone 17/16/15 Pro Max class, per Apple's written spec) | Not shown as a separate slot in this account's current UI | 1290×2796 | `6.7in-*` files exist at this size but aren't used — no matching slot appeared when the app record was opened |
| Everything smaller | Auto-scaled by Apple | — | n/a |
| **13" iPad** | **Required** — `TARGETED_DEVICE_FAMILY` is `"1,2"` (universal), confirmed still set in `ios/App/App.xcodeproj/project.pbxproj`; iPad layout is now DONE per `LAUNCH-CHECKLIST.md` #18 | 2064×2752 | `13in-ipad-*` files, confirmed generated at exactly 2064×2752 |

**Upload the 6.5in-\* set into the iPhone slot and the 13in-ipad-\* set into the 13" iPad slot.** No alpha channel in any of them (same rule as the marketing icon — generated the same way `assets/icon-1024.png` was flattened in §0). The `6.7in-*` set is not used for this account.

**What's in each set** — menu, mid-run (two cities), puzzle mode mid-solve (two landmarks), completed-monument fact interstitial, and the shop — eight beats per size, comfortably inside Apple's 1–10 range and led with the puzzle mode, the strongest differentiator per COMPLIANCE §3.0.

---

## 8. Review notes / demo account

**No account exists in the app, so there is nothing to give a reviewer.** State plainly in the "App Review Information" notes field:

```
No login or account is required. The app is fully playable offline with no setup. Tap Play from the main menu to begin.
```

If Game Center or online leaderboards ship before submission, revisit this — a reviewer testing a leaderboard from a fresh install needs to know there's no seed data to expect.

---

## 9. Pre-submission checklist

- [x] Trademark search on "CityRunner" completed and clear (30 August 2026)
- [x] Apple Developer Program enrolment approved (§1)
- [x] iPad support confirmed shipping — `TARGETED_DEVICE_FAMILY` is `"1,2"`, layout DONE per LAUNCH-CHECKLIST #18
- [x] Screenshots generated via `npm run shots:store` (§7) — not yet uploaded
- [ ] Bundle ID `uk.co.zinkin.cityrunner` registered in Certificates, Identifiers & Profiles
- [ ] App Store Connect record created (§2)
- [ ] App name, subtitle, promotional text, description, keywords, URLs and copyright pasted in (§3)
- [ ] Screenshots uploaded for both required sizes — 6.5in-\* set into the iPhone slot, 13in-ipad-\* set into the 13" iPad slot (§7)
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
- **Adding `ITSAppUsesNonExemptEncryption` to Info.plist** (§6 above) — a small edit, but it's an Xcode-managed file normally touched inside Xcode; confirmed still absent from `ios/App/App/Info.plist` as of 30 August 2026
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
