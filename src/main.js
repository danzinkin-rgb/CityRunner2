import * as THREE from '../vendor/three.module.js';
import { createRenderer, makeCamera, handleResize, dressScene } from './core/engine.js';
import { createInput } from './core/input.js';
import { sfx, startMusic, stopMusic, prefs as audioPrefs, saveAudioPrefs } from './core/audio.js';
import { CITIES, LANDMARK_NAMES } from './cities/themes.js';
import { STREET_FACTS, MONUMENT_FACTS } from './facts.js';
import { renderHero, renderCompact, paintScale, countUp } from './factviz.js';
import { getIdentity, rerollName, eraseAllData } from './core/identity.js';
import { startSession, submit, top as topScores, personalBest, currentSession } from './core/scores.js';
import { makeRng, dailySeedFor, dailyKey, secondsUntilDailyReset } from './core/rng.js';
import { initNative, onAppPause, hapticLight, hapticMedium, hapticHeavy, hapticSuccess } from './core/native.js';

export const VERSION = '1.0.0';
import { Player, DEFAULT_STYLE } from './run/player.js';
import { Track } from './run/track.js';
import { Puzzle } from './puzzle/puzzle.js';
import { CHARACTERS, characterById } from './run/characters.js';
import { makeCollectible } from './cities/souvenirs.js';

// ---------- persistent progress ----------
const save = JSON.parse(localStorage.getItem('cityrunner2') || '{"stars":{},"coins":0,"best":0}');
const persist = () => localStorage.setItem('cityrunner2', JSON.stringify(save));

// Souvenir-economy sink #1: cosmetic characters. The default runner is
// always owned so a fresh save never looks empty in the shop.
if (!Array.isArray(save.characters)) save.characters = [];
if (!save.characters.includes('runner')) save.characters.push('runner');
if (!save.equipped || !CHARACTERS.some((c) => c.id === save.equipped)) save.equipped = 'runner';
persist();

// ---------- dom ----------
const $ = (id) => document.getElementById(id);
const hud = $('hud'), fade = $('fade');
const screens = {
  menu: $('screen-menu'), over: $('screen-over'), pwin: $('screen-puzzle-win'),
  facts: $('screen-facts'), paused: $('screen-paused'),
  help: $('screen-help'), settings: $('screen-settings'), scores: $('screen-scores'),
  shop: $('screen-shop'), continue: $('screen-continue'),
};
function showScreen(name) {
  if (name !== 'menu') stopDailyTimer();   // never leak the countdown interval
  for (const k in screens) screens[k].classList.toggle('on', k === name);
  // The HUD stays up behind the pause/continue overlay so the run reads as "frozen".
  hud.classList.toggle('on', !name || name === 'paused' || name === 'continue');
  $('btn-pause').style.display = (!name && (state === 'run' || state === 'puzzle')) ? 'flex' : 'none';
}

// ---------- three ----------
const renderer = createRenderer($('app'));
const camera = makeCamera();
handleResize(renderer, camera);

// ---------- game state ----------
let state = 'menu';         // menu | run | puzzle | over | pwin
let cityIdx = 0, level = 1;
let scene = null, player = null, track = null, puzzle = null;
let speed = 0, coins = 0, score = 0, puzzleBonus = 0;
let shake = 0;

const city = () => CITIES[cityIdx];

// ---------- daily challenge ----------
// One course a day, identical for every player worldwide, rotating city.
// Unlimited attempts; the best score of the day is the one that counts.
let dailyMode = false;
let runSeed = null;          // null => a fresh random course

function todaysDaily(date = new Date()) {
  const seed = dailySeedFor(date);
  // Derive city and street from the seed itself, so the rotation is fixed for
  // the day and nobody can look ahead by changing their clock forward.
  const pick = makeRng(seed);
  const ci = Math.floor(pick() * CITIES.length) % CITIES.length;
  const lv = 1 + (Math.floor(pick() * 3) % 3);
  return { seed, cityIdx: ci, level: lv, day: dailyKey(date) };
}

function fmtCountdown(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Streaks REWARD but never PUNISH: no penalty messaging, no pressure, no
// nagging. (UK Children's Code — the project avoids nudge techniques.)
function recordDailyPlayed() {
  const today = dailyKey();
  if (save.dailyLast === today) return;
  const y = new Date(); y.setUTCDate(y.getUTCDate() - 1);
  save.dailyStreak = save.dailyLast === dailyKey(y) ? (save.dailyStreak || 0) + 1 : 1;
  save.dailyLast = today;
  persist();
}

let dailyTimer = null;
function refreshDailyCard() {
  const card = $('daily-card');
  if (!card) return;
  const d = todaysDaily();
  const c = CITIES[d.cityIdx];
  $('daily-where').textContent = `${c.name} · ${c.streets[d.level - 1]}`;
  const best = personalBest({ mode: 'daily', day: d.day });
  $('daily-best').textContent = best ? `Your best today ${Math.round(best).toLocaleString()}` : 'Not played yet today';
  const streak = save.dailyStreak || 0;
  const st = $('daily-streak');
  st.textContent = streak > 1 ? `🔥 ${streak}-day streak` : '';
  st.style.display = streak > 1 ? '' : 'none';
  $('daily-reset').textContent = `New course in ${fmtCountdown(secondsUntilDailyReset())}`;
}
function startDailyTimer() {
  stopDailyTimer();
  refreshDailyCard();
  dailyTimer = setInterval(refreshDailyCard, 30000);
}
function stopDailyTimer() {
  if (dailyTimer) { clearInterval(dailyTimer); dailyTimer = null; }
}

function startDaily() {
  const d = todaysDaily();
  cityIdx = d.cityIdx;
  level = d.level;
  dailyMode = true;
  runSeed = d.seed;
  startRun();
}

// ---------- menu ----------
function buildCitySelect() {
  const wrap = $('city-select');
  wrap.innerHTML = '';
  const flagFix = { london: '💂' };   // 🇬🇧 renders as plain "GB" on Windows
  CITIES.forEach((c, i) => {
    const stars = save.stars[c.id] || 0;
    const unlocked = i === 0 || (save.stars[CITIES[i - 1].id] || 0) >= 1;
    const el = document.createElement('div');
    el.className = 'city-card' + (unlocked ? '' : ' locked');
    el.innerHTML = `<div class="thumb" style="background-image:url(assets/thumbs/${c.id}.png)">
        <span class="thumb-flag">${flagFix[c.id] || c.flag}</span></div>
      <div class="name">${c.name}</div>
      <div class="stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>`;
    if (unlocked) el.onclick = () => {
      dailyMode = false; runSeed = null;
      cityIdx = i; level = Math.min(3, (save.stars[c.id] || 0) + 1);
      startRun();
    };
    wrap.appendChild(el);
  });
  const stats = document.getElementById('menu-stats');
  if (stats) stats.textContent = `BEST ${Math.round(save.best)}   ·   ${save.coins} SOUVENIRS BANKED`;
  const nameEl = document.getElementById('menu-name');
  if (nameEl) nameEl.textContent = getIdentity().name;
  startDailyTimer();
}

function doFade(fn) {
  fade.style.opacity = 1;
  setTimeout(() => { fn(); fade.style.opacity = 0; }, 520);
}

// ---------- run mode ----------
function startRun() {
  doFade(() => {
    disposeAll();
    scene = new THREE.Scene();
    dressScene(scene, city());
    player = new Player(scene, characterById(save.equipped).style);
    track = new Track(scene, city(), level, runSeed);
    speed = 14 + (level - 1) * 3;
    coins = 0; score = 0; shake = 0;
    continuesUsed = 0;
    camera.position.set(0, 5.2, 8.5);
    $('hud-city').textContent = (dailyMode ? 'DAILY · ' : '')
      + `${city().name} · ${city().streets[level - 1].toUpperCase()}`;
    $('hud-timer').style.display = 'none';
    $('hud-coin-icon').src = `assets/souvenirs/${city().id}.png`;
    startSession(dailyMode ? 'daily' : 'run', city().id, level, runSeed || 0);
    state = 'run';
    showScreen(null);
    hint('◀ ▶ move · ▲ jump · ▼ roll — or swipe');
    setTimeout(() => {
      if (state === 'run') {
        const lm = city().landmarks[level - 1];
        const article = (lm === 'bigben' || lm === 'towerbridge') ? '' : 'the ';   // "Big Ben", but "the Colosseum"
        hint(`${city().streets[level - 1]} — run to ${article}${LANDMARK_NAMES[lm]}!`);
      }
    }, 3000);
    startMusic(city().id);
    state = 'run';
  });
}

let hintTimer = 0;
function hint(text) {
  const el = $('hud-hint');
  el.textContent = text;
  el.style.opacity = 1;
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => { el.style.opacity = 0; }, 2600);
}

// ---------- souvenir-economy sink #2: the continue token ----------
// Price escalates within a single run — 150, 300, 600 — then it's simply
// not offered again. No countdown, no flashing: a calm choice with a clear
// price and a clear decline (UK Children's Code — no nudge techniques).
// Disabled entirely in the daily challenge: it's a level playing field for
// every player worldwide, and paying to survive would distort that board.
const CONTINUE_PRICES = [150, 300, 600];
let continuesUsed = 0;

function crash() {
  if (GOD) return;
  sfx.crash();
  hapticHeavy();
  stopMusic();
  shake = 0.7;
  state = 'dead';
  const price = CONTINUE_PRICES[continuesUsed];
  const offerContinue = !dailyMode && price !== undefined;
  setTimeout(() => {
    if (offerContinue) showContinueOffer(price);
    else endRun();
  }, 900);
}

function showContinueOffer(price) {
  $('continue-score').textContent = Math.round(score);
  $('continue-price').textContent = price;
  const affordable = save.coins >= price;
  $('btn-continue-pay').disabled = !affordable;
  $('continue-note').textContent = affordable
    ? 'Spend souvenirs to clear the road ahead and carry on.'
    : `Not enough souvenirs to continue — you have ${save.coins}.`;
  showScreen('continue');
  state = 'continue-offer';
}

function acceptContinue() {
  const price = CONTINUE_PRICES[continuesUsed];
  if (state !== 'continue-offer' || price === undefined || save.coins < price) return;
  save.coins -= price;
  persist();
  continuesUsed++;
  shake = 0;
  track.clearNearPlayer();
  player.vy = 0; player.y = 0; player.grounded = true; player.rolling = 0;
  state = 'run';
  showScreen(null);
  hint('Back in it — the road ahead is clear');
  startMusic(city().id);
}

function declineContinue() {
  if (state !== 'continue-offer') return;
  endRun();
}

// The run has TRULY ended (crash declined/exhausted, or a puzzle finished).
// Score is submitted here and ONLY here for a crash-ending run, so a
// continued run's higher final score is the one that gets recorded —
// submit() itself also refuses a second call for the same session, so
// calling this twice would silently drop the better score.
function endRun() {
  save.best = Math.max(save.best, score);
  save.coins += coins;
  persist();
  submit(score);   // validated + recorded locally; ignores its own failures
  if (dailyMode) recordDailyPlayed();
  $('over-score').textContent = Math.round(score);
  $('over-coins').textContent = coins;
  showScreen('over');
  state = 'over';
}

// ---------- fact pages ----------
// Facts are the reward for finishing a street, so they get a magazine
// treatment: a hero title in the city's colour, then cards that lead with a
// big number. Numbers count up, because a number that moves gets read.

// Which fact leads. The cursor advances every time a screen is shown, so a
// street looks materially different on each play without a word being
// rewritten -- three facts give three distinct pages, not one page seen thrice.
function nextHeroIndex(key, len) {
  if (len <= 0) return 0;
  if (!save.factCursor) save.factCursor = {};
  const cur = (save.factCursor[key] || 0) % len;
  save.factCursor[key] = (cur + 1) % len;
  persist();
  return cur;
}

// One fact gets the full-width infographic; the rest become quiet rows.
function paintFacts(container, facts, key) {
  container.innerHTML = '';
  if (!facts || !facts.length) return;
  const reduced = !!save.reducedMotion;
  const hero = nextHeroIndex(key, facts.length);
  container.appendChild(renderHero(facts[hero], reduced));
  facts.forEach((f, n) => { if (n !== hero) container.appendChild(renderCompact(f)); });
  countUp(container, reduced);
}

function applyCityPalette() {
  const t = city();
  document.documentElement.style.setProperty('--fp-accent', t.windowLit || '#ffd166');
  document.documentElement.style.setProperty('--fp-glow', t.sky?.mid || '#3a4a8c');
}

function showStreetFacts() {
  stopMusic();
  state = 'facts';
  applyCityPalette();
  const entry = STREET_FACTS[city().id]?.[level - 1];
  $('facts-kicker').textContent = city().name;
  $('facts-title').textContent = entry?.street || city().streets[level - 1];
  $('facts-tag').textContent = entry?.tag || '';
  paintFacts($('facts-list'), entry?.facts || [], 's:' + city().id + ':' + level);
  showScreen('facts');
}

// ---------- puzzle mode ----------
function startPuzzle() {
  stopMusic();
  doFade(() => {
    disposeAll();
    scene = new THREE.Scene();
    dressScene(scene, city());
    const lm = city().landmarks[level - 1];
    puzzle = new Puzzle(scene, camera, lm, level);
    cam.angle = 0; cam.vel = 0; cam.userActive = 0; cam.dragging = false;
    const d0 = fitPuzzleCamera();
    camera.position.set(0, d0 * 0.45, d0);
    camera.lookAt(0, cam.lookY, 0);
    $('hud-timer').style.display = 'block';
    $('hud-city').textContent = `BUILD: ${LANDMARK_NAMES[lm].toUpperCase()}`;
    $('hud-coin-icon').src = `assets/souvenirs/${city().id}.png`;
    state = 'puzzle';
    showScreen(null);
    hint('Tap the glowing blocks — drag to look around');
  });
}

function finishPuzzle(won) {
  const lm = city().landmarks[level - 1];
  if (won) {
    hapticSuccess();
    puzzleBonus = Math.round(puzzle.time) * 50;
    score += puzzleBonus;
    save.stars[city().id] = Math.max(save.stars[city().id] || 0, level);
    save.best = Math.max(save.best, score);
    save.coins += coins;
    persist();
    submit(score);
    if (dailyMode) recordDailyPlayed();
    // Let the celebration play out un-dimmed before the modal appears.
    setTimeout(() => {
      $('pw-name').textContent = LANDMARK_NAMES[lm];
      $('pw-bonus').textContent = puzzleBonus;
      $('pw-time').textContent = Math.round(puzzle.time);
      applyCityPalette();
      const md = MONUMENT_FACTS[lm];
      paintFacts($('pw-facts'), md?.facts || [], 'm:' + lm);
      paintScale($('pw-scale'), md?.scale, md?.compare, LANDMARK_NAMES[lm], !!save.reducedMotion);
      showScreen('pwin');
      state = 'pwin';
    }, 4300);
    state = 'pwin-wait';
  } else {
    save.best = Math.max(save.best, score);
    save.coins += coins; persist();
    submit(score);          // the run still counts even if the puzzle timed out
    $('over-score').textContent = Math.round(score);
    $('over-coins').textContent = coins;
    showScreen('over');
    state = 'over';
  }
}

// ---------- input ----------
createInput((action, px, py) => {
  if (state === 'run') {
    if (action === 'left') { player.moveLane(-1, sfx); hapticMedium(); }
    else if (action === 'right') { player.moveLane(1, sfx); hapticMedium(); }
    else if (action === 'up') { player.jump(sfx); hapticMedium(); }
    else if (action === 'down') { player.roll(sfx); hapticMedium(); }
  }
  // Puzzle picking is handled by the pointer/drag layer below, so that a drag
  // to rotate the view is never mistaken for a tap to place a block.
});

// ---------- puzzle camera: drag to orbit, auto-fit to portrait ----------
const cam = {
  angle: 0,          // orbit angle in radians
  vel: 0,            // inertia after a flick
  userActive: 0,     // seconds since the player last dragged
  dragging: false,
  moved: false,
  lastX: 0, downX: 0, downY: 0,
  dist: 30, lookY: 6,
};

// Fit the camera to whatever is actually on the plaza, rather than assuming a
// distance. On a portrait phone the horizontal field of view is narrow, and a
// fixed distance left most scattered pieces off-screen and unreachable.
function fitPuzzleCamera() {
  let radius = 12, height = 14;
  if (puzzle && puzzle.items) {
    for (const it of puzzle.items) {
      const p = it.placed ? { x: it.def.p[0], y: it.def.p[1], z: it.def.p[2] } : it.mesh.position;
      radius = Math.max(radius, Math.hypot(p.x, p.z) + 2);
      height = Math.max(height, p.y + 2);
    }
  }
  const vHalf = THREE.MathUtils.degToRad(camera.fov) / 2;
  const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect);
  // Distance needed to contain the scene horizontally and vertically, with a
  // small margin so nothing sits flush against the frame edge.
  const dH = radius / Math.tan(hHalf);
  const dV = (height * 0.62) / Math.tan(vHalf);
  // Clamped: beyond ~62 the monument becomes an unreadable speck and the
  // blocks get hard to tap. If the fit wants more than this, the scatter is
  // too wide — pieces past the clamp are still reachable by dragging.
  cam.dist = THREE.MathUtils.clamp(Math.max(dH, dV) * 1.08, 26, 62);
  cam.lookY = Math.min(8, height * 0.36);
  return cam.dist;
}

const canvasEl = renderer.domElement;
canvasEl.style.touchAction = 'none';   // let us own drag gestures

canvasEl.addEventListener('pointerdown', (e) => {
  if (state !== 'puzzle') return;
  cam.dragging = true;
  cam.moved = false;
  cam.lastX = e.clientX;
  cam.downX = e.clientX;
  cam.downY = e.clientY;
  cam.vel = 0;
  canvasEl.setPointerCapture(e.pointerId);
});

canvasEl.addEventListener('pointermove', (e) => {
  if (!cam.dragging || state !== 'puzzle') return;
  const dx = e.clientX - cam.lastX;
  cam.lastX = e.clientX;
  cam.angle -= dx * 0.006;
  cam.vel = -dx * 0.006 * 0.3;   // gentle flick carry, not a spin
  cam.userActive = 0;
  if (Math.hypot(e.clientX - cam.downX, e.clientY - cam.downY) > 10) cam.moved = true;
});

canvasEl.addEventListener('pointerup', (e) => {
  if (state !== 'puzzle') { cam.dragging = false; return; }
  const wasDrag = cam.moved;
  cam.dragging = false;
  if (!wasDrag) {
    // A clean tap — place a block.
    puzzle.tryPick((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  }
});

canvasEl.addEventListener('pointercancel', () => { cam.dragging = false; });

$('btn-play').onclick = () => {
  dailyMode = false; runSeed = null;
  cityIdx = 0; level = Math.min(3, (save.stars.nyc || 0) + 1);
  startRun();
};
$('daily-card').onclick = () => startDaily();
$('btn-build').onclick = () => startPuzzle();

// ---------- menu shell: help, settings, scoreboard ----------
// Each overlay remembers where it came from so Back always returns correctly.
let overlayFrom = 'menu';
function openOverlay(name) {
  overlayFrom = state === 'menu' ? 'menu' : overlayFrom;
  if (state === 'run' || state === 'puzzle') pauseGame();
  state = `ui-${name}`;
  showScreen(name);
}
function closeOverlay() {
  if (pausedFrom) { state = 'paused'; showScreen('paused'); return; }
  state = 'menu';
  buildCitySelect();
  showScreen('menu');
}

$('btn-help').onclick = () => openOverlay('help');
$('btn-help-close').onclick = closeOverlay;
$('btn-scores').onclick = () => { renderScores(); openOverlay('scores'); };
$('btn-scores-close').onclick = closeOverlay;
$('btn-settings').onclick = () => { renderSettings(); openOverlay('settings'); };
$('btn-settings-close').onclick = closeOverlay;
$('btn-shop').onclick = () => { renderShop(); openOverlay('shop'); };
$('btn-shop-close').onclick = closeOverlay;

function renderScores() {
  const body = $('scores-body');
  body.innerHTML = '';
  let any = false;
  for (const c of CITIES) {
    for (let lv = 1; lv <= 3; lv++) {
      const best = topScores({ mode: 'run', cityId: c.id, level: lv }, 1)[0];
      if (!best) continue;
      any = true;
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `<span>${c.name} · ${c.streets[lv - 1]}</span>
        <span style="color:var(--gold);font-weight:800">${best.score.toLocaleString()}</span>`;
      body.appendChild(row);
    }
  }
  if (!any) {
    body.innerHTML = '<p class="tip">No runs yet. Your best score for each street will appear here.</p>';
  } else {
    const hr = document.createElement('hr');
    const tot = document.createElement('div');
    tot.className = 'row';
    tot.innerHTML = `<span class="muted">Lifetime souvenirs</span>
      <span class="muted">${save.coins.toLocaleString()}</span>`;
    body.append(hr, tot);
  }
}

// ---------- shop (souvenir sink #1: characters) ----------
const hexCss = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0').slice(-6);
let shopMsgTimer = null;
function shopMsg(text) {
  const el = $('shop-msg');
  el.textContent = text;
  clearTimeout(shopMsgTimer);
  shopMsgTimer = setTimeout(() => { el.textContent = ''; }, 2200);
}
function renderShop() {
  const wrap = $('shop-grid');
  wrap.innerHTML = '';
  for (const c of CHARACTERS) {
    const style = { ...DEFAULT_STYLE, ...c.style };
    const owned = save.characters.includes(c.id);
    const equipped = save.equipped === c.id;
    const el = document.createElement('div');
    el.className = 'char-card' + (equipped ? ' equipped' : '') + (!owned ? ' locked' : '');
    // Portrait rendered from the real model (assets/characters), tinted with
    // the character's own colours behind it so the card still reads at a
    // glance if the image is slow to arrive.
    el.innerHTML = `<div class="char-thumb" style="background:
        url(assets/characters/${c.id}.png) center bottom/auto 96% no-repeat,
        radial-gradient(ellipse at 50% 85%,${hexCss(style.hoodie)}3a,transparent 70%),
        linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.01))"></div>
      <div class="char-name">${c.name}</div>
      <div class="char-state">${equipped ? 'EQUIPPED' : owned ? 'OWNED' : `${c.price.toLocaleString()} 🪙`}</div>`;
    el.onclick = () => {
      if (equipped) return;
      if (owned) { save.equipped = c.id; persist(); renderShop(); return; }
      if (save.coins >= c.price) {
        save.coins -= c.price;
        save.characters.push(c.id);
        save.equipped = c.id;
        persist();
        renderShop();
      } else {
        shopMsg(`Not enough souvenirs — need ${(c.price - save.coins).toLocaleString()} more.`);
      }
    };
    wrap.appendChild(el);
  }
  $('shop-balance-num').textContent = save.coins.toLocaleString();
}

function renderSettings() {
  const setToggle = (id, on) => {
    const el = $(id);
    el.textContent = on ? 'ON' : 'OFF';
    el.classList.toggle('on', on);
  };
  setToggle('set-music', audioPrefs.music);
  setToggle('set-sfx', audioPrefs.sfx);
  setToggle('set-motion', !!save.reducedMotion);
  setToggle('set-touchbtns', !!save.touchButtons);
  $('set-vol').value = Math.round(audioPrefs.volume * 100);
  $('set-name').textContent = getIdentity().name;
  $('set-version').textContent = `v${VERSION}`;
}

$('set-music').onclick = () => {
  audioPrefs.music = !audioPrefs.music; saveAudioPrefs(); renderSettings();
  if (audioPrefs.music && state === 'paused' && pausedFrom === 'run') startMusic(city().id);
};
$('set-sfx').onclick = () => { audioPrefs.sfx = !audioPrefs.sfx; saveAudioPrefs(); renderSettings(); };
$('set-vol').oninput = (e) => { audioPrefs.volume = +e.target.value / 100; saveAudioPrefs(); };
$('set-motion').onclick = () => {
  save.reducedMotion = !save.reducedMotion; persist(); applyReducedMotion(); renderSettings();
};
$('set-touchbtns').onclick = () => {
  save.touchButtons = !save.touchButtons; persist(); applyTouchButtons(); renderSettings();
};
$('set-reroll').onclick = () => { rerollName(); renderSettings(); };
$('set-erase').onclick = () => {
  if (!confirm('Erase your nickname, progress and scores from this device?\n\nThis is immediate and cannot be undone.')) return;
  eraseAllData();
  save.stars = {}; save.coins = 0; save.best = 0;
  persist();
  renderSettings();
  alert('Erased. A fresh anonymous profile has been created.');
};

// Respect the OS setting on first run, then honour the in-game override.
if (save.reducedMotion === undefined) {
  save.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  persist();
}
export function reducedMotion() { return !!save.reducedMotion; }
function applyReducedMotion() { document.body.classList.toggle('reduced-motion', !!save.reducedMotion); }
function applyTouchButtons() { document.body.classList.toggle('touch-controls', !!save.touchButtons); }
applyReducedMotion();
applyTouchButtons();

// ---------- pause ----------
let pausedFrom = null;
function pauseGame() {
  if (state !== 'run' && state !== 'puzzle') return;
  pausedFrom = state;
  state = 'paused';
  stopMusic();
  showScreen('paused');
}
function resumeGame() {
  if (state !== 'paused' || !pausedFrom) return;
  state = pausedFrom;
  pausedFrom = null;
  clock.getDelta();                 // discard the paused interval
  showScreen(null);
  if (state === 'run') startMusic(city().id);
}
$('btn-pause').onclick = pauseGame;

// On-screen control pad (Settings → On-screen controls)
const padAction = (id, fn) => {
  const el = $(id);
  el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (state === 'run') fn(); });
};
padAction('t-left', () => player.moveLane(-1, sfx));
padAction('t-right', () => player.moveLane(1, sfx));
padAction('t-jump', () => player.jump(sfx));
padAction('t-roll', () => player.roll(sfx));
$('btn-resume').onclick = resumeGame;
$('btn-quit').onclick = () => {
  pausedFrom = null;
  doFade(() => { disposeAll(); buildCitySelect(); showScreen('menu'); state = 'menu'; });
};
window.addEventListener('keydown', (e) => {
  if (e.code !== 'Escape' && e.code !== 'KeyP') return;
  if (state === 'paused') resumeGame(); else pauseGame();
});
// Auto-pause when the tab/app is backgrounded — expected behaviour on phones.
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
$('btn-continue-pay').onclick = acceptContinue;
$('btn-continue-no').onclick = declineContinue;
$('btn-retry').onclick = () => startRun();
$('btn-menu').onclick = $('btn-menu2').onclick = () => doFade(() => { disposeAll(); buildCitySelect(); showScreen('menu'); state = 'menu'; });
$('btn-next').onclick = () => {
  if (level < 3) level++;
  else if (cityIdx < CITIES.length - 1) { cityIdx++; level = 1; }
  else { doFade(() => { disposeAll(); buildCitySelect(); showScreen('menu'); state = 'menu'; }); return; }
  startRun();
};

function disposeAll() {
  if (track) { track.dispose(); track = null; }
  if (puzzle) { puzzle.dispose(); puzzle = null; }
  if (scene) {
    scene.traverse((n) => { if (n.geometry) n.geometry.dispose(); });
    scene = null;
  }
  player = null;
}

// ---------- main loop ----------
const clock = new THREE.Clock();
let lastTickSec = -1;

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  if (!scene) return;

  if (state === 'run' || state === 'dead') {
    if (state === 'run') {
      speed += dt * 0.25;                       // gentle ramp
      score += speed * dt * 2;
      track.update(dt, speed, player,
        () => { coins++; sfx.coin(); hapticLight(); score += 25; },
        () => crash());
      player.update(dt, speed);
      if (track.done()) showStreetFacts();
    }
    // camera follow + speed shake
    const targetFov = 62 + Math.min(14, (speed - 14) * 0.5);
    camera.fov += (targetFov - camera.fov) * dt * 3;
    camera.updateProjectionMatrix();
    camera.position.x += (player.x * 0.55 - camera.position.x) * dt * 6;
    camera.position.y = 5.2 + player.y * 0.35 + Math.sin(clock.elapsedTime * 9) * 0.03;
    if (shake > 0) {
      shake -= dt;
      const amp = save.reducedMotion ? 0.18 : 0.9;   // damped, not removed
      camera.position.x += (Math.random() - 0.5) * shake * amp;
      camera.position.y += (Math.random() - 0.5) * shake * amp;
    }
    camera.lookAt(player ? player.x * 0.4 : 0, 2.2, -14);

    $('hud-coins').textContent = coins;
    $('hud-score').textContent = Math.round(score);
    $('hud-progress').style.width = `${track.progress() * 100}%`;
  } else if (state === 'puzzle') {
    puzzle.update(dt);
    // Player-controlled orbit with flick inertia; drifts gently on its own
    // only after a few idle seconds so the scene never feels frozen.
    cam.userActive += dt;
    if (!cam.dragging) {
      cam.angle += cam.vel;
      cam.vel *= 0.88;
      if (cam.userActive > 4) cam.angle += dt * 0.06;
    }
    const dist = cam.dist || fitPuzzleCamera();
    camera.position.set(Math.sin(cam.angle) * dist, dist * 0.45, Math.cos(cam.angle) * dist);
    camera.lookAt(0, cam.lookY || 6, 0);
    const tl = Math.ceil(puzzle.time);
    $('hud-timer').textContent = tl;
    $('hud-timer').classList.toggle('low', tl <= 10);
    if (tl <= 10 && tl !== lastTickSec) { lastTickSec = tl; sfx.tick(); }
    $('hud-progress').style.width = `${(puzzle.placedCount / puzzle.items.length) * 100}%`;
    if (puzzle.done) finishPuzzle(true);
    else if (puzzle.failed) finishPuzzle(false);
  } else if (state === 'pwin-wait') {
    puzzle.update(dt);
  }

  renderer.render(scene, camera);
}

initNative();
onAppPause(() => pauseGame());   // iOS fires this more reliably than visibilitychange
buildCitySelect();
frame();

// ---------- automated screenshot / test harness ----------
// ?view=run|puzzle&city=nyc|paris|london|rome&level=1..3&god=1
// Used by headless-browser visual review; harmless in normal play.
const q = new URLSearchParams(location.search);
const GOD = q.has('god');
if (q.get('view')) {
  const ci = CITIES.findIndex((c) => c.id === (q.get('city') || 'nyc'));
  cityIdx = ci >= 0 ? ci : 0;
  level = Math.min(3, Math.max(1, +(q.get('level') || 1)));
  // Debug handle for automated review only (never exposed in normal play).
  window.__cr = {
    get puzzle() { return puzzle; },
    get camera() { return camera; },
    get state() { return state; },
    get cam() { return cam; },
    get track() { return track; },
    get player() { return player; },
    get speed() { return speed; },
    get seed() { return runSeed; },
    get score() { return score; },
    get continuesUsed() { return continuesUsed; },
    get session() { return currentSession(); },
    crash, acceptContinue, declineContinue,   // test-only: drive the continue flow without a real collision
    todaysDaily,
  };
  if (q.get('seed')) runSeed = +q.get('seed') >>> 0;
  if (q.has('daily')) { const d = todaysDaily(); cityIdx = d.cityIdx; level = d.level; dailyMode = true; runSeed = d.seed; }
  if (q.get('view') === 'puzzle') startPuzzle();
  else startRun();
  // &goal=120 shortens the run for automated review of the facts screen
  const tg = +(q.get('goal') || 0);
  if (tg) setTimeout(() => { if (track) track.goal = tg; }, 900);
} else {
  window.GOD = false;
}

// ?ui=<screen> forces any overlay for systematic UI review at a given size.
// screens: menu | help | settings | scores | shop | continue | facts | over | pwin | paused
if (q.get('ui')) {
  const which = q.get('ui');
  const ci = CITIES.findIndex((c) => c.id === (q.get('city') || 'london'));
  cityIdx = ci >= 0 ? ci : 0;
  level = Math.min(3, Math.max(1, +(q.get('level') || 2)));
  // Populate representative content so screens aren't reviewed empty.
  score = 12480; coins = 37; puzzleBonus = 1650;
  save.best = Math.max(save.best, 12480);
  // in-memory only (no persist) — lets the shop preview show a mix of owned/locked;
  // scoped to `shop` so it doesn't mask the continue screen's affordability states
  if (which === 'shop') save.coins = Math.max(save.coins, 2600);
  if (which === 'facts') showStreetFacts();
  else if (which === 'over') {
    $('over-score').textContent = Math.round(score);
    $('over-coins').textContent = coins;
    showScreen('over'); state = 'over';
  } else if (which === 'pwin') {
    const lm = city().landmarks[level - 1];
    $('pw-name').textContent = LANDMARK_NAMES[lm];
    $('pw-bonus').textContent = puzzleBonus;
    $('pw-time').textContent = 21;
    applyCityPalette();
    const md = MONUMENT_FACTS[lm];
    paintFacts($('pw-facts'), md?.facts || [], 'm:' + lm);
    paintScale($('pw-scale'), md?.scale, md?.compare, LANDMARK_NAMES[lm], !!save.reducedMotion);
    showScreen('pwin'); state = 'pwin';
  } else if (which === 'paused') {
    showScreen('paused'); state = 'paused';
  } else if (which === 'help') { renderSettings(); showScreen('help'); state = 'ui-help'; }
  else if (which === 'settings') { renderSettings(); showScreen('settings'); state = 'ui-settings'; }
  else if (which === 'scores') { renderScores(); showScreen('scores'); state = 'ui-scores'; }
  else if (which === 'shop') { renderShop(); showScreen('shop'); state = 'ui-shop'; }
  else if (which === 'souvenir') {
    // Renders one city's collectible alone, for capturing HUD/help icons.
    // Emoji were standing in for these and were both inaccurate (a classical
    // BUILDING for Rome's Caesar bust) and rendered as flat boxes on iOS.
    disposeAll();
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x141a30);
    const key = new THREE.DirectionalLight(0xfff4e2, 3.1); key.position.set(3, 5, 6);
    const rim = new THREE.DirectionalLight(0xa8d0ff, 1.6); rim.position.set(-4, 2, -4);
    scene.add(key, rim, new THREE.HemisphereLight(0xeaf2ff, 0x2a3050, 1.6));
    const souvenir = makeCollectible(city());
    souvenir.rotation.y = -0.55;
    scene.add(souvenir);
    camera.fov = 26; camera.updateProjectionMatrix();
    camera.position.set(0, 0.1, 3.4);
    camera.lookAt(0, 0, 0);
    showScreen(null);
    hud.classList.remove('on');
    state = 'souvenir';
  }
  else if (which === 'portrait') {
    // Renders one character alone for capturing shop portraits. Deliberately
    // shown from BEHIND at a three-quarter angle — that is how the player
    // actually sees their character while running, and the model has no face.
    const c = characterById(q.get('char') || 'runner');
    disposeAll();
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x141a30);
    const key = new THREE.DirectionalLight(0xfff2df, 2.9); key.position.set(4, 7, 6);
    const rim = new THREE.DirectionalLight(0x9ec8ff, 1.7); rim.position.set(-5, 3, -5);
    scene.add(key, rim, new THREE.HemisphereLight(0xe6f0ff, 0x2a3050, 1.4));
    player = new Player(scene, c.style);
    player.blob.visible = false;              // the ground blob floats with no ground
    player.group.rotation.y = -0.5;           // three-quarter from behind
    camera.fov = 26; camera.updateProjectionMatrix();
    camera.position.set(0, 1.5, 7.2);
    camera.lookAt(0, 1.12, 0);
    showScreen(null);
    hud.classList.remove('on');
    state = 'portrait';
    // Freeze on a flattering frame of the run cycle rather than a limp T-pose.
    player.time = 0.62;
    player.update(0.0001, 14);
  }
  else if (which === 'continue') { showContinueOffer(CONTINUE_PRICES[0]); }
  else { buildCitySelect(); showScreen('menu'); state = 'menu'; }
}
