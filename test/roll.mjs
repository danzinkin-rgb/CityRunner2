/**
 * The roll stays above the road — a GATE, wired into `npm test`.
 *
 * The roll squashes the runner and spins the body. It used to spin about the
 * feet, so the head and torso swung down through the road for half of every
 * roll (user feedback: "the runner goes under/through the floor"). This rolls
 * and measures the lowest point of the body on every frame.
 *
 * Usage: node test/roll.mjs [baseUrl]
 */
import { webkit } from 'playwright';
import { resolveBase } from './serve.mjs';

const { base: BASE, close } = await resolveBase(process.argv[2]);
let failures = 0;
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'ok ' : 'x  '} ${label}${detail ? `  ${detail}` : ''}`);
  if (!ok) failures++;
};
const browser = await webkit.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`${BASE}/?view=run&city=nyc&level=1&seed=7&god=1`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__cr?.player, null, { timeout: 20000 });
await page.waitForTimeout(800);

const r = await page.evaluate(async () => {
  const { player } = window.__cr;
  const Box3 = player.group.position.constructor;      // Vector3; build a box by hand
  const lowest = () => {
    let min = Infinity;
    player.body.updateWorldMatrix(true, true);
    // real vertices, not bounding-box corners: a box's corners stand well
    // clear of the rounded limbs and would report a dip that is not there
    player.body.traverse((n) => {
      if (!n.isMesh) return;
      const pos = n.geometry.attributes.position;
      for (let i = 0; i < pos.count; i += 3) {
        const v = new Box3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(n.matrixWorld);
        if (v.y < min) min = v.y;
      }
    });
    return min;
  };
  const running = lowest();
  player.roll({ lane() {}, jump() {}, roll() {} });
  let worst = Infinity, frames = 0, rolled = false;
  const t0 = performance.now();
  while (performance.now() - t0 < 1200) {
    if (player.rolling > 0) { rolled = true; worst = Math.min(worst, lowest()); frames++; }
    await new Promise((res) => requestAnimationFrame(res));
  }
  return { running: +running.toFixed(2), worst: +worst.toFixed(2), frames, rolled, after: +lowest().toFixed(2) };
});
check(r.rolled && r.frames > 5, 'the roll was measured', `${r.frames} frames`);
check(r.worst > -0.04, 'no part of the runner goes below the road during a roll', `lowest point ${r.worst} m`);
check(r.after > -0.04, 'and the runner is back on the road afterwards', `lowest point ${r.after} m`);
check(!errors.length, 'no page errors', errors[0] || '');

await browser.close();
await close();
console.log(`\n${failures ? `x ${failures} roll check(s) failed` : 'ok roll — stays above the road'}`);
process.exit(failures ? 1 : 0);
