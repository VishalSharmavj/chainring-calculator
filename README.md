# Chainring & Gear Calculator

Every gear you have, in whichever unit you think in — plus your range, your
gear gaps, and what a different chainring would actually change.

No dependencies, no build step, no framework.

**[Try the full version on Bikeshala →](https://bikeshala.com/tools/chainring-calculator/)**

```
34T × 10-52 Eagle · 2277 mm wheel · 170 mm cranks · 80 rpm

Total range   Easiest      Hardest     Biggest jump
520%          0.65 : 1     3.40 : 1    24%

34×10   3.40   97.0 in   7.74 m   gain 7.25   37.2 km/h
```

---

## Run it

```bash
git clone https://github.com/VishalSharmavj/chainring-calculator.git
cd chainring-calculator
python3 -m http.server 8000     # or: npm start
```

```bash
npm test        # 15 tests, no dependencies
```

---

## Use the maths on its own

```js
import { gear, gearTable, range, compareRing } from './js/gearing.js';

const bike = { circumferenceMm: 2277, crankMm: 170, cadence: 80 };

gear(34, 10, bike);
// { ratio: 3.40, inches: 97.0, development: 7.74, gain: 7.25, kmh: 37.2 }

range(gearTable([34], [10,12,14,16,18,21,24,28,32,36,42,52], bike));  // 520

compareRing(32, 30, cogs, bike).shiftPercent;   // -6.25
```

---

## How it works

### One gear, four units

```
ratio       = chainring teeth / sprocket teeth
gear inches = ratio × wheel diameter in inches
development = ratio × wheel circumference        (metres per crank turn)
gain ratio  = (wheel radius / crank length) × ratio
speed       = cadence × development × 60 / 1000  (km/h)
```

**Gear inches** is what diameter of penny-farthing wheel the gear is equivalent
to. An anachronism, and still the lingua franca.

**Development** is the one with an obvious physical meaning: how far one turn
of the cranks takes you. A test pins it by checking that a 1:1 gear develops
exactly one wheel circumference.

### Gain ratio is the only one that knows about crank length

Sheldon Brown's unit, and the reason it exists: **a 165 mm crank and a 175 mm
crank on identical gears are not identical gears.** Every other unit says they
are.

```js
const short = gear(34, 20, { ...bike, crankMm: 165 });
const long  = gear(34, 20, { ...bike, crankMm: 175 });

short.ratio       === long.ratio;        // same
short.inches      === long.inches;       // same
short.development === long.development;  // same
short.gain         >  long.gain;         // different
```

It is dimensionless — how far you travel per unit the *pedal* travels — so it
scales exactly inversely with crank length. That identity is a test:

```js
short.gain / long.gain === 175 / 165;
```

### Range, and the thing a chainring cannot do

```
range = (hardest ratio / easiest ratio) × 100
```

A SRAM Eagle 10-52 cassette is advertised at **520%**, and 52/10 = 5.2, which
pins the convention. The calculator reproduces that figure exactly.

Now the useful part. **Changing the chainring cannot change your range.**

```js
for (const ring of [28, 30, 32, 34, 36])
  range(gearTable([ring], EAGLE, bike));   // 520 every time
```

Every gear moves by the same percentage, so the whole range slides up or down
and the spread stays exactly where it was. Going 32T → 30T makes everything
**6.25% easier** — the climbing gear *and* the top end. If you are spinning out
on descents, a smaller ring will make that worse, not better. Range comes from
the cassette.

Both of those are tests, because it is the single most common misconception
about gearing and an implementation that got it wrong would look plausible.

### Steps, and what range costs

```js
steps(gears)   // the jump between each consecutive pair, as a percentage
```

Under about 10% is a shift you barely notice. Over about 15% you start hunting
for a cadence that is not there.

A wide-range 1x buys its 520% with exactly this: the top of an Eagle cassette
has jumps over 20%, and a test asserts that a close-ratio road cassette has a
smaller average step than a wide 1x. That trade-off is the whole 1x-versus-2x
argument in one number.

### Duplicates

On a 2x drivetrain, 20 combinations are not 20 gears — several land within a
few percent of each other. `duplicates()` finds them, and a test asserts that a
1x has none by construction.

---

## Layout

```
index.html           the UI
css/base.css         tokens, layout, inputs
css/calculator.css   stats, gear table, comparison column
js/gearing.js        the maths — pure functions, no DOM, no imports
js/app.js            the only file that knows a browser exists
test/gearing.test.js 15 tests, node --test
```

---

## What this version leaves out

The full version on Bikeshala also offers miles throughout, a shareable setup
and bike presets.

**[Chainring & Cassette Calculator on Bikeshala →](https://bikeshala.com/tools/chainring-calculator/)**

---

## Licence

MIT — see [LICENSE](LICENSE).
