import * as THREE from '../../vendor/three.module.js';

// Renderer + per-city scene dressing (sky dome, fog, lights, ground haze).
export function createRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  return renderer;
}

export function makeCamera() {
  const cam = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 400);
  cam.position.set(0, 5.2, 8.5);
  return cam;
}

export function handleResize(renderer, camera) {
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// Canvas-driven gradient sky dome — cheap, beautiful, per-city colors.
export function makeSky(theme) {
  // NOTE: the dome's lower half sits below the ground plane, so the visible
  // sky is roughly the top half of this canvas — the glow must peak at ~0.5.
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  const glow = theme.sky.glow || theme.sky.horizon;
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, theme.sky.top);
  grad.addColorStop(0.28, theme.sky.mid);
  grad.addColorStop(0.42, theme.sky.horizon);
  grad.addColorStop(0.5, glow);
  grad.addColorStop(1, glow);
  g.fillStyle = grad;
  g.fillRect(0, 0, 1024, 512);

  // hazy distant-skyline silhouette hugging the horizon for depth
  g.fillStyle = 'rgba(30,40,80,0.16)';
  let x = 0;
  while (x < 1024) {
    const w = 14 + Math.random() * 30;
    const top = 218 - Math.random() * 26;
    g.fillRect(x, top, w, 512 - top);
    if (Math.random() < 0.25) g.fillRect(x + w * 0.3, top - 8, w * 0.2, 10); // spire
    x += w + 2;
  }
  // second, fainter row further back
  g.fillStyle = 'rgba(40,50,95,0.1)';
  x = 8;
  while (x < 1024) {
    const w = 20 + Math.random() * 42;
    const top = 200 - Math.random() * 20;
    g.fillRect(x, top, w, 512 - top);
    x += w + 6;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.SphereGeometry(300, 24, 18);
  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false });
  const dome = new THREE.Mesh(geo, mat);
  dome.renderOrder = -10;
  return dome;
}

// Soft glowing sun/moon disc near the horizon for depth.
export function makeSunDisc(theme) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const rg = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  rg.addColorStop(0, 'rgba(255,244,214,1)');
  rg.addColorStop(0.25, 'rgba(255,220,150,.9)');
  rg.addColorStop(1, 'rgba(255,200,120,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, fog: false, depthWrite: false, transparent: true }));
  spr.scale.setScalar(90);
  const p = theme.sun.pos;
  spr.position.set(p[0] * 2.4, 26, -260);
  return spr;
}

export function dressScene(scene, theme) {
  scene.fog = new THREE.FogExp2(theme.fog, theme.fogDensity);
  scene.add(makeSky(theme));
  scene.add(makeSunDisc(theme));

  const hemi = new THREE.HemisphereLight(theme.hemi.sky, theme.hemi.ground, theme.hemi.intensity);
  scene.add(hemi);

  // Shadowless warm fill from behind the camera so facades facing the player
  // are always lit — the single biggest readability win for the runner view.
  const fill = new THREE.DirectionalLight(theme.fill ? theme.fill.color : 0xfff1dc,
    theme.fill ? theme.fill.intensity : 1.0);
  fill.position.set(6, 26, 60);
  fill.target.position.set(0, 4, -60);
  scene.add(fill);
  scene.add(fill.target);

  const sun = new THREE.DirectionalLight(theme.sun.color, theme.sun.intensity);
  sun.position.set(...theme.sun.pos);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 220;
  const s = 40;
  sun.shadow.camera.left = -s; sun.shadow.camera.right = s;
  sun.shadow.camera.top = s; sun.shadow.camera.bottom = -s;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  scene.add(sun.target);
  return { sun, hemi };
}

// Generic canvas-texture helper used by the city builders.
export function canvasTexture(w, h, draw, repeatX = 1, repeatY = 1) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 8;
  return tex;
}
