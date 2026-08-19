/**
 * iOS-ish UI test sweep.
 *
 * Runs the game through Playwright's WebKit build — the same engine family as
 * Safari — using real iPhone/iPad device profiles (viewport, device pixel
 * ratio, touch, Safari user agent).
 *
 * COVERAGE
 *   1. Layout audit of all 8 static screens on 3 devices
 *   2. Every city's facts + victory screen on the SMALLEST device, because
 *      the text differs per city and long copy is what overflows
 *   3. All 12 street scenes and 12 monuments render with a live canvas
 *   4. Landscape orientation
 *   5. A real interaction flow driven by taps, not synthetic clicks
 *
 * WHAT THIS CATCHES that Chrome emulation does not:
 *   - WebKit layout/CSS differences and text metrics
 *   - Realistic Safari viewport heights (an iPhone 15 gives ~659px, not 844)
 *   - Touch-only interaction paths
 *
 * WHAT IT STILL CANNOT CATCH — only a real device or Mac simulator will:
 *   - Safari's collapsing toolbars, Apple emoji glyphs
 *   - True notch insets (env(safe-area-inset-*) resolves to 0 here)
 *   - iOS audio autoplay rules, Home Screen PWA behaviour
 *
 * Usage:  node test/ios-ui.mjs [baseUrl]      (npm run test:ios)
 */
import { webkit, devices } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const BASE = process.argv[2] || 'http://localhost:4173';
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'shots');
mkdirSync(OUT, { recursive: true });

const PROFILES = [
  ['iphone-15', devices['iPhone 15']],
  ['iphone-se', devices['iPhone SE']],
  ['ipad', devices['iPad (gen 7)']],
];
const SMALLEST = ['iphone-se', devices['iPhone SE']];
const PRIMARY = ['iphone-15', devices['iPhone 15']];

const SCREENS = {
  menu: '#screen-menu', help: '#screen-help', settings: '#screen-settings',
  scores: '#screen-scores', shop: '#screen-shop', continue: '#screen-continue',
  facts: '#screen-facts', over: '#screen-over',
  pwin: '#screen-puzzle-win', paused: '#screen-paused',
};
const CITIES = ['nyc', 'paris', 'london', 'rome'];
const MIN_TAP = 44;

let failures = 0, checked = 0;
const fail = (label, lines) => {
  failures++; checked++;
  console.log(`\n✗ ${label}`);
  lines.slice(0, 8).forEach((l) => console.log('    ' + l));
};
const pass = (label) => { checked++; console.log(`✓ ${label}`); };

/** Layout problems inside a visible screen. Runs in the page. */
const AUDIT = ({ selector, MIN_TAP }) => {
  const vw = window.innerWidth, vh = window.innerHeight;
  const root = selector ? document.querySelector(selector) : document.body;
  if (!root) return { issues: ['missing ' + selector] };
  const issues = [];
  root.querySelectorAll('*').forEach((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || (!r.width && !r.height)) return;
    const name = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '')
      + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/)[0] : '');
    if (r.right > vw + 1 || r.left < -1) issues.push(`OVERFLOW-X ${name} [${Math.round(r.left)}..${Math.round(r.right)}] vw=${vw}`);
    if (r.bottom > vh + 1 && cs.position !== 'absolute' && !el.closest('.sheet') && !el.closest('.facts-list'))
      issues.push(`BELOW-FOLD ${name} bottom=${Math.round(r.bottom)} vh=${vh}`);
    const tappable = el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'INPUT';
    if (tappable && (r.height < MIN_TAP - 0.5 || r.width < MIN_TAP - 0.5))
      issues.push(`SMALL-TAP ${name} ${Math.round(r.width)}x${Math.round(r.height)}`);
    if (!el.children.length && el.scrollWidth > el.clientWidth + 2
        && cs.overflowX === 'hidden' && cs.textOverflow !== 'ellipsis')
      issues.push(`CLIPPED ${name} "${(el.textContent || '').trim().slice(0, 30)}"`);
  });
  return { vw, vh, issues };
};

async function newPage(device) {
  const browser = await webkit.launch();
  const ctx = await browser.newContext({ ...device });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 150)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 150)); });
  return { browser, page, errors };
}

// ---------------------------------------------------------------- 1. screens
for (const [pname, device] of PROFILES) {
  const { browser, page, errors } = await newPage(device);
  for (const [screen, sel] of Object.entries(SCREENS)) {
    await page.goto(`${BASE}/?ui=${screen}&city=london&level=2`, { waitUntil: 'load' });
    await page.waitForTimeout(1100);
    const res = await page.evaluate(AUDIT, { selector: sel, MIN_TAP });
    await page.screenshot({ path: join(OUT, `${pname}-${screen}.png`) });
    res.issues.length ? fail(`${pname} / ${screen} (${res.vw}x${res.vh})`, res.issues) : pass(`${pname} / ${screen}`);
  }
  if (errors.length) fail(`${pname} JS errors`, [...new Set(errors)]);
  await browser.close();
}

// ------------------------------------------- 2. per-city copy on the smallest
{
  const [pname, device] = SMALLEST;
  const { browser, page, errors } = await newPage(device);
  for (const city of CITIES) {
    for (let lv = 1; lv <= 3; lv++) {
      for (const screen of ['facts', 'pwin']) {
        await page.goto(`${BASE}/?ui=${screen}&city=${city}&level=${lv}`, { waitUntil: 'load' });
        await page.waitForTimeout(700);
        const res = await page.evaluate(AUDIT, { selector: SCREENS[screen], MIN_TAP });
        const label = `${pname} / ${screen} ${city}${lv}`;
        if (res.issues.length) {
          await page.screenshot({ path: join(OUT, `${pname}-${screen}-${city}${lv}.png`) });
          fail(label, res.issues);
        } else pass(label);
      }
    }
  }
  if (errors.length) fail(`${pname} copy-sweep JS errors`, [...new Set(errors)]);
  await browser.close();
}

// ------------------------------------------------ 3. every scene renders
{
  const [pname, device] = PRIMARY;
  const { browser, page, errors } = await newPage(device);
  for (const city of CITIES) {
    for (let lv = 1; lv <= 3; lv++) {
      for (const mode of ['run', 'puzzle']) {
        const url = `${BASE}/?view=${mode}&city=${city}&level=${lv}${mode === 'run' ? '&god=1' : ''}`;
        await page.goto(url, { waitUntil: 'load' });
        await page.waitForTimeout(2400);
        const ok = await page.evaluate(() => {
          const c = document.querySelector('#app canvas');
          const gl = c && c.getContext('webgl2');
          return { has: !!c, w: c ? c.width : 0, hud: document.getElementById('hud').classList.contains('on') };
        });
        const label = `${pname} / ${mode} ${city}${lv}`;
        if (!ok.has || !ok.w || !ok.hud) {
          await page.screenshot({ path: join(OUT, `FAIL-${mode}-${city}${lv}.png`) });
          fail(label, [`canvas=${ok.has} w=${ok.w} hud=${ok.hud}`]);
        } else pass(`${label} (${ok.w}px)`);
      }
    }
  }
  if (errors.length) fail(`${pname} scene JS errors`, [...new Set(errors)]);
  await browser.close();
}

// ------------------------------------------------------------ 4. landscape
{
  const device = { ...devices['iPhone 15 landscape'] };
  const { browser, page, errors } = await newPage(device);
  for (const screen of ['menu', 'help', 'settings', 'pwin']) {
    await page.goto(`${BASE}/?ui=${screen}&city=rome&level=3`, { waitUntil: 'load' });
    await page.waitForTimeout(900);
    const res = await page.evaluate(AUDIT, { selector: SCREENS[screen], MIN_TAP });
    await page.screenshot({ path: join(OUT, `landscape-${screen}.png`) });
    res.issues.length ? fail(`landscape / ${screen} (${res.vw}x${res.vh})`, res.issues) : pass(`landscape / ${screen}`);
  }
  await page.goto(`${BASE}/?view=run&city=nyc&level=3&god=1`, { waitUntil: 'load' });
  await page.waitForTimeout(2200);
  const ok = await page.evaluate(() => !!document.querySelector('#app canvas')?.width);
  ok ? pass('landscape / run renders') : fail('landscape / run renders', ['no canvas']);
  if (errors.length) fail('landscape JS errors', [...new Set(errors)]);
  await browser.close();
}

// -------------------------------------------------- 5. touch interaction flow
{
  const [pname, device] = PRIMARY;
  const { browser, page, errors } = await newPage(device);
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  const steps = [];
  const shown = (id) => page.evaluate((i) => document.getElementById(i).classList.contains('on'), id);

  await page.tap('#btn-help');
  await page.waitForTimeout(350);
  steps.push(['help opens by tap', await shown('screen-help')]);
  await page.tap('#btn-help-close');
  await page.waitForTimeout(350);
  steps.push(['help closes', await shown('screen-menu')]);

  await page.tap('#btn-settings');
  await page.waitForTimeout(350);
  const before = await page.textContent('#set-music');
  await page.tap('#set-music');
  await page.waitForTimeout(250);
  steps.push(['music toggles by tap', (await page.textContent('#set-music')) !== before]);
  await page.tap('#set-music');
  await page.tap('#btn-settings-close');
  await page.waitForTimeout(350);
  steps.push(['settings closes', await shown('screen-menu')]);

  await page.tap('#btn-play');
  await page.waitForTimeout(2200);
  steps.push(['run starts by tap', await page.evaluate(() => document.getElementById('hud').classList.contains('on'))]);
  await page.tap('#btn-pause');
  await page.waitForTimeout(400);
  steps.push(['pause by tap', await shown('screen-paused')]);
  await page.tap('#btn-resume');
  await page.waitForTimeout(400);
  steps.push(['resume by tap', !(await shown('screen-paused'))]);

  const bad = steps.filter(([, ok]) => !ok).map(([n]) => n + ' FAILED');
  bad.length ? fail(`${pname} interaction flow`, bad) : pass(`${pname} interaction flow (${steps.length} steps)`);
  if (errors.length) fail(`${pname} interaction JS errors`, [...new Set(errors)]);
  await browser.close();
}

console.log(`\n${failures ? '✗' : '✓'} ${checked} checks — ${failures} failing`);
console.log(`screenshots: ${OUT}`);
process.exit(failures ? 1 : 0);
