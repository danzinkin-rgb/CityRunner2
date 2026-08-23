# CityRunner — Supabase Costs

**Source of truth for what the online leaderboard costs, and when the free tier stops being viable. Last updated 23 August 2026. Pricing checked against `https://supabase.com/pricing` and the linked docs pages on that date — Supabase changes pricing without much notice, so re-check before acting on this if it's more than a few months old.**

**Headline: database size is the first hard limit, and ordinary sustained play — not a viral spike — is what hits it. At roughly 1,000 daily active players kept up for 7–12 months, the free tier's 500 MB database quota is exhausted and the project goes read-only. Monthly active users (50,000) and egress (5 GB) are an order of magnitude further away and are unlikely to bind first under any scenario below.**

---

## 1. What's actually being priced

Two tables, both defined in `supabase/schema.sql`:

- **`players`** — one row per anonymous identity. Tiny; grows only with new players, never with replay.
- **`scores`** — one row per run submitted. This is the entire cost story. Everything else in the schema (three indexes plus a partial unique index) multiplies its footprint.

The client side (`src/core/scores.js`) submits one row per completed run through `submit()`, and reads the leaderboard through `top()` — which, once the backend is Supabase, becomes a `select` against the `leaderboard_daily` / `leaderboard_city` views. Those are the two traffic shapes that cost money: inserts (score submissions) and reads (leaderboard views, public per `scores_read`/`players_read` policies in the schema).

`PRODUCT-ROADMAP.md` §7 adds four more columns to the `scores` row — `ended_reason`, `distance_m`, `souvenirs`, `puzzle_state` — deliberately, instead of a third-party analytics SDK. That decision is right for compliance (`COMPLIANCE.md` §1.2 already lists it as planned), but it makes every row bigger, and row size is what this document is about. It's included below.

---

## 2. Current Supabase pricing (checked 23 August 2026)

Source: [supabase.com/pricing](https://supabase.com/pricing), cross-checked against [Understanding Database and Disk Size](https://supabase.com/docs/guides/platform/database-size), [Project Pausing](https://supabase.com/docs/guides/platform/free-project-pausing) and [Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous).

| Metric | Free | Pro ($25/mo base) |
|---|---|---|
| Database size | 500 MB, then **read-only mode** | 8 GB included, then $0.125/GB |
| Monthly Active Users (Auth) | 50,000 | 100,000, then $0.00325/MAU |
| Egress (API/DB traffic) | 5 GB + 5 GB cached | 250 GB + 250 GB cached, then $0.09/GB ($0.03/GB cached) |
| File storage | 1 GB (not used by this schema) | 100 GB, then $0.0213/GB |
| API requests | Unlimited (published tiers don't cap it) | Unlimited |
| Inactive-project pausing | **Yes — see §4** | Never |

A few things worth stating precisely rather than assuming:

- **"Database size" includes indexes and views**, per Supabase's own docs — not just table data. All three `scores` indexes and the partial unique index count against the 500 MB, which is why §5 below builds the row estimate including index overhead rather than just column bytes.
- **Exceeding 500 MB doesn't warn — it puts the project into read-only.** The documented failure mode is `cannot execute INSERT in a read-only transaction`. Leaderboard **reads** (`select` against the views) keep working — only writes stop. In product terms: the game silently stops accepting new scores, but the board it's already showing stays visible. `submit()` already treats a failed submission as non-fatal (`Never throws — a failed submission must not interrupt play`), so a player wouldn't see a crash, just a leaderboard that quietly stops updating.
- **Deletes don't shrink the database immediately.** Postgres leaves dead tuples in place until `VACUUM` runs. The 400-day purge (`purge_old_scores()` in `supabase/schema.sql`) deletes rows but doesn't reclaim their space on its own — see §6.
- **Whether anonymous auth users count as MAU isn't explicitly documented**, but Supabase's own guidance on anonymous sign-ins states plainly that "anonymous users are stored in your database" and can "abuse the endpoint to increase your database size drastically" if not rate-limited — which only makes sense if they're treated as real users for billing purposes. Assume they count until Supabase says otherwise; the roadmap's plan to add `signInAnonymously` (`supabase/schema.sql`, "KNOWN GAP" section) means **every player becomes an Auth user**, not just an anonymous device UUID as today. This is a change from the current no-backend build, where nothing touches Auth at all.

---

## 3. Row size, built from the actual schema

Postgres row cost has three parts: the column data itself, a fixed per-row overhead (tuple header, line pointer, null bitmap — roughly constant regardless of columns), and index entries, which are billed separately but count toward the same 500 MB quota.

### 3.1 Column data — `scores` table

| Column | Type | Bytes (typical) |
|---|---|---|
| `id` | bigint identity | 8 |
| `player_id` | uuid | 16 |
| `mode` | text (`run`/`daily`) | ~4 |
| `city_id` | text (`nyc`…`london`), nullable | ~5 |
| `level` | smallint | 2 |
| `day` | date | 4 |
| `seed` | bigint | 8 |
| `score` | integer | 4 |
| `duration_ms` | integer | 4 |
| `created_at` | timestamptz | 8 |
| **Shipped subtotal** | | **~63** |
| `ended_reason` *(planned, roadmap §7)* | text (`crash`/`quit`/`completed`) | ~7 |
| `distance_m` *(planned)* | integer | 4 |
| `souvenirs` *(planned)* | smallint | 2 |
| `puzzle_state` *(planned)* | text (e.g. `not_started`/`in_progress`/`completed`) | ~11 |
| **Planned analytics subtotal** | | **~24** |
| **Total column data, once §7 lands** | | **~90 bytes** |

Add Postgres's fixed per-row overhead — tuple header, line pointer, null bitmap, alignment padding — call it **~30 bytes**. Heap row total: **~120 bytes**.

### 3.2 Index overhead

Four indexes touch every insert:

- `scores_daily_idx (mode, day, score desc)`
- `scores_city_idx (mode, city_id, level, score desc)`
- `scores_player_idx (player_id, created_at desc)`
- `scores_one_daily_per_player (player_id, day)` — partial, `where mode = 'daily'`, so it only costs space on the roughly one-in-four-or-five rows that are daily-challenge attempts.

Each btree entry costs roughly its key width plus a 6-byte heap pointer plus ~8 bytes of index-tuple overhead. Summed across the three full indexes plus the partial one at reduced weight, that's a further **~90–110 bytes per row on average**.

### 3.3 Working number

**~220–250 bytes per row, all-in (heap + all indexes), once the analytics columns are added.** Call it **250 bytes/row** for the arithmetic below, and treat that as a planning estimate, not a guarantee — real Postgres bloat depends on autovacuum timing and fill factor, which no amount of arithmetic replaces. A pessimistic case (worse padding, index bloat between vacuums) might run closer to **400 bytes/row**; both figures are used below to bound the estimates rather than pretend to false precision. Once a real project exists, `select pg_size_pretty(pg_total_relation_size('scores'))` gives the true number in thirty seconds and should replace this estimate.

The `players` table is comparatively irrelevant: ~48 bytes of columns (`id` uuid, `display_name` text, two timestamps) plus overhead and its primary-key index, call it ~120 bytes/player — but it's one row per player *ever*, not per run, so it never dominates.

---

## 4. Auto-pause: the risk that isn't about cost at all

Free-tier projects are paused after **7 days with no database activity** (Supabase's own wording: "sufficient user database activity over the past week"). Supabase emails a warning about a week ahead of pausing. Once paused:

- The project is **completely unavailable** — no reads, no writes — until someone logs into the Supabase dashboard and clicks Resume. It does **not** wake itself up on the next player request.
- Data is preserved and restorable for up to a year, so nothing is lost.
- Resuming takes on the order of 30 seconds once triggered manually.

This is the opposite failure mode from everything else in this document. Every scenario below is about *too much* play causing a cost problem. Auto-pause bites *too little* play — a genuinely plausible outcome for a game that isn't being actively marketed, or between a launch spike and whatever comes next. A week without a single leaderboard read or score post — which for a mobile game between app-store review cycles or a quiet fortnight is entirely normal — takes the whole leaderboard offline until you personally notice and intervene.

For a live game this is worth planning for explicitly: either accept it (know it can happen, check the dashboard periodically, budget the manual-resume step into "why is the leaderboard broken" triage) or dodge it deliberately with a scheduled no-op query once a week (a cron job, a GitHub Action, or Supabase's own scheduled functions hitting the database on a timer). The second option costs nothing and removes the risk entirely; it's the more defensible default given players won't tell you the leaderboard died, they'll just stop seeing scores post and assume the game is broken.

---

## 5. Three scenarios

All three build from the 250-bytes/row working number, flag the 400-byte pessimistic case where it changes the conclusion, and state every assumption so the owner can substitute his own numbers.

**Shared assumption:** roughly 60% of daily active players (DAP) also attempt the daily challenge (capped at one `mode = 'daily'` row/day/player by the schema's unique index), on top of their `run`-mode attempts. Leaderboard reads assumed at 3 fetches/DAP/day (checking standings after a run), ~2 KB per JSON response (PostgREST wraps rows with repeated field names, so a top-20 leaderboard is a few KB, not a few hundred bytes).

### 5.1 Quiet launch — 100 DAP, 3 runs each

| | |
|---|---|
| Run-mode rows/day | 100 × 3 = 300 |
| Daily-mode rows/day | 100 × 0.6 = 60 |
| Total rows/day | 360 |
| Rows/month | ~10,800 |
| DB growth/month | 10,800 × 250 B ≈ **2.7 MB** |
| Months to reach 500 MB at this rate | ~185 (i.e. never, at this scale) |
| Auth MAU | 100–3,000 depending on churn — trivial against 50,000 |
| Egress/month | 100 × 3 × 2 KB × 30 ≈ **18 MB** — trivial against 5 GB |

**Nothing binds at this scale.** The only live risk is auto-pause (§4) — a slow week at 100 DAP is exactly the kind of gap that triggers it.

### 5.2 Modest success — 1,000 DAP, 5 runs each

| | |
|---|---|
| Run-mode rows/day | 1,000 × 5 = 5,000 |
| Daily-mode rows/day | 1,000 × 0.6 = 600 |
| Total rows/day | 5,600 |
| Rows/month | ~168,000 |
| DB growth/month (250 B/row) | ≈ **42 MB** |
| DB growth/month (400 B/row, pessimistic) | ≈ **67 MB** |
| **Months to reach 500 MB** | **~12 (optimistic) to ~7.5 (pessimistic)** |
| Auth MAU | 1,000–30,000 depending on churn — still under 50,000, but the range is wide enough to watch if turnover is high |
| Egress/month | 1,000 × 3 × 2 KB × 30 ≈ **180 MB** — well under 5 GB |

**This is where the free tier actually breaks**, and the arithmetic has a sting in it: the 400-day purge doesn't start deleting anything until day 400 (~13.3 months) of the *first* row's life. At the optimistic 250 B/row rate, the database hits 500 MB at ~month 12 — just before the purge would start helping. At the pessimistic rate, it hits the ceiling at ~month 7, well before the purge is relevant at all. **Either way, 1,000 sustained DAP outruns the 400-day purge**, so the purge cannot be relied on to keep this scenario on the free tier.

### 5.3 Viral spike — 20,000 DAP for one week

Assumes a more casual crowd than the sustained scenarios: 3 runs/DAP/day, 40% try the daily challenge.

| | |
|---|---|
| Run-mode rows/day | 20,000 × 3 = 60,000 |
| Daily-mode rows/day | 20,000 × 0.4 = 8,000 |
| Total rows/day | 68,000 |
| Rows over the week | ~476,000 |
| DB growth over the week (250 B/row) | ≈ **119 MB** |
| DB growth over the week (400 B/row) | ≈ **190 MB** |
| Auth MAU created in the week | up to 20,000 new anonymous Auth users |
| Egress over the week | 20,000 × 3 × 2 KB × 7 ≈ **840 MB** |

A single viral week consumes **24–38% of the entire 500 MB quota in seven days**, and the egress for that week alone (840 MB) is already a sixth of the whole month's 5 GB allowance. In isolation this scenario doesn't quite exhaust either limit — but it doesn't need to happen in isolation. If it lands on top of six months of Modest-success-style baseline growth (already 200–400 MB in, per §5.2), a viral week is very plausibly the thing that tips the project into read-only mode **mid-spike** — the exact moment new-score submissions matter most for making the leaderboard feel alive. Reads keep working (§2), so the board doesn't disappear, it just stops moving, which is a strange failure to debug if you don't already know why.

The 50,000 MAU ceiling isn't threatened by one spike week on its own, but note that it's a *rolling 30-day* figure: a spike stacked on an existing 1,000-DAP baseline (up to ~30,000 MAU/month per §5.2) plus 20,000 new spike users in the same billing window gets meaningfully closer to 50,000 than either alone suggests.

### 5.4 The headline, stated once plainly

**Database size is the first ceiling hit, and it's hit by sustained ordinary play, not a viral event.** Roughly **1,000 DAP sustained for 7–12 months** exhausts the free tier's 500 MB and the project goes read-only. MAU (50,000) and egress (5 GB) both require something like an order of magnitude more traffic to threaten, under every scenario modelled here. A viral week is a *risk multiplier* on top of that baseline — it can consume a third of the remaining headroom in days — but on its own it's not the first thing to break.

---

## 6. Cost-control levers, in order of leverage

1. **The 400-day purge already exists** (`purge_old_scores()` in `supabase/schema.sql`) and is the right idea for GDPR minimisation, but as §5.2 shows, at Modest-success scale it doesn't arrive soon enough to prevent hitting 500 MB on its own. It also **doesn't reclaim space on its own** — `DELETE` leaves dead tuples for autovacuum (or a manual `VACUUM`) to clear. If this job is scheduled via `pg_cron`, schedule a `VACUUM scores;` (or rely on autovacuum, which will eventually run under normal write load, but shouldn't be assumed to run *immediately* after a large purge) to actually shrink the number that counts against the 500 MB quota.

2. **Aggregate before deleting, rather than only deleting by age.** `leaderboard_city` already collapses every run down to `max(score)` per player/city/level — every row that *isn't* a player's personal best on that board is pure storage cost with zero product value shown anywhere. A periodic job that keeps only each player's best row per `(city_id, level)` and drops the rest — independent of the 400-day age purge — would cut storage far more aggressively than time-based deletion alone, because most of a player's run history is never displayed. Worth doing before Pro becomes necessary, not after.

3. **Cache leaderboard reads client-side.** The leaderboard views are public, read-only, and don't need per-request freshness — a top-10 board doesn't meaningfully change between one player's runs. A short client-side TTL (say 30–60 seconds) or an HTTP cache header on the view request would move a large share of the 3-reads/DAP/day traffic modelled above out of billed egress and into Supabase's separately-priced (and cheaper) cached-egress bucket, or eliminate the request entirely.

4. **Anonymous Auth users cannot be auto-cleaned today.** Supabase's own docs state cleanup "is currently not available" out of the box, and offer a manual SQL pattern for deleting anonymous users past a threshold age. **Apply this carefully against this schema**: `players.id` will equal `auth.uid()` once the roadmap's anonymous-auth fix lands, and `scores.player_id` cascades on `players` delete. Deleting a stale Auth user who *has* posted scores would delete their leaderboard history along with them. The safe version of this lever only targets anonymous Auth users who **never posted a score** — abandoned sign-ins, bot noise, someone who opened the app once — not real players. That distinction has to be in the cleanup query, not assumed.

5. **The public anon key means the leaderboard-read traffic is, by design, uncontrolled** — anyone with the key (which is everyone, per `COMPLIANCE.md` §4) can hit the views directly, not just through the game. Levers 3 and 4 reduce the *cost* of that; they don't reduce the exposure. That exposure is a security question already addressed in `COMPLIANCE.md`, not a cost one — noted here only because it's the reason read traffic can't be assumed to track DAP 1:1 forever.

---

## 7. Recommendation

**Stay on free while:**
- Measured database size (Studio → Database → Database Size, or `select pg_size_pretty(pg_total_relation_size('scores'));`) stays comfortably under 500 MB — treat ~350 MB (70% of quota) as the point to start planning the move, not the point to make it. Read-only mode is a hard stop with no warning email of its own; 150 MB of headroom is the margin for reacting before a spike closes that gap in days (§5.3).
- Sustained DAP stays under a few hundred for months at a time. §5.2's arithmetic says ~1,000 sustained DAP is roughly a year's runway at best.

**Move to Pro ($25/month) when either:**
- Measured database size crosses ~350 MB, **or**
- Sustained DAP has been running above ~500–800 for more than a couple of months and shows no sign of dropping back to Quiet-launch levels.

Whichever trigger fires first should decide it — don't wait for both. The $25/month base buys 8 GB (16× the free ceiling) and removes auto-pause entirely, which for a live game with real players is worth doing proactively rather than discovering read-only mode from a support email after a launch spike.

**Regardless of tier:** set up a weekly keep-alive ping now. It's free, removes the auto-pause risk (§4) completely, and unlike the database-size question, there's no scenario where it's the wrong call.
