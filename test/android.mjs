/**
 * Android gate: the native project's settings, purchases going to Google
 * Play, and the system back button.
 *
 * WHAT IT GUARDS.
 *   - Google Play refuses an upload that targets an API level below its
 *     yearly minimum (36 from 31 August 2026). Capacitor's template and any
 *     later `cap add` reset it to their own default.
 *   - A tester build (every street open, invincible runs) must never be
 *     uploaded. android/app/build.gradle refuses to make a release from one;
 *     this checks the refusal is still there and still looks for the text the
 *     tester build really contains.
 *   - No Firebase or other Google SDK sneaks in through the template
 *     (docs/COMPLIANCE.md section 4), and the app asks for no permission
 *     beyond the network.
 *   - Purchases: on Android the products are registered with Google Play,
 *     on iOS still with the App Store, and the player-facing messages name
 *     the right store.
 *   - A store that never answers. Google Play Billing on a phone with no Play
 *     Store or no Google account never settles initialize(); the paywall and
 *     Restore waited for ever until iap.js put a time limit on store calls.
 *   - Back: closes an overlay, pauses a run, resumes from pause, and at the
 *     menu reports "not handled" so native.js can send the app to the
 *     background.
 *
 * WHAT IT CANNOT CHECK. The native half: whether Gradle builds, whether Play
 * Billing really charges, whether the back event fires on a phone. Those are
 * on the device checklist in docs/GOOGLE-PLAY.md. The store here is a stub
 * standing in for cordova-plugin-purchase, recording what it was asked.
 *
 * Usage: node test/android.mjs [base-url]
 */
import { webkit } from 'playwright';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveBase } from './serve.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (...p) => readFileSync(join(REPO, ...p), 'utf8');

let failures = 0;
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'ok ' : 'x  '} ${label}${detail ? `  ${detail}` : ''}`);
  if (!ok) failures++;
};

// ---- static: the native project -------------------------------------------
if (!existsSync(join(REPO, 'android', 'app', 'build.gradle'))) {
  console.log('x   android/ is missing: npx cap add android');
  process.exit(1);
}
const vars = read('android', 'variables.gradle');
const sdk = (k) => Number(vars.match(new RegExp(`${k}\\s*=\\s*(\\d+)`))?.[1]);
check(sdk('targetSdkVersion') >= 36, 'android: targets API 36 or later (Play minimum from 31 Aug 2026)',
  `targetSdkVersion=${sdk('targetSdkVersion')}`);
check(sdk('compileSdkVersion') >= sdk('targetSdkVersion'), 'android: compiles against the target API',
  `compileSdkVersion=${sdk('compileSdkVersion')}`);

const appGradle = read('android', 'app', 'build.gradle');
const appId = JSON.parse(read('capacitor.config.json')).appId;
check(appGradle.includes(`applicationId "${appId}"`), 'android: applicationId matches capacitor.config.json',
  appId);

// The release guard, and the text it looks for really being in a tester build.
const mainSrc = read('src', 'main.js');
check(/preReleaseBuild/.test(appGradle) && appGradle.includes("contains('TESTER BUILD')"),
  'android: Gradle refuses to build a release from a tester build');
check(mainSrc.includes("'TESTER BUILD'"),
  'android: the tester build still shows the text the Gradle guard looks for');

// Comments stripped: app/build.gradle explains why Firebase was taken out.
const gradleAll = [read('android', 'build.gradle'), appGradle].join('\n').replace(/^\s*\/\/.*$/gm, '');
check(!/google-services|firebase|play-services|gms:/i.test(gradleAll),
  'android: no Firebase, Play Games or other Google Play services SDK in the Gradle files');
// The one Google library allowed: Play's in-app review, which only talks to
// the Play Store (docs/COMPLIANCE.md section 1.2). Anything else from Google's
// com.google.android.play group needs the same check first.
const playLibs = [...gradleAll.matchAll(/['"](com\.google\.android\.play:[^:'"]+)/g)].map((m) => m[1]);
check(playLibs.join() === 'com.google.android.play:review',
  'android: the only Google Play library is the in-app review one', playLibs.join(', ') || 'none');

// Share and rating: the Java plugin must exist under the name native.js asks
// for, and be registered, or both calls fail silently on every phone.
const javaDir = ['android', 'app', 'src', 'main', 'java', 'uk', 'co', 'zinkin', 'cityrunner'];
const growth = existsSync(join(REPO, ...javaDir, 'GrowthPlugin.java')) ? read(...javaDir, 'GrowthPlugin.java') : '';
const nativeSrc = read('src', 'core', 'native.js');
check(/@CapacitorPlugin\(name = "Growth"\)/.test(growth) && nativeSrc.includes("registerPlugin('Growth')"),
  'android: the Growth plugin exists under the name native.js registers');
check(read(...javaDir, 'MainActivity.java').includes('registerPlugin(GrowthPlugin.class)'),
  'android: MainActivity registers the Growth plugin');
check(nativeSrc.includes(`play.google.com/store/apps/details?id=${appId}`),
  'android: sharing links to this app on Google Play');

const manifest = read('android', 'app', 'src', 'main', 'AndroidManifest.xml');
const perms = [...manifest.matchAll(/uses-permission android:name="([^"]+)"/g)].map((m) => m[1]);
check(perms.join() === 'android.permission.INTERNET', 'android: asks for the network permission only',
  perms.join(', '));

// That android:sync copies the plain build is test/release-build.mjs's check.

// ---- in the page ------------------------------------------------------------
const { base: BASE, close } = await resolveBase(process.argv[2]);
const browser = await webkit.launch();

/**
 * A page that believes it is the native app on `platform`, with a stub store
 * that records how it was set up. Must be an init script: the modules read
 * window.Capacitor and window.CdvPurchase as they load.
 */
async function nativePage(platform, path) {
  const ctx = await browser.newContext();
  await ctx.addInitScript((p) => {
    window.Capacitor = { isNativePlatform: () => true, getPlatform: () => p };
    window.__store = [];
    const self = { approved: () => self, receiptUpdated: () => self };
    window.CdvPurchase = {
      ProductType: { NON_CONSUMABLE: 'non consumable' },
      Platform: { APPLE_APPSTORE: 'ios-appstore', GOOGLE_PLAY: 'android-playstore' },
      store: {
        register: (ps) => window.__store.push(['register', ps.map((x) => x.platform)]),
        when: () => self,
        initialize: async (ps) => { window.__store.push(['initialize', ps]); },
        get: () => undefined,
        owned: () => false,
        restorePurchases: async () => { window.__store.push(['restore']); },
      },
    };
  }, platform);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/${path}`, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  return { ctx, page, errors };
}

for (const [platform, want, account] of [
  ['android', 'android-playstore', 'Google Account'],
  ['ios', 'ios-appstore', 'Apple Account'],
]) {
  const { ctx, page, errors } = await nativePage(platform, '?ui=settings');
  await page.click('#set-restore');
  await page.waitForTimeout(400);
  const got = await page.evaluate(() => ({
    calls: window.__store,
    restore: document.getElementById('set-restore-status')?.textContent || '',
  }));
  const reg = got.calls.find((c) => c[0] === 'register');
  const init = got.calls.find((c) => c[0] === 'initialize');
  check(reg && reg[1].length >= 2 && reg[1].every((p) => p === want),
    `${platform}: every product is registered with ${want}`, `${reg?.[1].length} products`);
  check(init && init[1].join() === want, `${platform}: the store initialises ${want} only`,
    JSON.stringify(init?.[1]));
  check(got.calls.some((c) => c[0] === 'restore'), `${platform}: Restore asks the store`);
  check(got.restore.includes(account), `${platform}: the restore message names the ${account}`,
    JSON.stringify(got.restore));
  const shareShown = await page.evaluate(() => getComputedStyle(document.getElementById('btn-share-over')).display !== 'none'
    || document.getElementById('btn-share-over').style.display === '');
  check(shareShown, `${platform}: the share button is enabled`);
  check(!errors.length, `${platform}: no page errors`, errors[0] || '');
  await ctx.close();
}

// ---- a store that never answers -------------------------------------------
// What Google Play Billing does on a phone with no Play Store or no Google
// account: initialize() and restorePurchases() never settle. The paywall and
// Restore must give up and say so, not wait for ever (src/core/iap.js,
// STORE_WAIT_MS).
{
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => {
    window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android' };
    const self = { approved: () => self, receiptUpdated: () => self };
    const never = () => new Promise(() => {});
    window.CdvPurchase = {
      ProductType: { NON_CONSUMABLE: 'non consumable' },
      Platform: { APPLE_APPSTORE: 'ios-appstore', GOOGLE_PLAY: 'android-playstore' },
      store: { register() {}, when: () => self, initialize: never, get: () => undefined,
        owned: () => false, restorePurchases: never },
    };
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?ui=settings`, { waitUntil: 'load' });
  await page.click('#set-restore');
  await page.waitForTimeout(21500);   // STORE_WAIT_MS for initialize, again for restore
  const restore = await page.textContent('#set-restore-status');
  check(/No previous purchase/.test(restore), 'stuck store: Restore gives up and says so', JSON.stringify(restore));
  // From a padlocked city, so there is a pack to look for.
  await page.click('#btn-settings-close');
  await page.waitForTimeout(300);
  await page.click('#city-select .city-card:has(.padlock)');
  await page.waitForTimeout(500);
  const pay = await page.textContent('#paywall-status');
  check(/not reachable/.test(pay), 'stuck store: the paywall says the store is not reachable', JSON.stringify(pay));
  await ctx.close();
}

// ---- back button --------------------------------------------------------------
// handleBack() in src/main.js, reached through the debug handle. The native
// listener that calls it only exists on an Android device.
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const on = () => page.evaluate(() => ({
    state: window.__cr.state,
    screen: document.querySelector('.screen.on')?.id || null,
  }));
  const back = () => page.evaluate(() => window.__cr.back());

  // The handle exists only on a ?view= page, so start from a run and reach
  // the menu by quitting it.
  await page.goto(`${BASE}/?view=run&god=1&seed=7`, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  let s = await on();
  check(s.state === 'run', 'back: a run is under way before pressing back', s.state);
  await back();
  await page.waitForTimeout(200);
  s = await on();
  check(s.state === 'paused' && s.screen === 'screen-paused', 'back: during a run it pauses',
    `${s.state} ${s.screen}`);
  await back();
  await page.waitForTimeout(200);
  s = await on();
  check(s.state === 'run' && s.screen === null, 'back: on the pause screen it resumes',
    `${s.state} ${s.screen}`);

  await back();
  await page.waitForTimeout(200);
  await page.click('#btn-quit');
  await page.waitForTimeout(1500);
  s = await on();
  check(s.state === 'menu' && s.screen === 'screen-menu', 'back: quitting from pause reaches the menu',
    `${s.state} ${s.screen}`);
  check(await back() === false, 'back: at the menu it is not handled, so the app goes to the background');

  await page.click('#btn-settings');
  await page.waitForTimeout(200);
  check(await back() === true, 'back: in Settings it is handled');
  await page.waitForTimeout(200);
  s = await on();
  check(s.state === 'menu' && s.screen === 'screen-menu', 'back: Settings closes to the menu',
    `${s.state} ${s.screen}`);
  check(!errors.length, 'back: no page errors', errors[0] || '');
  await ctx.close();
}

await browser.close();
await close?.();

console.log(`\n${failures ? `x ${failures} check(s) failed` : 'ok android — all checks passed'}`);
process.exit(failures ? 1 : 0);
