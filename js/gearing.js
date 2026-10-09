/**
 * Bicycle gearing.
 *
 * Pure functions. No DOM, no dependencies — the same file runs in a browser,
 * in Node and in the test suite.
 *
 * The same gear, four ways, because different riders think in different units:
 *
 *     ratio       = chainring teeth / sprocket teeth
 *     gear inches = ratio x wheel diameter in inches
 *     development = ratio x wheel circumference        (metres per crank turn)
 *     gain ratio  = (wheel radius / crank length) x ratio
 *     speed       = cadence x development x 60 / 1000  (km/h)
 */

export const MM_PER_INCH = 25.4;
export const MI_PER_KM = 0.621371;

/**
 * One gear, in every unit.
 *
 * @param {number} ring       chainring teeth
 * @param {number} cog        sprocket teeth
 * @param {object} bike
 * @param {number} bike.circumferenceMm  rolling circumference of the wheel
 * @param {number} bike.crankMm          crank length
 * @param {number} [bike.cadence=80]     rpm, for the speed figure
 */
export function gear(ring, cog, bike) {
	const ratio = cog > 0 ? ring / cog : 0;
	const circ = bike.circumferenceMm;
	const devM = (ratio * circ) / 1000;
	const diameterInches = circ / Math.PI / MM_PER_INCH;
	const cadence = bike.cadence ?? 80;
	const kmh = (devM * cadence * 60) / 1000;

	return {
		ring,
		cog,
		ratio,
		/* Gear inches: what diameter of penny-farthing wheel this gear is
		   equivalent to. An anachronism, but still the lingua franca. */
		inches: ratio * diameterInches,
		/* Development: how far one turn of the cranks takes you. */
		development: devM,
		/* Sheldon Brown's gain ratio — the only one of the four that knows
		   about crank length, and therefore the only one that can tell you a
		   165 mm crank and a 175 mm crank are not the same gear. It is
		   dimensionless: how far you travel per unit the pedal travels. */
		gain: bike.crankMm > 0 ? (circ / (2 * Math.PI) / bike.crankMm) * ratio : 0,
		kmh,
		mph: kmh * MI_PER_KM
	};
}

/**
 * Every combination, sorted easiest first.
 *
 * Real drivetrains have duplicates — two combinations giving nearly the same
 * ratio — and spotting them is half the reason to look at a table like this.
 */
export function gearTable(rings, cogs, bike) {
	const out = [];
	for (const ring of rings) {
		for (const cog of cogs) {
			if (ring > 0 && cog > 0) out.push(gear(ring, cog, bike));
		}
	}
	return out.sort((a, b) => a.ratio - b.ratio);
}

/**
 * The spread between the easiest and hardest gear, as a percentage.
 *
 * This is the number marketing quotes. A SRAM Eagle 10-52 cassette is
 * advertised at 520%, and 52/10 = 5.2, so the convention is
 *
 *     range = (hardest / easiest) x 100
 */
export function range(gears) {
	if (!gears.length) return 0;
	const ratios = gears.map((g) => g.ratio).filter((r) => r > 0);
	if (!ratios.length) return 0;
	return (Math.max(...ratios) / Math.min(...ratios)) * 100;
}

/** The same thing for a cassette on its own, which is how they are sold. */
export function cassetteRange(cogs) {
	const t = cogs.filter((c) => c > 0);
	if (!t.length) return 0;
	return (Math.max(...t) / Math.min(...t)) * 100;
}

/**
 * The jump between consecutive gears, as a percentage.
 *
 * Under about 10% is a smooth shift you barely notice; much over 15% and you
 * are hunting for a cadence that is not there. A wide-range 1x setup buys its
 * range with exactly this.
 */
export function steps(gears) {
	const out = [];
	for (let i = 1; i < gears.length; i++) {
		const prev = gears[i - 1].ratio;
		const curr = gears[i].ratio;
		if (prev > 0) out.push({ from: gears[i - 1], to: gears[i], percent: (curr / prev - 1) * 100 });
	}
	return out;
}

/**
 * Combinations close enough to be the same gear.
 *
 * Only meaningful on a multi-ring setup — on a 1x every combination is
 * distinct by construction.
 */
export function duplicates(gears, tolerancePercent = 3) {
	const dupes = [];
	for (let i = 1; i < gears.length; i++) {
		const a = gears[i - 1], b = gears[i];
		if (a.ratio > 0 && Math.abs(b.ratio / a.ratio - 1) * 100 < tolerancePercent) {
			dupes.push([a, b]);
		}
	}
	return dupes;
}

/**
 * What changing the chainring does, without changing anything else.
 *
 * This is the question people actually arrive with: not "show me a gear
 * table" but "what happens if I put a 30T on instead of a 32T".
 */
export function compareRing(fromRing, toRing, cogs, bike) {
	const before = gearTable([fromRing], cogs, bike);
	const after = gearTable([toRing], cogs, bike);
	const shift = (toRing / fromRing - 1) * 100;

	return {
		before, after,
		/* Every gear moves by the same percentage — changing the ring shifts
		   the whole range and cannot alter its spread. */
		shiftPercent: shift,
		easiestBefore: before[0],
		easiestAfter: after[0],
		hardestBefore: before[before.length - 1],
		hardestAfter: after[after.length - 1],
		rangeUnchanged: Math.abs(range(before) - range(after)) < 1e-9
	};
}

/** Cadence needed to hold a speed in a given gear. */
export function cadenceFor(kmh, g) {
	if (!(g.development > 0)) return 0;
	return (kmh * 1000) / 60 / g.development;
}
