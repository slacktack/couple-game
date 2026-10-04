// Shared by NightTrain.jsx and scripts/verify-night-train.mjs.
export const ROUTE = { name: 'The Nightingale Sleeper', from: 'Vienna', departs: '21:28' };

export const PASSENGERS = [
  { id: 'amara', name: 'Amara Okafor', first: 'Amara', role: 'Cellist', hue: '#f19bb0' },
  { id: 'mateo', name: 'Mateo Ruiz', first: 'Mateo', role: 'Pastry chef', hue: '#e8bf72' },
  { id: 'hana', name: 'Hana Sato', first: 'Hana', role: 'Cartographer', hue: '#8fd3c6' },
  { id: 'leila', name: 'Leila Haddad', first: 'Leila', role: 'Night nurse', hue: '#b7a6f2' },
  { id: 'oskar', name: 'Oskar Lind', first: 'Oskar', role: 'Lighthouse keeper, retired', hue: '#8fb7f0' },
];

export const CARS = [1, 2, 3, 4, 5];

// Times live only on Tushar's timetable; features only on Riya's map.
export const STATIONS = [
  { id: 'salzburg', name: 'Salzburg', short: 'SZG', time: '23:40', feature: 'river', mark: 'On the river' },
  { id: 'innsbruck', name: 'Innsbruck', short: 'INN', time: '01:46', feature: 'peaks', mark: 'Under the peaks' },
  { id: 'bolzano', name: 'Bolzano', short: 'BZO', time: '03:58', feature: 'vines', mark: 'Among the vines' },
  { id: 'verona', name: 'Verona', short: 'VRN', time: '05:32', feature: 'balcony', mark: 'The balcony city' },
  { id: 'venice', name: 'Venice', short: 'VCE', time: '07:05', feature: 'lagoon', mark: 'On the lagoon' },
];

export const DRINKS = [
  { id: 'tea', name: 'Tea' },
  { id: 'cocoa', name: 'Cocoa' },
  { id: 'wine', name: 'Red wine' },
  { id: 'coffee', name: 'Coffee' },
  { id: 'lemonade', name: 'Lemonade' },
];

// s = { car: {pid: 1..5}, station: {pid: 0..4}, drink: {pid: drinkId} }
export const who = (s, key, value) => PASSENGERS.find(p => s[key][p.id] === value)?.id;
const stationAt = time => STATIONS.findIndex(st => st.time === time);
const sinceDeparture = time => { const [h, m] = time.split(':').map(Number); return ((h * 60 + m) - 21 * 60 + 1440) % 1440; };
const firstStopAfter = time => STATIONS.findIndex(st => sinceDeparture(st.time) > sinceDeparture(time));

export const SOLUTION = {
  car: { mateo: 1, amara: 2, leila: 3, oskar: 4, hana: 5 },
  station: { oskar: 0, hana: 1, amara: 2, leila: 3, mateo: 4 },
  drink: { mateo: 'coffee', amara: 'tea', leila: 'wine', oskar: 'cocoa', hana: 'lemonade' },
};

// Tushar's manifest. smudge = the ink could be either digit.
export const MANIFEST = [
  { id: 'mateo', car: 1 },
  { id: 'amara' },
  { id: 'hana' },
  { id: 'leila', drink: 'wine' },
  { id: 'oskar', smudge: [1, 4], to: 'river', toText: 'drop at the river city' },
];

export const TIMETABLE_NOTE = 'Times are platform arrivals. The sleeper does not stop between them.';

// Riya's torn stubs: each belongs to one unnamed passenger.
export const STUBS = [
  { id: 's1', car: 4, drink: 'cocoa', torn: 'right', tilt: -4 },
  { id: 's2', car: 3, toPrefix: 'V', torn: 'right', tilt: 3 },
  { id: 's3', drink: 'wine', to: 'verona', torn: 'top', tilt: -2 },
  { id: 's4', car: 5, punched: '01:46', torn: 'left', tilt: 5 },
  { id: 's5', car: 1, drink: 'coffee', torn: 'left', tilt: -3 },
];

export const NOTES = [
  { id: 'n-tea', text: 'Whoever ordered tea sat in the car right next to the red wine.', test: s => Math.abs(s.car[who(s, 'drink', 'tea')] - s.car[who(s, 'drink', 'wine')]) === 1 },
  { id: 'n-cellist', text: 'The cellist stepped off at the first stop after three in the morning.', test: s => s.station.amara === firstStopAfter('03:00') },
  { id: 'n-rosin', text: 'Left on the dining table beside the letter: a tin of cello rosin.', herring: true },
];

export const LETTER = {
  excerpt: [
    'I am writing this in the dining car while the others sleep.',
    'I stirred my cup until the last marshmallow gave up, and still the words would not come.',
    'I get off long before morning, so I will leave this where the two of you will find it.',
    'Read the rest only once you know who I am.',
  ],
  // The marshmallow: only cocoa takes one.
  writer: s => who(s, 'drink', 'cocoa'),
  herring: 'amara',
};

const stubTest = stub => s => PASSENGERS.some(p =>
  (stub.car == null || s.car[p.id] === stub.car)
  && (stub.drink == null || s.drink[p.id] === stub.drink)
  && (stub.to == null || STATIONS[s.station[p.id]].id === stub.to)
  && (stub.toPrefix == null || STATIONS[s.station[p.id]].name.startsWith(stub.toPrefix))
  && (stub.punched == null || s.station[p.id] === stationAt(stub.punched)));

const manifestTests = row => [
  row.car && { id: `m-${row.id}-car`, test: s => s.car[row.id] === row.car },
  row.smudge && { id: `m-${row.id}-smudge`, test: s => row.smudge.includes(s.car[row.id]) },
  row.drink && { id: `m-${row.id}-drink`, test: s => s.drink[row.id] === row.drink },
  row.to && { id: `m-${row.id}-to`, test: s => STATIONS[s.station[row.id]].feature === row.to },
].filter(Boolean);

// owner A = Tushar (manifest + timetable), B = Riya (stubs + notes + map).
export const CLUES = [
  ...MANIFEST.flatMap(row => manifestTests(row).map(c => ({ ...c, owner: 'A', doc: 'manifest' }))),
  ...STUBS.map(stub => ({ id: `stub-${stub.id}`, owner: 'B', doc: 'stub', test: stubTest(stub) })),
  ...NOTES.filter(n => n.test).map(n => ({ id: n.id, owner: 'B', doc: 'notes', test: n.test })),
];
