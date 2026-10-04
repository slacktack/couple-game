// Grid legend: # hedge · . path · S start · E exit · K key · G gate · 1-4 floor runes · lowercase = landmark on a path
export const LANDMARKS = {
  a: 'a broken arch', b: 'a garden bench', d: 'a sundial', f: 'a fountain', h: 'a hare-shaped topiary',
  l: 'a lamppost', m: 'a ring of mushrooms', o: 'an owl on a post', p: 'a lily pond', r: 'a rose bush',
  s: 'a stone statue', u: 'a terracotta urn', w: 'a little well',
};

export const RUNES = {
  1: 'M4 1V9M4 4.4 7.2 2M4 6.8 7.2 4.4',
  2: 'M3 9V1.4L7 4.2V9',
  3: 'M3.6 1V9M3.6 2.8 6.9 5 3.6 7.2',
  4: 'M4 1V9M4 1.4 7.2 3.6M4 3.9 7.2 6.1',
};

export const LEVELS = [
  {
    id: 'l1', label: 'Starter hedge', mapkeeper: 'A',
    grid: [
      'Sm.#a..',
      '##.###.',
      'b...w#.',
      '.###.#.',
      '..s#..f',
      '##.###.',
      'r...o#E',
    ],
  },
  {
    id: 'l2', label: 'The cold gate', mapkeeper: 'B',
    grid: [
      'o..#u...K',
      '.#.#.###.',
      'h#....d#.',
      '.#####.#.',
      '..S.f#..a',
      '####.###.',
      'EG....s#.',
      '######.#.',
      'r..p....b',
    ],
  },
  {
    id: 'l3', label: 'Four runes', mapkeeper: 'A', order: [3, 1, 4, 2],
    grid: [
      '..w#..o...E',
      '.#.#.######',
      '2#...#.....',
      '.#.#######.',
      '.#h.d.3...l',
      '.###.######',
      'b...f...a.u',
      '.###.###.#.',
      '4#.#.#s#1#.',
      '.#.#.#.#.#.',
      'r..#S#..m#.',
    ],
  },
];

export const DIRS = {
  up: { dx: 0, dy: -1, name: 'north' },
  right: { dx: 1, dy: 0, name: 'east' },
  down: { dx: 0, dy: 1, name: 'south' },
  left: { dx: -1, dy: 0, name: 'west' },
};

const cache = new WeakMap();
export function parse(level) {
  if (cache.has(level)) return cache.get(level);
  const h = level.grid.length; const w = level.grid[0].length;
  let start = null; let exit = null;
  const cells = level.grid.map((row, y) => [...row].map((ch, x) => {
    const cell = { x, y, ch, wall: ch === '#' };
    if (ch === 'S') start = { x, y };
    if (ch === 'E') { exit = { x, y }; cell.exit = true; }
    if (ch === 'K') cell.key = true;
    if (ch === 'G') cell.gate = true;
    if (/[1-4]/.test(ch)) cell.rune = Number(ch);
    if (LANDMARKS[ch]) cell.landmark = ch;
    return cell;
  }));
  const parsed = { w, h, cells, start, exit, runes: level.order?.length || 0, at: (x, y) => cells[y]?.[x] || null };
  cache.set(level, parsed);
  return parsed;
}

export const startState = level => ({ ...parse(level).start, key: false, lit: [] });

// Pure move rule shared by the game and scripts/verify-maze.mjs.
export function step(level, state, dir) {
  const map = parse(level);
  const d = DIRS[dir];
  const nx = state.x + d.dx; const ny = state.y + d.dy;
  const cell = map.at(nx, ny);
  if (!cell || cell.wall) return { state, event: 'hedge', bump: true };
  if (cell.gate && !state.key) return { state, event: 'gate', bump: true };
  if (cell.exit && state.lit.length < map.runes) return { state, event: 'sealed', bump: true };
  let next = { ...state, x: nx, y: ny };
  let event = 'move';
  if (cell.key && !state.key) { next.key = true; event = 'key'; }
  if (cell.rune && state.lit.length < map.runes && !state.lit.includes(cell.rune)) {
    if (level.order[state.lit.length] === cell.rune) {
      next.lit = [...state.lit, cell.rune];
      event = next.lit.length === map.runes ? 'runes' : 'rune';
    } else {
      event = state.lit.length ? 'reset' : 'fade';
      next.lit = [];
    }
  }
  if (cell.exit) event = 'exit';
  return { state: next, event };
}

const keyOf = s => `${s.x},${s.y},${s.key ? 1 : 0},${s.lit.length}`;

// Shortest list of positions from state to the exit, or null.
export function solve(level, from = startState(level)) {
  const seen = new Map([[keyOf(from), null]]);
  const queue = [from];
  while (queue.length) {
    const s = queue.shift();
    for (const dir of Object.keys(DIRS)) {
      const { state, event, bump } = step(level, s, dir);
      if (bump) continue;
      const k = keyOf(state);
      if (seen.has(k)) continue;
      seen.set(k, s);
      if (event === 'exit') {
        const path = [state];
        for (let p = s; p; p = seen.get(keyOf(p))) path.unshift(p);
        return path.map(({ x, y }) => [x, y]);
      }
      queue.push(state);
    }
  }
  return null;
}
