/**
 * Fact visualisation.
 *
 * The old fact screen showed three identical cards, each a small number beside
 * small text. Three cards of equal weight give the eye nowhere to land, so the
 * page read as a list — which is what a player called boring, and they were
 * right.
 *
 * This gives ONE fact per visit a full-width infographic and demotes the rest
 * to compact rows. Which fact gets the hero treatment rotates every time the
 * player sees the screen, so a street looks materially different on each play
 * without a single new fact being written.
 *
 * THREE TREATMENTS, chosen from the shape of the statistic itself — no hand
 * tagging of the 49 entries in facts.js:
 *
 *   era    a date  ->  a timeline the year is placed on, and how long ago
 *   tally  a count ->  a pictogram grid, so 500,000 is a quantity not a word
 *   pull   anything else -> a typographic hero
 *
 * `pull` is not the leftover bin; it is the treatment for the values that look
 * worst as a plain number. "II" as a big digit was the weakest thing on the
 * old screen. Rendered as a set-piece with its label, it reads deliberately.
 *
 * Every animation here checks reducedMotion. The game is built for children
 * under the UK Age Appropriate Design Code, where honouring that setting is
 * not optional polish.
 */

const SVG = 'http://www.w3.org/2000/svg';
const el = (tag, cls, parent) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (parent) parent.appendChild(n);
  return n;
};
const svgEl = (tag, attrs = {}) => {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};

// Units that describe a countable thing, so a pictogram grid means something.
// Distances and masses are deliberately absent: forty dots do not explain 96m.
const COUNTABLE = new Set([
  'people', 'visitors', 'spectators', 'shops', 'museums', 'rivets', 'panes',
  'names', 'lifts', 'capsules', 'entrances', 'elephants', 'strikes', 'minutes',
  'days', 'stalls', 'traders', 'fountains', 'steps', 'columns', 'statues',
  'rooms', 'windows', 'arches', 'bells', 'seats', 'gates', 'stalls',
]);

const PEOPLE_UNITS = new Set(['people', 'visitors', 'spectators']);

/** "500k" -> 500000, "2.5M" -> 2500000, "1,900" -> 1900. NaN if not numeric. */
function parseMagnitude(raw) {
  const m = String(raw).match(/^([\d.,]+)\s*([kM])?$/);
  if (!m) return NaN;
  const n = parseFloat(m[1].replace(/,/g, ''));
  if (!isFinite(n)) return NaN;
  return m[2] === 'k' ? n * 1000 : m[2] === 'M' ? n * 1e6 : n;
}

/**
 * The year a fact refers to, or null. Handles plain years, AD/BC, and the
 * ordinal centuries that appear as "15th" / "17th".
 */
export function parseYear(f) {
  const big = String(f.big ?? '').trim();
  const unit = String(f.unit ?? '').trim().toLowerCase();

  const century = big.match(/^(\d{1,2})(st|nd|rd|th)$/);
  if (century && unit === 'century') return (parseInt(century[1], 10) - 1) * 100 + 50;

  const n = parseFloat(big.replace(/,/g, ''));
  if (!isFinite(n)) return null;
  if (unit === 'bc') return -n;
  if (unit === 'ad') return n;
  // A bare four-digit number in a plausible range is a year. 1,900 panes of
  // glass is not, which is why the comma-grouped form is excluded above.
  if (!unit && Number.isInteger(n) && n >= 1000 && n <= 2100 && !big.includes(',')) return n;
  return null;
}

export function classify(f) {
  if (!f || !f.big) return 'none';
  if (parseYear(f) !== null) return 'era';
  const unit = String(f.unit ?? '').trim().toLowerCase();
  if (COUNTABLE.has(unit) && isFinite(parseMagnitude(f.big))) return 'tally';
  return 'pull';
}

// ---------------------------------------------------------------------------
// era — a year placed on a timeline
// ---------------------------------------------------------------------------

const NOW = 2026;

/** A timeline domain that puts the year comfortably inside it, on round numbers. */
function domainFor(year) {
  const span = NOW - year;
  const step = span > 1200 ? 500 : span > 400 ? 200 : span > 150 ? 100 : 50;
  const start = Math.floor((year - step * 0.35) / step) * step;
  return { start, end: NOW, step };
}

function fmtYear(y) {
  return y < 0 ? `${Math.abs(y)} BC` : String(y);
}

function renderEra(f, reduced) {
  const year = parseYear(f);
  const { start, end, step } = domainFor(year);
  const pct = ((year - start) / (end - start)) * 100;

  const wrap = el('div', 'fv fv-era');

  const head = el('div', 'fv-head', wrap);
  const big = el('div', 'fv-num', head);
  big.dataset.count = year > 0 && !f.unit ? String(year) : '';
  big.textContent = f.unit && !/^(ad|bc)$/i.test(f.unit) ? f.big : fmtYear(year);
  if (f.unit && !/^(ad|bc)$/i.test(f.unit)) el('div', 'fv-unit', head).textContent = f.unit;

  const ago = NOW - year;
  el('div', 'fv-caption', wrap).textContent =
    ago > 0 ? `${ago.toLocaleString('en-GB')} years ago` : 'this year';

  // The axis. Ticks are drawn at round centuries so the marker has context.
  const rail = el('div', 'fv-rail', wrap);
  el('div', 'fv-track', rail);
  for (let t = Math.ceil(start / step) * step; t <= end; t += step) {
    const p = ((t - start) / (end - start)) * 100;
    if (p > 96) continue;
    const tick = el('div', 'fv-tick', rail);
    tick.style.left = `${p}%`;
    el('span', '', tick).textContent = fmtYear(t);
  }
  const fill = el('div', 'fv-fill', rail);
  const dot = el('div', 'fv-dot', rail);
  const nowTick = el('div', 'fv-now', rail);
  nowTick.textContent = 'today';

  if (reduced) { fill.style.width = `${pct}%`; dot.style.left = `${pct}%`; }
  else requestAnimationFrame(() => {
    fill.style.width = `${pct}%`;
    dot.style.left = `${pct}%`;
  });

  el('div', 'fv-text', wrap).textContent = f.text;
  if (f.label) el('div', 'fv-label', wrap).textContent = f.label;
  return wrap;
}

// ---------------------------------------------------------------------------
// tally — a count as a grid of marks
// ---------------------------------------------------------------------------

/** Pick a per-mark value that lands the grid between roughly 20 and 60 marks. */
function markValue(total) {
  if (total <= 60) return 1;
  for (const base of [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000]) {
    if (total / base <= 60) return base;
  }
  return Math.ceil(total / 50);
}

function personMark() {
  const s = svgEl('svg', { viewBox: '0 0 10 16', class: 'fv-mark' });
  s.appendChild(svgEl('circle', { cx: 5, cy: 3.2, r: 2.6 }));
  s.appendChild(svgEl('path', { d: 'M5 6.6c-2.6 0-4 1.6-4 4V16h8v-5.4c0-2.4-1.4-4-4-4z' }));
  return s;
}

function dotMark() {
  const s = svgEl('svg', { viewBox: '0 0 10 10', class: 'fv-mark' });
  s.appendChild(svgEl('rect', { x: 0.6, y: 0.6, width: 8.8, height: 8.8, rx: 2.6 }));
  return s;
}

function renderTally(f, reduced) {
  const total = parseMagnitude(f.big);
  const per = markValue(total);
  const count = Math.max(1, Math.min(60, Math.round(total / per)));
  const people = PEOPLE_UNITS.has(String(f.unit).toLowerCase());

  const wrap = el('div', 'fv fv-tally');

  const head = el('div', 'fv-head', wrap);
  const big = el('div', 'fv-num', head);
  big.dataset.count = String(f.big);
  big.textContent = f.big;
  if (f.unit) el('div', 'fv-unit', head).textContent = f.unit;

  const grid = el('div', 'fv-grid' + (people ? ' people' : ''), wrap);
  for (let i = 0; i < count; i++) {
    const mark = people ? personMark() : dotMark();
    if (reduced) mark.classList.add('on');
    else setTimeout(() => mark.classList.add('on'), 90 + i * (620 / count));
    grid.appendChild(mark);
  }

  if (per > 1) {
    el('div', 'fv-caption', wrap).textContent =
      `each mark = ${per.toLocaleString('en-GB')}${f.unit ? ' ' + f.unit : ''}`;
  } else if (f.label) {
    el('div', 'fv-caption', wrap).textContent = f.label;
  }

  el('div', 'fv-text', wrap).textContent = f.text;
  return wrap;
}

// ---------------------------------------------------------------------------
// pull — a typographic set piece
// ---------------------------------------------------------------------------

// A duplicate of the number ghosted behind it read as a rendering artifact,
// not a design -- two grey bars behind 'II' looked broken. This leads with
// scale instead: the number set very large, a rule, then the copy.
function renderPull(f) {
  const wrap = el('div', 'fv fv-pull');
  const head = el('div', 'fv-head', wrap);
  if (f.big) {
    const big = el('div', 'fv-num', head);
    big.dataset.count = String(f.big);
    big.textContent = f.big;
  }
  if (f.unit) el('div', 'fv-unit', head).textContent = f.unit;
  el('div', 'fv-rule', wrap);
  if (f.label) el('div', 'fv-label', wrap).textContent = f.label;
  el('div', 'fv-text', wrap).textContent = f.text;
  return wrap;
}

// The quote glyph was a font character, and the system stack renders it as two
// flat bars -- the same placeholder look the ghosted number had. Drawn instead,
// so it is a real mark and picks up the city colour like the pictograms do.
function quoteMark() {
  const d = 'M4 30h8c2.2 0 4-1.8 4-4V16c0-2.2-1.8-4-4-4H8.2C8.8 8.4 11 6 15.4 4.6L13.8 0C5.4 1.8 0 7.6 0 16.4V26c0 2.2 1.8 4 4 4z';
  const s = svgEl('svg', { viewBox: '0 0 38 30', class: 'fv-qm' });
  s.appendChild(svgEl('path', { d }));
  s.appendChild(svgEl('path', { d, transform: 'translate(22,0)' }));
  s.setAttribute('aria-hidden', 'true');
  return s;
}

/** A fact with no statistic at all — the text carries it, so set it as a quote. */
function renderQuote(f) {
  const wrap = el('div', 'fv fv-pull fv-quote');
  wrap.appendChild(quoteMark());
  el('div', 'fv-text', wrap).textContent = f.text;
  return wrap;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** The full-width treatment for the one fact leading this visit. */
export function renderHero(f, reduced = false) {
  switch (classify(f)) {
    case 'era': return renderEra(f, reduced);
    case 'tally': return renderTally(f, reduced);
    case 'pull': return renderPull(f);
    default: return renderQuote(f);
  }
}

/** The demoted rows beneath the hero — deliberately quiet. */
export function renderCompact(f) {
  const card = el('div', 'fp-card' + (f.big ? '' : ' noStat'));
  if (f.big) {
    const stat = el('div', 'fp-stat', card);
    const b = el('div', 'fp-big', stat);
    b.textContent = f.big;
    b.dataset.target = f.big;
    if (f.unit) el('div', 'fp-unit', stat).textContent = f.unit;
  }
  el('div', 'fp-text', card).textContent = f.text;
  return card;
}

// ---------------------------------------------------------------------------
// Scale comparison — a monument beside something the player knows
// ---------------------------------------------------------------------------

// Silhouettes, because the reference was a grey blob and read as a placeholder
// rather than a bus. Each path is drawn in a 100-wide box, flat on the baseline.
const SILHOUETTES = {
  bus: 'M6 96V34c0-5 4-9 9-9h70c5 0 9 4 9 9v62H6zM14 40h30v20H14zM56 40h30v20H56z'
     + 'M20 96a9 9 0 0 1 18 0zM62 96a9 9 0 0 1 18 0z',
  person: 'M50 8a11 11 0 1 1 0 22 11 11 0 0 1 0-22zM34 36h32c4 0 6 3 6 7v26h-9v27h-26V69h-9V43c0-4 2-7 6-7z',
};

const SCALE_REFS = {
  bus: { h: 4.4, name: 'double-decker bus', art: 'bus' },
  person: { h: 1.7, name: 'person', art: 'person' },
};

/**
 * Height of a monument against a familiar object, so "96 m" means something.
 * The reference is drawn as a real silhouette scaled to true relative height.
 */
export function paintScale(container, metres, compare, name, reduced = false) {
  container.innerHTML = '';
  if (!metres) return;
  const ref = SCALE_REFS[compare] || SCALE_REFS.bus;
  const refPct = Math.max(3, (ref.h / metres) * 100);

  const row = el('div', 'fv-scale', container);

  const tall = el('div', 'fv-sbar', row);
  el('div', 'fv-sval', tall).textContent = `${metres} m`;
  const col = el('div', 'fv-scol', tall);
  el('div', 'fv-scap', tall).textContent = name;

  const small = el('div', 'fv-sbar ref', row);
  el('div', 'fv-sval', small).textContent = `${ref.h} m`;
  const holder = el('div', 'fv-sart', small);
  const art = svgEl('svg', { viewBox: '0 0 100 100', preserveAspectRatio: 'xMidYMax meet' });
  art.appendChild(svgEl('path', { d: SILHOUETTES[ref.art] }));
  holder.appendChild(art);
  el('div', 'fv-scap', small).textContent = ref.name;

  const grow = () => { col.style.height = '100%'; holder.style.height = `${refPct}%`; };
  if (reduced) grow(); else requestAnimationFrame(grow);
}

/**
 * Count any purely numeric hero from zero. Values like "€1.5M" or "#1" are left
 * alone, because counting up a currency symbol looks broken.
 */
export function countUp(scope, reduced = false) {
  if (reduced) return;
  scope.querySelectorAll('[data-count]').forEach((node) => {
    const raw = node.dataset.count || '';
    const m = raw.match(/^([\d.,]+)([A-Za-z]*)$/);
    if (!m) return;
    const target = parseFloat(m[1].replace(/,/g, ''));
    if (!isFinite(target) || target === 0) return;
    const suffix = m[2] || '';
    const decimals = (m[1].split('.')[1] || '').length;
    const grouped = m[1].includes(',');
    const t0 = performance.now();
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / 950);
      const v = target * (1 - Math.pow(1 - k, 3));
      let out = decimals ? v.toFixed(decimals) : Math.round(v).toString();
      if (grouped) out = Number(out).toLocaleString('en-GB');
      node.textContent = out + suffix;
      if (k < 1) requestAnimationFrame(tick);
      else node.textContent = raw;
    };
    requestAnimationFrame(tick);
  });
}
