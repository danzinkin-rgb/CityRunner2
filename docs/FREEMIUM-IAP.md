# Freemium / In-App Purchase — what is built, and what you must do

**Status: the game logic is finished and tested. The native store connection is not, and cannot be done from Windows.**

This document is the handover for the parts that need a Mac, an Apple Developer account, and web forms only you can fill in. Proposed answers for every form field are given — they are drafts to approve or edit, not instructions to follow blindly.

---

## 1. The model that was implemented

Your decision, restated as built:

| | Free forever | Paid |
|---|---|---|
| **Cities** | New York, Paris, London | Rome, and every city added later |
| **Monuments** | 3 in each free city — 9 total | Any 4th+ monument added to a free city *(rule written, nothing to act on yet — see below)* |
| **Everything else** | Daily challenge, souvenirs, leaderboard, characters, all settings | — |

Two products, **never on sale at the same time**:

| | Founder | Standing unlock |
|---|---|---|
| Product ID | `uk.co.zinkin.cityrunner.founder` | `uk.co.zinkin.cityrunner.unlock.allcities` |
| Price | **£1.99 / $1.99** | Your choice later — £3.99 or £4.99 suggested |
| On sale | Launch → ~3 months | From then on |
| Grants | Everything, forever, including cities that do not exist yet | The same content |

**The two differ in price and timing, not in content.** A founder who paid £1.99 is never asked for money again, including for cities built years from now. That promise is the product — it is why £1.99 is worth paying early rather than waiting. The code enforces it (`GRANTS_EVERYTHING` in `src/core/entitlements.js` is a product set, deliberately not a list of city ids, because a list could not include a city nobody has designed yet).

### The one decision left for you

**Rome was chosen as the paid city.** The reasoning: it is last in the progression chain, so gating it interrupts nobody's first session; and its monuments are the largest puzzles in the game at 25 pieces, so it is the most substantial thing £1.99 can buy.

If you would rather sell a different one, change **one line** — `FREE_CITIES` at the top of `src/core/entitlements.js` — and re-run `npm test`. Nothing else needs touching. The gate test derives everything from that constant.

### Why there is no launch date anywhere in the code

The obvious way to build "on sale for three months" is a cutoff date in the app. **It was deliberately not built that way.** The device clock is user-settable and skews; a date constant would eventually start showing an unbuyable product to everyone, and fixing it would need an app update and a review cycle.

Instead: the app offers whichever product the App Store says is actually purchasable. **You close the window by removing Founder from sale in App Store Connect** — a store setting, effective within hours, no app update, no review. See §6.

---

## 2. What is already done (no action needed)

- `src/core/entitlements.js` — the single source of truth for what is locked
- `src/core/iap.js` — the store transport, with the native call sites stubbed and commented
- Paywall screen, reachable only by deliberate tap: a padlocked city card, or a quiet permanent row in Settings
- **Restore Purchases** in both Settings and the paywall — Apple rejects apps selling non-consumables without it
- Web build (GitHub Pages) stays completely free and completely unlocked; the purchase rows are hidden there entirely
- `test/entitlements.mjs` — a gate wired into `npm test`, 30 checks, covering the web build, the native build, the earned-but-unpaid state, and the paywall's behaviour when the store cannot be reached

### The per-monument rule is written but currently inert

Every city ships with exactly three monuments today, so `FREE_LEVELS_PER_CITY = 3` and `isPaidLevel()` never actually deny anything. The rule is enforced at the choke point (`startRun()` and `startPuzzle()` both call `isLevelEntitled`), so **adding a fourth monument to New York would make it paid automatically** — that is the point of writing it down now rather than rediscovering it later.

What is *not* covered: there is no level-select UI, because there is no city with four levels to select from. Whoever adds monument #4 must also give the player a way to see it is paid before tapping it, and extend `test/entitlements.mjs` to cover it. The gate test cannot catch a regression here today because there is no fourth monument for it to check.

### The daily challenge is deliberately exempt

The daily can land on a paid city, and an unpaid player will be allowed to run it. This is a decision, not an oversight, and it is recorded in a comment at `startRun()`: the daily is one seeded run whose score goes on a leaderboard shared by everyone that day, so clamping it to free cities for some players would put two different challenges on one board. One run a day in a locked city is a taster; its monuments and its own progression stay paid.

**The app is safe to build and run today.** With no store connected, no city card offers a purchase path that dead-ends: the paywall explains the store is unreachable and leaves Restore working.

---

## 3. Children's Code — constraints already built in, and what not to undo

The 4+ age rating and the UK Children's Code shaped this UI. These are not stylistic choices:

- **The offer never appears by itself.** No interstitials, no timed prompts, no "are you sure you don't want to buy" on dismissal
- **No urgency or scarcity language.** No countdown to the end of the founder window, no "ends soon", no "only N left", no animated nagging. This is why the three-month window is invisible to the player rather than advertised
- **"NOT NOW" is a full-size button of the same visual weight as the buy button** — not a grey 8px ×
- **The price is never hardcoded.** StoreKit supplies it, localised by Apple to the player's own storefront. A hardcoded "£1.99" would be wrong in every other country
- Apple handles purchase authentication and **Ask to Buy** for child accounts — we neither see nor need payment details

If you later want to promote the founder window, promote it **outside the app** — App Store description, a website, social. Not with a timer inside a game rated 4+.

---

## 4. Mac tasks — the native store connection

Everything here needs macOS with Xcode and CocoaPods.

### 4.1 Install the plugin

```bash
npm install cordova-plugin-purchase@13
```

**Which plugin, and one to avoid.** Checked against the npm registry on 2026-08-23:

- **`cordova-plugin-purchase@13.18.0`** (updated 2026-07-16) — the choice. Actively maintained, StoreKit 2 on iOS, works through Capacitor's Cordova compatibility layer. It declares no peer dependency on Capacitor, so nothing forces a version conflict with this repo's 7.6.8 — but that also means **a native build is the only real proof it works**, which is why it was not added to `package.json` from a machine that cannot build it.
- `@capacitor-community/in-app-purchases` — **does not exist.** It is the name everyone reaches for from memory; the registry returns 404. Do not spend an afternoon on it.
- `@revenuecat/purchases-capacitor` — **rejected on two independent grounds.** It requires `@capacitor/core >= 8` and this repo is on 7.6.8; and it routes purchase and device data through RevenueCat's own servers, which would add a third-party processor, trigger Apple's SDK disclosure, and **falsify the "Data Not Collected" privacy label** already drafted in `APPSTORE-SUBMISSION.md` for a 4+ title likely used by children. See `COMPLIANCE.md` §1.2.

### 4.2 Sync and open

```bash
npx cap sync ios
```

```bash
npx cap open ios
```

### 4.3 Enable the capability

In Xcode: select the **App** target → **Signing & Capabilities** → **+ Capability** → **In-App Purchase**.

### 4.4 Fill in the stub

Open `src/core/iap.js`. The function `loadStore()` contains a commented block marked `BEGIN MAC TASK` / `END MAC TASK` with the intended implementation. Uncomment it, delete the `return null` beneath it, and verify against the plugin's current docs — the API may have moved since this was written.

**Then re-run `npm test`.** The entitlement gate must still pass. If `getOffer()` now returns something in a desktop browser, the plugin is leaking into the web bundle and the import is not lazy enough.

---

## 5. App Store Connect — proposed form entries

**App Store Connect → your app → Monetization → In-App Purchases → +**

### 5.1 Product 1 — Founder

| Field | Proposed entry |
|---|---|
| **Type** | Non-Consumable |
| **Reference Name** *(internal only, never shown to users)* | `Founder Unlock` |
| **Product ID** | `uk.co.zinkin.cityrunner.founder` |
| **Price** | £1.99 (UK) — see pricing note below |
| **Display Name** *(shown to users, 30 char max)* | `Founder — Every City` |
| **Description** *(45–170 chars)* | `Unlock Rome and every city added in future, plus every new monument. One payment, kept forever. Thank you for backing CityRunner early.` |
| **Availability** | All territories |
| **Tax Category** | App Store Software (default) |

### 5.2 Product 2 — Standing unlock

**Create this now but leave it in "Ready to Submit" without making it available**, or create it later. Do not have both purchasable at once.

| Field | Proposed entry |
|---|---|
| **Type** | Non-Consumable |
| **Reference Name** | `All Cities Unlock` |
| **Product ID** | `uk.co.zinkin.cityrunner.unlock.allcities` |
| **Price** | £3.99 or £4.99 — your call |
| **Display Name** | `Every City` |
| **Description** | `Unlock Rome and every city added in future, plus every new monument. One payment, kept forever.` |
| **Tax Category** | App Store Software (default) |

### 5.3 Pricing

Apple replaced the old numbered tiers with 900 price points and per-storefront control. Set **United Kingdom as the base region at £1.99**, then let Apple auto-generate the other 174 storefronts — it will pick $1.99 for the US, which is exactly what you asked for. Review the auto-generated table before saving; you can override any individual country.

### 5.4 Review information (required per product)

| Field | Proposed entry |
|---|---|
| **Screenshot** | A 1290×2796 capture of the paywall screen. Generate with `npm run shots:store` once the store returns a real price, or capture from the simulator. Apple requires this and rejects products without it |
| **Review Notes** | `This is a one-time non-consumable purchase. It unlocks the Rome city and all future cities. Three cities (New York, Paris, London) with three monuments each remain free permanently and require no purchase. Restore Purchases is available in Settings and on the purchase screen. No account or login is required.` |

### 5.5 Two things that block payouts entirely

- **Paid Applications Agreement** — App Store Connect → Business. Banking and tax forms must be complete and *accepted*. Until they are, **your in-app purchases will not load even in sandbox**, and this is the single most common cause of "my IAP returns nothing" — before debugging any code, check this
- **Small Business Program** — apply at developer.apple.com. Takes commission from 30% to **15%** on the first $1M/year. Worth roughly £0.30 per £1.99 sale. Application is a short form; approval takes days

---

## 6. Closing the founder window (in ~3 months)

Do this from App Store Connect, with no app update:

1. **Founder** → set availability off / remove from sale
2. **All Cities Unlock** → make available at your chosen price

The app switches itself. `OFFER_ORDER` in `src/core/iap.js` asks for Founder first and falls through to the standing unlock when Founder is no longer purchasable.

**Existing founders are unaffected** — their purchase is already recorded against their Apple Account, Restore still returns it, and `isFounder()` shows them "Founder — thank you" in Settings instead of any price. Removing a non-consumable from sale never revokes it from people who bought it.

**Set a calendar reminder now.** Nothing in the code will remind you, by design.

---

## 7. Sandbox testing (Mac, before submitting)

1. App Store Connect → **Users and Access → Sandbox → Test Accounts → +**. Use an email you control that is **not** an existing Apple ID. A `+sandbox` alias on your own address works
2. On the test device: **Settings → Developer → Sandbox Apple Account**, sign in there. Do *not* sign out of your real account in the App Store app
3. Build to a real device from Xcode (sandbox IAP does not work in the simulator for StoreKit 1 flows; StoreKit 2 with a local `.storekit` configuration file does, and is faster for UI iteration)
4. **Test all of these:**
   - Paywall shows a real localised price, not blank
   - Buy → Rome unlocks → city card loses its padlock
   - Force-quit, relaunch → still unlocked
   - Delete and reinstall the app → locked again → **Restore Purchases returns it**
   - Cancel the purchase sheet → no error message, no change
   - Aeroplane mode → paywall says the store is unreachable, does not hang or crash
   - A second sandbox account that never bought → still locked

Step 4's reinstall-then-restore is the one Apple's reviewer will try. It is also the one most likely to be broken.

---

## 8. Documents this supersedes

- `PROPOSALS.md` §4 (£4.99 city unlock, NY free only) — superseded on price, on the number of free cities, and on the founder window
- `PROPOSALS.md` §5 (£0.99 Supporter + Kidoz ads) — superseded. Ads remain paused; the Supporter tip jar is replaced by the Founder product, which grants real content rather than removing ads that do not exist
- `PRODUCT-ROADMAP.md` line 109 ("monetisation, if it ever matters") — no longer hypothetical

Both `PROPOSALS.md` sections have been marked superseded in place so nobody implements them by accident.
