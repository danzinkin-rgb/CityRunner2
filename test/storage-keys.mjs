/**
 * The deletion boundary: what "Erase my data" removes, and what it keeps.
 *
 * This is a GATE, not a probe. It exists because the failure it guards against
 * is completely silent. The game writes five localStorage keys from five
 * different modules; eraseAllData() removes three of them. Nothing in the
 * language stops a sixth module from inventing a sixth key and never telling
 * the erase path about it, and if that happened there would be no exception,
 * no red test, and no symptom — just a data-subject deletion route
 * (docs/COMPLIANCE.md §4) that quietly stopped covering everything it claims
 * to. That is the kind of gap that gets found in an audit, not in play.
 *
 * THREE LAYERS, EACH CATCHING WHAT THE OTHERS CANNOT.
 *
 *   PART A — no stray key literals anywhere in src/. A purely static scan. It
 *     is the only one of the three that can catch a key belonging to a module
 *     this suite never loads, which is precisely the case that worries us: a
 *     future module nobody thought to add here.
 *   PART B — the declared lists match a literal written out below. Pinned to
 *     spelled-out strings on purpose. Deriving the expectation from the module
 *     under test would make this self-confirming — it would pass just as
 *     happily if every key were deleted from the registry (the same mistake
 *     that once made the entitlements gate meaningless).
 *   PART C — the behaviour, driven through the real Settings > Erase button,
 *     confirm dialog and all. A registry that says the right thing while
 *     eraseAllData() ignores it would sail through A and B.
 *
 * WHY KEPT KEYS ARE ASSERTED AS FIRMLY AS ERASED ONES. Both directions are
 * product decisions with reasons written down in src/core/storage-keys.js: a
 * wiped entitlement cache shows a paying player a paywall the moment they
 * erase, and wiping audio prefs un-mutes a game somebody deliberately muted.
 * "Erase more" is not automatically safer, so an over-broad erase must fail
 * here just as loudly as an under-broad one.
 *
 * Usage: node test/storage-keys.mjs [baseUrl]
 */
import { webkit } from 'playwright';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveBase } from './serve.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const { base: BASE } = await resolveBase(process.argv[2]);

let failures = 0;
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'ok ' : 'x  '} ${label}${detail ? `  ${detail}` : ''}`);
  if (!ok) failures++;
};

// The expected sets, spelled out. If a legitimate new key is added, this list
// is meant to be edited by hand — that edit is the moment somebody has to
// decide whether the key is personal data. Making it painless would defeat it.
const EXPECT_ERASED = ['cityrunner2', 'cityrunner2.identity', 'cityrunner2.scores'];
const EXPECT_KEPT = ['cityrunner2.audio', 'cityrunner2.ent'];

// =============================================================================
// PART A — no module may spell a storage key itself
// =============================================================================
{
  const REGISTRY = join('src', 'core', 'storage-keys.js');
  const offenders = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) { walk(full); continue; }
      if (!name.endsWith('.js')) continue;
      const rel = relative(REPO, full);
      if (rel === REGISTRY) continue; // the one place allowed to name them
      const body = readFileSync(full, 'utf8');
      // Only quoted occurrences count. A comment naming the key is
      // documentation, and several modules rightly carry one.
      for (const m of body.matchAll(/(['"])cityrunner2[\w.]*\1/g)) offenders.push(`${rel}: ${m[0]}`);
    }
  };
  walk(join(REPO, 'src'));
  check(offenders.length === 0,
    'no module outside storage-keys.js writes a storage key literal',
    offenders.join(', '));
}

const browser = await webkit.launch();

// =============================================================================
// PART B — the declared lists, pinned to a literal
// =============================================================================
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?ui=settings`, { waitUntil: 'load' });
  await page.waitForTimeout(300);

  const declared = await page.evaluate(async () => {
    const m = await import('/src/core/storage-keys.js');
    return {
      erased: [...m.ERASED_KEYS].sort(),
      kept: [...m.KEPT_KEYS].sort(),
      all: [...m.ALL_KEYS].sort(),
      values: Object.values(m.STORAGE).sort(),
    };
  });

  const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  check(same(declared.erased, EXPECT_ERASED), 'ERASED_KEYS is exactly the expected set',
    JSON.stringify(declared.erased));
  check(same(declared.kept, EXPECT_KEPT), 'KEPT_KEYS is exactly the expected set',
    JSON.stringify(declared.kept));
  // Every declared key must be classified. A key added to STORAGE but to
  // neither list would be a key nobody decided about, which is the whole bug.
  check(same(declared.all, declared.values),
    'every key in STORAGE appears in exactly one of ERASED_KEYS / KEPT_KEYS',
    `lists=${JSON.stringify(declared.all)} storage=${JSON.stringify(declared.values)}`);

  await ctx.close();
}

// =============================================================================
// PART C — the real button, end to end
// =============================================================================
// Seeded before load so the app boots with a full set of state to destroy,
// including the two keys it must NOT touch. The erase route is behind a
// window.confirm(); accepting every dialog is what lets the test press the
// button the player presses instead of calling the module directly.
{
  const SEED_ENT = JSON.stringify(['uk.co.zinkin.cityrunner.founder']);
  const SEED_AUDIO = JSON.stringify({ music: false, sfx: false, volume: 0.2 });

  const ctx = await browser.newContext();
  await ctx.addInitScript((seed) => {
    localStorage.setItem('cityrunner2.identity', JSON.stringify({
      id: 'seed-id', name: 'SeedRunner42', createdAt: '2020-01-01T00:00:00.000Z',
    }));
    localStorage.setItem('cityrunner2', JSON.stringify({
      stars: { nyc: 3 }, coins: 99, best: 4242, characters: ['runner'], equipped: 'runner',
    }));
    localStorage.setItem('cityrunner2.scores', JSON.stringify([{
      id: 'seed-id', name: 'SeedRunner42', score: 4242, mode: 'run',
      cityId: 'nyc', level: 1, seed: 1, day: '2020-01-01', at: '2020-01-01T00:00:00.000Z',
    }]));
    localStorage.setItem('cityrunner2.ent', seed.ent);
    localStorage.setItem('cityrunner2.audio', seed.audio);
  }, { ent: SEED_ENT, audio: SEED_AUDIO });

  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('dialog', (d) => d.accept());
  await page.goto(`${BASE}/?ui=settings`, { waitUntil: 'load' });
  await page.waitForTimeout(500);

  const before = await page.evaluate(() => ({
    name: JSON.parse(localStorage.getItem('cityrunner2.identity') || 'null')?.name,
    best: JSON.parse(localStorage.getItem('cityrunner2') || 'null')?.best,
  }));
  check(before.name === 'SeedRunner42' && before.best === 4242,
    'seeded profile and progress were actually loaded before erasing',
    JSON.stringify(before));

  await page.click('#set-erase');
  await page.waitForTimeout(400);

  const after = await page.evaluate((keys) => Object.fromEntries(
    keys.map((k) => [k, localStorage.getItem(k)]),
  ), [...EXPECT_ERASED, ...EXPECT_KEPT]);

  // "ERASED" MEANS "HOLDS NOTHING OF THE OLD PLAYER", NOT "ABSENT". Two of the
  // three keys come straight back, by design and while the player is still
  // looking at the screen: the erase handler resets the in-memory save and
  // re-persists it immediately, because the running game holds that object and
  // the next persist() would otherwise write the old progress back out; and
  // re-rendering Settings asks for an identity, which mints a fresh anonymous
  // one (the confirmation the player is shown says exactly that). So what has
  // to be asserted is the content, not the absence — a check for `null` here
  // would be testing the wrong promise, and would fail on correct behaviour.
  const identity = after['cityrunner2.identity'] ? JSON.parse(after['cityrunner2.identity']) : null;
  check(!identity || (identity.id !== 'seed-id' && identity.name !== 'SeedRunner42'),
    'erase destroys the stored identity: any profile left behind is a new one',
    JSON.stringify(identity));
  check(after['cityrunner2.scores'] === null, 'erase removes the local scores key',
    String(after['cityrunner2.scores']));
  const save = after.cityrunner2 ? JSON.parse(after.cityrunner2) : null;
  check(!save || (save.best === 0 && save.coins === 0 && Object.keys(save.stars || {}).length === 0),
    'erase leaves no progress behind: stars, coins and best are all reset',
    JSON.stringify(save));

  check(after['cityrunner2.ent'] === SEED_ENT,
    'erase KEEPS the entitlement cache — a copy of Apple\'s receipt, not the player\'s data',
    String(after['cityrunner2.ent']));
  check(after['cityrunner2.audio'] === SEED_AUDIO,
    'erase KEEPS audio preferences — a device setting, not personal data',
    String(after['cityrunner2.audio']));

  // The in-memory half of the review's point: a stale cached identity would
  // survive the storage wipe and be re-persisted verbatim by the next write.
  const fresh = await page.evaluate(async () => {
    const m = await import('/src/core/identity.js');
    return m.getIdentity();
  });
  check(fresh.id !== 'seed-id' && fresh.name !== 'SeedRunner42',
    'the in-memory identity cache is dropped too: a fresh profile is minted, not the erased one',
    JSON.stringify(fresh));

  check(!errors.length, 'erase route: no page errors', errors[0] || '');
  await ctx.close();
}

await browser.close();

console.log(`\n${failures ? `x ${failures} check(s) failed` : 'ok storage-keys — all checks passed'}`);
process.exit(failures ? 1 : 0);
