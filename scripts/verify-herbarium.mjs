import assert from 'node:assert/strict';
import { GRID, BLANK, HEART, PAGES, COLOURS, PETALS, decode, decodeFlower, encode, hiddenWord, encodeNote, parseNote, noteFromHash, sanitizeNote } from '../src/games/herbarium-cipher.js';

const cells = GRID.flat();
assert.equal(GRID.length, COLOURS.length, 'one row per colour');
GRID.forEach(row => assert.equal(row.length, PETALS.length, 'one column per petal count'));
assert.equal(cells.length, 30);
const symbols = cells.filter(c => c !== BLANK);
assert.equal(new Set(symbols).size, symbols.length, 'every symbol appears once');
assert.equal(cells.filter(c => c === BLANK).length, 2, 'two blank cells');
for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') assert.ok(symbols.includes(ch), `missing ${ch}`);
assert.ok(symbols.includes(' ') && symbols.includes(HEART));
console.log('key: 30 cells, 26 letters + space + heart + 2 blanks, no duplicates');

const EXPECT = { p1: 'DEAR RIYA ♥', p2: 'SAME TIME TOMORROW', p3: 'ONLY THE LEFT CURLS COUNT' };
for (const page of PAGES) {
  const out = decode(page.flowers, page.leafRule);
  assert.equal(out, EXPECT[page.id], `${page.id} round trip`);
  page.flowers.forEach((f, i) => {
    assert.ok(f.c >= 0 && f.c < 6 && f.p >= 3 && f.p <= 7, `${page.id}#${i} in range`);
    if (page.leafRule && f.leaf === 'serrated') assert.notEqual(GRID[f.c][f.p - 3], BLANK, `${page.id}#${i} serrated leaf never sits on a blank`);
    if (decodeFlower(f, page.leafRule) === BLANK) assert.equal(f.leaf, 'smooth', `${page.id}#${i} blanks are smooth`);
  });
  const serrated = page.flowers.filter(f => f.leaf === 'serrated').length;
  const naive = decode(page.flowers, false);
  if (page.leafRule) assert.notEqual(naive, out, `${page.id} needs the leaf rule`);
  console.log(`${page.id}: ${page.flowers.length} flowers, ${serrated} serrated -> "${out}"${page.leafRule ? ` (without rule: "${naive}")` : ''}`);
}

const p3 = PAGES[2];
assert.equal(hiddenWord(p3), 'YOU');
assert.deepEqual(PAGES.map(p => p.answer), ['DEAR RIYA', 'SAME TIME TOMORROW', 'YOU'], 'page answers');
assert.equal(p3.flowers.filter(f => f.curl === 'left').length, 3);
console.log(`p3 hidden (left curls N° ${p3.flowers.map((f, i) => f.curl === 'left' ? i + 1 : 0).filter(Boolean).join(', ')}): "${hiddenWord(p3)}"`);

// Stable encodings: page art must not change between builds.
assert.deepEqual(PAGES[0].flowers, encode(PAGES[0].text, PAGES[0]));

const samples = ['MISS YOU ALREADY ♥', 'CALL ME AT NINE', 'Z', 'quick brown fox jumps over the lazy dog <3', 'X'.repeat(80), '  hi   there  '];
for (const s of samples) {
  for (const from of ['A', 'B']) {
    const raw = encodeNote(s, from, 123);
    const note = parseNote(raw);
    assert.ok(note, `parse ${s}`);
    assert.equal(note.from, from);
    assert.equal(note.text, sanitizeNote(s).trim());
    assert.deepEqual(noteFromHash(`#press=${raw}`).text, note.text);
    assert.ok(raw.length <= 61);
  }
}
for (const bad of ['', 'C', 'A', 'Aabc$', `A${'A'.repeat(61)}`, 'A8', 'Aa', 'AW']) assert.equal(parseNote(bad), null, `reject ${bad}`);
assert.equal(parseNote('ARRR'), null, 'only-space note rejected');
assert.equal(parseNote('AF').text, 'S', 'single letter note');
console.log(`notes: ${samples.length * 2} round trips, bad links rejected`);
console.log('verify-herbarium: OK');
