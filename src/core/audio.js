// Procedural WebAudio: no audio files, everything synthesized.
import { STORAGE } from './storage-keys.js';

let ctx = null, master = null, musicTimer = null;

// ---- user preferences (persisted; every mobile game is expected to have these)
// Deliberately NOT cleared by "erase my data" — see src/core/storage-keys.js.
const PREF_KEY = STORAGE.AUDIO;
export const prefs = { music: true, sfx: true, volume: 0.8 };
try {
  const saved = JSON.parse(localStorage.getItem(PREF_KEY) || 'null');
  if (saved) Object.assign(prefs, saved);
} catch { /* unavailable storage — defaults stand */ }

export function saveAudioPrefs() {
  try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch { /* private mode */ }
  if (master) master.gain.value = 0.35 * prefs.volume;
  if (!prefs.music) stopMusic();
}

// Audio must never be able to break the game. WebKit throws if the API is
// missing or blocked (no user gesture yet, low-power mode, locked-down
// contexts), and these calls sit inside the render loop.
let audioBroken = false;

function ac() {
  if (audioBroken) return null;
  // A context iOS has closed (an interruption like a phone call, or extended
  // backgrounding, can do this) stays unusable forever unless recreated —
  // `resume()` only helps a merely 'suspended' context, and createOscillator
  // throws on a 'closed' one. `!ctx` alone never catches this once a context
  // has existed, which is exactly why sound could go dead for the rest of a
  // session with no recovery.
  if (ctx && ctx.state === 'closed') ctx = null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    // Only a MISSING API is permanent. A constructor that throws once (iOS
    // right after the WebView was killed and reloaded, or with its audio
    // session busy) used to latch audioBroken for the rest of the session —
    // no sound whatever the player did, until the app was restarted. Now
    // the next gesture simply tries again.
    if (!AC) { audioBroken = true; return null; }
    try { ctx = new AC(); } catch { ctx = null; return null; }
    master = ctx.createGain();
    master.gain.value = 0.35 * prefs.volume;
    master.connect(ctx.destination);
  }
  // 'interrupted' is WebKit's own state for an audio session taken away
  // (a call, Siri, another app's audio). It needs resuming just as much.
  if (ctx.state === 'suspended' || ctx.state === 'interrupted') ctx.resume().catch(() => {});
  return ctx;
}

// ---- unlocking audio on iOS
// iOS will only start an AudioContext from inside a user gesture. A context
// created anywhere else starts 'suspended', and resume() called from outside
// a gesture is silently refused. Nothing used to create the context inside a
// gesture: the first audio call was startMusic(), which runs in a setTimeout
// ~520ms AFTER the player taps a city. So every run began silent, sound only
// woke up on the first swipe (sfx.lane() happens to run inside touchend), and
// a player who tapped rather than swiped could hear nothing at all.
//
// So every gesture gets a chance to create or resume the context, on the
// capture phase so nothing further down the page can swallow it first. The
// listeners stay on for the whole session rather than removing themselves
// after the first success: iOS suspends the context again on interruptions
// (a call, Siri, backgrounding), and ac() replaces one iOS has closed with a
// brand-new context that starts suspended too. Either way the very next tap
// brings sound back. Once the context is running each call is one state check.
//
// SILENT MODE IS RESPECTED, ON PURPOSE. Web Audio on iOS is muted by the
// silent switch / Action button's silent mode, and that is left alone: it is
// Apple's guidance for games whose sound is secondary, and a kids' game that
// plays out loud on a phone someone has deliberately silenced is worse than
// one that is quiet. Do not set navigator.audioSession.type = 'playback' to
// "fix" silence on a muted phone — that is this behaviour, decided 22
// September 2026.
// A context that is still not running shortly after a gesture resumed it
// is stuck, and resume() will never fix it — reported as sound gone after a
// crash-and-reload, with the settings toggles doing nothing. The next gesture
// throws it away and builds a fresh one, inside that gesture, which is the one
// thing iOS reliably honours. The music loop and every sound go through ac(),
// so they follow the new context without knowing.
let stuck = false;
function unlock() {
  if (stuck && ctx) {
    stuck = false;
    try { ctx.close(); } catch { /* already gone */ }
    ctx = null;
  }
  const a = ac();                  // creates the context here, inside the gesture
  if (!a || a.state === 'running') return;
  a.resume().catch(() => {});
  setTimeout(() => { if (ctx === a && a.state !== 'running' && a.state !== 'closed') stuck = true; }, 700);
  // Older iOS only treats the context as unlocked once something has actually
  // been started from inside the gesture, so start one silent sample.
  try {
    const src = a.createBufferSource();
    src.buffer = a.createBuffer(1, 1, 22050);
    src.connect(a.destination);
    src.start(0);
  } catch { /* unlocking is best-effort; it must never break input */ }
}
if (typeof window !== 'undefined') {
  for (const type of ['touchend', 'pointerup', 'click', 'keydown']) {
    window.addEventListener(type, unlock, { capture: true, passive: true });
  }
}

function tone(freq, dur, type = 'sine', vol = 0.5, when = 0, slide = 0, isMusic = false) {
  if (isMusic ? !prefs.music : !prefs.sfx) return;
  const a = ac();
  if (!a) return;
  // These calls sit inside the render loop (see header comment) — a context
  // caught mid-transition (e.g. iOS tearing it down for an interruption,
  // between ac() returning it and this running) can still throw here even
  // after the 'closed' check above. One missed beat of music must never
  // become a broken run, so this must never propagate.
  try {
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = freq;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), a.currentTime + when + dur);
    g.gain.setValueAtTime(0, a.currentTime + when);
    g.gain.linearRampToValueAtTime(vol, a.currentTime + when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + when + dur);
    o.connect(g); g.connect(master);
    o.start(a.currentTime + when); o.stop(a.currentTime + when + dur + 0.05);
  } catch { /* see above — a dropped note, not a broken run */ }
}

export const sfx = {
  coin() { tone(1318, 0.09, 'square', 0.16); tone(1760, 0.14, 'square', 0.14, 0.06); },
  jump() { tone(300, 0.18, 'sine', 0.3, 0, 260); },
  roll() { tone(220, 0.15, 'sawtooth', 0.12, 0, -80); },
  lane() { tone(500, 0.06, 'triangle', 0.15, 0, 120); },
  crash() {
    tone(110, 0.4, 'sawtooth', 0.5, 0, -70);
    tone(80, 0.5, 'square', 0.35, 0.02, -40);
  },
  place() { tone(523, 0.1, 'sine', 0.3); tone(784, 0.18, 'sine', 0.25, 0.07); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.28, i * 0.11)); },
  tick() { tone(880, 0.05, 'square', 0.1); },
  powerup() { [440, 554, 659, 880].forEach((f, i) => tone(f, 0.1, 'square', 0.15, i * 0.05)); },
};

// Minimal driving music loop: bass pulse + arpeggio, per-city scale flavor.
const SCALES = {
  nyc: [0, 3, 5, 7, 10], paris: [0, 2, 3, 7, 8], london: [0, 2, 4, 7, 9], rome: [0, 2, 4, 5, 9],
};

export function startMusic(cityId) {
  stopMusic();
  if (!prefs.music) return;
  const a = ac();
  if (!a) return;
  const scale = SCALES[cityId] || SCALES.nyc;
  const root = 110;
  let step = 0;
  musicTimer = setInterval(() => {
    const beat = step % 8;
    if (beat % 2 === 0) tone(root / 2, 0.22, 'sine', 0.22, 0, 0, true);
    const n = scale[(step * 3 + ((step / 8) | 0)) % scale.length];
    tone(root * 2 * Math.pow(2, n / 12), 0.14, 'triangle', 0.08, 0, 0, true);
    if (beat === 4) tone(root * Math.pow(2, scale[1] / 12), 0.2, 'sine', 0.12, 0, 0, true);
    step++;
  }, 180);
}

export function stopMusic() {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
}
