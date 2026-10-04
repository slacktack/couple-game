import { CLUES, PASSENGERS, CARS, STATIONS, DRINKS, SOLUTION, LETTER } from '../src/games/night-train-data.js';

const perms = list => list.length <= 1 ? [list] : list.flatMap((x, i) => perms([...list.slice(0, i), ...list.slice(i + 1)]).map(p => [x, ...p]));
const ids = PASSENGERS.map(p => p.id);
const toMap = values => Object.fromEntries(ids.map((id, i) => [id, values[i]]));
const carP = perms(CARS).map(toMap);
const stationP = perms(STATIONS.map((_, i) => i)).map(toMap);
const drinkP = perms(DRINKS.map(d => d.id)).map(toMap);

function solve(clues) {
  const found = [];
  for (const car of carP) for (const drink of drinkP) {
    const partial = { car, drink, station: null };
    for (const station of stationP) {
      partial.station = station;
      if (clues.every(c => c.test(partial))) found.push({ car, drink, station });
    }
  }
  return found;
}

const key = (s, k) => ids.map(id => s[k][id]).join(',');
const distinct = (list, k) => new Set(list.map(s => key(s, k))).size;
const same = (a, b) => ['car', 'station', 'drink'].every(k => key(a, k) === key(b, k));

let ok = true;
const check = (label, pass, detail) => { console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`); if (!pass) ok = false; };

const all = solve(CLUES);
check('all clues -> exactly one solution', all.length === 1, `${all.length} found`);
check('that solution is SOLUTION', all.length === 1 && same(all[0], SOLUTION));
const writer = all[0] && LETTER.writer(all[0]);
check('letter points to one writer', Boolean(writer), writer);
check('red herring points at someone else', writer && LETTER.herring !== writer, `herring -> ${LETTER.herring}`);

const withoutA = solve(CLUES.filter(c => c.owner !== 'A'));
const withoutB = solve(CLUES.filter(c => c.owner !== 'B'));
check("without Tushar's info -> multiple solutions", withoutA.length > 1, `${withoutA.length} found`);
check("without Riya's info -> multiple solutions", withoutB.length > 1, `${withoutB.length} found`);
check('round 1 (cars) needs Tushar', distinct(withoutA, 'car') > 1, `${distinct(withoutA, 'car')} seatings`);
check('round 1 (cars) needs Riya', distinct(withoutB, 'car') > 1, `${distinct(withoutB, 'car')} seatings`);
check('round 2 (stops) needs Tushar', distinct(withoutA, 'station') > 1, `${distinct(withoutA, 'station')} stop plans`);
check('round 2 (stops) needs Riya', distinct(withoutB, 'station') > 1, `${distinct(withoutB, 'station')} stop plans`);

const redundant = CLUES.filter(c => solve(CLUES.filter(r => r !== c)).length === 1).map(c => c.id);
check('every clue is necessary', redundant.length === 0, redundant.join(', ') || `${CLUES.length} clues`);

process.exit(ok ? 0 : 1);
