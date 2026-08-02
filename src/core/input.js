// Unified input: arrow keys / WASD / space + touch swipes.
// Emits: 'left' | 'right' | 'up' | 'down' | 'tap'
export function createInput(onAction) {
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    switch (e.code) {
      case 'ArrowLeft': case 'KeyA': onAction('left'); break;
      case 'ArrowRight': case 'KeyD': onAction('right'); break;
      case 'ArrowUp': case 'KeyW': case 'Space': onAction('up'); e.preventDefault(); break;
      case 'ArrowDown': case 'KeyS': onAction('down'); break;
    }
  });

  let sx = 0, sy = 0, st = 0;
  window.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    sx = t.clientX; sy = t.clientY; st = performance.now();
  }, { passive: true });
  window.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - sx, dy = t.clientY - sy;
    const dt = performance.now() - st;
    if (dt > 600) return;
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) { onAction('tap', t.clientX, t.clientY); return; }
    if (Math.abs(dx) > Math.abs(dy)) onAction(dx > 0 ? 'right' : 'left');
    else onAction(dy > 0 ? 'down' : 'up');
  }, { passive: true });

  window.addEventListener('mousedown', (e) => onAction('tap', e.clientX, e.clientY));
}
