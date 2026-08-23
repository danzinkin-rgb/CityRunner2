# CityRunner — Path to a Real Product

**Status: source of truth for scope and sequencing. Last updated 22 August 2026.**
Purpose: what stands between the current build and a shipped, supportable product with accounts and leaderboards.

---

## Executive summary

The game is playable and deployed as a web app. The gap to "real product" is **not** more graphics — it is four things: an identity and score service that cannot be trivially cheated, a store-ready native wrapper, a compliance posture for an audience that will include children, and the retention loop that gives anyone a reason to open it twice.

**Recommendation: ship in three tranches.**

1. **Tranche 1 — Web product (2–3 build sessions).** Anonymous device-scoped accounts, server-held leaderboards, basic telemetry. No app store, no login friction. Proves whether anyone plays before spending on distribution.
2. **Tranche 2 — iOS via Capacitor + Game Center (3–5 sessions + £79/yr).** Native wrapper, Apple's own leaderboards, TestFlight. Deliberately after Tranche 1, because Apple rejects thin website wrappers and Tranche 1's native-feeling features are what clear that bar.
3. **Tranche 3 — Live product (open-ended).** Daily challenges, seasons, monetisation, more cities.

**Cost to reach Tranche 2 is roughly £100–£250 in year one.** The binding constraint is not money, it is that leaderboards in a client-side game are cheatable by design — see *Score integrity*, which is the one genuinely hard problem here.

**Counter-position (moderate probability):** skip Tranche 1 and go straight to iOS. This wins if the goal is the App Store listing itself — a portfolio artifact, a learning exercise, a thing to point at. It loses if the goal is players, because you would be paying distribution costs to find out the retention loop is not there yet. Decide which of those two you actually want before starting; the sequencing follows from the answer, and only you can call it.

---

## 1. Accounts and identity

The instinct is "users need to sign up." Resist it. Sign-up is the single largest drop-off point in casual games, and for a leaderboard you need an *identity*, not an *account*.

**Recommended model — progressive identity:**

| Stage | What the player does | What we store |
|---|---|---|
| First play | Nothing. Anonymous ID minted on device | Random UUID, chosen display name, scores |
| Wants to keep progress | Optional "claim account" — Sign in with Apple / Google | Same UUID, now linked to a provider ID |
| Never claims | Nothing | Progress lives on that device only, and is lost with it |

This gets a working leaderboard on day one with zero login friction, and lets the minority who care about permanence upgrade.

**Backend recommendation: Supabase.** You already run it on the fantasy auction, so the operational learning is amortised — auth, Postgres and row-level security in one service, generous free tier. Firebase is the main alternative and is arguably better at anonymous auth specifically, but adds a second vendor to learn for marginal gain.

**The security boundary you must own personally** (not delegable to Claude Code): row-level security policies must be written so a player can insert their own score and read the leaderboard, and can do *nothing else* — no updating another player's row, no deleting, no reading anyone's provider identity. Assume the client is hostile, because it is: anyone can open developer tools and call your API directly with your public key. That key is public by design; RLS is the only thing standing behind it.

---

## 2. Score integrity — the hard problem

**State this plainly: a JavaScript game running in the player's browser cannot produce trustworthy scores.** The score is computed on hardware you do not control, by code the player can read and modify. Anyone moderately motivated can post a score of nine billion. Every web leaderboard has this problem; the ones that look clean are managing it, not solving it.

What is achievable, in ascending cost:

1. **Sanity bounds (cheap, do it first).** Server rejects scores above what the game's physics permit for the elapsed time. Kills the lazy 99%.
2. **Session tokens.** Score submission must carry a server-issued token from a session that actually started, is old enough to be plausible, and has not already submitted. Kills replay and drive-by posting.
3. **Seeded runs + input replay (expensive, high assurance).** Server issues the level seed; client returns the input sequence; server re-simulates and verifies the score. This is how it is properly done. It requires the game simulation to be deterministic, which ours currently is not — obstacle placement uses unseeded `Math.random()`. Retrofitting determinism is real work and should be a conscious decision, not a surprise.
4. **Segregate the leaderboard.** Friends/local boards are socially self-policing and matter more for retention than a global board anyway.

**Recommendation: 1 and 2 in Tranche 1; 4 as the primary social surface; 3 only if a global board becomes competitively meaningful.** On iOS, Game Center shifts some of this burden to Apple — another argument for the native path if leaderboards are the point.

---

## 3. iOS and the App Store

| Item | Detail |
|---|---|
| Developer Program | £79/year, individual or company. Company enrolment needs a D-U-N-S number and takes longer |
| Wrapper | **Capacitor** — wraps the existing web build, gives native APIs (haptics, Game Center, IAP) without a rewrite |
| Build machine | Xcode requires macOS. **You do not need to buy a Mac** — Codemagic or Bitrise build Capacitor iOS projects in the cloud; free tiers cover this volume |
| Testing | TestFlight — up to 100 internal testers, no review for internal builds |
| Review risk | **Guideline 4.2 (Minimum Functionality)** is the real threat. Apple rejects apps that are repackaged websites |

**Clearing Guideline 4.2 requires genuine native integration**, which is why Tranche 2 bundles them: Game Center leaderboards and achievements, haptic feedback on collisions and block placement, offline play, push notifications for daily challenges, proper iPad layouts. Each is small; together they make the app defensibly native.

**Also required before submission:** privacy nutrition labels, an age rating, a privacy policy at a public URL, and app icons and screenshots at every required size.

---

## 4. Compliance — the part that is easy to underestimate

An endless runner with bright colours and no violence **will be accessed by children**. That fact, not your intent, triggers the obligations.

- **UK Age Appropriate Design Code (Children's Code)** applies to services likely to be accessed by under-18s. It requires high-privacy defaults, data minimisation, no nudge techniques toward weaker privacy settings, and a **Data Protection Impact Assessment**.
- **UK GDPR:** a random device UUID tied to a score is still personal data. You need a lawful basis, a retention period, and a deletion route.
- **Apple's Kids Category** (if you opt in) forbids third-party analytics and behavioural advertising outright.
- **Display names are user-generated content.** A leaderboard of free-text names visible to children needs profanity filtering and a reporting route. Apple has rejected apps for exactly this.

**Practical posture: collect as close to nothing as possible.** No email, no real names, no third-party analytics SDKs, curated display names or a filtered word list. This is both the cheapest compliance position and the strongest product position — and it is much harder to retrofit than to design in, which is why it belongs in Tranche 1.

---

## 5. Legal — landmarks and brands

The game already avoids trademarked shop names, which was the right call. Two further points:

- **The buildings are safe.** The Colosseum, Pantheon, Big Ben, Brooklyn Bridge and the Eiffel Tower's structure are all long out of copyright.
- **One genuine trap: the Eiffel Tower's night-time illumination is separately copyrighted** and commercial use of images of the *lit* tower requires permission from its operator. Our stylised, unlit rendering is outside this, but do not add a twinkling-lights night mode without checking.
- **"CityRunner" needs a trademark search** before you invest in the name — Apple will not check this for you, and a rename after launch is expensive.

---

## 6. Retention — why anyone opens it twice

Everything above is plumbing. This is the product. Current state: play, get a score, no reason to return.

**Highest value per unit of effort, in order:**

1. **Daily challenge** — one fixed seed per day, everyone runs the same course, resets at midnight. This is the single strongest retention mechanic in the genre and is cheap to build (it also requires the deterministic seeding noted in §2 — build them together).
2. **Progression** — unlock cities, characters and boards with collected souvenirs. The economy exists; it currently buys nothing.
3. **Missions** — "collect 50 croissants", "clear 3 buses in one run". Gives short sessions a purpose.
4. **Friends leaderboard** — see §2; more motivating than a global board and far less cheat-sensitive.

**Monetisation, if it ever matters:** cosmetics and a "continue" token, not pay-to-win. Apple takes 15% under the Small Business Programme (first $1M). Rewarded video ads collide with the children's-privacy posture above — that trade-off should be a deliberate decision, not a default.

---

## 7. Measurement — how we learn what works

**The question: once this is live, what tells us which cities get played, where players quit, and whether any of it is working?**

### What Apple gives us — and what it does not

| Source | What it tells us | Cost |
|---|---|---|
| **Game Center** | Ranked scores and achievements. Hands leaderboard anti-cheat to Apple | Free |
| **App Store Connect → App Analytics** | Impressions, product page views, downloads, sessions, active devices, deletions, crashes, and **day-1 / day-7 / day-28 retention** | Free, no SDK, no code |

**Game Center provides no analytics whatsoever.** It is a leaderboard and an achievement store. It does not report what players did, which city they chose, or why they stopped. This is the most common misunderstanding of what Game Center is for, and it is worth stating flatly before anyone plans around it.

App Store Connect is genuinely useful, genuinely free, and has two limits that decide everything below:

- It is a **consented sample, not a census.** Only players who opted into sharing with developers are counted. Treat the shape of a curve as real and the absolute numbers as indicative.
- **It stops at the app boundary.** It knows a session happened. It cannot know the session was Rome level 3, ended by a barrier at 400 m, with the monument puzzle abandoned and the fact page skipped in under a second.

Everything we actually want to know lives in that second gap.

### Recommendation: the scores table *is* the analytics

We are already planning to post one row per run to Supabase for the leaderboard. Add a handful of columns to that row and it answers most product questions with **no new system, no SDK, no new consent story, and no extra network request**:

| Column | The question it answers |
|---|---|
| `ended_reason` — crash, quit, completed | Do people finish runs, or bail out mid-way? |
| `distance_m` | Where is the difficulty wall? |
| `city_id`, `level` *(already in the schema)* | Which cities and levels actually get played? |
| `souvenirs` | Is the collectible loop engaging, or ignored? |
| `puzzle_state` | Does anyone finish a monument? |

The five decisions that shape the roadmap — *which city to build next, whether level 3 is too hard, whether the puzzle mode earns its complexity, whether the fact pages are read, whether anyone comes back* — are answered by four of those columns plus Apple's retention curve. That is a strong return for one migration.

**Why roll our own instead of taking an SDK.** TelemetryDeck and Aptabase are both credible and privacy-respecting, and either would be a defensible choice. Firebase is not, for this game: Google ad-tech identifiers in a 4+ title likely to be used by children is the wrong trade at any level of convenience. But the deciding argument is that `COMPLIANCE.md` states **"No third-party SDKs"** as a position, and that sentence is load-bearing — it is an answer on the nutrition label, a line in the DPIA, and a claim that stays true with no ongoing vendor diligence. Extra columns on a table we are already writing retract nothing.

**This resolves a contradiction rather than reversing a decision.** The executive summary above already puts "basic telemetry" in Tranche 1, while `LAUNCH-CHECKLIST` #32 said analytics was excluded on compliance grounds. Run-outcome columns are the version of telemetry that *is* compatible with the compliance posture. Both documents now say so.

**Known blind spots, stated now rather than discovered later.** This sees nothing of players who never start a run, and nothing of players who are offline. Apple's session and crash data covers the first. The second is a real bias: online rows over-represent connected players, which is fine for comparing cities against each other and wrong for any absolute count.

### Player feedback — and the trap in "request a city"

Asking players which city they want next is a good idea. **Implemented as a text box, it would be a serious mistake.**

`COMPLIANCE.md` §1.4 records the risk of a child disclosing their identity through a display name as *Eliminated*, on the basis that names are generated and never typed. §2.2 sets the expected age rating at 4+ **on the stated basis that there is no user-generated content.** A free-text request box reintroduces both at once: it creates UGC, it creates a moderation duty we have no capacity for, and it puts the age rating in question. Generated display names exist precisely to make it structurally impossible for typed text to enter the system. A request box would walk it back in through the front door.

**Keep the feature, drop the risk: make it a poll, not a text box.** Show the candidate cities that have *already* been cleared against the IP filter in `PROPOSALS.md` — Amsterdam, Prague, Istanbul, Edinburgh, Lisbon, Vienna, Berlin — and let the player tap one. Store it as a per-city counter with **no identifier attached at all**, so it never becomes personal data, never enters "linked to you", and never needs a retention policy. The trade-off, stated now rather than discovered at implementation time: with no identifier there is nothing stopping one person voting a thousand times. Treat the counts as indicative signal, not a ballot. De-duplicating would mean storing a player id, which puts a personal-data row back into `COMPLIANCE.md` §1.2 and requires that assessment to be revised — so it is a decision, not a tweak.

It is also simply better data. Votes across a fixed list are countable and comparable; a thousand free-text strings are a spreadsheet nobody reads. And it can never surface an enthusiastic request for a city we are not legally able to build — Sydney, Rio and Venice are excluded at the design stage rather than disappointed at the reply stage.

**Where the qualitative signal actually comes from, in descending order of value:**

1. **TestFlight, before launch.** Free, up to 10,000 testers, and its built-in feedback form captures a screenshot plus free text — from consenting adults we invited, so none of the above applies. **This is the highest-value channel in the list, and it is available pre-launch, which is when feedback can still change the design cheaply.** Recruit deliberately: children in the target age band, watched while playing, are worth more than any number of developers.
2. **App Store reviews.** Prompt once, at a genuine high point — a monument completed, never a death — using the system rating sheet. Never nag; that is a nudge technique and the Children's Code names it.
3. **A support email.** Already required for submission.
4. **The city poll**, as above.

### What to do, and when

| When | Action |
|---|---|
| Now | Nothing to build. This section is the decision |
| Tranche 1, with the leaderboard | The run-outcome columns. One migration, no separate system |
| Tranche 2, at TestFlight | The point at which feedback is worth most. Recruit real players in the target age band |
| Tranche 3 | The city poll, once there is a base worth asking |
| Post-launch, first thing | **Watch day-1 retention before anything else.** If it is poor, no amount of city-level analysis matters — the problem is the first ninety seconds, and that is a design problem, not a data problem |

---

## 8. Engineering prerequisites

Applying the enterprise checklist proportionately — this is a single-developer game, not a bank. Items 6–10 of the usual list are overkill today; these five are not:

1. **Deterministic simulation** — seeded RNG throughout. Blocks daily challenges *and* replay verification. Do it once, early.
2. **Secrets and config** — no keys in the repo; Supabase URL and anon key via environment config, service-role key server-side only and never in the client bundle.
3. **Automated tests on the logic that can silently break** — collision fairness (is every obstacle actually passable?), score calculation, save/load migration. The visuals are checked by screenshot review; the maths is not checked by anything today.
4. **Error reporting** — **decided for v1: Apple only, no SDK.** Sentry, Crashlytics and Bugsnag all receive device and diagnostic data from players. That makes each of them a third-party data recipient, which contradicts `COMPLIANCE.md` §4 and would falsify the "Data Not Collected" privacy label submitted for a title rated 4+ and likely used by children. App Store Connect → Crashes gives symbolicated reports for free, gathered under Apple's own consent prompt, with nothing to integrate.

   **Open follow-up (owner: Dan).** Apple's crash data is only useful if somebody looks at it. The intent is an agent that checks it on a schedule and escalates on a spike, so a bad release is caught in hours rather than whenever the reviews turn. Not built, not scoped, deliberately recorded here so it is not lost — the decision above is what makes it necessary.
5. **A real build step** — the game ships unminified ES modules and a full Three.js build. Fine for GitHub Pages, wasteful over mobile data. Vite would cut the payload substantially.

---

## 9. Sequenced plan

**Tranche 1 — Web product (2–3 sessions)**
Seeded/deterministic simulation · Supabase project with RLS · anonymous identity · score submission with sanity bounds and session tokens · global and daily leaderboards · display-name filtering · Sentry · Vite build.
*Exit test: a stranger can play, appear on a leaderboard, and return the next day to a new daily challenge.*

**Tranche 2 — iOS (3–5 sessions + £79)**
Capacitor wrapper · Game Center · haptics · offline play · iPad layouts · icons and screenshots · privacy policy and nutrition labels · DPIA · TestFlight · submission.
*Exit test: approved on the App Store.*

**Tranche 3 — Live product (open-ended)**
Missions · progression economy · friends · seasons · additional cities · monetisation if warranted.

**Indicative year-one cost**

| Item | Cost |
|---|---|
| Apple Developer Programme | £79/yr |
| Supabase | £0 (free tier ample at this scale; ~£20/mo if it grows) |
| Sentry, Codemagic | £0 (free tiers) |
| Domain (optional) | ~£12/yr |
| **Total** | **~£91–£250** |

---

## 10. Risks

| Risk | Probability | Mitigation |
|---|---|---|
| App Store rejection under Guideline 4.2 | **Moderate** if wrapped thinly; **low** with Tranche 2 native features | Build the native integrations before submitting |
| Leaderboard defaced by cheated scores | **High** without §2 measures | Sanity bounds and session tokens from day one; friends boards as the real social surface |
| Children's-data compliance discovered late | Moderate | Design for near-zero data collection now; retrofit is far more expensive |
| Nobody plays it | **This is the actual risk** | Tranche 1 answers it for ~£0 before you spend on distribution |
| Name already trademarked | Low–moderate | Search before investing in the brand |

**The load-bearing assumption in this whole plan** is that the goal is players. If the goal is instead the experience of taking something through the App Store — a legitimate and probably more likely aim here — then Tranche 2 moves first and §6 becomes optional. Worth being explicit with yourself about which it is, because it changes the order of everything above.
