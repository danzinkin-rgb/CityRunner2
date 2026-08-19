// Procedural WebAudio: no audio files, everything synthesized.
let ctx = null, master = null, musicTimer = null;

// ---- user preferences (persisted; every mobile game is expected to have these)
const PREF_KEY = 'cityrunner2.audio';
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
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { audioBroken = true; return null; }
    try { ctx = new AC(); } catch { audioBroken = true; return null; }
    master = ctx.createGain();
    master.gain.value = 0.35 * prefs.volume;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, dur, type = 'sine', vol = 0.5, when = 0, slide = 0, isMusic = false) {
  if (isMusic ? !prefs.music : !prefs.sfx) return;
  const a = ac();
  if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = freq;
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), a.currentTime + when + dur);
  g.gain.setValueAtTime(0, a.currentTime + when);
  g.gain.linearRampToValueAtTime(vol, a.currentTime + when + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + when + dur);
  o.connect(g); g.connect(master);
  o.start(a.currentTime + when); o.stop(a.currentTime + when + dur + 0.05);
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
