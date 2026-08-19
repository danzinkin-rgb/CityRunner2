# CityRunner — Four Proposals

**For decision, not yet built. 02 August 2026.**
Daily challenge · souvenir economy · Game Center · freemium model.

---

## Summary of recommendations

| # | Item | Recommendation | Effort | Gated on |
|---|---|---|---|---|
| 1 | Daily challenge | Build first — strongest retention per unit of work, and the seeded RNG already exists | ~1 session | nothing |
| 2 | Souvenir economy | Characters + a "continue" token. Earned currency only, no paid currency, no loot boxes | 1–2 sessions | nothing |
| 3 | Game Center | Leaderboards + ~15 achievements. Best answer to Guideline 4.2, and hands anti-cheat to Apple | ~1 session | Capacitor wrapper existing |
| 4 | Freemium | **Single one-time unlock at £4.99**, New York free forever | 1–2 sessions | Capacitor wrapper existing |

**Suggested order: 1 → 2 → (Capacitor) → 3 → 4.** Items 1 and 2 need no native work and make the game materially better on the web build you already have live.

---

## 1. Daily challenge

**What it is.** One course per day, identical for every player worldwide, resetting at 00:00 UTC. A menu card shows today's city, your best score today, and a countdown to the next reset.

**Why first.** It is the single strongest retention mechanic in this genre, and the hard part is already done and tested: `src/core/rng.js` produces a UTC-stable daily seed, verified to be identical across a day and to change at midnight.

**Design decisions I recommend**

- *Which city?* Derived from the day's seed, so it rotates and nobody can pre-empt it.
- *How many attempts?* **Unlimited, best score of the day counts.** One-shot-per-day creates more tension but is punishing in a game where a run can end in five seconds. This needs one change: `supabase/schema.sql` currently has a unique index rejecting a second daily score — it should become an upsert that keeps the higher score.
- *Reward.* Souvenirs plus a **streak counter**. Streaks are the retention hook; note the deliberate constraint below.
- *Children's Code constraint.* No penalty for breaking a streak, no notification nagging, no countdown pressure. Streaks may reward, never punish.

**The actual work.** The one substantive piece: `src/run/track.js` still calls `Math.random()` for obstacle placement, so a seed does not yet reproduce a course. Gameplay randomness (lane, kind, spacing, collectible position) must draw from `rand()` in a fixed order; cosmetic randomness (which windows are lit) can stay as-is. This also unlocks server-side replay verification later.

**Risk.** Threading the seeded stream through `track.js` without disturbing the difficulty balance just fixed. Mitigated by re-running `test/difficulty.mjs` after.

---

## 2. Souvenir economy

**The problem.** Souvenirs accumulate and buy nothing. An economy that never spends is a dead loop, and players notice.

**Recommendation: two sinks.**

**(a) Characters — the collection goal.** The runner is procedurally generated, so variants cost almost nothing: palette swaps plus accessory geometry. Eight to ten characters at 500–2,500 souvenirs. Suggested set: the default runner, a courier with a satchel, a tourist with a camera, a skater, a chef, a street artist, a cabbie, a gladiator (Rome unlock), a mime (Paris unlock).

**(b) Continue token — the frustration valve.** Revive at the point of death for souvenirs, escalating within a run (150, then 300, then 600) so it cannot be spammed. Directly converts the currency into something a player wants at the exact moment they want it.

**Deliberately excluded, and why.** No paid currency, no loot boxes, no random rewards, no timers or energy. Beyond being unpleasant, these are precisely the "nudge techniques" the UK Children's Code targets, and our whole compliance position rests on not doing them. Souvenirs are earned by playing, full stop.

**Reconciling with progression.** Stars currently gate street order within a city. That stays. Souvenirs buy cosmetics and continues only — never progression, so nobody can pay or grind past a challenge.

---

## 3. Game Center

**Why.** Three benefits at once: it is the strongest single answer to Guideline 4.2 (a wrapped website has no Game Center), it hands leaderboard anti-cheat to Apple — which solves the problem §2 of the roadmap says we cannot solve ourselves — and it is free.

**Scope**
- *Leaderboards:* all-time best run, one per city, and today's daily challenge.
- *Achievements:* ~15. First monument built; all three in a city; all twelve; a run with no hits; a monument built in under 30 seconds; souvenir milestones; every city visited.

**Privacy note, which matters for our labels.** Game Center identity is Apple-managed and pseudonymous. **Recommendation: submit scores but never store the Game Center player ID ourselves.** That keeps `docs/COMPLIANCE.md` §2.1 accurate — we continue to collect nothing.

**Constraint.** Game Center exists only in the native wrapper. The web build on GitHub Pages keeps the existing local leaderboard, so the two builds diverge slightly. That is fine and worth stating plainly in the code.

---

## 4. Freemium — "first city free"

### Recommended model: a single one-time unlock

| | |
|---|---|
| **Free forever** | All of New York — 3 streets, 3 monuments — plus the daily challenge, leaderboards, settings and accessibility |
| **Paid** | Paris, London and Rome (9 streets, 9 monuments), and any city added later |
| **Product type** | Non-consumable in-app purchase, bought once, restored free on any device |
| **Price** | **£4.99** (alternatively £3.99 to widen the funnel) |
| **Family Sharing** | Enable it — siblings should not need to buy twice |

**Why a single unlock rather than per-city purchases.** Per-city sales look like more revenue but add four SKUs, four decision points and a nagging surface — the opposite of what a family-audience game wants. One honest purchase, once.

**Why the free tier must be genuinely complete.** New York alone is three streets, three monuments and the daily challenge — a real game, not a demo. That matters commercially (players who feel short-changed do not convert) and defensively: apps whose free tier is a thin teaser attract "misleading" complaints and rejection risk.

### Apple mechanics you must have

- **A Restore Purchases control is mandatory** for non-consumables. Apple rejects apps without one. It goes in Settings.
- **Commission is 15%**, not 30%, via the **App Store Small Business Program** — under $1M annual proceeds, and new developers qualify. On £4.99 that nets roughly £4.24 before Apple's VAT handling.
- **StoreKit 2 validates receipts on-device.** At this scale server-side validation is unnecessary; revisit only if piracy shows up in the numbers.

**Do not build external payment links.** The position moved twice recently: after the April 2025 *Epic v Apple* injunction US apps could link out commission-free, but in December 2025 the appeals court held Apple may charge a fee, and in **August 2026 Apple proposed 5% for Small Business Program apps** — still pending the court's ruling. The engineering and legal overhead is not remotely justified for a £4.99 game. Use standard IAP.

### The Children's Code wrinkle

Selling to an audience that includes children constrains *how* you sell, not whether you may:

- **Show the offer once**, at a natural moment — after New York's three monuments are complete — plus a permanent, quiet entry in Settings. No repeat interstitials.
- **No urgency or scarcity language.** No countdowns, no "today only", no animated nagging. These are the nudge techniques the Code names explicitly.
- **Apple handles purchase authentication** and Ask to Buy for child accounts, so parental consent is not ours to implement — but the pressure-free presentation is.

### Effect on the web build

**Recommendation: the GitHub Pages build stays entirely free.** It costs nothing to run, acts as the shop window, and adding payment plumbing to a web build is disproportionate. Only the iOS build gates cities.

**Counter-position, low probability but worth naming:** if the web version proves the main audience, a free web game undercuts the paid iOS one. If that happens, the response is to gate the web build behind the same account system rather than to hobble it now.

### Implementation sketch

1. `src/core/entitlements.js` — single source of truth for "is this city unlocked", reading a purchased flag; on web it always returns unlocked.
2. Paywall screen — what you get, price, Buy, **Restore**, and a plain "New York stays free forever" line.
3. City cards already carry a `.locked` style; extend it to distinguish *locked by progression* from *locked by purchase*.
4. Capacitor IAP plugin, App Store Connect product setup, sandbox testing.

---

## 5. Monetisation — revised: free with kid-safe contextual ads

**Supersedes proposal 4's premium model.** Decision taken: the game ships **free**, with ads added over time and a cheap ad-free unlock.

### Why the model changed

Essentially every successful endless runner is free — Subway Surfers, Temple Run, Crossy Road. There is no meaningful paid endless-runner market, so a premium price would be fighting the category. Comparable premium titles for reference: Alto's Odyssey $2.99, Monument Valley $4.99, Mini Metro $4.99 — but those are art/puzzle games with brand behind them.

### The model

| | |
|---|---|
| **Base game** | Free. All four cities, all 12 streets, all 12 monuments |
| **Ad-free unlock** | **£0.99** non-consumable IAP ("Supporter"), removes ads and adds a cosmetic character. Apple's global price tiers handle currency automatically; nets ~£0.84 after the 15% Small Business rate |
| **Ad type** | **Contextual only, never behavioural** |

### Ad provider — automated, no selling required

The requirement is a network that serves programmatically with no manual sales effort, and stays compliant with an audience that includes children. That category exists and is purpose-built:

1. **Kidoz — recommended.** Privacy-first SDK across 40,000+ kid-safe games; behavioural targeting disabled by default; no personal data collected from under-13s; PRIVO-certified. The most accessible option for a small developer.
2. **SuperAwesome AwesomeAds.** Certified COPPA-compliant through an FTC-approved Safe Harbor programme, contextual ML placement plus human review of every creative. Aimed historically at larger publishers.
3. **AdMob with child-directed treatment** — serves non-personalised ads, but is a general network configured for children rather than built for them. Third choice.

The distinction that makes 1 and 2 acceptable: they target the **content**, not the **person**. That is exactly the line the UK Children's Code draws.

### Placement — corrected

**Between-level interstitials, clearly labelled "Advertisement".** This is the safe placement.

**Not in-world billboards.** Static ads painted into the scenery initially looked like the elegant answer, but for a child audience it is the riskiest: the Children's Code and the ASA both treat "blurring" commercial content with editorial content as a harm, and an advert disguised as a building is by definition hard to label. **In-world billboards stay reserved for house promotion and the game's own fictional brands**, where no commercial relationship exists to disclose.

Also required, from the Code:
- No ads interrupting a run in progress — only between levels.
- No rewarded-video nagging, no ads as a pressure mechanic.
- Frequency capped; an ad every level is harassment.

### Consequences to accept

- **The privacy label changes.** "Kid-safe" is not "collects nothing" — any third-party SDK triggers Apple's SDK disclosure, and we would likely move off "Data Not Collected". §2.1 of COMPLIANCE.md must be revised against the chosen provider's declared collection, not assumed.
- **Revenue will be small.** Contextual CPMs are a fraction of behavioural, times a small install base. Pennies, not income.
- **There is a volume gate.** These networks generally want existing traffic.

### Sequencing

1. **Now:** build the ad slots; fill them with house ads promoting the game's own cities. Zero compliance cost, and it proves the placements.
2. **At launch:** ship free, no third-party SDK. Add the £0.99 Supporter unlock as a tip jar that also pre-empts future ads.
3. **Once there is an install base:** integrate Kidoz behind a feature flag, update the compliance doc, and only then enable ads for non-supporters.

**Integration cost:** native SDKs needing a Capacitor bridge — roughly one session if no community plugin exists, and gated on the wrapper existing.

### Content obligation

Going free-with-ads raises the content bar, because retention becomes the whole business. A city is now mostly **data** — one `themes.js` entry, three monuments, six fact sets — so roughly 1–2 sessions each. But candidate cities must clear the same IP filter as the imagery decision:

| Safe | Avoid | Why |
|---|---|---|
| Amsterdam, Prague, Istanbul, Edinburgh, Lisbon, Vienna, Berlin | Sydney | Opera House copyright to 2078 |
| | Rio | Christ the Redeemer protected until 2031 |
| | Venice, Athens, Cairo | Heritage-code regimes as in Italy |
| | Tokyo (partly) | Tokyo Tower protected to 2040 |

Cheaper content per unit of value: seasonal variants of existing cities, the character collection, weekly challenges, and an endless mode mixing all cities.
