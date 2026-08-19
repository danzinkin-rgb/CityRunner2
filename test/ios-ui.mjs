/**
 * iOS-ish UI test sweep.
 *
 * Runs every screen through Playwright's WebKit build — the same engine family
 * as Safari — using real iPhone device profiles (viewport, device pixel ratio,
 * touch, Safari user agent).
 *
 * WHAT THIS CATCHES that Chrome emulation does not:
 *   - WebKit layout and CSS differences (flex/grid edge cases, backdrop-filter,
 *     clamp(), -webkit-* prefixes, safe-area-inset resolution)
 *   - WebKit text metrics, so genuine text clipping shows up
 *   - Touch-only interaction paths
 *
 * WHAT IT STILL CANNOT CATCH — only a real device or a Mac simulator will:
 *   - Safari's collapsing top/bottom toolbars eating vertical space
 *   - Apple's emoji glyphs (these render with Windows fonts here)
 *   - True notch/home-indicator insets (env(safe-area-inset-*) is 0 here)
 *   - iOS audio autoplay restrictions and Home Screen PWA behaviour
 *
 * Usage:  node test/ios-ui.mjs [baseUrl]
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

const SCREENS = ['menu', 'help', 'settings', 'scores', 'facts', 'over', 'pwin', 'paused'];
const SCENES = [
  ['run-nyc3', 'view=run&city=nyc&level=3&god=1'],
  ['run-london2', 'view=run&city=london&level=2&god=1'],
  ['run-paris1', 'view=run&city=paris&level=1&god=1'],
  ['run-rome3', 'view=run&city=rome&level=3&god=1'],
  ['pz-pantheon', 'view=puzzle&city=rome&level=3'],
  ['pz-eiffel', 'view=puzzle&city=paris&level=1'],
];

const MIN_TAP = 44;   // Apple HIG minimum touch target, in points

/** Measure layout problems inside the currently visible screen. */
const AUDIT = ({ selector, MIN_TAP }) => {
  const vw = window.innerWidth, vh = window.innerHeight;
  const root = selector ? document.querySelector(selector) : document.body;
  if (!root) return { fatal: 'missing ' + selector };
  const issues = [];
  root.querySelectorAll('*').forEach((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    if (!r.width && !r.height) return;
    const name = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '')
      + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/)[0] : '');
    if (r.right > vw + 1 || r.left < -1) issues.push(`OVERFLOW-X ${name} [${Math.round(r.left)}..${Math.round(r.right)}] vw=${vw}`);
    if (r.bottom > vh + 1 && cs.position !== 'absolute' && !el.closest('.sheet')) issues.push(`BELOW-FOLD ${name}`);
    const tappable = el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'INPUT';
    if (tappable && (r.height < MIN_TAP - 0.5 || r.width < MIN_TAP - 0.5)) {
      issues.push(`SMALL-TAP ${name} ${Math.round(r.width)}x${Math.round(r.height)} (min ${MIN_TAP})`);
    }
    // real text clipping (leaf nodes only, excluding intentional scrollers)
    if (!el.children.length && el.scrollWidth > el.clientWidth + 2
        && cs.overflowX === 'hidden' && cs.textOverflow !== 'ellipsis') {
      issues.push(`CLIPPED ${name} "${(el.textContent || '').trim().slice(0, 30)}"`);
    }
  });
  return { vw, vh, scrollW: document.documentElement.scrollWidth, issues };
};

let failures = 0, checked = 0;

for (const [profileName, device] of PROFILES) {
  const browser = await webkit.launch();
  const ctx = await browser.newContext({ ...device });
  const page = await ctx.newPage();

  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 160)); });

  for (const screen of SCREENS) {
    await page.goto(`${BASE}/?ui=${screen}&city=london&level=2`, { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    const idMap = {
      menu: '#screen-menu', help: '#screen-help', settings: '#screen-settings',
      scores: '#screen-scores', facts: '#screen-facts', over: '#screen-over',
      pwin: '#screen-puzzle-win', paused: '#screen-paused',
    };
    const res = await page.evaluate(AUDIT, { selector: idMap[screen], MIN_TAP });
    checked++;
    await page.screenshot({ path: join(OUT, `${profileName}-${screen}.png`) });
    if (res.issues && res.issues.length) {
      failures++;
      console.log(`\n✗ ${profileName} / ${screen}  (${res.vw}x${res.vh})`);
      res.issues.slice(0, 10).forEach((i) => console.log('    ' + i));
    } else {
      console.log(`✓ ${profileName} / ${screen}`);
    }
  }

  // 3D scenes: assert they render and produce no errors
  for (const [name, qs] of SCENES) {
    await page.goto(`${BASE}/?${qs}`, { waitUntil: 'load' });
    await page.waitForTimeout(2600);
    const ok = await page.evaluate(() => {
      const c = document.querySelector('#app canvas');
      return { hasCanvas: !!c, w: c ? c.width : 0, hudOn: document.getElementById('hud').classList.contains('on') };
    });
    checked++;
    await page.screenshot({ path: join(OUT, `${profileName}-${name}.png`) });
    if (!ok.hasCanvas || !ok.w) {
      failures++;
      console.log(`✗ ${profileName} / ${name} — no canvas rendered`);
    } else {
      console.log(`✓ ${profileName} / ${name} (canvas ${ok.w}px)`);
    }
  }

  if (errors.length) {
    failures++;
    console.log(`\n✗ ${profileName} JS errors:`);
    [...new Set(errors)].slice(0, 8).forEach((e) => console.log('    ' + e));
  }

  await browser.close();
}

console.log(`\n${failures ? '✗' : '✓'} ${checked} checks across ${PROFILES.length} devices — ${failures} failing group(s)`);
console.log(`screenshots: ${OUT}`);
process.exit(failures ? 1 : 0);
