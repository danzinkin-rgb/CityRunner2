import * as THREE from '../vendor/three.module.js';
import { createRenderer, makeCamera, handleResize, dressScene } from './core/engine.js';
import { createInput } from './core/input.js';
import { sfx, startMusic, stopMusic } from './core/audio.js';
import { CITIES, LANDMARK_NAMES } from './cities/themes.js';
import { Player } from './run/player.js';
import { Track } from './run/track.js';
import { Puzzle } from './puzzle/puzzle.js';

// ---------- persistent progress ----------
const save = JSON.parse(localStorage.getItem('cityrunner2') || '{"stars":{},"coins":0,"best":0}');
const persist = () => localStorage.setItem('cityrunner2', JSON.stringify(save));

// ---------- dom ----------
const $ = (id) => document.getElementById(id);
const hud = $('hud'), fade = $('fade');
const screens = { menu: $('screen-menu'), over: $('screen-over'), pwin: $('screen-puzzle-win') };
function showScreen(name) {
  for (const k in screens) screens[k].classList.toggle('on', k === name);
  hud.classList.toggle('on', !name);
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
    el.innerHTML = `<div class="flag">${flagFix[c.id] || c.flag}</div><div class="name">${c.name}</div>
      <div class="stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>`;
    if (unlocked) el.onclick = () => { cityIdx = i; level = Math.min(3, (save.stars[c.id] || 0) + 1); startRun(); };
    wrap.appendChild(el);
  });
  const stats = document.getElementById('menu-stats');
  if (stats) stats.textContent = `BEST ${Math.round(save.best)}   ·   ${save.coins} COINS BANKED`;
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
    showScreen(null);
    hint(`${city().streets[level - 1]} — run to the ${LANDMARK_NAMES[city().landmarks[level - 1]]}!`);
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
  setTimeout(() => {
    $('over-score').textContent = Math.round(score);
    $('over-coins').textContent = coins;
    showScreen('over');
    state = 'over';
  }, 900);
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
    camera.position.set(0, 14, 30);
    camera.lookAt(0, 6, 0);
    $('hud-timer').style.display = 'block';
    $('hud-city').textContent = `BUILD: ${LANDMARK_NAMES[lm].toUpperCase()}`;
    showScreen(null);
    hint('Tap the glowing blocks — build from the ground up!');
    state = 'puzzle';
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
    setTimeout(() => {
      $('pw-name').textContent = LANDMARK_NAMES[lm];
      $('pw-bonus').textContent = puzzleBonus;
      $('pw-time').textContent = Math.round(puzzle.time);
      showScreen('pwin');
      state = 'pwin';
    }, 1400);
    state = 'pwin-wait';
  } else {
    save.coins += coins; persist();
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
  } else if (state === 'puzzle' && action === 'tap' && px !== undefined) {
    puzzle.tryPick((px / window.innerWidth) * 2 - 1, -(py / window.innerHeight) * 2 + 1);
  }
});

$('btn-play').onclick = () => { cityIdx = 0; level = Math.min(3, (save.stars.nyc || 0) + 1); startRun(); };
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
      if (track.done()) startPuzzle();
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
    // slow orbit
    const a = Math.sin(clock.elapsedTime * 0.1) * 0.35;
    camera.position.set(Math.sin(a) * 30, 15, Math.cos(a) * 30);
    camera.lookAt(0, 6, 0);
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
  if (q.get('view') === 'puzzle') startPuzzle();
  else startRun();
} else {
  window.GOD = false;
}
