import { pinConfig, checkPin, solvePins, PIN_RULES, gearConfig, checkGear, solveGears, melodyConfig, checkCombo, solveMelody, dialStart, DIAL } from '../src/games/musicbox-rules.js';

const N = 20000;
let failed = false;
const fail = msg => { if (!failed) console.log(`  FAIL ${msg}`); failed = true; };
const tally = () => new Map();
const bump = (m, k) => m.set(k, (m.get(k) || 0) + 1);
const show = m => [...m.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0]))).map(([k, v]) => `${k}:${(v / N * 100).toFixed(1)}%`).join('  ');

const pinRules = tally(); const pinPos = tally();
for (let s = 1; s <= N; s++) {
  const cfg = pinConfig(s);
  const right = [0, 1, 2, 3, 4].filter(i => checkPin(cfg, i));
  if (right.length !== 1) fail(`pins seed ${s}: ${right.length} solutions`);
  const { rule } = solvePins(cfg);
  bump(pinRules, `R${rule}`); bump(pinPos, right[0] + 1);
}
console.log(`Pin cylinder · ${N} configs · exactly one pin each`);
console.log(`  rules ${show(pinRules)}`);
console.log(`  pin   ${show(pinPos)}`);
for (let r = 1; r <= PIN_RULES.length; r++) if (!pinRules.get(`R${r}`)) fail(`rule ${r} never fires`);

const gearPick = tally(); const turns = tally(); const kept = tally();
for (let s = 1; s <= N; s++) {
  const cfg = gearConfig(s);
  if (new Set(cfg.gears.map(g => g.teeth)).size !== 4 || new Set(cfg.gears.map(g => g.glyph)).size !== 4) fail(`gears seed ${s}: duplicate teeth or glyph`);
  const right = [];
  for (let g = 0; g < 4; g++) for (let q = -4; q <= 4; q++) if (q && checkGear(cfg, g, q)) right.push([g, q]);
  if (right.length !== 1) fail(`gears seed ${s}: ${right.length} solutions`);
  const sol = solveGears(cfg);
  bump(gearPick, `gear${sol.gear + 1}`); bump(turns, sol.dir * sol.turns); bump(kept, sol.keeps ? 'kept' : 'passed');
}
console.log(`Gear train · ${N} configs × 4 gears × ±4 quarter turns · exactly one action each`);
console.log(`  drive ${show(gearPick)}`);
console.log(`  turn  ${show(turns)}`);
console.log(`  first ${show(kept)}`);

const swaps = tally(); const combos = new Set();
for (let s = 1; s <= N; s++) {
  const cfg = melodyConfig(s);
  let right = 0;
  for (const a of DIAL) for (const b of DIAL) for (const c of DIAL) if (checkCombo(cfg, [a, b, c])) right++;
  if (right !== 1) fail(`melody seed ${s}: ${right} solutions`);
  const sol = solveMelody(cfg);
  bump(swaps, sol.swap ? 'swap' : 'plain'); combos.add(sol.combo.join(''));
  const start = dialStart(cfg, s);
  if (start.some((d, i) => DIAL[d] === sol.combo[i])) fail(`melody seed ${s}: a dial starts on its answer`);
}
console.log(`Melody dial · ${N} configs × 216 combos · exactly one combo each`);
console.log(`  ${show(swaps)}  distinct answers: ${combos.size}`);

console.log(failed ? 'FAILED' : 'ALL OK');
process.exit(failed ? 1 : 0);
