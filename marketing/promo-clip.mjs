/**
 * A short sped-up promo: two streets being run and two monuments going from
 * half built to finished, then a title card. 4:5 (1080x1350), which sits well
 * in both the LinkedIn and X feeds.
 *
 * Same method as daily-clip.mjs: the page clock is faked and stepped one frame
 * at a time, so the result is smooth on any machine. Streets are played by the
 * shared autopilot; monuments use the puzzle's own self-play mode (?auto),
 * recorded from the game's own starting point (part built) to the end.
 *
 *   node marketing/promo-clip.mjs      writes marketing/out/promo.mp4 (or .webm)
 *
 * Edit SEGMENTS to change what is shown. SPEED is how much faster than real
 * time the footage plays.
 */
import { webkit } from 'playwright';
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { startStaticServer } from '../test/serve.mjs';
import { autopilotStep } from './autopilot.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');
const FRAMES = join(OUT, 'promo-frames');
const config = JSON.parse(readFileSync(join(HERE, 'config.json'), 'utf8'));
const FPS = 30;
const VIEW = { width: 540, height: 675 };   // x2 = 1080x1350

const SEGMENTS = [
  { kind: 'run', city: 'nyc', level: 3, seconds: 1.8, speed: 2, label: 'Times Square, New York' },
  { kind: 'build', city: 'nyc', level: 1, seconds: 1.7, label: 'Empire State Building' },
  { kind: 'run', city: 'paris', level: 1, seconds: 1.8, speed: 2, label: 'Champs-Élysées, Paris' },
  { kind: 'build', city: 'paris', level: 1, seconds: 1.7, label: 'Eiffel Tower' },
];
const END_SECONDS = 1.0;

function findFfmpeg() {
  if (spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0) return { bin: 'ffmpeg', full: true };
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH
    || (process.platform === 'win32' ? join(process.env.LOCALAPPDATA || '', 'ms-playwright')
      : process.platform === 'darwin' ? join(homedir(), 'Library', 'Caches', 'ms-playwright')
        : join(homedir(), '.cache', 'ms-playwright'));
  for (const dir of existsSync(root) ? readdirSync(root).filter((d) => d.startsWith('ffmpeg-')).sort().reverse() : []) {
    const name = readdirSync(join(root, dir)).find((f) => f.startsWith('ffmpeg'));
    if (name) return { bin: join(root, dir, name), full: false };
  }
  return null;
}

// A small label in the corner, and the closing card.
function overlay({ label, end }) {
  let el = document.getElementById('mk-promo');
  if (!el) {
    const css = document.createElement('style');
    css.textContent = `
      #mk-promo{position:fixed;left:16px;bottom:18px;z-index:99998;padding:8px 14px;border-radius:999px;
        background:rgba(7,11,26,.72);color:#fff;font:700 17px system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
      #mk-promo-end{position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;
        justify-content:center;gap:14px;text-align:center;padding:30px;background:#0b1020;color:#fff;
        font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
      #mk-promo-end h1{margin:0;font-size:40px;line-height:1.1;color:#ffd166}
      #mk-promo-end p{margin:0;font-size:21px;opacity:.92}`;
    document.head.appendChild(css);
    el = document.createElement('div');
    el.id = 'mk-promo';
    document.body.appendChild(el);
  }
  el.textContent = label || '';
  el.style.display = label ? '' : 'none';
  if (end) {
    const card = document.createElement('div');
    card.id = 'mk-promo-end';
    card.innerHTML = `<h1>${end.title}</h1>${end.lines.map((l) => `<p>${l}</p>`).join('')}`;
    document.body.appendChild(card);
  }
}

const { base } = await startStaticServer();
const browser = await webkit.launch();
rmSync(FRAMES, { recursive: true, force: true });
mkdirSync(FRAMES, { recursive: true });
let frame = 0;
const shoot = (page) => page.screenshot({ path: join(FRAMES, `f${String(frame++).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 90 });

async function openPage(url) {
  const context = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.error('page error:', e.message));
  const when = new Date();
  await page.clock.install({ time: when });
  await page.goto(`${base}/${url}`);
  await page.clock.pauseAt(new Date(when.getTime() + 60000));
  return { page, context };
}

async function stepUntil(page, what, test, limitMs = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < limitMs) {
    if (await page.evaluate(test).catch(() => false)) return;
    await page.clock.runFor(100);
    await new Promise((r) => setTimeout(r, 30));
  }
  throw new Error(`timed out waiting for ${what}`);
}

for (const seg of SEGMENTS) {
  const frames = Math.round(seg.seconds * FPS);
  if (seg.kind === 'run') {
    const { page, context } = await openPage(`?view=run&city=${seg.city}&level=${seg.level}&god`);
    await stepUntil(page, 'the run', () => window.__cr?.state === 'run' && !!window.__cr.track);
    // Get going first: the opening seconds are the slowest and emptiest.
    for (let i = 0; i < 60; i++) { await page.evaluate(autopilotStep); await page.clock.runFor(1000 / FPS); }
    await page.evaluate(overlay, { label: seg.label });
    for (let i = 0; i < frames; i++) {
      for (let k = 0; k < seg.speed; k++) { await page.evaluate(autopilotStep); await page.clock.runFor(1000 / FPS); }
      await shoot(page);
    }
    const hits = await page.evaluate(() => window.__mkHits || 0);
    console.log(`${seg.label}: ${frames} frames, autopilot collisions ${hits}`);
    await context.close();
  } else {
    const { page, context } = await openPage(`?view=puzzle&city=${seg.city}&level=${seg.level}&auto`);
    await stepUntil(page, 'the puzzle', () => !!window.__cr?.puzzle?.items?.length);
    await page.evaluate(() => window.__cr.puzzle.deliverAllNow?.());
    const total = await page.evaluate(() => window.__cr.puzzle.items.length);
    // On-screen tips are for players, not for a promo.
    await page.addStyleTag({ content: '#hud-hint{display:none!important}' });
    const left = await page.evaluate(() => window.__cr.puzzle.items.length - window.__cr.puzzle.placedCount);
    // Self-play places a piece every 0.3s and each flight takes about 0.6s;
    // squeeze that into the segment, keeping the last ~third for the finish.
    const gameMs = (left * 0.3 + 0.8) * 1000;
    const stepMs = gameMs / Math.round(frames * 0.75);
    await page.evaluate(overlay, { label: seg.label });
    for (let i = 0; i < frames; i++) {
      const done = await page.evaluate(() => window.__cr.puzzle.done);
      await page.clock.runFor(done ? 1000 / FPS : stepMs);
      await shoot(page);
    }
    const state = await page.evaluate(() => ({ placed: window.__cr.puzzle.placedCount, done: window.__cr.puzzle.done }));
    console.log(`${seg.label}: ${frames} frames, ${state.placed}/${total} pieces, done ${state.done}`);
    await context.close();
  }
}

// Closing card, on a blank page so nothing behind it can show through.
{
  const context = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.setContent('<html><body style="margin:0;background:#0b1020"></body></html>');
  await page.evaluate(overlay, { end: { title: config.appName, lines: ['Run real streets. Rebuild real landmarks.', 'Free on the App Store'] } });
  for (let i = 0; i < Math.round(END_SECONDS * FPS); i++) await shoot(page);
  await context.close();
}
await browser.close();

const ff = findFfmpeg();
if (!ff) { console.error('No ffmpeg found; frames are in', FRAMES); process.exit(1); }
const file = join(OUT, `promo.${ff.full ? 'mp4' : 'webm'}`);
const encode = ff.full
  ? ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-movflags', '+faststart']
  : ['-c:v', 'libvpx', '-b:v', '6M'];
const input = Buffer.concat(readdirSync(FRAMES).sort().map((f) => readFileSync(join(FRAMES, f))));
const made = spawnSync(ff.bin, ['-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', 'pipe:0', ...encode, file],
  { input, stdio: ['pipe', 'ignore', 'pipe'], maxBuffer: 1 << 28 });
if (made.status !== 0) { console.error(made.stderr.toString().slice(-1500)); process.exit(1); }
writeFileSync(join(OUT, 'promo.txt'), `${frame} frames, ${(frame / FPS).toFixed(1)}s\n`);
console.log(`wrote ${file} (${frame} frames, ${(frame / FPS).toFixed(1)}s)`);
