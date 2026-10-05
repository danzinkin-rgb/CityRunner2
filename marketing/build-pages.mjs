/**
 * Generate the landmark fact pages: one static page per monument, an index,
 * and a sitemap, all written into the repo root so GitHub Pages serves them
 * beside the game with no build step.
 *
 * WHY THESE EXIST. The game itself is one JavaScript page with no text a search
 * engine can read. Every monument already has approved facts in src/facts.js,
 * so this turns that table into pages people might actually search for, each
 * linking to the App Store listing. The web build is deliberately not
 * promoted: it is free and fully unlocked, so it competes with the app.
 *
 * THE FACTS ARE NOT COPIED BY HAND. Everything on a page is read from
 * src/facts.js and src/cities/themes.js, so a fact corrected there is
 * corrected here on the next run. The pages are committed (Pages serves the
 * repo as it stands), which means they can go stale: `--check` exits non-zero
 * if what is on disk differs from what the tables would produce.
 *
 *   node marketing/build-pages.mjs           write the pages
 *   node marketing/build-pages.mjs --check   fail if they are out of date
 *
 * Links between pages and to assets are relative, for the same reason the
 * game's are: the site lives under /CityRunner2/ on Pages. Only the canonical
 * and sharing tags use the absolute address from marketing/config.json.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const config = JSON.parse(readFileSync(join(HERE, 'config.json'), 'utf8'));
const CHECK = process.argv.includes('--check');

// package.json is "type": "commonjs", so Node will not import src/*.js as
// modules by path. Neither file imports anything, so loading the text works.
const load = (rel) => import(`data:text/javascript,${encodeURIComponent(readFileSync(join(ROOT, rel), 'utf8'))}`);
const { STREET_FACTS, MONUMENT_FACTS } = await load('src/facts.js');
const { ALL_CITIES, LANDMARK_NAMES } = await load('src/cities/themes.js');
// Released cities only: a queued city (src/cities/releases.js) gets no page
// until its release.
const { RELEASE_QUEUE } = await load('src/cities/releases.js');
const CITIES = ALL_CITIES.filter((c) => !RELEASE_QUEUE.includes(c.id));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const titleCase = (s) => s.toLowerCase().split(' ').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

const landmarks = [];
for (const city of CITIES) {
  city.landmarks.forEach((id, i) => {
    const facts = MONUMENT_FACTS[id];
    if (!facts) return;
    landmarks.push({
      id, name: LANDMARK_NAMES[id], slug: slug(LANDMARK_NAMES[id]),
      city: titleCase(city.name), cityId: city.id,
      metres: facts.scale, facts: facts.facts,
      street: STREET_FACTS[city.id]?.[i],
    });
  });
}

const STYLE = `
  :root{--gold:#ffd166;--ink:#0b1020}
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#0b1020;color:#e8ecf8;font-family:"Segoe UI",system-ui,sans-serif;line-height:1.6;padding:32px 16px 72px}
  main{max-width:720px;margin:0 auto}
  nav{font-size:14px;opacity:.7;margin-bottom:22px}
  h1{font-size:clamp(30px,7vw,46px);font-weight:900;line-height:1.1;margin-bottom:6px;
    background:linear-gradient(180deg,#fff,var(--gold));-webkit-background-clip:text;background-clip:text;color:transparent}
  .sub{opacity:.65;font-size:14px;letter-spacing:2px;text-transform:uppercase;margin-bottom:24px}
  h2{font-size:22px;margin:34px 0 12px;color:var(--gold)}
  p{margin-bottom:12px}
  a{color:var(--gold)}
  .hero{display:block;width:min(320px,80%);height:auto;margin:0 auto 8px}
  .fact{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.13);border-radius:16px;padding:18px 20px;margin:12px 0}
  .big{font-size:34px;font-weight:900;color:var(--gold);line-height:1.1}
  .big span{font-size:16px;font-weight:600;opacity:.85;margin-left:6px}
  .label{font-size:13px;letter-spacing:1.5px;text-transform:uppercase;opacity:.65;margin-bottom:6px}
  .cta{display:flex;flex-wrap:wrap;gap:12px;margin:18px 0}
  .btn{display:inline-block;padding:13px 22px;border-radius:999px;font-weight:800;text-decoration:none;background:var(--gold);color:var(--ink)}
  .btn.alt{background:transparent;color:var(--gold);border:2px solid var(--gold)}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin:12px 0 8px}
  .tile{display:block;text-align:center;text-decoration:none;color:#e8ecf8;background:rgba(255,255,255,.06);
    border:1px solid rgba(255,255,255,.13);border-radius:16px;padding:12px 10px;font-weight:700;font-size:15px}
  .tile img{display:block;width:100%;height:auto;margin-bottom:6px}
  footer{margin-top:48px;opacity:.55;font-size:13px}`;

const head = ({ title, description, path, image }) => `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${config.siteUrl}${path}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${config.siteUrl}${path}">
<meta property="og:image" content="${config.siteUrl}${image}">
<meta name="twitter:card" content="summary">${config.appStoreId ? `\n<meta name="apple-itunes-app" content="app-id=${config.appStoreId}">` : ''}
<meta name="theme-color" content="#070b1a">
<style>${STYLE}
</style>
</head>`;

const factCard = (f) => `<div class="fact">${f.big ? `<div class="big">${esc(f.big)}${f.unit ? `<span>${esc(f.unit)}</span>` : ''}</div>` : ''}${f.label ? `<div class="label">${esc(f.label)}</div>` : ''}<p>${esc(f.text)}</p></div>`;

// The App Store only. The web build is free and fully unlocked, so sending
// people there would compete with the app rather than sell it.
const cta = (lm) => `<div class="cta">
  <a class="btn" href="${config.appStoreUrl}">Get it free on the App Store</a>
</div>
<p class="label">${esc(config.androidNote)}</p>
<p>${lm ? `In ${esc(config.appName)} you run ${esc(lm.street?.street || lm.city)} and then have 60 seconds to rebuild the ${esc(lm.name)} from its pieces.` : `${esc(config.appName)} is an endless runner through real streets. Each run ends with 60 seconds to rebuild a monument from its pieces.`} No adverts, no account, no tracking.</p>`;

const footer = (up) => `<footer>
  <p>${esc(config.appName)} is an independent game, not affiliated with or endorsed by any city or landmark shown. <a href="${up}privacy.html">Privacy</a></p>
</footer>`;

function landmarkPage(lm) {
  const path = `landmarks/${lm.slug}/`;
  const lead = lm.facts.find((f) => f.text)?.text || '';
  const description = `${lm.name}, ${lm.city}: ${lead}`.slice(0, 155);
  const others = landmarks.filter((o) => o.cityId === lm.cityId && o.id !== lm.id);
  const ld = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: `${lm.name} facts`, about: { '@type': 'LandmarksOrHistoricalBuildings', name: lm.name },
    image: `${config.siteUrl}assets/monuments/${lm.id}.png`, url: `${config.siteUrl}${path}`,
    publisher: { '@type': 'Organization', name: config.appName },
  };
  return `${head({ title: `${lm.name} facts: quick things to know | CityRunner`, description, path, image: `assets/monuments/${lm.id}.png` })}
<body>
<main>
<nav><a href="../">CityRunner landmarks</a> › ${esc(lm.city)}</nav>
<h1>${esc(lm.name)} facts</h1>
<div class="sub">${esc(lm.city)}${lm.metres ? ` · ${lm.metres} m tall` : ''}</div>
<img class="hero" src="../../assets/monuments/${lm.id}.png" width="320" height="320" alt="The ${esc(lm.name)} as it appears in CityRunner, built from blocks">
${lm.facts.map(factCard).join('\n')}
<h2>Rebuild it yourself</h2>
${cta(lm)}
${lm.street ? `<h2>The street that leads there: ${esc(lm.street.street)}</h2>
<p class="label">${esc(lm.street.tag)}</p>
${lm.street.facts.map(factCard).join('\n')}` : ''}
${others.length ? `<h2>More in ${esc(lm.city)}</h2>
<div class="grid">
${others.map((o) => `<a class="tile" href="../${o.slug}/"><img src="../../assets/monuments/${o.id}.png" width="320" height="320" alt="" loading="lazy">${esc(o.name)}</a>`).join('\n')}
</div>` : ''}
<p><a href="../">All landmarks</a></p>
${footer('../../')}
</main>
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</body>
</html>
`;
}

function indexPage() {
  const cities = [...new Set(landmarks.map((l) => l.city))];
  return `${head({ title: 'Landmark facts: 15 monuments in 5 cities | CityRunner'.replace('15', landmarks.length).replace('5', cities.length), description: `Quick facts about ${landmarks.length} famous landmarks in ${cities.join(', ')}, from the game where you run the street and rebuild the monument.`, path: 'landmarks/', image: 'assets/icon-512.png' })}
<body>
<main>
<h1>Landmark facts</h1>
<div class="sub">${landmarks.length} monuments · ${cities.length} cities</div>
${cta()}
${cities.map((c) => `<h2>${esc(c)}</h2>
<div class="grid">
${landmarks.filter((l) => l.city === c).map((l) => `<a class="tile" href="${l.slug}/"><img src="../assets/monuments/${l.id}.png" width="320" height="320" alt="" loading="lazy">${esc(l.name)}</a>`).join('\n')}
</div>`).join('\n')}
${footer('../')}
</main>
</body>
</html>
`;
}

// No <lastmod>: a date that changed on every run would make --check fail daily
// for no reason, and search engines largely ignore the field anyway.
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${['landmarks/', ...landmarks.map((l) => `landmarks/${l.slug}/`)].map((p) => `  <url><loc>${config.siteUrl}${p}</loc></url>`).join('\n')}
</urlset>
`;

const files = [
  ['landmarks/index.html', indexPage()],
  ...landmarks.map((l) => [`landmarks/${l.slug}/index.html`, landmarkPage(l)]),
  ['sitemap.xml', sitemap],
];

let stale = 0;
for (const [rel, body] of files) {
  const file = join(ROOT, rel);
  if (CHECK) {
    const onDisk = existsSync(file) ? readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : null;
    if (onDisk !== body) { stale++; console.error('out of date:', rel); }
  } else {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, body);
  }
}
if (CHECK) {
  if (stale) { console.error(`${stale} page(s) differ from src/facts.js. Run: node marketing/build-pages.mjs`); process.exit(1); }
  console.log(`landmark pages are up to date (${files.length} files)`);
} else {
  console.log(`wrote ${files.length} files: ${landmarks.length} landmark pages, an index and sitemap.xml`);
}
