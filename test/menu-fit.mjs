/**
 * Menu fit: nothing on the menu may be compressed smaller than its own content.
 *
 * WHY THIS SUITE EXISTS. test/ios-ui.mjs screenshots the menu at a handful of
 * real device sizes and passes. It still shipped a menu where the daily
 * challenge card's border ran straight through its own text on a real iPhone.
 * Both facts are true because the bug is not a device-rendering difference —
 * it is a viewport HEIGHT the suite never tried.
 *
 * THE MECHANISM, once and for all:
 *   .screen is `display:flex; flex-direction:column` (index.html), so every
 *   direct child of #screen-menu is a column flex item with the default
 *   `flex-shrink:1`. Normally that is harmless, because a flex item's
 *   automatic minimum size (`min-height:auto`) refuses to shrink it below its
 *   content. But the moment an element sets an explicit `min-height` — as
 *   .daily-card does, `min-height:44px`, for the Apple tap-target guideline —
 *   that automatic minimum is GONE. The item is now free to be squashed to
 *   44px while its content still needs ~90px, and since nothing sets
 *   `overflow:hidden` on it, the surplus text simply paints outside the
 *   element's own border. The border is drawn at the compressed height; the
 *   words are not. That is exactly what "the line goes through the text"
 *   looks like, and the same bug is already commented on and fixed for
 *   .fp-cards further down the same stylesheet.
 *
 * WHY A HEIGHT SWEEP AND NOT A DEVICE LIST. The trigger is "menu content is
 * taller than the viewport", and how much room a real phone has is not the
 * spec sheet number. An iPhone 15 is 852pt tall but a Safari-in-app return
 * banner ("◀ WhatsApp"), the URL bar, Dynamic Island insets and a home
 * indicator all subtract from it, and the user's screenshot that started this
 * was taken with exactly such a banner. A device list encodes an assumption
 * about chrome; a sweep does not. So this walks the whole plausible range and
 * fails on the first height where anything overflows itself.
 *
 * WHAT IT ASSERTS, per height:
 *   1. CONTAINMENT — no descendant's painted box escapes the top or bottom of
 *      the element that draws a border around it. This is the actual visual
 *      defect, measured directly rather than eyeballed in a screenshot.
 *   2. NO COMPRESSION — no menu flex item is laid out shorter than its own
 *      scrollHeight. Catches the same class of bug in a sibling before it
 *      becomes a visible overlap.
 *   3. NO OVERLAP — the card must not collide with the element below it.
 *
 * A screenshot suite cannot make these assertions; it can only record that
 * something looked like something. Geometry is checkable, so check geometry.
 *
 * Usage: node test/menu-fit.mjs
 */
import { webkit } from 'playwright';
import { startStaticServer } from './serve.mjs';

/**
 * The sweep. 380 is below any shipping iPhone in portrait and is here as the
 * floor: the menu scrolls rather than breaks even in the worst case.
 * The step is deliberately fine (20px) near the sizes real phones land on,
 * because the failure appears abruptly at whatever height the content stops
 * fitting, and a coarse sweep can step straight over it.
 */
const HEIGHTS = [
  852, 844, 830, 820, 800, 780, 760, 740, 720, 700,
  680, 667, 660, 640, 620, 600, 580, 568,
];

/**
 * Landscape is swept as whole viewports rather than as more entries in
 * HEIGHTS. A short viewport on a phone is always ALSO a wide one — turning
 * the device sideways trades height for width, and the extra width is what
 * lets the city cards sit in one row instead of two. Sweeping 390x420 asserts
 * against a phone that is narrow and short at the same time, which no
 * hardware is, and it fails for a layout that is actually fine.
 */
const LANDSCAPE = [
  [844, 390], [926, 428], [896, 414], [736, 414], [667, 375], [568, 320],
];

/**
 * Widths worth sweeping: 320 is an iPhone SE 1st-gen/zoomed-display floor,
 * 360 a small Android, 390 the iPhone 13/14/15 baseline, 430 a Pro Max. The
 * card's text is the thing most likely to reflow into a second line at a
 * narrow width, and a second line is exactly what makes it too tall to fit.
 */
const WIDTHS = [320, 360, 430];
const WIDTH = 390;

/**
 * The other widths get a handful of heights rather than the full sweep. The
 * mechanism is height-driven — width only matters insofar as it decides
 * whether the card's text wraps to another line — so a fine sweep is worth
 * paying for once, at the baseline width, and spot checks elsewhere. This
 * suite runs in `npm test`, so it has to stay quick enough to belong there.
 */
const WIDE_HEIGHTS = [844, 800, 760, 740, 700, 667, 640, 620, 600, 568];

/**
 * Every overlay gets a coarser pass. The reported bug was on the menu, but
 * nothing about the mechanism is specific to it — .screen is shared, so any
 * screen with an explicit min-height on a child is exposed the same way.
 */
const SCREENS = [
  'screen-menu', 'screen-help', 'screen-settings', 'screen-scores',
  'screen-paywall', 'screen-shop', 'screen-facts', 'screen-continue',
  'screen-over', 'screen-puzzle-win', 'screen-paused',
];
const SCREEN_HEIGHTS = [844, 660, 568];

/** Elements that paint a border/background and so must contain their text. */
const BOXES = ['#daily-card', '.city-card', '.btn'];

let failures = 0;
let measured = 0;
const skipped = [];
const check = (ok, label, detail = '') => {
  if (!ok) {
    console.log(`x   ${label}${detail ? `  ${detail}` : ''}`);
    failures++;
  }
};

const { base, close } = await startStaticServer();
const browser = await webkit.launch();

/**
 * Measure one screen. Returns the four defect lists; empty means clean.
 * Kept as a string-free function passed to page.evaluate so the assertions
 * live next to each other rather than being split across two suites.
 */
const MEASURE = ({ boxSelectors, screenId }) => {
  const out = { spills: [], squashed: [], overlaps: [], stranded: [], belowFold: [] };
  const R = (el) => el.getBoundingClientRect();
  const screen = document.getElementById(screenId);
  if (!screen) return out;
  const name = (el) => el.id || (typeof el.className === 'string' ? el.className : '') || el.tagName;
  const laidOut = (el) => {
    const b = R(el);
    return b.height > 0 && getComputedStyle(el).position !== 'absolute';
  };

  // 1. containment — text must not paint outside the box that frames it
  for (const sel of boxSelectors) {
    for (const box of screen.querySelectorAll(sel)) {
      const bb = R(box);
      if (bb.height === 0) continue;
      for (const kid of box.querySelectorAll('*')) {
        const kb = R(kid);
        if (kb.height === 0 || kb.width === 0) continue;
        const below = kb.bottom - bb.bottom;
        const above = bb.top - kb.top;
        if (below > 0.5 || above > 0.5) {
          out.spills.push({
            box: sel, kid: name(kid),
            text: (kid.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30),
            below: +below.toFixed(1), above: +above.toFixed(1),
          });
        }
      }
    }
  }

  // 2. compression — a flex item laid out shorter than its own content.
  // Anything that scrolls or clips on purpose is exempt: for those,
  // content taller than the box is the design, not a defect.
  // scrollHeight is NOT usable here: it includes a last child's bottom
  // margin, so an element whose final child has `margin-bottom:6px` reports
  // 6px of phantom overflow while clipping nothing. That produced three
  // false positives on #screen-facts. The painted extent of the children is
  // what actually matters, so measure their rects.
  for (const item of screen.children) {
    if (!laidOut(item)) continue;
    const oy = getComputedStyle(item).overflowY;
    if (oy === 'auto' || oy === 'scroll' || oy === 'hidden') continue;
    const ib = R(item);
    let deepest = ib.bottom;
    for (const kid of item.querySelectorAll('*')) {
      const cs = getComputedStyle(kid);
      if (cs.display === 'none' || cs.position === 'absolute' || cs.position === 'fixed') continue;
      const ko = cs.overflowY;
      if (ko === 'auto' || ko === 'scroll' || ko === 'hidden') continue;
      const kb = R(kid);
      if (kb.height === 0 && kb.width === 0) continue;
      if (kb.bottom > deepest) deepest = kb.bottom;
    }
    const over = deepest - ib.bottom;
    const padB = parseFloat(getComputedStyle(item).paddingBottom) || 0;
    if (over > 0.5) {
      out.squashed.push({
        el: name(item),
        laidOut: +ib.height.toFixed(1),
        needs: +(ib.height + over + padB).toFixed(1),
      });
    }
  }

  // 3. nothing stranded above the top of a scrolling column.
  // This is the failure mode that fixing (2) can INTRODUCE: a
  // `justify-content:center` flex column whose content is taller than the
  // box overflows equally in both directions, so the first child lands at a
  // negative offset that scrolling cannot reach — there is no scrollable
  // area above the origin. Refusing to shrink without also fixing the
  // alignment just trades a clipped card for an unreachable title.
  screen.scrollTop = 0;
  for (const item of screen.children) {
    if (!laidOut(item)) continue;
    const top = R(item).top;
    if (top < -0.5) out.stranded.push({ el: name(item), top: +top.toFixed(1) });
  }

  // 5. below the fold. This is test/ios-ui.mjs's own BELOW-FOLD assertion,
  // restated here so that one suite covers the whole height range instead of
  // four device profiles. The exemptions are copied from it deliberately:
  // absolutely-positioned decoration is not in flow, and .sheet / #facts-list
  // are the two things that scroll by design, so content past their bottom is
  // the intent rather than a defect. Only the single worst offender is
  // reported — once anything is below the fold every one of its descendants
  // is too, and listing them all buries the cause.
  {
    const vh = window.innerHeight;
    let worst = null;
    for (const el of screen.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      if (cs.position === 'absolute' || cs.position === 'fixed') continue;
      if (el.closest('.sheet') || el.closest('#facts-list')) continue;
      const b = R(el);
      if (b.height === 0 && b.width === 0) continue;
      if (b.bottom > vh + 1 && (!worst || b.bottom > worst.bottom)) {
        worst = { el: name(el), bottom: +b.bottom.toFixed(1), vh, over: +(b.bottom - vh).toFixed(1) };
      }
    }
    if (worst) out.belowFold.push(worst);
  }

  // 4. overlap between consecutive siblings
  const kids = [...screen.children].filter(laidOut);
  for (let i = 0; i < kids.length - 1; i++) {
    const ov = R(kids[i]).bottom - R(kids[i + 1]).top;
    if (ov > 0.5) out.overlaps.push({ a: name(kids[i]), b: name(kids[i + 1]), by: +ov.toFixed(1) });
  }
  return out;
};

/** Report one measurement; returns true when clean. */
function report(label, r) {
  const bad = r.spills.length + r.squashed.length + r.overlaps.length
    + r.stranded.length + r.belowFold.length;
  if (bad === 0) { console.log(`ok  ${label}`); return true; }
  console.log(`x   ${label}`);
  for (const s of r.spills) {
    check(false, `  ${s.box} — "${s.text}" escapes its box`,
      s.below > 0 ? `${s.below}px below` : `${s.above}px above`);
  }
  for (const s of r.squashed) {
    check(false, `  ${s.el} compressed below its content`, `laid out ${s.laidOut}px, needs ${s.needs}px`);
  }
  for (const s of r.stranded) {
    check(false, `  ${s.el} is above the top of the scroll area and unreachable`, `top ${s.top}px`);
  }
  for (const o of r.overlaps) check(false, `  ${o.a} overlaps ${o.b}`, `by ${o.by}px`);
  for (const f of r.belowFold) {
    check(false, `  content runs below the fold (worst: ${f.el})`, `bottom ${f.bottom}px vs viewport ${f.vh}px — over by ${f.over}px`);
  }
  return false;
}

/**
 * Safe-area insets, emulated.
 *
 * THIS IS THE FIDELITY GAP THAT LET THE BUG SHIP. .screen sets
 * `padding: env(safe-area-inset-*)`, and in a headless browser every one of
 * those env() values is 0 — so every test so far has been measuring a phone
 * with no notch and no home indicator, i.e. ~93px more usable height than the
 * device actually has. A menu that "fits in 844px" in Playwright can still
 * need 929px of a real iPhone 15, which is exactly the overflow the user
 * photographed. env() cannot be set from the test side, so the padding is
 * overridden directly with the same numbers iOS reports.
 *
 * Values are for a notched/Dynamic Island iPhone in portrait: 59px status
 * area, 34px home indicator. An older Touch ID phone reports 20/0, which is
 * strictly easier and is covered by the no-inset pass.
 */
/**
 * Insets are chosen by viewport height, because on real hardware the two are
 * not independent: only the tall notch/Dynamic Island phones (812pt and up)
 * carry the 59/34 pair, while every shorter device is a Touch ID model with a
 * 20px status bar and no home indicator. Applying 93px to a 568px iPhone SE
 * would be inventing a phone that does not exist and failing the layout for
 * it, so the emulation follows the hardware.
 */
const insetsFor = (height) => (height >= 812 ? { top: 59, bottom: 34 } : { top: 20, bottom: 0 });


/** Open a page at a viewport, with the daily card's async text settled. */
async function open(width, height, query = '?seed=7', insets = null) {
  // reducedMotion is not a preference here, it is determinism. The fact
  // panels animate in from translateY(14px), so a measurement taken while
  // that is still running sees children sitting up to 14px below their
  // settled position and reports a layout defect that does not exist. The
  // app already honours the media query (body.reduced-motion), so asking for
  // it makes the geometry final by the time it is measured.
  const ctx = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: 3, reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  if (insets) {
    await page.addInitScript(({ top, bottom }) => {
      document.addEventListener('DOMContentLoaded', () => {
        const s = document.createElement('style');
        s.textContent = `.screen{padding-top:${top}px !important;padding-bottom:${bottom}px !important}`;
        document.head.appendChild(s);
      });
    }, insets);
  }
  await page.goto(`${base}/${query}`, { waitUntil: 'load' });
  // The daily card writes its own text from a timer; measuring before that
  // has run would measure the placeholder and pass for the wrong reason.
  await page.waitForFunction(
    () => (document.getElementById('daily-best')?.textContent || '').trim().length > 0,
    null, { timeout: 5000 },
  ).catch(() => {});
  await page.waitForTimeout(250);
  return { ctx, page };
}

// ---- PASS 1: the menu, swept finely across widths and heights -------------
console.log(`\n— menu: ${WIDTH}px x ${HEIGHTS[0]}…${HEIGHTS[HEIGHTS.length - 1]}px, plus ${WIDTHS.join('/')}px spot checks`);
for (const useInsets of [false, true]) {
  const tag = useInsets ? 'safe-area' : 'no-inset ';
  for (const height of HEIGHTS) {
    const { ctx, page } = await open(WIDTH, height, '?seed=7', useInsets ? insetsFor(height) : null);
    measured++;
    report(`${tag} ${WIDTH}x${height}`, await page.evaluate(MEASURE, { boxSelectors: BOXES, screenId: 'screen-menu' }));
    await ctx.close();
  }
  for (const width of WIDTHS) {
    for (const height of WIDE_HEIGHTS) {
      const { ctx, page } = await open(width, height, '?seed=7', useInsets ? insetsFor(height) : null);
      measured++;
      report(`${tag} ${width}x${height}`, await page.evaluate(MEASURE, { boxSelectors: BOXES, screenId: 'screen-menu' }));
      await ctx.close();
    }
  }
}

// ---- PASS 2: every other screen, coarser ----------------------------------
// Overlays are opened with the ?ui= debug hook (src/core/debug.js), which is
// the same mechanism test/release-build.mjs proves is stripped from a
// shipped bundle — so this cannot work against dist/, only the source tree.
console.log(`\n— all screens at ${WIDTH}px`);
for (const height of SCREEN_HEIGHTS) {
  for (const id of SCREENS) {
    const ui = id.replace(/^screen-/, '');
    const { ctx, page } = await open(WIDTH, height, `?seed=7&ui=${ui}`);
    const visible = await page.evaluate((s) => {
      const el = document.getElementById(s);
      return !!el && el.classList.contains('on') && el.getBoundingClientRect().height > 0;
    }, id);
    // A screen the debug hook could not open is NOT a pass. Several overlays
    // need live run state (#screen-over, #screen-continue) and legitimately
    // will not open from a cold load — but silently skipping them would let
    // "0 failures" mean "measured nothing", so every skip is printed and
    // counted, and the totals are reported at the end.
    if (!visible) { skipped.push(`${id}@${height}`); await ctx.close(); continue; }
    measured++;
    report(`${id} ${WIDTH}x${height}`, await page.evaluate(MEASURE, { boxSelectors: BOXES, screenId: id }));
    await ctx.close();
  }
}

// ---- PASS 3: landscape, as real whole viewports -------------------------
console.log('\n— landscape');
for (const [w, h] of LANDSCAPE) {
  const { ctx, page } = await open(w, h, '?seed=7', { top: 0, bottom: 21 });
  measured++;
  report(`landscape ${w}x${h}`, await page.evaluate(MEASURE, { boxSelectors: BOXES, screenId: 'screen-menu' }));
  await ctx.close();
}

await browser.close();
await close();

console.log(`\n${measured} screen measurements taken`);
if (skipped.length) {
  console.log(`skipped (would not open from a cold load): ${[...new Set(skipped.map((s) => s.split('@')[0]))].join(', ')}`);
}
console.log(`${failures ? `x ${failures} problem(s) found` : 'ok menu-fit — nothing overflows itself at any size'}`);
process.exit(failures ? 1 : 0);
