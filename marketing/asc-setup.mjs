/**
 * Creates whatever App Store Connect items the released game needs and does
 * not have yet: Game Center leaderboards and achievements for every released
 * city, the daily leaderboard for the current DAILY.version, and a £0.99
 * region pack for every region with a released paid city. Safe to re-run:
 * anything that already exists is left alone (and listed).
 *
 *   ASC_KEY_ID=<key> node marketing/asc-setup.mjs           show what is missing
 *   ASC_KEY_ID=<key> node marketing/asc-setup.mjs --apply   create it
 *
 * Needs an API key with the App Manager role (marketing/asc.mjs; the default
 * key there is Sales-only and gets HTTP 403 here). Nothing is submitted for
 * review: new items still have to be added to the version in App Store
 * Connect, and submitted, by hand.
 *
 * What it makes, matching the items made by hand before it:
 *   leaderboard.<city>         "<City> High Score", Classic, best, high to low
 *   achievement.city.<city>    "<City> Master", 0 points (docs/RELEASES.md),
 *                              with test/shots/achv/achv_<city>.png as badge
 *   leaderboard.daily.v<N>     Recurring daily from the next UTC midnight
 *   pack.<region>              £0.99 non-consumable in every territory, with
 *                              test/shots/iap-review-<region>.png for review
 */
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { asc } from './asc.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APPLY = process.argv.includes('--apply');
const APP = '6806808248';
const NS = 'uk.co.zinkin.cityrunner';

// ---- what the game says should exist ----------------------------------------
const load = async (rel) => import(`data:text/javascript,${encodeURIComponent(readFileSync(join(ROOT, rel), 'utf8'))}`);
const { ALL_CITIES, REGIONS } = await load('src/cities/themes.js');
const { RELEASE_QUEUE } = await load('src/cities/releases.js');
const ent = readFileSync(join(ROOT, 'src/core/entitlements.js'), 'utf8');
const FREE = JSON.parse(ent.match(/FREE_CITIES = (\[[^\]]*\])/)[1].replace(/'/g, '"'));
const PACKS = Object.fromEntries([...ent.matchAll(/^\s+'?([a-z-]+)'?: '(uk\.co\.zinkin\.cityrunner\.pack\.[a-z]+)',/gm)].map((m) => [m[1], m[2]]));
const DAILY_V = +readFileSync(join(ROOT, 'src/core/rng.js'), 'utf8').match(/DAILY = \{ version: (\d+)/)[1];

const released = ALL_CITIES.filter((c) => !RELEASE_QUEUE.includes(c.id));
const title = (s) => s.toLowerCase().replace(/(^|[\s-])\S/g, (m) => m.toUpperCase());
const paidByRegion = {};
for (const c of released) if (!FREE.includes(c.id)) (paidByRegion[c.region] ||= []).push(title(c.name));

// short store copy per pack (display name max 30, description max 55)
const PACK_COPY = {
  europe: ['Europe Pack', 'Unlock Rome and every new city in Europe.'],
  'north-america': ['North America Pack', 'San Francisco and every new North American city.'],
  'mideast-africa': ['Middle East & Africa Pack', 'Marrakech, Cape Town and Zanzibar, plus new cities.'],
  'latin-america': ['Latin America Pack', 'Mexico City, Havana and Buenos Aires, plus new cities.'],
  'east-asia': ['East Asia Pack', 'Beijing, Seoul and Hanoi, plus every new city there.'],
  'south-asia': ['South & Central Asia Pack', 'Delhi, Bangkok and Samarkand, plus new cities there.'],
};
const reviewNote = (region) => `One-time non-consumable purchase. It unlocks the paid cities in one region (${REGIONS[region]}): currently ${paidByRegion[region].join(', ')}, and any city added to that region later. ${FREE.map((id) => title(ALL_CITIES.find((c) => c.id === id).name)).join(', ').replace(/, ([^,]*)$/, ' and $1')} remain free. A Founder unlock (already approved) unlocks everything. Restore Purchases is in Settings and on the purchase screen. No account or login is needed.`;

// ---- what App Store Connect has ------------------------------------------------
const gc = (await asc(`/v1/apps/${APP}/gameCenterDetail`)).data.id;
const lbs = (await asc(`/v1/gameCenterDetails/${gc}/gameCenterLeaderboards?limit=200`)).data;
const achs = (await asc(`/v1/gameCenterDetails/${gc}/gameCenterAchievements?limit=200`)).data;
const iaps = (await asc(`/v1/apps/${APP}/inAppPurchasesV2?limit=200`)).data;
const hasLb = (id) => lbs.some((l) => l.attributes.vendorIdentifier === id);
const hasAch = (id) => achs.some((a) => a.attributes.vendorIdentifier === id);
const iapBy = (pid) => iaps.find((i) => i.attributes.productId === pid);

const rel = (type, id) => ({ data: { type, id } });
const post = (path, data, included) => asc(path, { method: 'POST', body: { data, ...(included ? { included } : {}) } });
async function upload(reservation, buf) {
  for (const op of reservation.data.attributes.uploadOperations) {
    const res = await fetch(op.url, {
      method: op.method,
      headers: Object.fromEntries((op.requestHeaders || []).map((h) => [h.name, h.value])),
      body: buf.subarray(op.offset, op.offset + op.length),
    });
    if (!res.ok) throw new Error(`upload ${op.url}: HTTP ${res.status}`);
  }
}
const md5 = (buf) => createHash('md5').update(buf).digest('hex');

const todo = [];

// ---- leaderboards and achievements for every released city ---------------------
for (const c of released) {
  const name = title(c.name);
  const lb = `${NS}.leaderboard.${c.id}`;
  if (!hasLb(lb)) todo.push([`leaderboard ${lb}`, async () => {
    const r = await post('/v1/gameCenterLeaderboards', {
      type: 'gameCenterLeaderboards',
      attributes: { referenceName: `${name} High Score`, vendorIdentifier: lb, defaultFormatter: 'INTEGER', submissionType: 'BEST_SCORE', scoreSortType: 'DESC' },
      relationships: { gameCenterDetail: rel('gameCenterDetails', gc) },
    });
    await post('/v1/gameCenterLeaderboardLocalizations', {
      type: 'gameCenterLeaderboardLocalizations', attributes: { locale: 'en-US', name: `${name} High Score` },
      relationships: { gameCenterLeaderboard: rel('gameCenterLeaderboards', r.data.id) },
    });
  }]);
  const ach = `${NS}.achievement.city.${c.id}`;
  if (!hasAch(ach)) todo.push([`achievement ${ach} (0 points)`, async () => {
    const badge = join(ROOT, 'test', 'shots', 'achv', `achv_${c.id}.png`);
    if (!existsSync(badge)) throw new Error(`missing badge ${badge}`);
    const r = await post('/v1/gameCenterAchievements', {
      type: 'gameCenterAchievements',
      attributes: { referenceName: `${name} Master`, vendorIdentifier: ach, points: 0, showBeforeEarned: true, repeatable: false },
      relationships: { gameCenterDetail: rel('gameCenterDetails', gc) },
    });
    const loc = await post('/v1/gameCenterAchievementLocalizations', {
      type: 'gameCenterAchievementLocalizations',
      attributes: { locale: 'en-US', name: `${name} Master`, beforeEarnedDescription: `Earn all 3 stars in ${name}.`, afterEarnedDescription: `Earned all 3 stars in ${name}.` },
      relationships: { gameCenterAchievement: rel('gameCenterAchievements', r.data.id) },
    });
    const buf = readFileSync(badge);
    const img = await post('/v1/gameCenterAchievementImages', {
      type: 'gameCenterAchievementImages', attributes: { fileName: `achv_${c.id}.png`, fileSize: buf.length },
      relationships: { gameCenterAchievementLocalization: rel('gameCenterAchievementLocalizations', loc.data.id) },
    });
    await upload(img, buf);
    await asc(`/v1/gameCenterAchievementImages/${img.data.id}`, { method: 'PATCH', body: { data: { type: 'gameCenterAchievementImages', id: img.data.id, attributes: { uploaded: true } } } });
  }]);
}

// ---- the daily leaderboard for this DAILY.version ---------------------------------
const daily = `${NS}.leaderboard.daily.v${DAILY_V}`;
if (!hasLb(daily)) todo.push([`leaderboard ${daily} (recurring daily)`, async () => {
  const d = new Date(); d.setUTCHours(24, 0, 0, 0);   // next UTC midnight, when the daily turns over
  const r = await post('/v1/gameCenterLeaderboards', {
    type: 'gameCenterLeaderboards',
    attributes: {
      referenceName: `Daily Challenge High Score v${DAILY_V}`, vendorIdentifier: daily, defaultFormatter: 'INTEGER',
      submissionType: 'BEST_SCORE', scoreSortType: 'DESC',
      recurrenceStartDate: d.toISOString().replace('.000', ''), recurrenceDuration: 'PT24H', recurrenceRule: 'FREQ=DAILY;INTERVAL=1',
    },
    relationships: { gameCenterDetail: rel('gameCenterDetails', gc) },
  });
  await post('/v1/gameCenterLeaderboardLocalizations', {
    type: 'gameCenterLeaderboardLocalizations', attributes: { locale: 'en-US', name: 'Daily Challenge' },
    relationships: { gameCenterLeaderboard: rel('gameCenterLeaderboards', r.data.id) },
  });
}]);

// ---- region packs ---------------------------------------------------------------------
const territories = (await asc('/v1/territories?limit=200')).data.map((t) => ({ type: 'territories', id: t.id }));
for (const [region, pid] of Object.entries(PACKS)) {
  if (!paidByRegion[region]) continue;                     // no released paid city: not needed yet
  const existing = iapBy(pid);
  if (existing) {
    if (existing.attributes.reviewNote !== reviewNote(region)) todo.push([`update review notes of ${pid}`, () =>
      asc(`/v2/inAppPurchases/${existing.id}`, { method: 'PATCH', body: { data: { type: 'inAppPurchases', id: existing.id, attributes: { reviewNote: reviewNote(region) } } } })]);
    if (existing.attributes.state === 'MISSING_METADATA') todo.push([`finish ${pid}`, () => finishPack(existing.id, region, pid)]);
    // The store description names the pack's cities, so it is kept in step
    // too (Jerusalem left the Middle East & Africa pack when it became free).
    const [displayName, description] = PACK_COPY[region];
    const l10n = (await asc(`/v2/inAppPurchases/${existing.id}/inAppPurchaseLocalizations`)).data.find((l) => l.attributes.locale === 'en-GB');
    if (l10n && (l10n.attributes.description !== description || l10n.attributes.name !== displayName)) todo.push([`update store description of ${pid}`, () =>
      asc(`/v1/inAppPurchaseLocalizations/${l10n.id}`, { method: 'PATCH', body: { data: { type: 'inAppPurchaseLocalizations', id: l10n.id, attributes: { name: displayName, description } } } })]);
    continue;
  }
  todo.push([`pack ${pid} at £0.99`, async () => {
    const r = await asc('/v2/inAppPurchases', { method: 'POST', body: { data: {
      type: 'inAppPurchases',
      attributes: { name: PACK_COPY[region][0].replace('&', 'and'), productId: pid, inAppPurchaseType: 'NON_CONSUMABLE', reviewNote: reviewNote(region), familySharable: false },
      relationships: { app: rel('apps', APP) },
    } } });
    await finishPack(r.data.id, region, pid);
  }]);
}

// A pack is several records (localisation, price, availability, review
// screenshot); Apple sometimes fails one with a 500, so each is checked and
// made separately, and a re-run finishes a half-made pack.
const missing = async (path) => { try { return !(await asc(path)).data; } catch (e) { if (e.status === 404) return true; throw e; } };
async function finishPack(id, region, pid) {
  const [displayName, description] = PACK_COPY[region];
  if (!(await asc(`/v2/inAppPurchases/${id}/inAppPurchaseLocalizations`)).data.length) await post('/v1/inAppPurchaseLocalizations', {
    type: 'inAppPurchaseLocalizations', attributes: { locale: 'en-GB', name: displayName, description },
    relationships: { inAppPurchaseV2: rel('inAppPurchases', id) },
  });
  if (await missing(`/v2/inAppPurchases/${id}/appStoreReviewScreenshot`)) {
    const shotFile = join(ROOT, 'test', 'shots', `iap-review-${pid.split('.').pop()}.png`);
    if (!existsSync(shotFile)) throw new Error(`missing review screenshot ${shotFile}`);
    const buf = readFileSync(shotFile);
    const shot = await post('/v1/inAppPurchaseAppStoreReviewScreenshots', {
      type: 'inAppPurchaseAppStoreReviewScreenshots', attributes: { fileName: `iap-review-${pid.split('.').pop()}.png`, fileSize: buf.length },
      relationships: { inAppPurchaseV2: rel('inAppPurchases', id) },
    });
    await upload(shot, buf);
    await asc(`/v1/inAppPurchaseAppStoreReviewScreenshots/${shot.data.id}`, { method: 'PATCH', body: { data: { type: 'inAppPurchaseAppStoreReviewScreenshots', id: shot.data.id, attributes: { uploaded: true, sourceFileChecksum: md5(buf) } } } });
  }
  if (await missing(`/v2/inAppPurchases/${id}/inAppPurchaseAvailability`)) await post('/v1/inAppPurchaseAvailabilities', {
    type: 'inAppPurchaseAvailabilities', attributes: { availableInNewTerritories: true },
    relationships: { inAppPurchase: rel('inAppPurchases', id), availableTerritories: { data: territories } },
  });
  // An App Manager key is refused (403) here, so this goes last: everything
  // else is in place and only the price is left for the App Store Connect page.
  if (await missing(`/v2/inAppPurchases/${id}/iapPriceSchedule`)) {
    const points = (await asc(`/v2/inAppPurchases/${id}/pricePoints?filter[territory]=GBR&limit=200`)).data;
    const point = points.find((p) => p.attributes.customerPrice === '0.99');
    if (!point) throw new Error('no £0.99 price point');
    await post('/v1/inAppPurchasePriceSchedules', {
      type: 'inAppPurchasePriceSchedules',
      relationships: { inAppPurchase: rel('inAppPurchases', id), baseTerritory: rel('territories', 'GBR'), manualPrices: { data: [{ type: 'inAppPurchasePrices', id: '${price}' }] } },
    }, [{ type: 'inAppPurchasePrices', id: '${price}', attributes: { startDate: null }, relationships: { inAppPurchasePricePoint: rel('inAppPurchasePricePoints', point.id) } }]);
  }
}

// ---- report, and apply ------------------------------------------------------------
console.log(`${released.length} released cities; daily v${DAILY_V}; ${Object.keys(paidByRegion).length} regions with paid cities.`);
if (!todo.length) { console.log('Nothing missing.'); process.exit(0); }
console.log(`${APPLY ? 'Creating' : 'Missing'} (${todo.length}):`);
let failed = 0;
for (const [label, fn] of todo) {
  if (!APPLY) { console.log(`  - ${label}`); continue; }
  try { await fn(); console.log(`  ok  ${label}`); } catch (e) { failed++; console.log(`  x   ${label}: ${String(e.message).slice(0, 300)}`); }
}
if (!APPLY) console.log('\nRun again with --apply to create these.');
process.exit(failed ? 1 : 0);
