import test from 'node:test';
import assert from 'node:assert/strict';
import {
	gear, gearTable, range, cassetteRange, steps, duplicates,
	compareRing, cadenceFor, MM_PER_INCH
} from '../js/gearing.js';

const near = (a, b, tol = 0.01) =>
	assert.ok(Math.abs(a - b) < tol, `expected ${a} to be within ${tol} of ${b}`);

const BIKE = { circumferenceMm: 2277, crankMm: 170, cadence: 80 };
const EAGLE = [10, 12, 14, 16, 18, 21, 24, 28, 32, 36, 42, 52];

test('gear: the four units of one gear', () => {
	const g = gear(34, 10, BIKE);
	near(g.ratio, 3.4);
	near(g.inches, 97.0, 0.1);
	near(g.development, 7.74, 0.01);
	near(g.gain, 7.25, 0.01);
	near(g.kmh, 37.2, 0.1);
});

test('gear inches really is ratio x wheel diameter', () => {
	const g = gear(34, 10, BIKE);
	const diameterInches = BIKE.circumferenceMm / Math.PI / MM_PER_INCH;
	near(g.inches, g.ratio * diameterInches, 1e-9);
});

test('development is how far one crank turn takes you', () => {
	const g = gear(34, 34, BIKE);          // 1:1
	near(g.development, BIKE.circumferenceMm / 1000, 1e-9);
});

test('gain ratio is the only unit that knows about crank length', () => {
	/* Sheldon Brown's point: a 165 mm crank and a 175 mm crank on identical
	   gears are not identical gears, and every other unit says they are. */
	const short = gear(34, 20, { ...BIKE, crankMm: 165 });
	const long = gear(34, 20, { ...BIKE, crankMm: 175 });

	near(short.ratio, long.ratio, 1e-9);
	near(short.inches, long.inches, 1e-9);
	near(short.development, long.development, 1e-9);
	assert.ok(short.gain > long.gain, 'a shorter crank gives a higher gain ratio');

	/* Gain ratio is dimensionless — distance travelled per distance the pedal
	   travels — so it scales exactly inversely with crank length. */
	near(short.gain / long.gain, 175 / 165, 1e-9);
});

test('range: reproduces SRAM\'s advertised Eagle figure', () => {
	/* A 10-52 cassette is sold as 520%, and 52/10 = 5.2, which pins the
	   convention: range is hardest/easiest as a percentage. */
	near(cassetteRange(EAGLE), 520, 0.5);
	near(range(gearTable([34], EAGLE, BIKE)), 520, 0.5);
});

test('range: a single chainring cannot change it', () => {
	/* The thing people most often expect a chainring swap to do, and it does
	   not. It moves the whole range; the spread is the cassette's. */
	for (const ring of [28, 30, 32, 34, 36]) {
		near(range(gearTable([ring], EAGLE, BIKE)), 520, 0.5);
	}
});

test('gearTable: sorted easiest first, every combination present', () => {
	const t = gearTable([34], EAGLE, BIKE);
	assert.equal(t.length, EAGLE.length);
	for (let i = 1; i < t.length; i++) assert.ok(t[i].ratio > t[i - 1].ratio);
	assert.equal(t[0].cog, 52);                   // biggest sprocket is easiest
	assert.equal(t[t.length - 1].cog, 10);
});

test('gearTable: a 2x drivetrain has fewer distinct gears than combinations', () => {
	const cogs = [11, 13, 15, 17, 19, 21, 23, 25, 28, 32];
	const t = gearTable([34, 50], cogs, BIKE);
	assert.equal(t.length, 20);
	/* But several of them land on top of each other. */
	assert.ok(duplicates(t).length > 0, 'a 2x setup should have duplicate gears');
});

test('duplicates: a 1x drivetrain has none, by construction', () => {
	assert.deepEqual(duplicates(gearTable([34], EAGLE, BIKE)), []);
});

test('steps: the gaps between consecutive gears', () => {
	const t = gearTable([34], EAGLE, BIKE);
	const st = steps(t);
	assert.equal(st.length, t.length - 1);
	for (const s of st) assert.ok(s.percent > 0);

	/* A wide-range 1x buys its range with big jumps — the 42-52 end of an
	   Eagle cassette is a notably large step. */
	const biggest = st.reduce((a, b) => (b.percent > a.percent ? b : a));
	assert.ok(biggest.percent > 15);
});

test('steps: a close-ratio road cassette has smaller gaps than a wide 1x', () => {
	const road = steps(gearTable([50], [11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 23, 25], BIKE));
	const wide = steps(gearTable([34], EAGLE, BIKE));
	const avg = (a) => a.reduce((s, x) => s + x.percent, 0) / a.length;
	assert.ok(avg(road) < avg(wide));
});

test('compareRing: every gear moves by the same percentage', () => {
	const c = compareRing(32, 30, EAGLE, BIKE);
	near(c.shiftPercent, (30 / 32 - 1) * 100);
	near(c.shiftPercent, -6.25);

	for (let i = 0; i < c.before.length; i++) {
		near(c.after[i].ratio / c.before[i].ratio, 30 / 32, 1e-9);
	}
	assert.equal(c.rangeUnchanged, true);
});

test('compareRing: a smaller ring makes everything easier, not wider', () => {
	const c = compareRing(34, 30, EAGLE, BIKE);
	assert.ok(c.easiestAfter.ratio < c.easiestBefore.ratio);
	assert.ok(c.hardestAfter.ratio < c.hardestBefore.ratio);
	assert.equal(c.rangeUnchanged, true);
});

test('cadenceFor: inverts the speed calculation', () => {
	const g = gear(34, 18, BIKE);
	near(cadenceFor(g.kmh, g), BIKE.cadence, 1e-9);
});

test('gear: handles nonsense without throwing', () => {
	assert.equal(gear(34, 0, BIKE).ratio, 0);
	assert.equal(gear(34, 18, { ...BIKE, crankMm: 0 }).gain, 0);
	assert.equal(range([]), 0);
	assert.equal(cassetteRange([]), 0);
});
