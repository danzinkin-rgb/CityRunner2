/**
 * Write the Android launcher icons from assets/icon-1024.png, the same artwork
 * as the iOS icon.
 *
 * `npx cap add android` leaves Capacitor's own logo in every mipmap folder.
 * This replaces them. Run it again only if the icon changes:
 *
 *   npm run assets:android
 *
 * Three files per density:
 *   ic_launcher.png             square, for launchers older than Android 8
 *   ic_launcher_round.png       the same, clipped to a circle
 *   ic_launcher_foreground.png  the adaptive-icon layer (108dp canvas)
 *
 * The adaptive layer draws the artwork at 86dp in the middle of the 108dp
 * canvas. Launchers show at most the middle 72dp of it, so no edge of the
 * artwork and no gap round it is ever visible, whatever the mask shape, and
 * less of the tower is cropped than if the artwork filled the whole canvas.
 *
 * The resizing happens on a 2D canvas inside a browser, like
 * test/capture-city-assets.mjs, so no image library is needed.
 */
import { webkit } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RES = join(ROOT, 'android', 'app', 'src', 'main', 'res');
const SRC = `data:image/png;base64,${readFileSync(join(ROOT, 'assets', 'icon-1024.png')).toString('base64')}`;

// density -> pixels per dp
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

const browser = await webkit.launch();
const page = await browser.newPage();
await page.setContent('<html><body></body></html>');

/** Draw the icon into a size x size canvas: `art` px wide, centred, optionally round. */
const render = (size, art, round) => page.evaluate(async ({ src, size, art, round }) => {
  const img = new Image();
  img.src = src;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  if (round) { g.beginPath(); g.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); g.clip(); }
  const off = (size - art) / 2;
  g.drawImage(img, off, off, art, art);
  return c.toDataURL('image/png').split(',')[1];
}, { src: SRC, size, art, round });

for (const [d, k] of Object.entries(DENSITIES)) {
  const dir = join(RES, `mipmap-${d}`);
  const legacy = Math.round(48 * k);
  const layer = Math.round(108 * k);
  writeFileSync(join(dir, 'ic_launcher.png'), Buffer.from(await render(legacy, legacy, false), 'base64'));
  writeFileSync(join(dir, 'ic_launcher_round.png'), Buffer.from(await render(legacy, legacy, true), 'base64'));
  writeFileSync(join(dir, 'ic_launcher_foreground.png'),
    Buffer.from(await render(layer, Math.round(86 * k), false), 'base64'));
  console.log(`ok  mipmap-${d}: ${legacy}px icon, ${layer}px adaptive layer`);
}

await browser.close();
