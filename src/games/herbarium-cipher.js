export const HEART = '♥';
export const BLANK = null;
export const PETALS = [3, 4, 5, 6, 7];

export const COLOURS = [
  { id: 'rose', name: 'Rose', plain: 'pink', fill: '#e2627f', deep: '#a3334e' },
  { id: 'marigold', name: 'Marigold', plain: 'orange', fill: '#ee8b3d', deep: '#ad5614' },
  { id: 'buttercup', name: 'Buttercup', plain: 'yellow', fill: '#f3cc47', deep: '#a88210' },
  { id: 'cornflower', name: 'Cornflower', plain: 'blue', fill: '#5c87da', deep: '#2c519b' },
  { id: 'violet', name: 'Violet', plain: 'purple', fill: '#9b69ca', deep: '#5f358b' },
  { id: 'snowdrop', name: 'Snowdrop', plain: 'white', fill: '#fffdf6', deep: '#8f866f' },
];

// Rows = colour, columns = 3..7 petals. Two blank cells are pressed weeds.
export const GRID = [
  ['H', 'E', 'A', 'R', 'T'],
  ['S', 'W', 'I', 'N', 'G'],
  ['C', 'L', 'O', 'U', 'D'],
  ['M', 'Y', ' ', 'K', 'P'],
  ['B', 'V', HEART, 'F', 'X'],
  ['Q', BLANK, 'Z', BLANK, 'J'],
];

export const ALPHABET = /^[A-Z ♥]*$/;

export function cellOf(ch) {
  for (let r = 0; r < GRID.length; r++) {
    const c = GRID[r].indexOf(ch);
    if (c >= 0) return { r, c };
  }
  return null;
}

export function decodeFlower(flower, leafRule = false) {
  const col = flower.p - 3;
  const shifted = leafRule && flower.leaf === 'serrated' ? (col + 1) % 5 : col;
  return GRID[flower.c]?.[shifted] ?? BLANK;
}

export const decode = (flowers, leafRule = false) => flowers.map(f => decodeFlower(f, leafRule)).filter(ch => ch !== BLANK).join('');

export function rng(seed) {
  let s = seed % 2147483647 || 1;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

const BLANKS = GRID.flatMap((row, r) => row.map((ch, c) => (ch === BLANK ? { r, c } : null))).filter(Boolean);

// '·' in text = a blank (weed) flower. left = indices whose stems curl left; otherwise curls are random.
export function encode(text, { leafRule = false, decorativeLeaves = false, seed = 1, left = null } = {}) {
  const rand = rng(seed);
  return [...text].map((ch, i) => {
    const curl = left ? (left.includes(i) ? 'left' : 'right') : rand() < .5 ? 'left' : 'right';
    if (ch === '·') {
      const b = BLANKS[Math.floor(rand() * BLANKS.length)];
      return { c: b.r, p: b.c + 3, leaf: 'smooth', curl };
    }
    const cell = cellOf(ch);
    if (!cell) throw new Error(`Cannot press "${ch}"`);
    const prev = (cell.c + 4) % 5;
    if (leafRule && GRID[cell.r][prev] !== BLANK && rand() < .5) return { c: cell.r, p: prev + 3, leaf: 'serrated', curl };
    const leaf = !leafRule && decorativeLeaves && rand() < .4 ? 'serrated' : 'smooth';
    return { c: cell.r, p: cell.c + 3, leaf, curl };
  });
}

export const PAGES = [
  { id: 'p1', label: 'Plate I', title: 'A first pressing', botanist: 'A', leafRule: false, text: 'DEAR RIYA ♥', seed: 7, decorativeLeaves: true },
  { id: 'p2', label: 'Plate II', title: 'The jagged leaves', botanist: 'B', leafRule: true, text: 'SAME TIME ·TOMO·RROW', seed: 29 },
  { id: 'p3', label: 'Plate III', title: 'Read between the stems', botanist: 'A', leafRule: true, text: 'ONLY THE LEFT CURLS COUNT', seed: 41, left: [3, 21, 22], answer: 'YOU' },
].map(page => {
  const plain = page.text.replace(/·/g, '');
  return { ...page, plain, answer: page.answer || plain.replace(HEART, '').trim(), flowers: encode(page.text, page) };
});

const NUM = ['three', 'four', 'five', 'six', 'seven'];
export const describe = f => `${COLOURS[f.c].plain}, ${NUM[f.p - 3]} petals, ${f.leaf === 'serrated' ? 'jagged' : 'smooth'} leaves, stem curls ${f.curl}`;

export const hiddenWord = page => page.flowers.map((f, i) => (f.curl === 'left' ? decodeFlower(f, page.leafRule) : BLANK)).filter(ch => ch !== BLANK).join('');

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
export const NOTE_MAX = 60;

export const sanitizeNote = value => String(value ?? '').toUpperCase().replace(/<3/g, HEART).replace(/[^A-Z ♥]/g, '').replace(/ {2,}/g, ' ').replace(/^ /, '').slice(0, NOTE_MAX);

export function encodeNote(text, from = 'A', seed = Date.now()) {
  const clean = sanitizeNote(text).trim();
  const flowers = encode(clean, { seed });
  return (from === 'B' ? 'B' : 'A') + flowers.map(f => B64[f.c * 5 + f.p - 3 + (f.curl === 'left' ? 30 : 0)]).join('');
}

export function parseNote(raw) {
  const m = /^([AB])([A-Za-z0-9_-]{1,60})$/.exec(String(raw ?? ''));
  if (!m) return null;
  const flowers = [];
  for (const ch of m[2]) {
    const v = B64.indexOf(ch);
    if (v < 0 || v >= 60) return null;
    const idx = v % 30;
    const f = { c: Math.floor(idx / 5), p: (idx % 5) + 3, leaf: 'smooth', curl: v >= 30 ? 'left' : 'right' };
    if (decodeFlower(f) === BLANK) return null;
    flowers.push(f);
  }
  const text = decode(flowers);
  return /[A-Z]/.test(text) ? { from: m[1], flowers, text } : null;
}

export const noteFromHash = hash => parseNote(/^#press=(.+)$/.exec(hash || '')?.[1]);
