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

  // A swipe counts as soon as the finger has travelled far enough, not when
  // it lifts, and however slowly it moved. It used to be judged at touchend
  // and dropped if it took over 0.6 s, so a first-time player's slow,
  // deliberate swipes did nothing until they learned to flick (Galaxy A17
  // tester, November 2026). One move per touch; a touch that never travels
  // far enough is a tap, as before.
  const SWIPE = 24;
  let sx = 0, sy = 0, st = 0, swiped = false;
  window.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    sx = t.clientX; sy = t.clientY; st = performance.now(); swiped = false;
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (swiped) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) < SWIPE && Math.abs(dy) < SWIPE) return;
    swiped = true;
    if (Math.abs(dx) > Math.abs(dy)) onAction(dx > 0 ? 'right' : 'left');
    else onAction(dy > 0 ? 'down' : 'up');
  }, { passive: true });
  window.addEventListener('touchend', (e) => {
    if (swiped) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - sx, dy = t.clientY - sy;
    if (performance.now() - st > 600) return;
    if (Math.abs(dx) < SWIPE && Math.abs(dy) < SWIPE) {
      if (!(e.target && e.target.closest && e.target.closest('button'))) onAction('tap', t.clientX, t.clientY);
      return;
    }
    // A move too quick for any touchmove to report it.
    if (Math.abs(dx) > Math.abs(dy)) onAction(dx > 0 ? 'right' : 'left');
    else onAction(dy > 0 ? 'down' : 'up');
  }, { passive: true });

  // Ignore taps that land on UI controls (pause button, menu buttons) so they
  // don't also register as gameplay input.
  const onUI = (e) => !!(e.target && e.target.closest && e.target.closest('button'));
  window.addEventListener('mousedown', (e) => { if (!onUI(e)) onAction('tap', e.clientX, e.clientY); });
}
