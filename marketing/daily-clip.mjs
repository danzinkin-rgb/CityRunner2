/**
 * Render a short vertical clip of today's daily challenge course.
 *
 * This is a TOOL, not a gate, and is not in `npm test`. It is run once a day
 * by .github/workflows/daily-clip.yml, which hands the result to post.mjs.
 *
 * HOW THE FRAMES ARE MADE. A headless browser on a CI runner draws this game
 * at a few frames a second, and the game advances by real elapsed time, so a
 * screen recording would show a slow, stuttering run. Instead the page's clock
 * is replaced (Playwright's page.clock, which fakes Date, performance.now,
 * timers and requestAnimationFrame), advanced exactly one frame at a time, and
 * a screenshot is taken after each step. The clip is therefore smooth and the
 * same on any machine, however slow.
 *
 * WHO IS PLAYING. Nobody is, so a small autopilot reads the live obstacle list
 * from window.__cr and sends the same key events a player would: change lane
 * for vehicles, jump barriers, roll under signs. `&god` stays on as a safety
 * net so a mistake cannot end the clip on the crash screen; any such mistake is
 * counted with the track's own collision test and written to daily.json, and
 * post.mjs refuses to publish a clip that has one. Both come from the
 * debug hooks in src/core/debug.js, which exist only when src/ is served raw.
 *
 * Usage:
 *   node marketing/daily-clip.mjs                 today's course (UTC)
 *   node marketing/daily-clip.mjs --date 2026-10-04   another day's course
 *   node marketing/daily-clip.mjs --seconds 8     shorter, for a quick look
 *   node marketing/daily-clip.mjs --keep-frames   leave the JPEGs on disk
 *
 * Output, in marketing/out/ (git-ignored):
 *   daily-YYYY-MM-DD.mp4   when ffmpeg is on PATH (the CI runner has it)
 *   daily-YYYY-MM-DD.webm  otherwise, using the ffmpeg Playwright ships
 *   daily.json             what post.mjs needs: file, caption, alt text
 */
import { webkit } from 'playwright';
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { startStaticServer } from '../test/serve.mjs';
import { autopilotStep } from './autopilot.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');
const FRAMES = join(OUT, 'frames');
const config = JSON.parse(readFileSync(join(HERE, 'config.json'), 'utf8'));

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const FPS = 30;
const RUN_SECONDS = +flag('seconds', 17);
const END_SECONDS = 3;
const STEP_MS = 1000 / FPS;
// 540x960 CSS pixels at 2x is 1080x1920, the size every short-video feed wants.
const VIEW = { width: 540, height: 960 };

/** A caption bar for the whole clip and a full-screen card for the last seconds. */
function addOverlays({ headline, sub, endTitle, endLines }) {
  const css = document.createElement('style');
  css.textContent = `
    #mk-cap{position:fixed;left:0;right:0;bottom:0;z-index:99998;padding:18px 20px 26px;
      background:linear-gradient(transparent,rgba(7,11,26,.88) 45%);color:#fff;
      font:700 22px/1.25 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;text-align:center}
    #mk-cap small{display:block;font-weight:500;font-size:16px;opacity:.85;margin-top:4px}
    #mk-end{position:fixed;inset:0;z-index:99999;display:none;flex-direction:column;
      align-items:center;justify-content:center;gap:18px;padding:40px;text-align:center;
      background:rgba(7,11,26,.9);color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
    #mk-end h1{font-size:40px;line-height:1.1;margin:0}
    #mk-end p{font-size:21px;line-height:1.35;margin:0;opacity:.92}`;
  document.head.appendChild(css);
  const cap = document.createElement('div');
  cap.id = 'mk-cap';
  cap.innerHTML = `${headline}<small>${sub}</small>`;
  const end = document.createElement('div');
  end.id = 'mk-end';
  end.innerHTML = `<h1>${endTitle}</h1>${endLines.map((l) => `<p>${l}</p>`).join('')}`;
  document.body.append(cap, end);
}

function findFfmpeg() {
  const probe = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  if (probe.status === 0) return { bin: 'ffmpeg', full: true };
  // Playwright's own ffmpeg can only write VP8/WebM, which is enough to look
  // at a clip locally. Posting needs the MP4 the CI runner produces.
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH
    || (process.platform === 'win32' ? join(process.env.LOCALAPPDATA || '', 'ms-playwright')
      : process.platform === 'darwin' ? join(homedir(), 'Library', 'Caches', 'ms-playwright')
        : join(homedir(), '.cache', 'ms-playwright'));
  if (existsSync(root)) {
    for (const dir of readdirSync(root).filter((d) => d.startsWith('ffmpeg-')).sort().reverse()) {
      const name = readdirSync(join(root, dir)).find((f) => f.startsWith('ffmpeg'));
      if (name) return { bin: join(root, dir, name), full: false };
    }
  }
  return null;
}

const { base } = await startStaticServer();
// WebKit, because it is the browser every suite in test/ already uses.
const browser = await webkit.launch();
const context = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await context.newPage();
page.on('pageerror', (e) => console.error('page error:', e.message));

// The page's date decides which course is "today's", so --date renders any day.
const when = flag('date') ? new Date(`${flag('date')}T00:10:00Z`) : new Date();
await page.clock.install({ time: when });
await page.goto(`${base}/?view=run&daily&god`);
// install() alone leaves time running; pausing is what hands every tick to the
// loop below, so the clip covers exactly the seconds asked for.
await page.clock.pauseAt(new Date(when.getTime() + 60000));

// With the clock faked nothing in the page advances by itself, so waiting
// means stepping it. Modules and textures load on real time in between.
const stepUntil = async (what, test, limitMs = 60000) => {
  const started = Date.now();
  while (Date.now() - started < limitMs) {
    if (await page.evaluate(test).catch(() => false)) return;
    await page.clock.runFor(100);
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`timed out waiting for ${what}`);
};
await stepUntil('the run to start', () => window.__cr?.state === 'run' && !!window.__cr.track && !!window.__cr.player);

const info = await page.evaluate(async () => {
  const { CITIES } = await import('./src/cities/offered.js');
  const { STREET_FACTS } = await import('./src/facts.js');
  const { dailyKey } = await import('./src/core/rng.js');
  const d = window.__cr.todaysDaily();
  const city = CITIES[d.cityIdx];
  const street = STREET_FACTS[city.id]?.[d.level - 1];
  const fact = street?.facts?.find((f) => f.text)?.text || '';
  const title = (t) => t.toLowerCase().split(' ').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
  return { day: dailyKey(), city: title(city.name), cityId: city.id, level: d.level, street: street?.street || city.name, tag: street?.tag || '', fact };
});

const pretty = new Date(`${info.day}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
await page.evaluate(addOverlays, {
  headline: `Daily Challenge · ${pretty}`,
  sub: `${info.street}, ${info.city}`,
  endTitle: `Today's course: ${info.street}`,
  endLines: ['Same course for every player, new one tomorrow.', `Free on the App Store:<br><b>${config.appName}</b>`, config.androidNote],
});

rmSync(FRAMES, { recursive: true, force: true });
mkdirSync(FRAMES, { recursive: true });
const runFrames = Math.round(RUN_SECONDS * FPS);
const endFrames = Math.round(END_SECONDS * FPS);
const started = Date.now();
for (let i = 0; i < runFrames + endFrames; i++) {
  if (i === runFrames) await page.evaluate(() => { document.getElementById('mk-end').style.display = 'flex'; });
  if (i < runFrames) await page.evaluate(autopilotStep);
  await page.clock.runFor(STEP_MS);
  await page.screenshot({ path: join(FRAMES, `f${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 90 });
  if (i % 60 === 0) console.log(`frame ${i}/${runFrames + endFrames}`);
}
const end = await page.evaluate(() => ({ state: window.__cr.state, score: Math.round(window.__cr.score), hits: window.__mkHits || 0, log: window.__mkLog || [] }));
if (end.log.length) console.log(JSON.stringify(end.log));
console.log(`captured ${runFrames + endFrames} frames in ${Math.round((Date.now() - started) / 1000)}s, run state "${end.state}", score ${end.score}, autopilot collisions ${end.hits}`);
await browser.close();

const ff = findFfmpeg();
if (!ff) { console.error('No ffmpeg found; frames are in', FRAMES); process.exit(1); }
const file = join(OUT, `daily-${info.day}.${ff.full ? 'mp4' : 'webm'}`);
// Frames go in on stdin: it is the one input Playwright's cut-down ffmpeg
// accepts, and the full ffmpeg on the CI runner takes it just as well.
const input = ['-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', 'pipe:0'];
const encode = ff.full
  ? ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium', '-movflags', '+faststart']
  : ['-c:v', 'libvpx', '-b:v', '4M'];
const frames = Buffer.concat(readdirSync(FRAMES).sort().map((f) => readFileSync(join(FRAMES, f))));
const made = spawnSync(ff.bin, [...input, ...encode, file], { input: frames, stdio: ['pipe', 'ignore', 'pipe'], maxBuffer: 1 << 28 });
if (made.status !== 0) { console.error(made.stderr.toString().slice(-1500)); process.exit(1); }
if (!args.includes('--keep-frames')) rmSync(FRAMES, { recursive: true, force: true });

const link = config.appStoreUrl;
const caption = [
  `Daily Challenge, ${pretty}: ${info.street}, ${info.city}.`,
  info.fact,
  `Everyone gets the same course today. Free on the App Store: ${link}`,
  config.androidNote,
  config.hashtags,
].filter(Boolean).join('\n\n');
writeFileSync(join(OUT, 'daily.json'), JSON.stringify({
  ...info, file, width: VIEW.width * 2, height: VIEW.height * 2,
  caption, link,
  // post.mjs will not publish a clip in which the runner went through something.
  collisions: end.hits,
  alt: `Gameplay from CityRunner: a runner dodging traffic and collecting souvenirs on ${info.street}, ${info.city}.`,
}, null, 2));
console.log('wrote', file);
