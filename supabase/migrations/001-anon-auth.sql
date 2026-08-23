-- CityRunner — migration 001: bind rows to the caller via Supabase anonymous auth.
--
-- ============================================================================
-- UNTESTED. This has never been run against a live Supabase project.
-- Do NOT run this against production. Run it against a staging project first,
-- then work through every step in docs/SUPABASE-AUTH-PLAN.md — in particular
-- the adversarial test (player A cannot insert a score as player B) — before
-- this is ever considered for a production database.
-- ============================================================================
--
-- WHAT THIS FIXES
-- supabase/schema.sql, in its KNOWN GAP section, documents that nothing ties
-- a players or scores row to the caller who inserted it. `players_insert` is
-- `with check (true)`, and a score carries whatever `player_id` the client
-- sends. Any holder of the public anon key — which is everyone, because it
-- ships in the app bundle — can create a player row with someone else's id,
-- or post a score against a player_id that isn't theirs. This migration
-- closes that by requiring every write to carry the caller's own
-- Supabase-issued anonymous auth uid, and checking it in the database, which
-- is the only enforcement point a hostile client cannot route around.
--
-- PREREQUISITE — do this in the Supabase dashboard before running this file:
-- Authentication → Providers → enable "Anonymous Sign-Ins". Without this,
-- signInAnonymously() on the client fails and auth.uid() is null for every
-- caller, which means the policies below reject ALL inserts, not just
-- impersonation attempts. See docs/SUPABASE-AUTH-PLAN.md for the full
-- dashboard walkthrough and the client-side changes this requires.
--
-- WHY auth.uid() IS SAFE TO TRUST HERE, AND WHY NO EXTRA NULL CHECK IS NEEDED
-- auth.uid() reads the `sub` claim off the caller's JWT. A request made with
-- only the public anon key (no signInAnonymously() call) carries no `sub`
-- claim, so auth.uid() is NULL. `id = auth.uid()` and `player_id = auth.uid()`
-- both evaluate to NULL (not TRUE) when auth.uid() is NULL, and a WITH CHECK
-- clause that doesn't evaluate to TRUE rejects the row. So an unauthenticated
-- caller is refused automatically — there is no need to additionally write
-- `auth.uid() is not null`, though it would not hurt.
--
-- NOTE ON SUPABASE'S ROLE MODEL — this trips people up. An anonymous session
-- from signInAnonymously() is issued a JWT with `role: authenticated` and an
-- additional `is_anonymous: true` claim. It is NOT the `anon` role. That is
-- why the policies below are scoped `to authenticated` rather than `to anon`
-- — an anonymous-auth caller IS an authenticated caller, in Supabase's model,
-- just one the app cannot re-identify across a reinstall. See §3 of
-- docs/SUPABASE-AUTH-PLAN.md for what that does and doesn't protect against.
--
-- IDEMPOTENCY
-- Every statement below is safe to run more than once. `enable row level
-- security` is a no-op if already enabled. Every policy is dropped with
-- `if exists` immediately before it is recreated, matching the convention
-- already used throughout schema.sql, because Postgres has no
-- `create or replace policy` — a policy must be dropped and recreated to
-- change its definition, not edited in place.

-- ---------------------------------------------------------------------------
-- 0. Defensive: RLS must already be on (schema.sql turns it on). Restated
--    here so this file has no hidden dependency on run order beyond "after
--    schema.sql once, ever" — running it twice, or against a database where
--    someone fat-fingered a `disable row level security`, still leaves RLS on.
-- ---------------------------------------------------------------------------
alter table players enable row level security;
alter table scores  enable row level security;

-- ---------------------------------------------------------------------------
-- 1. players_insert — a caller may only create a player row FOR THEMSELVES.
--
--    Before: with check (true) — anyone can create a row with any id,
--    including an id that collides with, or squats on, another player's.
--    After: with check (id = auth.uid()) — the row's primary key must equal
--    the caller's own anonymous-auth uid. This is what makes `id` mean
--    something: it stops being "whatever the client says" and becomes "the
--    identity Supabase's auth server issued to this specific caller".
--
--    `display_name`'s existing CHECK constraint (curated-word-list shape) is
--    a table constraint, not part of this policy, so it is untouched and
--    still enforced on every insert regardless of who the caller is.
-- ---------------------------------------------------------------------------
drop policy if exists players_insert on players;
create policy players_insert on players for insert to authenticated
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. scores_insert — a score may only be posted against the caller's OWN
--    player_id, and every existing condition must still hold. This is an
--    ADDITION to the existing check, not a replacement of it — dropping any
--    of the original clauses would reopen the plausibility/date holes that
--    scores_insert was written to close.
--
--    Original conditions, carried through unchanged:
--      score >= 0
--      duration_ms >= 3000
--      is_plausible_score(score, duration_ms)
--      mode <> 'daily' or day = (today, UTC)
--    New condition, added:
--      player_id = auth.uid()
-- ---------------------------------------------------------------------------
drop policy if exists scores_insert on scores;
create policy scores_insert on scores for insert to authenticated
  with check (
    player_id = auth.uid()
    and score >= 0
    and duration_ms >= 3000
    and is_plausible_score(score, duration_ms)
    and (mode <> 'daily' or day = (now() at time zone 'utc')::date)
  );

-- ---------------------------------------------------------------------------
-- 3. players_delete_self — a caller may delete their OWN player row, and
--    only their own. This is new; no delete policy existed on players
--    before (deletion was denied by default, which is why delete_player()
--    exists as a security-definer escape hatch — see part 4 below).
--
--    Named "_self" rather than following the bare "players_delete" pattern
--    used elsewhere in this file, because a reader skimming policy names in
--    the dashboard should not be able to mistake this for an admin-style
--    "delete anyone" policy. `using (id = auth.uid())` is the only thing
--    that actually enforces the restriction; the name is a courtesy on top.
--
-- WHY THIS ALSO ERASES A PLAYER'S SCORES, EVEN THOUGH SCORES HAS NO DELETE
-- POLICY OF ITS OWN, AND WHY THAT'S CORRECT RATHER THAN A GAP:
-- scores.player_id references players(id) on delete cascade. Postgres
-- documents that referential-integrity actions — including an ON DELETE
-- CASCADE firing because a parent row was removed — always bypass row-level
-- security on the child table, precisely so a cascade can never be silently
-- half-applied by a policy the deleter doesn't hold. (See "Row Security
-- Policies" in the PostgreSQL manual: RI actions "will always be able to
-- see all rows and will not be restricted by a row security policy.") So a
-- caller who can delete their own players row can, as a direct consequence,
-- erase every score row that pointed at it — without scores ever needing an
-- insert-only table to grow a delete policy of its own. Do NOT add a scores
-- delete policy to "help" this along; it is unnecessary and it would let a
-- caller delete individual scores while keeping their player row, which is
-- a narrower and less honest form of erasure than "delete the identity".
-- ---------------------------------------------------------------------------
drop policy if exists players_delete_self on players;
create policy players_delete_self on players for delete to authenticated
  using (id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. is_plausible_score() and delete_player() under the new model.
--
-- is_plausible_score(score, duration_ms) — UNCHANGED, and correctly so. It
-- is a pure function of the two numeric arguments it's given; it has never
-- known or cared who the caller is. Binding player_id to auth.uid() doesn't
-- touch the plausibility maths, so there is nothing to migrate here. Stated
-- explicitly so a future reader doesn't go looking for a change that isn't
-- needed.
--
-- delete_player(target uuid) — UNCHANGED in definition, and its EXECUTE
-- grant stays revoked from public/anon/authenticated. Do NOT re-grant it to
-- make an in-game button work — schema.sql's warning above the grant still
-- applies, in full, after this migration.
--
-- What DOES change is the function's role. Before this migration it was the
-- ONLY deletion route (self-delete was denied by default), so an in-game
-- "erase my data" button had no honest way to exist — the only path went
-- through a privileged function that couldn't safely be handed to the
-- client. After this migration, part 3's players_delete_self policy gives
-- every player a direct, correctly-scoped route to erase themselves: the
-- client issues `delete from players where id = auth.uid()` under its own
-- (anonymous) session, RLS admits it because the row is theirs, and the FK
-- cascade takes their scores with it. That is now the correct implementation
-- of the in-game button, and it needs no privileged function at all.
--
-- delete_player() is therefore redundant for THAT case, but not worthless:
-- keep it for deletions a player cannot self-serve — a support/GDPR request
-- from someone who can no longer reach their own session (app deleted, no
-- persisted auth token, emailed in instead), or a moderation takedown of a
-- specific id. Those remain operator actions run from the SQL editor or an
-- authenticated Edge Function, exactly as schema.sql already says. No SQL
-- change is required to the function itself; this section exists to record
-- the reasoning, since "we didn't touch this" is a decision, not an oversight.
-- ---------------------------------------------------------------------------

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- This file is forward-only when run as-is: the rollback below is written as
-- a block comment so pasting the whole file into the SQL editor cannot
-- apply-then-immediately-revert itself by accident. To roll back, copy the
-- statements between the /* and */ markers into a fresh SQL editor tab,
-- delete the /* and */ delimiters, and run them. This restores the exact
-- policy set schema.sql currently ships (i.e. the state with the KNOWN GAP
-- still open) without touching table structure, data, or any other function.
--
-- Rolling back does NOT undo any consequence of players_delete_self having
-- existed in the meantime — if a player already deleted themselves under
-- this policy, that deletion (and its cascade) is real and permanent, same
-- as any other delete. Rollback removes the policy going forward; it is not
-- an undo of past deletes.
/*
drop policy if exists players_insert on players;
create policy players_insert on players for insert with check (true);

drop policy if exists scores_insert on scores;
create policy scores_insert on scores for insert with check (
  score >= 0
  and duration_ms >= 3000
  and is_plausible_score(score, duration_ms)
  and (mode <> 'daily' or day = (now() at time zone 'utc')::date)
);

drop policy if exists players_delete_self on players;
-- (no replacement — before this migration, players had no delete policy at
-- all, so removing this one restores the original default-deny.)
*/
