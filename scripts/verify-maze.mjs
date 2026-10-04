import { LEVELS, DIRS, parse, startState, step, solve } from '../src/games/maze-levels.js';

let failed = false;
const fail = (level, msg) => { failed = true; console.log(`  FAIL ${level.id}: ${msg}`); };
const ok = msg => console.log(`  ok   ${msg}`);

function explore(level) {
  const from = startState(level);
  const seen = new Set([JSON.stringify(from)]); const cells = new Set(); const events = new Set();
  const queue = [from];
  while (queue.length) {
    const s = queue.shift();
    cells.add(`${s.x},${s.y}`);
    for (const dir of Object.keys(DIRS)) {
      const { state, event, bump } = step(level, s, dir);
      events.add(event);
      if (bump) continue;
      const k = JSON.stringify(state);
      if (seen.has(k)) continue;
      seen.add(k); queue.push(state);
    }
  }
  return { cells, events };
}

for (const level of LEVELS) {
  const map = parse(level);
  console.log(`${level.id} · ${level.label} · ${map.w}x${map.h} · mapkeeper ${level.mapkeeper}`);
  if (!level.grid.every(row => row.length === map.w)) fail(level, 'ragged grid');
  const count = ch => level.grid.join('').split(ch).length - 1;
  if (count('S') !== 1 || count('E') !== 1) fail(level, 'needs exactly one S and one E');
  const marks = level.grid.join('').replace(/[^a-z]/g, '');
  if (new Set(marks).size !== marks.length) fail(level, `landmark repeated: ${marks}`);
  else ok(`${marks.length} unique landmarks (${marks})`);

  const path = solve(level);
  if (!path) { fail(level, 'exit unreachable'); continue; }
  ok(`solvable · shortest route ${path.length - 1} steps`);

  let s = startState(level); let last = null;
  for (let i = 1; i < path.length; i++) {
    const [x, y] = path[i];
    const dir = Object.keys(DIRS).find(d => s.x + DIRS[d].dx === x && s.y + DIRS[d].dy === y);
    const r = step(level, s, dir);
    if (r.bump) { fail(level, `route bumps at ${x},${y}`); break; }
    s = r.state; last = r.event;
  }
  last === 'exit' ? ok('route replays to the exit') : fail(level, `route ended with ${last}`);

  const { cells, events } = explore(level);
  const floor = map.cells.flat().filter(c => !c.wall);
  const unreachable = floor.filter(c => !cells.has(`${c.x},${c.y}`));
  unreachable.length ? fail(level, `unreachable floor: ${unreachable.map(c => `${c.x},${c.y}`).join(' ')}`) : ok(`all ${floor.length} floor cells reachable`);

  if (count('K')) {
    events.has('key') ? ok('key reachable') : fail(level, 'key unreachable');
    events.has('gate') ? ok('gate bumps before the key') : fail(level, 'gate never blocks');
    const noKey = { ...level, grid: level.grid.map(r => r.replace('K', '.')) };
    solve(noKey) ? fail(level, 'exit reachable without the key') : ok('gate is required (no key, no exit)');
  }
  if (level.order) {
    const runeCells = floor.filter(c => c.rune);
    runeCells.length === 4 && runeCells.every(c => cells.has(`${c.x},${c.y}`)) ? ok('all 4 runes reachable') : fail(level, 'runes missing or unreachable');
    events.has('runes') ? ok(`runes light in order ${level.order.join(' ')}`) : fail(level, 'rune order never completes');
    events.has('reset') && events.has('fade') ? ok('wrong order fades and resets') : fail(level, 'reset path never seen');
    events.has('sealed') ? ok('exit stays sealed until the runes glow') : fail(level, 'exit never sealed');
    const visits = path.map(([x, y]) => map.at(x, y).rune).filter(Boolean);
    ok(`shortest route steps on runes ${visits.join(' ')}`);
  }
}

console.log(failed ? '\nFAILED' : '\nAll levels verified.');
process.exit(failed ? 1 : 0);
