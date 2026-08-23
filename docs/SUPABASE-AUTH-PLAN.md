# CityRunner — Supabase anonymous-auth runbook

**Status: not applied. Nothing in this document has been run against a live project.** This is the plan for closing the KNOWN GAP recorded at the bottom of `supabase/schema.sql`, and the proof it actually closes it. Do not skip the adversarial test in §3 — a migration that "looks right" and hasn't been proven to reject the attack it exists to reject is not done.

Companion file: `supabase/migrations/001-anon-auth.sql`, which is the actual SQL. This document is how to apply it, how to verify it, and what it costs.

---

## 0. Why this exists, in one paragraph

Today, nothing ties a `players` or `scores` row to whoever inserted it. `players_insert` is `with check (true)`, and a score carries whatever `player_id` the client sends in the request body. Because the anon key is public — it ships in the app bundle, per `docs/COMPLIANCE.md` §4 — anyone can call the database directly with any `player_id` they like, including someone else's. The fix is to stop trusting the client to say who it is, and instead check who Supabase's auth server says it is. That requires anonymous auth: every caller gets a real, server-issued identity (`auth.uid()`) even though they never see a login screen, and the database checks writes against that instead of a client-supplied field.

Worth being precise about *how* live this gap already is, not just that it exists: `players_read` is `using (true)` on the table itself, not only on the leaderboard views built on top of it, so `select id from players` is public today via the anon key. After this migration ships, `players.id` is a player's `auth.uid()` — meaning every player's auth identity is readable by anyone, with no need to guess it. `schema.sql`'s own comment on the `delete_player` grant already makes this point for a different function ("player ids are readable from the leaderboard, so there is nothing to guess"); it applies equally here. This doesn't make the *post-migration* system unsafe — reading someone's uid doesn't let you forge their JWT — but it is exactly why the *pre-migration* gap the KNOWN GAP block describes is a live, walk-up-and-use hole rather than a theoretical one: an attacker doesn't need to guess a `player_id` to impersonate, they can read the exact list of valid ones straight off the table.

---

## 1. Enable anonymous sign-in (dashboard, ~1 minute)

1. Open the project in the Supabase dashboard.
2. **Authentication → Providers → Anonymous Sign-Ins.** Toggle it on. Save.
3. That's the entire dashboard change. No redirect URLs, no email templates, no SMTP config — anonymous auth doesn't send anything to anyone.

Skipping this step and running the migration anyway is safe but useless: `auth.uid()` will be `null` for every caller, so every insert the policies gate will be rejected, including legitimate ones. If step 4 (verification) shows *everything* failing rather than just the impersonation attempt, this is the first thing to check — but it is not the only possible cause. The policies in `001-anon-auth.sql` are scoped `to authenticated` rather than left unscoped, on the reasoning that a Supabase anonymous session carries `role: authenticated` (plus `is_anonymous: true`), not `role: anon` — see the migration file's own comment on this. That reasoning has not been tested against a live project either. If everything is failing and anonymous sign-in is confirmed ON, check next whether the caller's JWT actually carries `role: authenticated` (decode it, or check `auth.jwt() ->> 'role'` in a query run as that caller) — if it doesn't, the `to authenticated` scoping on the policies is the wrong role and needs dropping (plain `auth.uid()` in the `with check`/`using` clause already rejects unauthenticated callers on its own, so removing `to authenticated` is a safe fallback, not a weakening).

---

## 2. Apply the migration (staging project first, always)

1. Take a fresh copy of `supabase/schema.sql` and confirm it's already applied to the staging project (this migration assumes the base schema exists — it only alters policies, it doesn't create tables). Confirm this by inspecting the project (Table Editor, or the `pg_policies` query in §4 below) — do NOT confirm it by re-running `schema.sql` itself: `alter table scores add constraint scores_plausible ...` is not written `if not exists` and errors on a second run, aborting the rest of the script part-way through.
2. Open `supabase/migrations/001-anon-auth.sql`, read it top to bottom — it's short and every statement is commented with why, not just what.
3. Paste the forward-migration portion (everything before the `ROLLBACK` block comment at the end) into the SQL editor and run it.
4. Confirm no errors. Every statement is idempotent, so if something fails partway and you fix it, re-running the whole file is safe.

Do not run this against production until §3 and §4 below have both been done, on staging, successfully.

---

## 3. THE ADVERSARIAL TEST — this is the actual proof

Everything above is setup. This is the test the whole migration exists to pass. If you only do one thing from this document, do this.

**Goal: prove that an authenticated player A cannot insert a score (or a player row) carrying player B's id, and that the rejection happens at the database, not because of some client-side accident.**

### 3.1 Get two independent anonymous sessions

Using the JS client against the **staging** project (console, a scratch script, whatever — it doesn't need to be the game):

```js
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(STAGING_URL, STAGING_ANON_KEY);

const { data: sessionA } = await supabase.auth.signInAnonymously();
const uidA = sessionA.user.id;
// sign out, or open a second client instance, to get a genuinely separate session
await supabase.auth.signOut();

const { data: sessionB } = await supabase.auth.signInAnonymously();
const uidB = sessionB.user.id;

console.log({ uidA, uidB }); // must be different uuids
```

If `uidA === uidB`, something is wrong with the client setup (likely a cached session) — fix that before continuing; the test is meaningless with one identity.

### 3.2 Both players create their own row — must succeed

Sign back in as session A (or keep a client instance scoped to it), then:

```js
const { error: errA } = await supabase.from('players').insert({
  id: uidA,
  display_name: 'SwiftFalcon42',
});
```

**Expected: `errA` is `null`.** This proves the *legitimate* path still works — the migration must not break honest players while it's busy stopping dishonest ones.

Now do the same as session B:

```js
const { error: errB } = await supabase.from('players').insert({
  id: uidB,
  display_name: 'GoldenComet77',
});
```

**Expected: `errB` is `null`.** This step is not optional set-up colour — it matters for §3.3 below. `scores.player_id` has a foreign key to `players(id)`. If B never gets a row, an attempt in §3.3 to insert a score with `player_id: uidB` would be rejected anyway, by the FK constraint, regardless of whether RLS is doing anything at all — and that would be a false pass. Both players need to exist as real rows before the attack test means what it claims to mean.

### 3.3 THE ATTACK — player A tries to post a score as player B — must fail

Still authenticated as session A, and with B's `players` row now in place from 3.2:

```js
const { error } = await supabase.from('scores').insert({
  player_id: uidB,           // <-- someone else's id, and B's row now exists
  mode: 'run',
  city_id: 'nyc',
  level: 1,
  score: 1000,
  duration_ms: 30000,
});
```

**Expected: `error` is NOT null, and specifically a row-level-security violation — Postgres error code `42501`, message containing "row-level security policy".** Check the code, not just that an error exists: because B's row now exists (3.2), the foreign key is satisfied and cannot itself explain a rejection, so `42501` here is unambiguous proof RLS is what stopped it. If the error code is `23503` (foreign-key violation) instead, something is wrong with the test setup, not proof the gap is closed — go back and confirm 3.2 actually succeeded for B. If this insert succeeds at all, the gap is NOT closed — stop, do not proceed to production, go back to the migration.

Repeat the same shape of attack against `players`: as session A, attempt `insert({ id: uidB, display_name: 'AnythingElse01' })`. Note this one is a plain insert of a row whose primary key already exists (B's row from 3.2), so a duplicate-key error (`23505`) is also possible here and is a different, uninteresting failure — the one that matters is `42501` fired *before* the primary-key check would even apply, i.e. this is rejected by RLS regardless of whether B already has a row. If in doubt, also try it against a third, not-yet-created identity's id, where a `42501` can't be confused with a duplicate-key rejection. This is the impersonation the KNOWN GAP block originally described — creating *another player's identity row* — and it needs the same negative-test treatment as the scores attack, not just an assumption that fixing one fixes both.

### 3.4 Player A posts their OWN score — must succeed

```js
const { error } = await supabase.from('scores').insert({
  player_id: uidA,
  mode: 'run',
  city_id: 'nyc',
  level: 1,
  score: 1000,
  duration_ms: 30000,
});
```

**Expected: `error` is `null`.** Confirms the policy isn't accidentally too strict (e.g. a typo comparing the wrong column).

### 3.5 Existing plausibility/date checks still apply — must still fail for the right reasons

As session A, try a score with `score: 99999999` (implausible) and, separately, `player_id: uidA` but `duration_ms: 100` (below the 3000ms floor). **Both must be rejected.** This confirms the auth check was *added* to `scores_insert`, not substituted for the original conditions — a passing 3.4 plus a failing 3.5 is what "all existing constraints survived" actually looks like in practice, as opposed to just reading the SQL and assuming it.

### 3.6 Self-delete — must be scoped to yourself, and must cascade

Order matters in this section: run the cross-player attempt *before* A deletes itself, otherwise A's row is already gone by the time B tries to delete it, and "zero rows affected" would prove nothing (there'd be nothing to delete either way, RLS or not).

First, as session B (still logged in, A's row still exists from 3.2), attempt to delete A:

```js
const { data: crossDelete } = await supabase.from('players').delete().eq('id', uidA).select();
```

**Expected: `crossDelete` is an empty array — zero rows affected.** This is not an error case: a DELETE whose USING clause matches no rows simply deletes nothing, so check the returned rows (hence `.select()` chained on, to get them back), not the absence of an `error`. Then confirm A's row is genuinely untouched: `select().eq('id', uidA)` as either session should still return it.

Only now, as session A, delete itself:

```js
const { error } = await supabase.from('players').delete().eq('id', uidA);
const { data } = await supabase.from('scores').select().eq('player_id', uidA);
```

**Expected: `error` is `null`, and the follow-up select on `scores` returns an empty array** — proving the `on delete cascade` removed A's scores along with A's player row, without `scores` needing a delete policy of its own (see the migration file's comments on why FK cascades bypass RLS by design).

### 3.7 Record the result

Paste the actual error objects/codes from 3.3 into the PR or commit that applies this to production, not just "tested, works". A future reader needs to see that `42501` (or equivalent) was the observed failure mode, not take it on trust.

---

## 4. Verify RLS is actually on (don't just trust that the migration ran)

Belt-and-braces checks, independent of the adversarial test above:

1. **Dashboard:** Table Editor → `players` → the RLS badge should read "Enabled", same for `scores`. If either says "Disabled", `alter table ... enable row level security` either didn't run or was reverted.
2. **SQL editor:**
   ```sql
   select relname, relrowsecurity from pg_class
   where relname in ('players', 'scores');
   ```
   Both rows must show `relrowsecurity = t`.
3. **Policy listing:**
   ```sql
   select tablename, policyname, cmd, qual, with_check
   from pg_policies where tablename in ('players', 'scores')
   order by tablename, policyname;
   ```
   Confirm `players_insert` and `scores_insert` show `auth.uid()` in their `with_check` column, and `players_delete_self` exists with `id = auth.uid()` in `qual`. If `with_check`/`qual` show the old definitions, the migration didn't apply — re-run it.
4. **Service-role sanity check:** confirm nothing in the client bundle or repo uses the service-role key. RLS is bypassed entirely by that key (`docs/COMPLIANCE.md` §4.2), so its accidental presence anywhere client-side makes every policy above irrelevant. `grep -r` the built bundle for the literal `service_role` string as a final check before shipping.

---

## 5. Client-side changes required in `src/core/scores.js` (and `identity.js`) — DESCRIBED, NOT MADE

This document does not modify application source — that's out of scope here and other work is in flight against those files concurrently. What follows is what the eventual change needs to do, precisely enough that whoever picks it up doesn't have to re-derive it.

**The core problem to solve:** `src/core/identity.js` currently mints its own player id client-side —
```js
function newId() {
  if (crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  ...
}
```
— entirely independently of Supabase. There is, today, no Supabase client wired into this app anywhere (`src/core/scores.js` mentions Supabase only in a comment; nothing imports `@supabase/supabase-js`). That self-minted UUID and the uid Supabase's `signInAnonymously()` will eventually issue are **two different values**, and the migration's policies only accept the latter. Concretely, the client work is:

1. **Add the Supabase client** and call `supabase.auth.signInAnonymously()` on first launch (persisted session thereafter — `supabase-js` handles token storage and refresh itself once configured, so this is a one-time call per install, not per session).
2. **Stop minting `id` locally.** Once a Supabase session exists, `getIdentity().id` must become `session.user.id` (the auth uid), not `crypto.randomUUID()`. The generated-name logic (`generateName()`, `rerollName()`) is unaffected and stays exactly as it is — the display name was never the security-relevant field.
3. **Insert the `players` row using that uid** the first time a session is established, matching the row shape `players_insert`'s new policy expects (`id = auth.uid()`).
4. **Send `player_id: session.user.id`** on every score submission in `submit()`, replacing today's `id: me.id` (which currently comes from local identity, not auth).
5. **Handle the insert being rejected** as a normal failure path (`submit()` already returns `{ ok, reason }` rather than throwing, so this is additive — add a `reason: 'not-authenticated'` or surface the Postgres error, rather than assuming success).
6. **`eraseAllData()`** should additionally call `supabase.auth.signOut()` and (if the row exists server-side) delete the player's own row — `supabase.from('players').delete().eq('id', session.user.id)` — which the new `players_delete_self` policy exists specifically to allow. This is the "erase my data" button becoming real, server-side, without ever re-granting `delete_player()` to the client.

None of this is implemented by this document or by `001-anon-auth.sql`. Flag it as follow-up work before online leaderboards actually go live — the migration alone changes nothing observable, because nothing currently calls Supabase at all.

---

## 6. What breaks for players who already have local scores

**Nothing, today — and that's worth stating precisely rather than assuming.** `src/core/scores.js`'s backend is 100% `localStorage`; no score has ever been sent to Supabase, because no code path sends one. So there is no existing server-side data this migration could orphan.

The breakage this section actually needs to anticipate is **future**, once §5 is built and the game is live:

- **A player's local `identity.js` uuid and their Supabase auth uid are not the same value**, and after §5 ships, the server-relevant id becomes the auth uid. A player's *locally stored* scores (their `localStorage` leaderboard history, personal bests) stay keyed on the old local uuid and keep working exactly as before, because that local store never talks to Supabase — it's a separate backend, per the "pluggable backend" comment at the top of `scores.js`. What changes is only which id gets used for *new server submissions* going forward.
- **A reinstall, or clearing app storage, issues a brand new anonymous auth uid** (Supabase has no way to know it's "the same" person — that's the whole limitation discussed in §7 below). Any *server-side* scores tied to the old uid become orphaned from that player's perspective: still on the leaderboard, permanently, but no longer reachable as "mine" by the app, and no longer deletable via `players_delete_self` because the new session's `auth.uid()` won't match. This is a real, permanent product limitation of anonymous auth, not a bug in this migration — document it in-app ("scores don't survive a reinstall") rather than trying to solve it here.
- **A beta tester who already has a Supabase row from an earlier, pre-migration test build** (if one exists on any project this has already touched) would have a `players.id` that isn't anyone's `auth.uid()`, because it predates auth existing at all. Their next authenticated insert would go through their *new* auth uid and silently create a second, disconnected player row rather than updating the old one — there's no migration path for that old row (there's no auth uid to attribute it to retroactively). Check for this specifically before running against any project that isn't brand new: `select id from players` and cross-reference against `select id from auth.users` — any `players.id` with no matching `auth.users.id` is a pre-auth orphan.

---

## 7. Security implications of anonymous auth itself — read this before overselling the fix

**What an anonymous `auth.uid()` DOES protect against:** impersonation of another *specific, already-existing* player. After this migration, caller A cannot write a row claiming to be caller B, because the database checks A's server-issued identity, not a value A typed into a request body. That is the entire, narrow claim this migration proves in §3, and it is a real improvement — today, that impersonation is trivial and unauthenticated; after, it requires compromising someone's session token, which is a materially harder attack.

**What it does NOT protect against, and this is the honest part:**

- **Unlimited identity creation.** `signInAnonymously()` is, by design, uncredentialed — no email, no password, no proof of anything. A determined attacker can call it as many times as they like, from a script, and get a fresh, fully legitimate `auth.uid()` every time, no rate limit beyond whatever Supabase applies at the project level. Anonymous auth stops caller A from posting *as* B; it does nothing to stop caller A from posting as a thousand freshly-minted, entirely real Cs, Ds and Es. Every score those identities post is "legitimately" tied to a real `auth.uid()`, indistinguishable at the RLS layer from an honest player.
- **Client-side score fabrication.** This was already true and remains true: the score value itself still comes from the player's device, computed by code the player can read and modify. `is_plausible_score()` bounds the absurd; it does not, and cannot, verify that a merely-excellent score was actually earned. Anonymous auth authenticates *who is claiming the score*, not *whether the score is real*. `docs/PRODUCT-ROADMAP.md` §2 already says this plainly for the client-side checks; it applies identically here — authenticating the messenger doesn't authenticate the message.
- **What this means for leaderboard integrity specifically:** this migration closes the *impersonation* hole, which is a real and worthwhile fix. It does not, and was never going to, close the *cheating* hole — a global leaderboard populated by anonymous, uncredentialed, client-computed scores remains gameable by volume (many fake identities) and by fabrication (implausible-but-not-absurd values) regardless of this migration. `docs/PRODUCT-ROADMAP.md` §2's recommendation — treat friends/local leaderboards as the primary, self-policing social surface, and treat a global board as inherently a lower-trust feature — still holds after this ships. Nothing here is a reason to raise that trust level.

**Residual risk, stated plainly for the DPIA / `docs/COMPLIANCE.md` update this migration should eventually trigger:** once applied and shipped, the "Anon caller posts scores under another player's id" row in `COMPLIANCE.md` §1.4 becomes **closed** (Live, unmitigated → Mitigated by RLS + anon auth, verified by the test in §3 above). No other row in that table changes as a result of this work — this migration was never scoped to solve score fabrication or leaderboard-flooding, only impersonation, and §1.4 should be updated to say exactly that when this ships, not overstated as "leaderboard integrity solved".

---

## 8. This migration also makes one sentence of `docs/COMPLIANCE.md` §4 inaccurate — fix it when this ships

`COMPLIANCE.md` §4.3 currently reads: "Tables are insert-only. No update or delete policy exists for anonymous callers, so a posted score cannot be altered or removed by a caller." That is true of the schema as it stands today, and it is the reason this document does not edit `COMPLIANCE.md` itself (out of this task's file scope) — but it is worth recording precisely here, because leaving a compliance document asserting something that becomes false is worse than leaving a gap documented as open.

After `001-anon-auth.sql` applies, `players_delete_self` gives every caller a real delete route — for their own `players` row — and the `on delete cascade` on `scores.player_id` means that route also removes every score that player posted, as a direct and correct consequence (see the migration's part 3 for why that's by design, not an accident). So "a posted score cannot be... removed by a caller" stops being true in the narrow case of a player removing their own scores via full self-erasure.

What should replace it, when this ships: *scores remain insert-only in the sense that matters for integrity* — no caller can ever **edit** a score's value after posting, and no caller can **delete another player's** score, or delete their own score in isolation while keeping their identity row (there is deliberately no scores-only delete policy, see the migration's part 3 comment on why). The only removal path is whole-identity self-erasure via `players_delete_self`, which takes all of that player's scores with it as an indivisible unit — an intentional data-subject-erasure route, not a way to selectively curate a leaderboard position. `COMPLIANCE.md` §4.3 should be updated to say that, rather than the current unqualified "cannot be... removed by a caller", once this migration is proven and applied.
