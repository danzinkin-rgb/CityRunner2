/**
 * Fact-page contact sheet — review every city and every fact page without
 * playing the game.
 *
 * The game already has the entry points: `?ui=facts&city=X&level=N` renders a
 * street fact page cold, and `?ui=pwin&city=X&level=N` renders the monument
 * page including its height-comparison chart. This script walks all of them,
 * screenshots each, pulls out the text the player actually reads, and writes a
 * single scrollable HTML page you can review in one pass.
 *
 * It is a PROBE, not a gate — like test/difficulty.mjs, and unlike the four
 * suites in `npm test`. It asserts nothing and always exits 0. Its job is to
 * put the whole corpus in front of a human, not to decide whether it is good.
 *
 * Two viewports by default. The narrow one matters: the monument height chart
 * is hidden below a certain width, so a review at iPhone 15 only would show
 * the chart present everywhere and tell you nothing about that gap. The sheet
 * flags every page where the chart is absent.
 *
 * Usage:
 *   npm run serve            # in another terminal — this needs :4173 up
 *   npm run review           # then open test/shots/sheet/index.html
 *
 *   node test/contact-sheet.mjs [baseUrl] [--device=iphone-15]
 */
import { webkit, devices } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const args = process.argv.slice(2);
const BASE = args.find((a) => !a.startsWith('--')) || 'http://localhost:4173';
const only = (args.find((a) => a.startsWith('--device=')) || '').split('=')[1];

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'shots', 'sheet');
mkdirSync(OUT, { recursive: true });

// City ids come from themes.js, the same way test/road-clearance.mjs reads
// them, so a new city appears in the sheet the day it lands. A hardcoded list
// here would silently skip it, which is the one failure mode a review tool
// must not have.
const themesSrc = readFileSync(join(HERE, '..', 'src', 'cities', 'themes.js'), 'utf8');
const CITIES = [...themesSrc.matchAll(/^\s{2}\{\s*$\n\s*id:\s*'([a-z]+)'/gm)].map((m) => m[1]);
if (!CITIES.length) {
  console.log('x could not read city ids from src/cities/themes.js — has the file moved?');
  process.exit(1);
}

const PROFILES = [
  ['iphone-15', devices['iPhone 15']],
  ['iphone-se', devices['iPhone SE']],
].filter(([name]) => !only || name === only);

// countUp() in src/factviz.js animates hero numbers over 950ms. Screenshot
// before it settles and every headline statistic reads as a partial number,
// which is exactly where the eye lands first.
const SETTLE = 1400;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Reads what the player actually sees, rather than trusting src/facts.js. */
const READ = ({ screen }) => {
  const txt = (sel) => document.querySelector(sel)?.innerText?.trim() || '';
  const shown = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.height > 4 && r.width > 4 && getComputedStyle(el).display !== 'none';
  };
  if (screen === 'facts') {
    return {
      kicker: txt('#facts-kicker'), title: txt('#facts-title'), tag: txt('#facts-tag'),
      body: txt('#facts-list'), items: document.querySelectorAll('#facts-list > *').length,
      scale: null,
    };
  }
  return {
    kicker: 'Monument', title: txt('#pw-name'), tag: '',
    body: txt('#pw-facts'), items: document.querySelectorAll('#pw-facts > *').length,
    scale: shown('#pw-scale'),
  };
};

const rows = [];
const browser = await webkit.launch();

console.log(`contact sheet — ${CITIES.length} cities x 3 levels x 2 screens x ${PROFILES.length} viewport(s)`);
console.log(`cities [${CITIES.join(', ')}] from src/cities/themes.js\n`);

for (const [pname, device] of PROFILES) {
  const ctx = await browser.newContext({ ...device });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  for (const city of CITIES) {
    for (let lv = 1; lv <= 3; lv++) {
      for (const screen of ['facts', 'pwin']) {
        const file = `${pname}-${screen}-${city}${lv}.png`;
        const url = `${BASE}/?ui=${screen}&city=${city}&level=${lv}`;
        const before = errors.length;
        try {
          await page.goto(url, { waitUntil: 'load' });
          await page.waitForTimeout(SETTLE);
          await page.screenshot({ path: join(OUT, file) });
          const r = await page.evaluate(READ, { screen });
          rows.push({ ...r, pname, city, lv, screen, file, url, err: errors.slice(before).join(' | ') });
          const flag = !r.items ? '  ! no facts rendered' : r.scale === false ? '  ! no height chart' : '';
          console.log(`ok  ${pname} ${screen} ${city}${lv}${flag}`);
        } catch (e) {
          rows.push({ pname, city, lv, screen, file: '', url, body: '', items: 0, err: String(e).split('\n')[0] });
          console.log(`x   ${pname} ${screen} ${city}${lv} — ${String(e).split('\n')[0]}`);
        }
      }
    }
  }
  await ctx.close();
}
await browser.close();

// ------------------------------------------------------------------- the sheet
const card = (r) => `
  <figure class="card${r.err ? ' bad' : ''}" data-dev="${r.pname}" data-screen="${r.screen}">
    ${r.file ? `<img loading="lazy" src="${esc(r.file)}" alt="${esc(r.city)} ${r.lv} ${r.screen}">`
             : '<div class="missing">no screenshot</div>'}
    <figcaption>
      <b>${esc(r.title || '(no title)')}</b>
      <span class="meta">${esc(r.city)} L${r.lv} · ${r.screen === 'facts' ? 'street' : 'monument'} · ${esc(r.pname)}</span>
      ${r.tag ? `<span class="tag">${esc(r.tag)}</span>` : ''}
      <pre>${esc(r.body || '(empty)')}</pre>
      ${!r.items ? '<span class="warn">no facts rendered</span>' : ''}
      ${r.scale === false ? '<span class="warn">height chart hidden at this width</span>' : ''}
      ${r.err ? `<span class="warn">${esc(r.err)}</span>` : ''}
      <a href="${esc(r.url)}" target="_blank">open live →</a>
    </figcaption>
  </figure>`;

const byCity = CITIES.map((c) => {
  const mine = rows.filter((r) => r.city === c);
  const name = mine.find((r) => r.screen === 'facts' && r.kicker)?.kicker || c;
  return `<section><h2>${esc(name)} <small>${esc(c)}</small></h2><div class="grid">${mine.map(card).join('')}</div></section>`;
}).join('');

const warnings = rows.filter((r) => !r.items || r.err).length;
const noChart = rows.filter((r) => r.scale === false).length;

writeFileSync(join(OUT, 'index.html'), `<!doctype html><meta charset="utf-8">
<title>CityRunner — fact pages</title>
<script>
  // Opened from disk this is a no-op. Served through \`npx serve\`, the URL is
  // rewritten to /test/shots/sheet with no trailing slash, so every relative
  // image would resolve one directory too high and the whole sheet would come
  // up blank. Pinning the base fixes it before the first <img> is parsed.
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
  .grid { display:grid; gap:18px; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); }
  .card { margin:0; background:#181b22; border:1px solid var(--line); border-radius:10px; overflow:hidden; }
  .card.bad { border-color:#a33; }
  .card img { width:100%; display:block; background:#000; }
  .missing { padding:60px 12px; text-align:center; color:var(--dim); }
  figcaption { padding:10px 12px 12px; display:flex; flex-direction:column; gap:6px; }
  .meta, .tag { color:var(--dim); font-size:12.5px; }
  pre { white-space:pre-wrap; margin:0; font:12.5px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace; color:#c8ccd4; }
  .warn { color:#ffb454; font-size:12.5px; }
  a { color:#6fb3ff; font-size:12.5px; text-decoration:none; }
</style>
<h1>Fact pages — every city, every level</h1>
<div class="sub">${rows.length} pages · ${CITIES.length} cities x 3 levels x street + monument ·
  ${warnings} warning${warnings === 1 ? '' : 's'} · ${noChart} without a height chart ·
  generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')}</div>
<div class="bar">
  <label>viewport <select id="dev"><option value="">both</option>${
    [...new Set(rows.map((r) => r.pname))].map((d) => `<option>${esc(d)}</option>`).join('')}</select></label>
  <label>page <select id="scr"><option value="">both</option><option value="facts">street</option><option value="pwin">monument</option></select></label>
  <label><input type="checkbox" id="warnonly"> warnings only</label>
</div>
${byCity}
<script>
  const apply = () => {
    const d = dev.value, s = scr.value, w = warnonly.checked;
    document.querySelectorAll('.card').forEach((c) => {
      const ok = (!d || c.dataset.dev === d) && (!s || c.dataset.screen === s)
              && (!w || c.querySelector('.warn'));
      c.style.display = ok ? '' : 'none';
    });
    document.querySelectorAll('section').forEach((sec) => {
      sec.style.display = sec.querySelector('.card:not([style*="none"])') ? '' : 'none';
    });
  };
  ['dev', 'scr', 'warnonly'].forEach((id) => document.getElementById(id).addEventListener('change', apply));
</script>`);

console.log(`\n${rows.length} pages -> ${join(OUT, 'index.html')}`);
console.log(`${warnings} warning(s), ${noChart} page(s) with no height chart at their viewport`);
