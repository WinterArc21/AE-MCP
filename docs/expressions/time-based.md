# Time-Based Expressions

Expressions that use `time`, keyframes, and temporal control to drive values. All use the AE modern JS expression engine (ES6+).

---

## 1. Linear Interpolation

### `linear()`

**What it does:** Maps an input range to an output range with a perfectly linear (no easing) relationship. The built-in AE `linear()` function.

**When to use:** Driving a value proportionally to time or another property — e.g., progress bars, linking two properties with a 1:1 linear mapping.

```js
// Animate opacity from 0 to 100 between t=1s and t=2s
linear(time, 1, 2, 0, 100)
```

```js
// General form
const startTime  = 0.5;  // EDIT: time (seconds) when output starts
const endTime    = 1.5;  // EDIT: time (seconds) when output ends
const startValue = 0;    // EDIT: output value at startTime
const endValue   = 100;  // EDIT: output value at endTime

linear(time, startTime, endTime, startValue, endValue)
```

**Editable parameters:**
| Parameter | Description |
|---|---|
| `startTime` | When the ramp begins (seconds) |
| `endTime` | When the ramp ends (seconds) |
| `startValue` | Output value at the start |
| `endValue` | Output value at the end |

> `linear()` clamps automatically — values before `startTime` return `startValue`, values after `endTime` return `endValue`.

---

## 2. Smooth Interpolation (`ease`, `easeIn`, `easeOut`)

### `ease()`

**What it does:** Same as `linear()` but with an ease-in-out curve (starts slow, ends slow). Equivalent to a CSS `ease-in-out`.

**When to use:** Default go-to for almost everything. Smoother and more professional than linear.

```js
// Ease opacity from 0 to 100 between t=0.5s and t=1.5s
ease(time, 0.5, 1.5, 0, 100)
```

```js
const startTime  = 0;    // EDIT
const endTime    = 0.8;  // EDIT
const startValue = 0;    // EDIT
const endValue   = 100;  // EDIT

ease(time, startTime, endTime, startValue, endValue)
```

---

### `easeIn()`

**What it does:** Starts slow, ends fast. Use for exits (element leaving the frame).

```js
// Position slides out quickly — slow start, fast end
easeIn(time, 1.0, 1.5, 0, 200)
```

---

### `easeOut()`

**What it does:** Starts fast, ends slow (decelerates). Use for entrances (element arriving).

```js
// Position slides in — fast start, slows to a stop
easeOut(time, 0.0, 0.6, -200, 0)
```

---

### Ease with Vector Values (Position, Scale, etc.)

For 2D/3D properties, wrap the ease call per axis or use an array:

```js
// Slide in from left, ease out
const x = easeOut(time, 0, 0.6, -300, 0); // EDIT: x start/end
const y = 540; // EDIT: fixed Y position
[x, y]
```

---

## 3. Time Remap

### `timeRemap` (property-based)

**What it does:** Applied directly to the Time Remap property of a pre-comp layer, this expression controls playback time of the nested comp.

**When to use:** Looping a pre-comp, reversing, or strobe-controlling an animated layer.

```js
// Loop a pre-comp's time remap
const duration = thisComp.layer(thisLayer).source.duration; // EDIT: or hardcode seconds
time % duration
```

---

### `posterizeTime(fps)`

**What it does:** Snaps the current time to a lower frame rate, creating a choppy/stepped animation effect.

**When to use:** Retro animation feel, glitch effects, or matching low-FPS footage.

```js
// Run at 12fps inside a 30fps comp
posterizeTime(12); // EDIT: target FPS (e.g., 6, 8, 12, 15)
value
```

> `posterizeTime()` must be called before referencing `value` — it has a side-effect of snapping `time` for the rest of the expression.

---

## 4. Looping Expressions

Apply these to a property that has **at least 2 keyframes** (loopIn needs keys at the start, loopOut needs keys at the end).

---

### `loopOut("cycle")` — Repeat Forward

**What it does:** After the last keyframe, repeat the entire keyframe range from the beginning.

**When to use:** Perpetual animations — spinning icons, pulsing elements.

```js
loopOut("cycle")
```

---

### `loopIn("cycle")` — Extend Before First Keyframe

```js
loopIn("cycle")
```

---

### `loopOut("pingpong")` — Repeat Back and Forth

**What it does:** After the last keyframe, play the animation in reverse, then forward again.

**When to use:** Breathing/pulsing effects, pendulum swings, bouncing scales.

```js
loopOut("pingpong")
```

---

### `loopOut("offset")` — Repeat with Accumulated Offset

**What it does:** Each cycle continues from where the last one ended — the value accumulates. Perfect for continuous rotation or infinite scrolling.

**When to use:** Continuous rotation (`transform.rotation`), scrolling position, ever-increasing counters.

```js
loopOut("offset")
```

---

### `loopOut("continue")` — Maintain Velocity After Last Keyframe

**What it does:** After the last keyframe, the property continues at the same velocity (derivative) forever.

**When to use:** Objects flying off screen, values that should keep moving at their last speed.

```js
loopOut("continue")
```

---

### Loop with Specific Keyframe Count

**What it does:** Only loop the last N keyframes, not the full animation.

```js
const numKeyframes = 2; // EDIT: number of keyframes to include in loop
loopOut("cycle", numKeyframes)
```

---

### Combined loopIn + loopOut

```js
loopIn("cycle");
loopOut("cycle")
```

---

## 5. Time-Based Wiggle (Without Random Noise)

A deterministic, smooth oscillation using sine — no random jitter.

```js
// Smooth sine-based oscillation (replaces wiggle for clean motion)
const freq  = 1.5;   // EDIT: oscillations per second
const amp   = 30;    // EDIT: amplitude (pixels, degrees, etc.)
const phase = 0;     // EDIT: phase offset (0–2*Math.PI)

Math.sin(time * freq * 2 * Math.PI + phase) * amp + value
```

> Unlike `wiggle()`, this is perfectly smooth and repeatable. Combine with `loopOut("cycle")` if needed.

---

## 6. Counting / Elapsed Timer (Text Display)

### Simple Elapsed Timer (MM:SS)

**What it does:** Displays elapsed comp time as a formatted MM:SS string. Apply to **Source Text** of a text layer.

```js
const elapsed = Math.floor(time);           // EDIT: replace `time` with a start offset if needed
const minutes = Math.floor(elapsed / 60);
const seconds = elapsed % 60;

const mm = String(minutes).padStart(2, "0");
const ss = String(seconds).padStart(2, "0");

`${mm}:${ss}`
```

---

### Countdown Timer (MM:SS)

```js
const totalSeconds = 60;  // EDIT: countdown duration in seconds
const remaining    = Math.max(0, totalSeconds - Math.floor(time));
const minutes      = Math.floor(remaining / 60);
const seconds      = remaining % 60;

`${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
```

---

### Animated Number Counter

**What it does:** Counts from `startVal` to `endVal` over a defined time window. Apply to **Source Text** of a text layer.

```js
const startTime = 0.5;    // EDIT: when counting starts (seconds)
const endTime   = 2.0;    // EDIT: when counting ends (seconds)
const startVal  = 0;      // EDIT: starting number
const endVal    = 1000;   // EDIT: ending number
const decimals  = 0;      // EDIT: decimal places (0 for integers)

const val = ease(time, startTime, endTime, startVal, endVal);
val.toFixed(decimals)
```

> Tip: Add a prefix/suffix with template literals: `` `$${val.toFixed(0)}M` `` for currency.

---

### Number Counter with Prefix/Suffix

```js
const startTime = 0.5;
const endTime   = 2.0;
const startVal  = 0;
const endVal    = 4200;
const prefix    = "$";     // EDIT: e.g. "$", "€", ""
const suffix    = "K";     // EDIT: e.g. "K", "%", "+"
const decimals  = 0;

const val = ease(time, startTime, endTime, startVal, endVal);
`${prefix}${val.toFixed(decimals)}${suffix}`
```

---

## Quick Reference Table

| Expression | Property | Use Case |
|---|---|---|
| `linear(time, t0, t1, v0, v1)` | Any | Linear ramp over time |
| `ease(time, t0, t1, v0, v1)` | Any | Smooth ease-in-out ramp |
| `easeIn(time, t0, t1, v0, v1)` | Any | Slow start, fast end (exits) |
| `easeOut(time, t0, t1, v0, v1)` | Any | Fast start, slow end (entrances) |
| `posterizeTime(fps); value` | Any | Snap to lower frame rate |
| `loopOut("cycle")` | Keyframed prop | Infinite forward loop |
| `loopOut("pingpong")` | Keyframed prop | Bounce back and forth |
| `loopOut("offset")` | Rotation/position | Accumulating continuous loop |
| `loopOut("continue")` | Any | Keep going at last velocity |
| `Math.sin(time * freq * 2 * Math.PI) * amp` | Any | Smooth deterministic oscillation |
