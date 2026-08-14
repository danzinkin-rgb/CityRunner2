import * as THREE from '../vendor/three.module.js';
import { createRenderer, makeCamera, handleResize, dressScene } from './core/engine.js';
import { createInput } from './core/input.js';
import { sfx, startMusic, stopMusic } from './core/audio.js';
import { CITIES, LANDMARK_NAMES } from './cities/themes.js';
import { STREET_FACTS, MONUMENT_FACTS } from './facts.js';
import { getIdentity, rerollName, eraseAllData } from './core/identity.js';
import { startSession, submit } from './core/scores.js';
import { Player } from './run/player.js';
import { Track } from './run/track.js';
import { Puzzle } from './puzzle/puzzle.js';

// ---------- persistent progress ----------
const save = JSON.parse(localStorage.getItem('cityrunner2') || '{"stars":{},"coins":0,"best":0}');
const persist = () => localStorage.setItem('cityrunner2', JSON.stringify(save));

// ---------- dom ----------
const $ = (id) => document.getElementById(id);
const hud = $('hud'), fade = $('fade');
const screens = {
  menu: $('screen-menu'), over: $('screen-over'), pwin: $('screen-puzzle-win'),
  facts: $('screen-facts'), paused: $('screen-paused'),
};
function showScreen(name) {
  for (const k in screens) screens[k].classList.toggle('on', k === name);
  // The HUD stays up behind the pause overlay so the run reads as "frozen".
  hud.classList.toggle('on', !name || name === 'paused');
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
    if (unlocked) el.onclick = () => { cityIdx = i; level = Math.min(3, (save.stars[c.id] || 0) + 1); startRun(); };
    wrap.appendChild(el);
  });
  const stats = document.getElementById('menu-stats');
  if (stats) stats.textContent = `BEST ${Math.round(save.best)}   ·   ${save.coins} SOUVENIRS BANKED`;
  const nameEl = document.getElementById('menu-name');
  if (nameEl) nameEl.textContent = getIdentity().name;
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
    player = new Player(scene);
    track = new Track(scene, city(), level);
    speed = 14 + (level - 1) * 3;
    coins = 0; score = 0; shake = 0;
    camera.position.set(0, 5.2, 8.5);
    $('hud-city').textContent = `${city().name} · ${city().streets[level - 1].toUpperCase()}`;
    $('hud-timer').style.display = 'none';
    const SOUVENIR_ICON = { nyc: '❤️', paris: '🥐', london: '☎️', rome: '🏛️' };
    $('hud-coin-icon').textContent = SOUVENIR_ICON[city().id] || '🪙';
    startSession('run', city().id, level, 0);
    state = 'run';
    showScreen(null);
    hint('⬅️➡️ move · ⬆️ jump · ⬇️ roll — or swipe');
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

function crash() {
  if (GOD) return;
  sfx.crash();
  stopMusic();
  shake = 0.7;
  state = 'dead';
  save.best = Math.max(save.best, score);
  save.coins += coins;
  persist();
  submit(score);   // validated + recorded locally; ignores its own failures
  setTimeout(() => {
    $('over-score').textContent = Math.round(score);
    $('over-coins').textContent = coins;
    showScreen('over');
    state = 'over';
  }, 900);
}

// ---------- street facts interstitial (run complete → facts → puzzle) ----------
function showStreetFacts() {
  stopMusic();
  state = 'facts';
  $('facts-title').textContent = city().streets[level - 1];
  const list = $('facts-list');
  list.innerHTML = '';
  for (const f of (STREET_FACTS[city().id]?.[level - 1] || [])) {
    const li = document.createElement('li');
    li.textContent = f;
    list.appendChild(li);
  }
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
    const SOUVENIR_ICON = { nyc: '❤️', paris: '🥐', london: '☎️', rome: '🏛️' };
    $('hud-coin-icon').textContent = SOUVENIR_ICON[city().id] || '🪙';
    state = 'puzzle';
    showScreen(null);
    hint('Tap the glowing blocks — drag to look around');
  });
}

function finishPuzzle(won) {
  const lm = city().landmarks[level - 1];
  if (won) {
    puzzleBonus = Math.round(puzzle.time) * 50;
    score += puzzleBonus;
    save.stars[city().id] = Math.max(save.stars[city().id] || 0, level);
    save.best = Math.max(save.best, score);
    save.coins += coins;
    persist();
    submit(score);
    // Let the celebration play out un-dimmed before the modal appears.
    setTimeout(() => {
      $('pw-name').textContent = LANDMARK_NAMES[lm];
      $('pw-bonus').textContent = puzzleBonus;
      $('pw-time').textContent = Math.round(puzzle.time);
      const pf = $('pw-facts');
      pf.innerHTML = '';
      for (const f of (MONUMENT_FACTS[lm] || [])) {
        const li = document.createElement('li');
        li.textContent = f;
        pf.appendChild(li);
      }
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
    if (action === 'left') player.moveLane(-1, sfx);
    else if (action === 'right') player.moveLane(1, sfx);
    else if (action === 'up') player.jump(sfx);
    else if (action === 'down') player.roll(sfx);
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

$('btn-play').onclick = () => { cityIdx = 0; level = Math.min(3, (save.stars.nyc || 0) + 1); startRun(); };
$('btn-build').onclick = () => startPuzzle();

// ---------- identity controls (privacy: reroll + erase are user rights) ----------
$('btn-reroll').onclick = () => { rerollName(); buildCitySelect(); };
$('btn-erase').onclick = () => {
  if (!confirm('Erase your nickname, progress and scores from this device?\n\nThis is immediate and cannot be undone.')) return;
  eraseAllData();
  save.stars = {}; save.coins = 0; save.best = 0;
  persist();
  buildCitySelect();
  alert('Erased. A fresh anonymous profile has been created.');
};

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
        () => { coins++; sfx.coin(); score += 25; },
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
      camera.position.x += (Math.random() - 0.5) * shake * 0.9;
      camera.position.y += (Math.random() - 0.5) * shake * 0.9;
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
  };
  if (q.get('view') === 'puzzle') startPuzzle();
  else startRun();
  // &goal=120 shortens the run for automated review of the facts screen
  const tg = +(q.get('goal') || 0);
  if (tg) setTimeout(() => { if (track) track.goal = tg; }, 900);
} else {
  window.GOD = false;
}
