# What's actually on you

**Every action left before submission that Claude cannot do, in the order to do them.**
Written 25 August 2026. Each item says where it happens and links to the doc with full detail/reasoning — this page is just the checklist, not the explanation.

Legend: 🖥️ **any browser, any computer** · 🍎 **Mac required**

---

## ~~1. 🖥️ Trademark search on "CityRunner"~~ — done, 30 August 2026

Clear under both US (USPTO) and UK (IPO) searches. `docs/COMPLIANCE.md` §2.3 and §3.0 updated to reflect this.

## 2. 🖥️ Enrol in the Apple Developer Program — £79/year

- Go to [developer.apple.com/programs/enroll](https://developer.apple.com/programs/enroll/)
- Choose **Individual** (not organisation — see `docs/APPSTORE-SUBMISSION.md` §1 for why)
- You need: a government photo ID matching your Apple ID's legal name exactly, 2FA on that Apple ID, and a payment card
- Usually approved within 24 hours; occasionally Apple asks for extra ID verification, so leave a few days' slack

**This is the hard blocker.** Nothing in §3 onward is possible without it.

## 3. 🍎 First Mac session — build and test the app

Follow `docs/MAC-SETUP.md` top to bottom. In order, that gets you:
- Xcode and Node installed
- The app built and running in the iPhone Simulator
- Signing set up with your Apple ID
- A device-testing pass covering things Windows genuinely cannot check: haptics, safe-area/notch, audio unlock, backgrounding, rotation

Also do these two small Xcode-only edits while you're there (both documented in `docs/APPSTORE-SUBMISSION.md` §6–7, neither has a Windows equivalent):
- Add `<key>ITSAppUsesNonExemptEncryption</key><false/>` to `ios/App/App/Info.plist`
- Confirm `TARGETED_DEVICE_FAMILY` is `"1,2"` (universal iPhone+iPad) — this is already set, and iPad layout is now fixed and tested, so no change needed here, just confirm it's still `"1,2"`

**Cost: £0.** You don't need the £79 account for this session — only for the App Store Connect steps below.

## 4. 🖥️ App Store Connect — create the app record

Once enrolled (§2), at [appstoreconnect.apple.com](https://appstoreconnect.apple.com):
- Register bundle ID `uk.co.zinkin.cityrunner` under Certificates, Identifiers & Profiles
- Create the app record — full field-by-field values in `docs/APPSTORE-SUBMISSION.md` §2–3 (name, subtitle, description, keywords, URLs — all pre-written, just paste)

## 5. 🖥️ Screenshots — generate, review, upload

- On Windows, run:
  ```bash
  npm run shots:store
  ```
- Open `test/shots/store/index.html` and review the set (6.9" iPhone + 13" iPad, both already Apple-compliant — alpha-flattened, correctly sized, and the iPad set now reflects the fixed tablet layout)
- Upload the reviewed images in App Store Connect's Media Manager, per size, at [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
- Also upload the 1024×1024 marketing icon: `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`

## 6. 🖥️ Three quick forms in App Store Connect

All three have pre-worked answers in `docs/APPSTORE-SUBMISSION.md` — this is just filling them in:
- **Age rating questionnaire** (§4) — expect 4+, answer every question "None"
- **App Privacy nutrition label** (§5) — answer "Data Not Collected"
- **Export compliance** (§6) — "Yes" uses encryption, "Yes" qualifies for the standard HTTPS exemption

## 7. 🖥️ EULA and review notes

- Terms of use: accept Apple's standard EULA (no need to write your own — no purchases exist yet)
- App Review notes field: paste the "no login, no account, tap Play" text in `docs/APPSTORE-SUBMISSION.md` §8

## 8. 🍎 Second Mac session — archive and submit

Back on the Mac:
```bash
cd ~/Desktop/CityRunner2
git pull
npm run ios:sync
npx cap open ios
```
Then in Xcode: **Product → Archive**, then upload through the Organizer window. This step has no Windows-side equivalent at all.

Once uploaded, submit for review from App Store Connect (🖥️, back on any browser).

---

## Not on you (yet)

- **Game Center leaderboards/achievements** — deliberately parked until §2 is done, since it needs real App Store Connect leaderboard/achievement IDs to build against. Once the account exists, this becomes a Claude task again.
- Everything else on `docs/LAUNCH-CHECKLIST.md` not listed above is either already done or genuinely optional polish, not a submission blocker.
