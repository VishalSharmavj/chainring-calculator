/** DOM wiring. The only file here that knows a browser exists. */
import {
	gear, gearTable, range, cassetteRange, steps, duplicates, compareRing
} from './gearing.js';

const $ = (id) => document.getElementById(id);
const num = (id) => parseFloat($(id).value);

const parseTeeth = (s) => String(s).split(/[,\s]+/)
	.map((t) => parseInt(t, 10))
	.filter((t) => Number.isFinite(t) && t > 0);

function render() {
	const rings = parseTeeth($('rings').value);
	const cogs = parseTeeth($('cogs').value);
	const bike = { circumferenceMm: num('circ'), crankMm: num('crank'), cadence: num('cadence') };
	const alt = parseInt($('alt').value, 10);

	const problems = [];
	if (!rings.length) problems.push('Enter at least one chainring size.');
	if (cogs.length < 2) problems.push('Enter at least two sprocket sizes, comma separated.');
	if (!(bike.circumferenceMm > 0)) problems.push('Enter the wheel circumference in millimetres.');
	/* "700" is the number people reach for, because the wheel is called 700c.
	   It is a bead-seat name, not a circumference, and the real figure is
	   about three times larger. Catch the whole range it could be confused
	   with, not just absurdly small values. */
	else if (bike.circumferenceMm < 1000) problems.push(`${bike.circumferenceMm} mm is too small to be a wheel circumference — that looks like a diameter or a wheel size name. A 700c wheel measures about 2100 mm round, and a 29 x 2.4 about 2277 mm.`);

	$('problems').hidden = problems.length === 0;
	$('problems').innerHTML = problems.map((p) => `<li>${esc(p)}</li>`).join('');

	if (problems.length) {
		$('rows').innerHTML = '';
		for (const id of ['stat-range', 'stat-low', 'stat-high', 'stat-step']) $(id).textContent = '—';
		$('compare').hidden = true;
		$('warnings').hidden = true;
		return;
	}

	const gears = gearTable(rings, cogs, bike);
	const st = steps(gears);
	const dupes = duplicates(gears);
	const dupeSet = new Set(dupes.flat());

	const biggest = st.length ? st.reduce((a, b) => (b.percent > a.percent ? b : a)) : null;

	$('stat-range').textContent = `${Math.round(range(gears))}%`;
	$('stat-low').textContent = `${gears[0].ratio.toFixed(2)} : 1`;
	$('stat-high').textContent = `${gears[gears.length - 1].ratio.toFixed(2)} : 1`;
	$('stat-step').textContent = biggest ? `${biggest.percent.toFixed(0)}%` : '—';

	const useAlt = Number.isFinite(alt) && alt > 0 && rings.length === 1;
	$('th-alt').hidden = !useAlt;

	$('rows').innerHTML = gears.map((g, i) => {
		const step = i > 0 ? st[i - 1].percent : null;
		const altGear = useAlt ? gear(alt, g.cog, bike) : null;
		return `<tr class="${dupeSet.has(g) ? 'is-dupe' : ''}">`
			+ `<td>${g.ring}&times;${g.cog}</td>`
			+ `<td>${g.ratio.toFixed(2)}</td>`
			+ `<td>${g.inches.toFixed(1)}</td>`
			+ `<td>${g.development.toFixed(2)}</td>`
			+ `<td>${g.gain.toFixed(2)}</td>`
			+ `<td>${g.kmh.toFixed(1)}</td>`
			+ `<td class="step ${step !== null && step > 15 ? 'is-big' : ''}">`
				+ `${step === null ? '' : step.toFixed(0) + '%'}</td>`
			+ (useAlt ? `<td>${altGear.ratio.toFixed(2)} &middot; ${altGear.kmh.toFixed(1)} km/h</td>` : '')
			+ '</tr>';
	}).join('');

	const cmp = $('compare');
	if (useAlt) {
		const c = compareRing(rings[0], alt, cogs, bike);
		cmp.hidden = false;
		cmp.innerHTML = `A <b>${alt}T</b> in place of the ${rings[0]}T shifts every gear by `
			+ `<b>${c.shiftPercent > 0 ? '+' : ''}${c.shiftPercent.toFixed(1)}%</b>. `
			+ `Easiest gear goes ${c.easiestBefore.ratio.toFixed(2)} &rarr; ${c.easiestAfter.ratio.toFixed(2)}, `
			+ `hardest ${c.hardestBefore.ratio.toFixed(2)} &rarr; ${c.hardestAfter.ratio.toFixed(2)}. `
			+ `Your total range is unchanged at ${Math.round(range(c.after))}% — a chainring moves the whole range, it cannot widen it.`;
	} else {
		cmp.hidden = true;
	}

	const notes = [];
	if (dupes.length) {
		notes.push(`${dupes.length} pair${dupes.length > 1 ? 's' : ''} of combinations give within 3% of the same gear — shaded above. On a multi-ring setup that is normal and simply means fewer distinct gears than the arithmetic suggests.`);
	}
	if (biggest && biggest.percent > 18) {
		notes.push(`The biggest jump is ${biggest.percent.toFixed(0)}% (${biggest.from.cog}T to ${biggest.to.cog}T). Over about 15% you tend to be hunting for a cadence between the two.`);
	}
	notes.push(`The cassette alone gives ${Math.round(cassetteRange(cogs))}% range.`);

	$('warnings').hidden = false;
	$('warnings').innerHTML = notes.map((n) => `<li>${esc(n)}</li>`).join('');
}

function esc(s) {
	return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

$('form').addEventListener('input', render);
$('form').addEventListener('change', render);
$('form').addEventListener('submit', (e) => e.preventDefault());
render();
