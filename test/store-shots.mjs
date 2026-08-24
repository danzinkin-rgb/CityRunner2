/**
 * App Store submission screenshots — the one thing standing between this
 * build and TestFlight/App Store review is that Apple will not accept a
 * submission with zero screenshots, and nobody wants to hand-drive an
 * iPhone simulator through four cities to collect them.
 *
 * This walks the same cold debug entry points the other Playwright probes
 * use (`?view=`, `?ui=`) so a screenshot can be captured without playing —
 * no swiping, no waiting for a run to fail or a puzzle to finish for real.
 * It is modelled directly on test/contact-sheet.mjs: same regex-derived
 * city list, same settle-before-shoot reasoning, same "write PNGs + build
 * an index.html to review them in one pass" shape. Read that file first if
 * this one is confusing.
 *
 * IT IS A PROBE, NOT A GATE — like contact-sheet.mjs and difficulty.mjs,
 * and unlike the five suites wired into `npm test`. It asserts nothing and
 * always exits 0 (bar one precondition: the static server must be up, or
 * there is nothing to screenshot at all). Its job is to hand a human a
 * curated set of PNGs at the exact pixel sizes Apple wants, not to decide
 * whether the game looks good.
 *
 * ---------------------------------------------------------------------
 * REQUIRED SIZES — confirmed against developer.apple.com/help/app-store-
 * connect/reference/screenshot-specifications/ on 2026-08-23.
 *
 * Apple has since renamed the display-size classes (bezels shrank, so the
 * class that used to top out at "6.7-inch" is now folded into a "6.9-inch"
 * class whose own native size is 1260x2736/1320x2868), but 1290x2796 is
 * still listed there today as an *accepted* upload size within that class,
 * and 1242x2688 is still listed as an accepted size for the "6.5-inch"
 * class (itself only mandatory if no 6.9" shot is supplied). Both are the
 * exact sizes this file was asked to produce, and both remain valid
 * uploads — so the brief's numbers still hold, just under updated Apple
 * naming. Apple is strict about exact pixel match (wrong-by-a-few-px gets
 * rejected at upload), which is why this script verifies real output
 * dimensions by reading each PNG's IHDR chunk rather than trusting the
 * viewport maths.
 *
 * The 13" iPad set is not an optional extra. This app's Xcode target is
 * universal (TARGETED_DEVICE_FAMILY = "1,2"), and Apple requires iPad
 * screenshots from any app with an iPad target — so shipping without them
 * blocks submission unless the target is narrowed to iPhone-only first.
 *
 * Exact pixels come from viewport size x deviceScaleFactor, not from a
 * Playwright device preset used as-is: presets like "iPhone 15 Plus" size
 * their `viewport` to Safari's on-screen content area (minus address bar/
 * home-indicator chrome), which is shorter than the full display. A
 * Capacitor app has no browser chrome, so the full display height is what
 * we want:
 *   6.7in-class:  430 x  932  @3x  ->  1290 x 2796
 *   6.5in-class:  414 x  896  @3x  ->  1242 x 2688
 *   13in iPad:   1032 x 1376  @2x  ->  2064 x 2752
 * Device presets are still used, spread first, purely for their Safari
 * user-agent / isMobile / hasTouch flags — then `viewport` is overridden.
 *
 * ---------------------------------------------------------------------
 * WHAT'S CAPTURED, AND WHY THESE EIGHT
 *
 * Apple allows up to 10 screenshots; dumping every city x level x screen
 * permutation would bury the good shots in noise a reviewer has to wade
 * through. The DEFAULT_SET below is a curated best-of, chosen to tell the
 * game's story in as few frames as possible:
 *
 *   1-2. Live run, two cities picked for maximum contrast: NYC Times
 *        Square (neon dusk, the loudest scene in the game) and Rome
 *        Piazza Navona (baroque evening festival). Both are each city's
 *        THIRD street specifically because levels 1-3 within a city are
 *        deliberately staged light -> dark/dramatic in themes.js, and the
 *        third street is consistently the most visually loaded.
 *   3-4. Finished monument puzzles, via `?built` so the shot shows the
 *        completed landmark rather than a half-solved scatter of blocks:
 *        the Eiffel Tower (Paris) and Big Ben (London) — two of the most
 *        globally recognisable silhouettes in the game, deliberately from
 *        the two cities not used in the run shots above.
 *   5.   A street fact page: London's Abbey Road (level 2) — the single
 *        most recognisable street NAME in the whole city list even to
 *        someone who has never opened the app, so it sells the "real
 *        cities, real facts" hook at a glance.
 *   6.   A monument win screen: Rome's Colosseum, showing the completion
 *        state AND the height-comparison chart in the same frame — the
 *        single shot that best demonstrates the puzzle mode's payoff.
 *   7-8. Menu and Shop — the only two static UI screens that sell the
 *        game's breadth (city select, progression/cosmetics) rather than
 *        one specific run; every other UI screen is either a duplicate of
 *        what's already shown (facts/pwin) or not worth a submission slot
 *        (settings, paused, continue).
 *
 * Edit DEFAULT_SET below to change the lineup — it's a plain array, one
 * entry per shot, each tagged with why it's in the set.
 *
 * ---------------------------------------------------------------------
 * SETTLING, AND THE BLANK-FRAME FAILURE MODE
 *
 * `?ui=facts` / `?ui=pwin` shots wait the same 1400ms as contact-sheet.mjs
 * — countUp() in src/factviz.js animates hero numbers over 950ms, and a
 * screenshot taken before that settles catches every headline number
 * mid-count.
 *
 * `?view=run` / `?view=puzzle` shots build a REAL scene (window.__cr only
 * exists once it has), so the main risk isn't a mid-count number, it's an
 * entirely dark frame: fog/sky/lighting can be attached before geometry
 * has streamed in, and a scene sampled at that instant renders as a
 * near-solid dark rectangle — a "successful" screenshot that is
 * completely useless. This is guarded against explicitly, not assumed
 * away:
 *   1. wait for `window.__cr` and its `.track` (run) or `.puzzle` (puzzle)
 *      to exist, the same signal test/road-clearance.mjs waits on;
 *   2. wait a further settle (3500ms run / 1800ms puzzle — run needs
 *      longer so several chunks build and the player is visibly away from
 *      the empty starting line, matching road-clearance.mjs's own wait);
 *   3. sample the live canvas in-page (renderer is created with
 *      `preserveDrawingBuffer: true` in src/core/engine.js, so it can be
 *      read back at any time) and measure luminance range across a 64x64
 *      downsample. A near-zero range means a near-solid frame; if so,
 *      wait another 2.5s and resample once before giving up and just
 *      flagging it in the output — this is a probe, so it still writes
 *      the PNG and lets the contact sheet show the human what happened.
 * Run URLs also carry `&god` (disables crash-on-collision) purely so nothing
 * knocks the run into the "crashed" overlay while the script is waiting
 * with no player driving it.
 *
 * Usage:
 *   npm run serve            # in another terminal — this needs :4173 up
 *   npm run shots:store      # then open test/shots/store/index.html
 *
 *   node test/store-shots.mjs [baseUrl]
 */
import { webkit, devices } from 'playwright';
import { resolveBase } from './serve.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { flattenPng } from './png-flatten.mjs';

// Serves the repo itself unless a URL is named — see test/serve.mjs
const { base: BASE } = await resolveBase(process.argv.find((a) => a.startsWith('http')));
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'shots', 'store');
mkdirSync(OUT, { recursive: true });

// City ids come from themes.js, the same way test/contact-sheet.mjs and
// test/road-clearance.mjs read them — not so DEFAULT_SET grows on its own
// (it's a deliberate curation, not full coverage), but so a curated shot
// referencing a city that has since been renamed/removed is caught and
// flagged instead of silently producing a broken URL.
const themesSrc = readFileSync(join(HERE, '..', 'src', 'cities', 'themes.js'), 'utf8');
const CITIES = [...themesSrc.matchAll(/^\s{2}\{\s*$\n\s*id:\s*'([a-z]+)'/gm)].map((m) => m[1]);
if (!CITIES.length) {
  console.log('x could not read city ids from src/cities/themes.js — has the file moved?');
  process.exit(1);
}

// ---------------------------------------------------------------- sizes
const SIZES = [
  {
    name: '6.7in', width: 1290, height: 2796,
    // 430x932 is the iPhone 15/16 Plus's full display in CSS px; @3x that's
    // exactly 1290x2796. Base off the preset for UA/touch flags only — its
    // own `viewport` is Safari's shorter on-screen area, not the full
    // display, so it's overridden below.
    base: devices['iPhone 15 Plus'] || devices['iPhone 16 Plus'] || {},
    viewport: { width: 430, height: 932 }, deviceScaleFactor: 3,
  },
  {
    name: '6.5in', width: 1242, height: 2688,
    // 414x896 @3x = 1242x2688 — iPhone 11 Pro Max / XS Max's full display.
    base: devices['iPhone 11 Pro Max'] || {},
    viewport: { width: 414, height: 896 }, deviceScaleFactor: 3,
  },
  {
    name: '13in-ipad', width: 2064, height: 2752,
    // NOT optional. TARGETED_DEVICE_FAMILY in ios/App/App.xcodeproj/project.pbxproj
    // is "1,2" — universal iPhone + iPad — and Apple requires a 13" iPad set for
    // any app that ships an iPad target. Dropping it means either producing these
    // or setting TARGETED_DEVICE_FAMILY = "1" in Xcode; see docs/APPSTORE-SUBMISSION.md.
    //
    // Playwright has no 13" preset (largest is 'iPad Pro 11'), so as with the
    // phones above the preset supplies UA/touch flags only and the viewport is
    // stated outright: 1032x1376 points @2x = exactly 2064x2752.
    base: devices['iPad Pro 11'] || devices['iPad (gen 11)'] || {},
    viewport: { width: 1032, height: 1376 }, deviceScaleFactor: 2,
  },
];

const SETTLE_UI = 1400;      // countUp() in src/factviz.js — see header
const SETTLE_RUN = 3500;     // matches test/road-clearance.mjs's own wait
const SETTLE_PUZZLE = 1800;  // ?built places everything instantly; still
                              // give materials/shadows/camera fit a beat

// -------------------------------------------------------------- the set
// Edit this array to change what ships. `kind` drives which wait/settle
// strategy is used (see capture() below). `why` is surfaced in the sheet.
const DEFAULT_SET = [
  { id: 'run-nyc-timessq', kind: 'run', city: 'nyc', level: 3,
    label: 'New York — Times Square (run)',
    why: 'Loudest scene in the game: dusk neon, LED, banners. The hero action shot.' },
  { id: 'run-rome-navona', kind: 'run', city: 'rome', level: 3,
    label: 'Rome — Piazza Navona (run)',
    why: 'Baroque evening festival square — different mood/palette from NYC, same energy.' },
  { id: 'puzzle-paris-eiffel', kind: 'puzzle', city: 'paris', level: 1,
    label: 'Paris — Eiffel Tower (finished monument)',
    why: 'One of the most recognisable silhouettes in the game; ?built shows it complete.' },
  { id: 'puzzle-london-bigben', kind: 'puzzle', city: 'london', level: 1,
    label: 'London — Big Ben (finished monument)',
    why: 'Second iconic landmark, from a city not already used for a run shot.' },
  { id: 'facts-london-abbey', kind: 'ui', screen: 'facts', city: 'london', level: 2,
    label: 'London — Abbey Road (street facts)',
    why: 'The single most recognisable street NAME in the roster, even out of context.' },
  { id: 'pwin-rome-colosseum', kind: 'ui', screen: 'pwin', city: 'rome', level: 1,
    label: 'Rome — Colosseum (monument complete + height chart)',
    why: 'Best single frame for the puzzle payoff: completion state plus the height chart.' },
  { id: 'menu', kind: 'ui', screen: 'menu',
    label: 'Menu — city select',
    why: 'Sells the breadth of the game (four cities) rather than one specific run.' },
  { id: 'shop', kind: 'ui', screen: 'shop',
    label: 'Shop — cosmetics/progression',
    why: 'Signals there is a progression system, not just an endless runner.' },
];

const missingCity = DEFAULT_SET.filter((s) => s.city && !CITIES.includes(s.city));
if (missingCity.length) {
  console.log(`! DEFAULT_SET references cities not found in themes.js: ${missingCity.map((s) => s.city).join(', ')}`);
}

const urlFor = (shot) => {
  if (shot.kind === 'run') return `${BASE}/?view=run&city=${shot.city}&level=${shot.level}&god`;
  if (shot.kind === 'puzzle') return `${BASE}/?view=puzzle&city=${shot.city}&level=${shot.level}&built`;
  const parts = [`ui=${shot.screen}`];
  if (shot.city) parts.push(`city=${shot.city}`);
  if (shot.level) parts.push(`level=${shot.level}`);
  return `${BASE}/?${parts.join('&')}`;
};

// ----------------------------------------------------------- server check
// A confusing 30s Playwright navigation timeout is a worse failure mode
// than just saying what to run.
try {
  const res = await fetch(BASE, { method: 'GET', signal: AbortSignal.timeout(3000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
} catch (e) {
  console.log(`x no server responding at ${BASE} (${String(e.message || e)})`);
  console.log(`  run \`npm run serve\` in another terminal first, then re-run this script.`);
  process.exit(1);
}

// -------------------------------------------------------- blank-frame guard
// Runs IN the page. The renderer is created with preserveDrawingBuffer:
// true (src/core/engine.js), so the canvas can be read back at any time,
// not just the instant after a render call. Downsamples to 64x64 and
// measures luminance range — a scene that hasn't streamed in geometry/
// lighting yet reads as a near-solid dark rectangle here.
const BLANK_CHECK = () => {
  const cv = document.querySelector('canvas');
  if (!cv || !cv.width || !cv.height) return { ok: false, reason: 'no canvas' };
  const w = 64, h = 64;
  const tmp = document.createElement('canvas');
  tmp.width = w; tmp.height = h;
  const ctx = tmp.getContext('2d');
  ctx.drawImage(cv, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  let min = 255, max = 0, sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    const lum = data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11;
    if (lum < min) min = lum;
    if (lum > max) max = lum;
    sum += lum;
  }
  const n = w * h;
  return { ok: true, min: +min.toFixed(1), max: +max.toFixed(1), mean: +(sum / n).toFixed(1), range: +(max - min).toFixed(1) };
};

// PNG width/height come straight out of the IHDR chunk (signature[8] +
// length[4] + 'IHDR'[4] + width[4 BE] + height[4 BE]) — no image library
// needed, and it reads what was actually written rather than what the
// viewport maths assumed would be written.
function pngSize(buf) {
  if (buf.length < 24 || buf.toString('ascii', 12, 16) !== 'IHDR') return null;
  // Byte 25 is the IHDR colour type. 2 is truecolour; 6 is truecolour+alpha,
  // which App Store Connect refuses — see test/png-flatten.mjs. It is read
  // here, after the file is on disk, for the same reason the dimensions are:
  // what was written is the only thing that will be uploaded.
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), colourType: buf[25] };
}

async function capture(page, shot) {
  const errors = [];
  const onErr = (e) => errors.push(String(e));
  page.on('pageerror', onErr);
  const url = urlFor(shot);
  try {
    await page.goto(url, { waitUntil: 'load' });
    let blank = null;
    if (shot.kind === 'run' || shot.kind === 'puzzle') {
      const prop = shot.kind === 'run' ? 'track' : 'puzzle';
      await page.waitForFunction((p) => window.__cr && window.__cr[p], prop, { timeout: 15000 });
      await page.waitForTimeout(shot.kind === 'run' ? SETTLE_RUN : SETTLE_PUZZLE);
      blank = await page.evaluate(BLANK_CHECK);
      if (blank.ok && blank.range < 10) {
        await page.waitForTimeout(2500);
        blank = await page.evaluate(BLANK_CHECK);
      }
    } else {
      await page.waitForTimeout(SETTLE_UI);
    }
    page.off('pageerror', onErr);
    return { ok: true, url, blank, errors };
  } catch (e) {
    page.off('pageerror', onErr);
    return { ok: false, url, error: String(e).split('\n')[0], errors };
  }
}

// -------------------------------------------------------------- the shoot
const rows = [];
const browser = await webkit.launch();

console.log(`store shots — ${DEFAULT_SET.length} shot(s) x ${SIZES.length} size(s)`);
console.log(`cities [${CITIES.join(', ')}] from src/cities/themes.js\n`);

for (const size of SIZES) {
  const ctx = await browser.newContext({ ...size.base, viewport: size.viewport, deviceScaleFactor: size.deviceScaleFactor });
  const page = await ctx.newPage();

  for (const shot of DEFAULT_SET) {
    const file = `${size.name}-${shot.id}.png`;
    const outPath = join(OUT, file);
    const r = await capture(page, shot);

    if (!r.ok) {
      rows.push({ size: size.name, shot, file: '', dims: null, blank: null, err: r.error });
      console.log(`x   ${size.name} ${shot.id} — ${r.error}`);
      continue;
    }

    await page.screenshot({ path: outPath });
    flattenPng(outPath);   // Playwright writes RGBA; Apple will not take alpha
    const buf = readFileSync(outPath);
    const dims = pngSize(buf);
    const dimsOk = dims && dims.width === size.width && dims.height === size.height;
    const alphaOk = dims && dims.colourType === 2;
    const blankFlag = r.blank && r.blank.ok && r.blank.range < 10;

    rows.push({
      size: size.name, shot, file, dims, dimsOk, alphaOk, kb: Math.round(buf.length / 1024),
      blank: r.blank, blankFlag, err: r.errors.join(' | '),
    });

    const dimsNote = dims ? `${dims.width}x${dims.height}${dimsOk ? '' : `  ! expected ${size.width}x${size.height}`}` : '! could not read PNG header';
    const blankNote = blankFlag ? `  ! possible blank frame (luminance range ${r.blank.range})` : '';
    const alphaNote = alphaOk ? '' : '  ! still has an alpha channel — Apple will reject this file';
    console.log(`ok  ${size.name} ${shot.id} — ${dimsNote}, ${Math.round(buf.length / 1024)}KB${blankNote}${alphaNote}`);
  }
  await ctx.close();
}
await browser.close();

// ------------------------------------------------------------------- the sheet
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const card = (r) => `
  <figure class="card${r.err || r.blankFlag || (r.dims && !r.dimsOk) || (r.dims && !r.alphaOk) ? ' bad' : ''}" data-size="${r.size}">
    ${r.file ? `<img loading="lazy" src="${esc(r.file)}" alt="${esc(r.shot.label)}">`
             : '<div class="missing">no screenshot</div>'}
    <figcaption>
      <b>${esc(r.shot.label)}</b>
      <span class="meta">${esc(r.size)} ${r.dims ? `· ${r.dims.width}x${r.dims.height}` : ''}${r.kb ? ` · ${r.kb}KB` : ''}</span>
      <span class="why">${esc(r.shot.why)}</span>
      ${r.dims && !r.dimsOk ? '<span class="warn">pixel size mismatch — see console log</span>' : ''}
      ${r.dims && !r.alphaOk ? '<span class="warn">has an alpha channel — App Store Connect will reject it</span>' : ''}
      ${r.blankFlag ? `<span class="warn">possible blank frame — luminance range ${r.blank.range} (min ${r.blank.min}, max ${r.blank.max})</span>` : ''}
      ${r.err ? `<span class="warn">${esc(r.err)}</span>` : ''}
    </figcaption>
  </figure>`;

const bySize = SIZES.map((size) => {
  const mine = rows.filter((r) => r.size === size.name);
  return `<section><h2>${esc(size.name)} <small>${size.width}x${size.height}</small></h2><div class="grid">${mine.map(card).join('')}</div></section>`;
}).join('');

const warnings = rows.filter((r) => r.err || r.blankFlag || (r.dims && !r.dimsOk) || (r.dims && !r.alphaOk)).length;

writeFileSync(join(OUT, 'index.html'), `<!doctype html><meta charset="utf-8">
<title>CityRunner — App Store screenshots</title>
<script>
  // Opened from disk this is a no-op. Served through \`npx serve\`, the URL is
  // rewritten to /test/shots/store with no trailing slash, so every relative
  // image would resolve one directory too high. Pin the base before the
  // first <img> is parsed — same fix as test/contact-sheet.mjs.
  if (!location.pathname.endsWith('/') && !location.pathname.endsWith('.html')) {
    const b = document.createElement('base');
    b.href = location.pathname + '/';
    document.head.appendChild(b);
  }
</script>
<style>
  :root { color-scheme: dark; --bg:#12141a; --fg:#e8e6e3; --dim:#9aa0aa; --line:#2a2e38; }
  body { margin:0; padding:24px; background:var(--bg); color:var(--fg);
         font:15px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
  h1 { margin:0 0 4px; font-size:22px; }
  .sub { color:var(--dim); margin-bottom:20px; }
  .bar { position:sticky; top:0; background:var(--bg); padding:12px 0; border-bottom:1px solid var(--line);
         margin-bottom:24px; display:flex; gap:16px; flex-wrap:wrap; align-items:center; z-index:9; }
  label { color:var(--dim); font-size:14px; }
  h2 { font-size:18px; border-bottom:1px solid var(--line); padding-bottom:6px; margin-top:36px; }
  h2 small { color:var(--dim); font-weight:400; font-size:13px; }
  .grid { display:grid; gap:18px; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); }
  .card { margin:0; background:#181b22; border:1px solid var(--line); border-radius:10px; overflow:hidden; }
  .card.bad { border-color:#a33; }
  .card img { width:100%; display:block; background:#000; }
  .missing { padding:60px 12px; text-align:center; color:var(--dim); }
  figcaption { padding:10px 12px 12px; display:flex; flex-direction:column; gap:6px; }
  .meta { color:var(--dim); font-size:12.5px; }
  .why { color:#9db4cf; font-size:12.5px; font-style:italic; }
  .warn { color:#ffb454; font-size:12.5px; }
</style>
<h1>App Store screenshots</h1>
<div class="sub">${rows.length} frame${rows.length === 1 ? '' : 's'} · ${DEFAULT_SET.length} shot(s) x ${SIZES.length} size(s) ·
  ${warnings} warning${warnings === 1 ? '' : 's'} ·
  generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')}</div>
<div class="bar">
  <label>size <select id="sz"><option value="">all</option>${SIZES.map((s) => `<option>${esc(s.name)}</option>`).join('')}</select></label>
  <label><input type="checkbox" id="warnonly"> warnings only</label>
</div>
${bySize}
<script>
  const apply = () => {
    const s = sz.value, w = warnonly.checked;
    document.querySelectorAll('.card').forEach((c) => {
      const ok = (!s || c.dataset.size === s) && (!w || c.classList.contains('bad'));
      c.style.display = ok ? '' : 'none';
    });
  };
  ['sz', 'warnonly'].forEach((id) => document.getElementById(id).addEventListener('change', apply));
</script>`);

console.log(`\n${rows.length} frame(s) -> ${join(OUT, 'index.html')}`);
console.log(`${warnings} warning(s)`);
process.exit(0);
