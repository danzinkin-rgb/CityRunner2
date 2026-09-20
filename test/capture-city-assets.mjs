/**
 * Capture the two PNGs every city needs: its menu-card thumbnail and its
 * souvenir icon.
 *
 * WHY THIS FILE EXISTS. Both sets were originally made by hand — someone
 * opened the game, screenshotted it, keyed out the backdrop and cropped the
 * result — and the scripts that did it were never committed. So the four
 * existing cities have images nobody can reproduce, and adding a fifth city
 * meant a broken <img> in the HUD (assets/souvenirs/sf.png, 404) with no
 * recorded way to make the missing file. This is that way, written down.
 *
 * Nothing here downloads or draws anything by hand: both images are renders
 * of the game's own procedural geometry, captured through the same WebKit
 * build the test suites use. That is what keeps "no asset downloads" true.
 *
 * The keying and cropping happen INSIDE the page, on a 2D canvas, so this
 * file needs no PNG encoder and no image library — the page hands back a
 * data URL and Node writes the bytes out.
 *
 * This is a TOOL, not a gate. It is deliberately not in `npm test`: it writes
 * into assets/, and a test that edits the repo is a bad test.
 *
 * Usage:
 *   node test/capture-city-assets.mjs sf            one city
 *   node test/capture-city-assets.mjs sf nyc rome   several
 *   node test/capture-city-assets.mjs --all         every city in themes.js
 */
import { webkit } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startStaticServer } from './serve.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

const themesSrc = readFileSync(join(ROOT, 'src', 'cities', 'themes.js'), 'utf8');
const ALL = [...themesSrc.matchAll(/^\s{2}\{\s*$\n\s*id:\s*'([a-z]+)'/gm)].map((m) => m[1]);

const args = process.argv.slice(2);
const cities = args.includes('--all') ? ALL : args.filter((a) => !a.startsWith('--'));
if (!cities.length) {
  console.log('usage: node test/capture-city-assets.mjs <cityId...> | --all');
  console.log(`cities in themes.js: ${ALL.join(', ')}`);
  process.exit(1);
}
const unknown = cities.filter((c) => !ALL.includes(c));
if (unknown.length) {
  console.log(`x unknown city id(s): ${unknown.join(', ')}`);
  console.log(`  themes.js has: ${ALL.join(', ')}`);
  process.exit(1);
}

const { base, close } = await startStaticServer();
const browser = await webkit.launch();

/** Write a `data:image/png;base64,...` string out as a real file. */
function writeDataUrl(path, dataUrl) {
  const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  writeFileSync(path, Buffer.from(b64, 'base64'));
}

mkdirSync(join(ROOT, 'assets', 'souvenirs'), { recursive: true });
mkdirSync(join(ROOT, 'assets', 'thumbs'), { recursive: true });

for (const city of cities) {
  // ---------------------------------------------------- souvenir icon
  // ?ui=souvenir renders the collectible alone on a flat backdrop. That flat
  // backdrop is what makes keying reliable: every pixel close to it in all
  // three channels is background, everything else is the souvenir.
  {
    const ctx = await browser.newContext({ viewport: { width: 700, height: 700 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(`${base}/?ui=souvenir&city=${city}`, { waitUntil: 'load' });
    await page.waitForTimeout(1400);
    const url = await page.evaluate(() => {
      const src = document.querySelector('canvas');
      const w = src.width, h = src.height;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d');
      g.drawImage(src, 0, 0);
      const img = g.getImageData(0, 0, w, h);
      const d = img.data;
      // the backdrop set by the souvenir route, 0x141a30
      // Tolerance has to stay tight: a souvenir's own dark parts sit close to
      // this backdrop (the cable car's wheels are 0x2a2a30, only 22 away in
      // red), and at a loose tolerance they get keyed out into holes.
      const BR = 0x14, BG = 0x1a, BB = 0x30, TOL = 13;
      let minX = w, minY = h, maxX = -1, maxY = -1;
      for (let i = 0; i < d.length; i += 4) {
        const near = Math.abs(d[i] - BR) < TOL && Math.abs(d[i + 1] - BG) < TOL
          && Math.abs(d[i + 2] - BB) < TOL;
        if (near) { d[i + 3] = 0; continue; }
        const px = (i / 4) % w, py = ((i / 4) / w) | 0;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
      if (maxX < 0) return null;                       // nothing but backdrop
      g.putImageData(img, 0, 0);
      // square crop around the souvenir, with a little breathing room
      const pad = 10;
      const side = Math.max(maxX - minX, maxY - minY) + pad * 2;
      const cxm = (minX + maxX) / 2, cym = (minY + maxY) / 2;
      const out = document.createElement('canvas');
      out.width = side; out.height = side;
      out.getContext('2d').drawImage(c, cxm - side / 2, cym - side / 2, side, side, 0, 0, side, side);
      return out.toDataURL('image/png');
    });
    await ctx.close();
    if (!url) {
      console.log(`x ${city}: souvenir render was empty — does makeCollectible() have a branch for it?`);
      process.exitCode = 1;
    } else {
      const path = join(ROOT, 'assets', 'souvenirs', `${city}.png`);
      writeDataUrl(path, url);
      console.log(`ok ${city}: assets/souvenirs/${city}.png`);
    }
  }

  // ---------------------------------------------------- menu thumbnail
  // A square crop of the city's first street, matching the existing four at
  // 256x256. god=1 keeps a collision from ending the run mid-capture.
  {
    const ctx = await browser.newContext({ viewport: { width: 520, height: 900 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(`${base}/?view=run&city=${city}&level=1&god=1&seed=7`, { waitUntil: 'load' });
    await page.waitForTimeout(2600);
    const url = await page.evaluate(() => {
      const src = document.querySelector('canvas');
      const side = Math.min(src.width, src.height);
      const out = document.createElement('canvas');
      out.width = 256; out.height = 256;
      // centre horizontally; take from the upper half, which is the street
      // and skyline rather than the road right under the player's feet
      out.getContext('2d').drawImage(
        src, (src.width - side) / 2, src.height * 0.16, side, side, 0, 0, 256, 256);
      return out.toDataURL('image/png');
    });
    await ctx.close();
    const path = join(ROOT, 'assets', 'thumbs', `${city}.png`);
    writeDataUrl(path, url);
    console.log(`ok ${city}: assets/thumbs/${city}.png`);
  }
}

await browser.close();
await close();
