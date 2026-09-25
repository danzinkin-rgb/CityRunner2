/**
 * Audio-unlock gate: the AudioContext must be born inside a user gesture.
 *
 * This is a GATE, not a probe: it exits non-zero and is wired into `npm test`.
 *
 * WHAT IT GUARDS. iOS only starts an AudioContext from inside a user gesture.
 * One created anywhere else starts 'suspended', and resume() from outside a
 * gesture is silently refused. The game used to create its context lazily on
 * the first sound, which was startMusic() — called from a setTimeout ~520ms
 * after the player tapped a city. So every run began silent on a phone, and
 * sound only woke up on the first swipe. It shipped in 1.0 and was found on a
 * real device, because nothing here could see it: desktop WebKit does not
 * enforce the gesture rule, so the game sounded fine in every test.
 *
 * HOW IT SEES IT ANYWAY. The rule is not enforced here, but the fact it
 * depends on is still observable: WebKit sets window.event while an event is
 * being dispatched. An init script wraps the AudioContext constructor and
 * records which event, if any, was in flight when it ran. A context created
 * from a timer or a render loop records nothing — which is exactly the bug.
 *
 * What it cannot see: whether the silent switch mutes the result. That is
 * intended (src/core/audio.js explains why) and only a device can show it.
 *
 * Usage: node test/audio-unlock.mjs [baseUrl]
 */
import { webkit, devices } from 'playwright';
import { resolveBase } from './serve.mjs';

const { base: BASE, close } = await resolveBase(process.argv[2]);
const GESTURES = new Set(['touchend', 'pointerup', 'click', 'keydown', 'mouseup']);

let failures = 0;
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'ok ' : 'x  '} ${label}${detail ? `  ${detail}` : ''}`);
  if (!ok) failures++;
};

const browser = await webkit.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
await ctx.addInitScript(() => {
  window.__audioBirths = [];
  window.__stuckLeft = location.search.includes('stuck') ? 1 : 0;
  window.__audioResumes = [];
  const during = () => (window.event ? window.event.type : null);
  // Playwright's WebKit on Windows ships NO Web Audio at all — AudioContext
  // is undefined — so audio.js used to mark itself broken and every suite ran
  // in silence without anyone noticing. Where the API is missing, stand in a
  // minimal fake with just the surface audio.js touches. What this test
  // checks is OUR code's timing (when it creates and resumes the context),
  // which does not need real sound. Where a real AudioContext exists (WebKit
  // on the Mac), it is wrapped instead, so nothing is faked there.
  class P { setValueAtTime() {} linearRampToValueAtTime() {} exponentialRampToValueAtTime() {} }
  class N {
    constructor() { this.gain = new P(); this.frequency = new P(); this.gain.value = 0; }
    connect() {} start() {} stop() {}
  }
  class FakeAC {
    constructor() { this.state = 'suspended'; this.currentTime = 0; this.destination = {}; }
    resume() {
      // ?stuck: the first context never leaves 'interrupted', like iOS after
      // the WebView was killed and reloaded
      if (window.__stuckLeft > 0) { this.state = 'interrupted'; return Promise.resolve(); }
      this.state = 'running'; return Promise.resolve();
    }
    close() { this.state = 'closed'; if (window.__stuckLeft > 0) window.__stuckLeft--; return Promise.resolve(); }
    createGain() { return new N(); }
    createOscillator() { return new N(); }
    createBuffer() { return {}; }
    createBufferSource() { return new N(); }
  }
  const Real = window.AudioContext || window.webkitAudioContext || FakeAC;
  const realResume = Real.prototype.resume;
  Real.prototype.resume = function (...a) {
    window.__audioResumes.push(during());
    return realResume.apply(this, a);
  };
  function Wrapped(...args) {
    window.__audioBirths.push(during());
    return new Real(...args);
  }
  Wrapped.prototype = Real.prototype;
  window.AudioContext = Wrapped;
  window.webkitAudioContext = Wrapped;
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(BASE, { waitUntil: 'load' });
await page.waitForFunction(() => !document.getElementById('city-select').hasAttribute('aria-busy'),
  null, { timeout: 15000 });
await page.waitForTimeout(400);

const before = await page.evaluate(() => window.__audioBirths.slice());
check(before.length === 0, 'no audio context exists before the player touches anything',
  JSON.stringify(before));

// Tap the first city exactly as a player would. The run starts after a
// fade, and that delayed start is where the context used to be created.
await page.tap('#city-select .city-card');
await page.waitForTimeout(1600);

const births = await page.evaluate(() => window.__audioBirths.slice());
check(births.length >= 1, 'tapping a city creates an audio context', JSON.stringify(births));
check(births.length > 0 && GESTURES.has(births[0]),
  'the FIRST context is created inside a user gesture, not a timer',
  `created during: ${JSON.stringify(births[0] ?? 'nothing')}`);
check(births.length === 1, 'exactly one context is created for the session',
  `${births.length} created`);
const resumes = await page.evaluate(() => window.__audioResumes.slice());
check(resumes.length > 0 && GESTURES.has(resumes[0]),
  'the first resume() also happens inside the gesture',
  `resumed during: ${JSON.stringify(resumes[0] ?? 'nothing')}`);
check(!errors.length, 'no page errors', errors[0] || '');

// ---- recovery: a context stuck after resume() is rebuilt on the next tap
// (only meaningful with the stand-in: real WebKit here has no Web Audio to
// get stuck, and on the Mac the real one is wrapped, not faked)
{
  const p2 = await ctx.newPage();
  await p2.goto(`${BASE}/?stuck`, { waitUntil: 'load' });
  await p2.waitForFunction(() => !document.getElementById('city-select').hasAttribute('aria-busy'), null, { timeout: 15000 });
  await p2.tap('#btn-help');                   // first gesture: context made, but stuck
  await p2.waitForTimeout(900);                // past the 700ms stuck check
  await p2.tap('#btn-help-close');             // next gesture: must rebuild it
  await p2.waitForTimeout(300);
  const r = await p2.evaluate(() => ({ births: window.__audioBirths.slice() }));
  check(r.births.length === 2, 'a context stuck after resume() is replaced on the next tap', JSON.stringify(r.births));
  check(r.births.length === 2 && GESTURES.has(r.births[1]), 'and the replacement is also made inside a gesture',
    `made during: ${JSON.stringify(r.births[1] ?? 'nothing')}`);
  await p2.close();
}

await browser.close();
await close();
console.log(`\n${failures ? `x ${failures} audio-unlock check(s) failed` : 'ok audio unlock — the context is born inside a gesture'}`);
process.exit(failures ? 1 : 0);
