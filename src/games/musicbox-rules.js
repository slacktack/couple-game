// Pure rules for The Music Box. Configs come from a short seed; the manual text lives here too.

export function rng(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const freshSeeds = () => [0, 1, 2].map(() => 1 + Math.floor(Math.random() * 999999));

export const MODULES = [
  { id: 'pins', label: 'Pin cylinder', tinkerer: 'A' },
  { id: 'gears', label: 'Gear train', tinkerer: 'B' },
  { id: 'melody', label: 'Melody dial', tinkerer: 'A' },
];

// ---------- Module 1: pin cylinder ----------
export const COLORS = {
  ruby: { name: 'ruby', hex: '#c8324a' },
  sapphire: { name: 'sapphire', hex: '#2f63c4' },
  gold: { name: 'gold', hex: '#e2ad35' },
  jade: { name: 'jade', hex: '#2f9e76' },
  pearl: { name: 'pearl', hex: '#f1e8dc' },
};
const COLOR_WEIGHTS = [['ruby', .27], ['sapphire', .2], ['gold', .19], ['jade', .17], ['pearl', .17]];

export function pinConfig(seed) {
  const r = rng(seed * 7 + 1);
  const pick = () => { let x = r(); for (const [id, w] of COLOR_WEIGHTS) { if ((x -= w) < 0) return id; } return 'pearl'; };
  return { pins: Array.from({ length: 5 }, pick), plate: 100 + Math.floor(r() * 900) };
}

export const PIN_RULES = [
  'If there are no ruby pins, pull the third pin.',
  'Otherwise, if the last pin is pearl and the plate number is odd, pull the fourth pin.',
  'Otherwise, if there is exactly one sapphire pin, pull the sapphire pin.',
  'Otherwise, if there is more than one ruby pin, pull the last ruby pin.',
  'Otherwise, if there are no gold pins, pull the first pin.',
  'Otherwise, pull the ruby pin.',
];

export function solvePins({ pins, plate }) {
  const count = c => pins.filter(p => p === c).length;
  if (!count('ruby')) return { rule: 1, pin: 2 };
  if (pins[4] === 'pearl' && plate % 2) return { rule: 2, pin: 3 };
  if (count('sapphire') === 1) return { rule: 3, pin: pins.indexOf('sapphire') };
  if (count('ruby') > 1) return { rule: 4, pin: pins.lastIndexOf('ruby') };
  if (!count('gold')) return { rule: 5, pin: 0 };
  return { rule: 6, pin: pins.indexOf('ruby') };
}

export const checkPin = (cfg, index) => solvePins(cfg).pin === index;

// ---------- Module 2: gear train ----------
// Table order is precedence: higher rows win.
export const GLYPHS = [
  { glyph: '♡', name: 'heart', dir: 1, turns: 2 },
  { glyph: '✦', name: 'star', dir: -1, turns: 1 },
  { glyph: '☾', name: 'moon', dir: 1, turns: 3 },
  { glyph: '❀', name: 'blossom', dir: -1, turns: 2 },
  { glyph: '♪', name: 'note', dir: 1, turns: 1 },
  { glyph: '⌘', name: 'knot', dir: -1, turns: 3 },
];
export const TEETH = [6, 7, 8, 9, 10, 11, 12];

function shuffle(list, r) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function gearConfig(seed) {
  const r = rng(seed * 13 + 5);
  const glyphs = shuffle(GLYPHS.map(g => g.glyph), r).slice(0, 4);
  const teeth = shuffle(TEETH, r).slice(0, 4);
  return { gears: glyphs.map((glyph, i) => ({ glyph, teeth: teeth[i] })) };
}

const rank = glyph => GLYPHS.findIndex(g => g.glyph === glyph);
const touching = i => [i - 1, i + 1].filter(j => j >= 0 && j < 4);

export function solveGears({ gears }) {
  const first = gears.reduce((best, g, i) => rank(g.glyph) < rank(gears[best].glyph) ? i : best, 0);
  const near = touching(first);
  const biggest = near.reduce((b, j) => gears[j].teeth > gears[b].teeth ? j : b, near[0]);
  const keeps = gears[first].teeth > gears[biggest].teeth;
  const gear = keeps ? first : biggest;
  const row = GLYPHS[rank(gears[gear].glyph)];
  const reversed = gear % 2 === 1;
  const odd = gears[gear].teeth % 2 === 1;
  return { first, keeps, gear, reversed, odd, dir: reversed ? -row.dir : row.dir, turns: row.turns + (odd ? 1 : 0) };
}

// quarters: signed quarter turns, positive = clockwise.
export const checkGear = (cfg, gear, quarters) => {
  const s = solveGears(cfg);
  return s.gear === gear && quarters === s.dir * s.turns;
};

// ---------- Module 3: melody dial ----------
export const SCALE = [523.25, 587.33, 659.25, 783.99, 880];
export const DIAL = ['♡', '✦', '☾', '❀', '♪', '⌘'];
export const CONTOURS = ['up', 'same', 'down'];
export const CONTOUR_TABLE = [
  { up: '☾', same: '♪', down: '❀' },
  { up: '✦', same: '☾', down: '⌘' },
  { up: '♡', same: '✦', down: '♪' },
];

export function melodyConfig(seed) {
  const r = rng(seed * 31 + 9);
  return { notes: Array.from({ length: 4 }, () => Math.floor(r() * SCALE.length)) };
}

export const contourOf = notes => [1, 2, 3].map(i => notes[i] > notes[i - 1] ? 'up' : notes[i] < notes[i - 1] ? 'down' : 'same');

export function solveMelody({ notes }) {
  const steps = contourOf(notes);
  const combo = steps.map((s, i) => CONTOUR_TABLE[i][s]);
  const swap = notes[3] > Math.max(notes[0], notes[1], notes[2]);
  if (swap) [combo[0], combo[2]] = [combo[2], combo[0]];
  return { steps, swap, combo };
}

export const checkCombo = (cfg, combo) => solveMelody(cfg).combo.every((s, i) => combo[i] === s);

// Dial start positions that never already show the answer.
export function dialStart(cfg, seed) {
  const r = rng(seed * 3 + 2);
  const { combo } = solveMelody(cfg);
  return combo.map(answer => {
    let i = Math.floor(r() * DIAL.length);
    if (DIAL[i] === answer) i = (i + 1 + Math.floor(r() * (DIAL.length - 1))) % DIAL.length;
    return i;
  });
}
