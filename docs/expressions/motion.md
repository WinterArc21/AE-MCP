# Motion Expressions

Expressions for position, rotation, scale, and organic motion. All use modern JS (ES6+).

---

## 1. Wiggle

### Basic Wiggle

**What it does:** Randomly oscillates a property at a given frequency and amplitude. The classic noise-based organic motion.

**When to use:** Camera shake, floating elements, handheld feel, organic imperfection.

```js
const freq = 2;   // EDIT: oscillations per second
const amp  = 20;  // EDIT: amplitude (pixels, degrees, etc.)

wiggle(freq, amp)
```

---

### Wiggle on One Axis Only (X or Y)

**What it does:** Applies wiggle to a single axis, keeping the other axis locked.

**When to use:** Horizontal shake only (earthquake), vertical bounce only.

```js
// Wiggle X only — Y stays at keyframed value
const freq = 3;    // EDIT
const amp  = 15;   // EDIT
const w    = wiggle(freq, amp);
[w[0], value[1]]
```

```js
// Wiggle Y only — X stays at keyframed value
const freq = 2;    // EDIT
const amp  = 10;   // EDIT
const w    = wiggle(freq, amp);
[value[0], w[1]]
```

---

### Temporal Wiggle (Wiggle in Time)

**What it does:** Wiggles the *time offset* rather than the value — creates a stuttering / time-remapped effect.

**When to use:** Glitch timing, tape-dropout effects, jittery playback.

```js
const freq = 4;     // EDIT: how often the stutter occurs
const amp  = 0.1;   // EDIT: time offset in seconds
temporalWiggle(freq, amp)
```

> Apply to Time Remap on a pre-comp for a glitchy playback effect.

---

### Smooth Wiggle (Low Octaves)

**What it does:** A gentler wiggle using additional parameters to reduce complexity/octaves.

```js
const freq       = 1;    // EDIT: frequency
const amp        = 40;   // EDIT: amplitude
const octaves    = 1;    // EDIT: 1 = smoothest, higher = more jagged
const multiplier = 0.5;  // EDIT: each octave's amplitude multiplier
const t          = time; // can offset: time + 5 for a different noise slice

wiggle(freq, amp, octaves, multiplier, t)
```

---

### Wiggle with Seed (Repeatable Noise)

**What it does:** Forces `seedRandom` so the wiggle pattern is the same every render.

```js
seedRandom(42, true); // EDIT: first arg = seed, second = true for repeatable
wiggle(2, 30)
```

---

### Loopable Wiggle

**What it does:** A seamlessly looping wiggle using `loopDuration`-aware noise sampling.

```js
const freq         = 2;    // EDIT
const amp          = 25;   // EDIT
const loopDuration = 3;    // EDIT: loop period in seconds

const t = time % loopDuration;
const w1 = wiggle(freq, amp, 1, 0.5, t);
const w2 = wiggle(freq, amp, 1, 0.5, t - loopDuration);
const blend = t / loopDuration;

// Cross-fade the two noise samples for seamless looping
[
  w1[0] * (1 - blend) + w2[0] * blend,
  w1[1] * (1 - blend) + w2[1] * blend
]
```

---

## 2. Bounce / Elastic Spring

### Classic Bounce-Back Expression

**What it does:** After the last keyframe, applies a damped spring that overshoots and settles. This is the industry-standard "springy" settle.

**When to use:** Icons landing on screen, UI panels snapping into place, any element that should feel physical.

**Apply to:** Position, Scale, Rotation, or any numeric property with keyframes.

```js
// Spring physics after last keyframe
const amp    = 0.08;  // EDIT: amplitude of bounce (higher = more dramatic)
const freq   = 3.0;   // EDIT: spring frequency in Hz (higher = faster oscillation)
const decay  = 4.0;   // EDIT: how quickly the bounce dies out (higher = faster decay)

const n = numKeys;
if (n === 0) {
  value;
} else {
  const t = time - key(n).time;
  if (t <= 0) {
    value;
  } else {
    const v = velocityAtTime(key(n).time - thisComp.frameDuration);
    const endVal = key(n).value;
    endVal + v * amp * Math.exp(-decay * t) * Math.cos(freq * 2 * Math.PI * t);
  }
}
```

> For **Position** (a 2D array), this expression must be applied per-axis, OR use the 2D variant below.

---

### Spring for 2D Position

```js
const amp   = 0.08;  // EDIT
const freq  = 3.0;   // EDIT
const decay = 4.0;   // EDIT

const n = numKeys;
if (n === 0) {
  value;
} else {
  const t = time - key(n).time;
  if (t <= 0) {
    value;
  } else {
    const v = velocityAtTime(key(n).time - thisComp.frameDuration);
    const endVal = key(n).value;
    [
      endVal[0] + v[0] * amp * Math.exp(-decay * t) * Math.cos(freq * 2 * Math.PI * t),
      endVal[1] + v[1] * amp * Math.exp(-decay * t) * Math.cos(freq * 2 * Math.PI * t)
    ];
  }
}
```

---

## 3. Overshoot

**What it does:** Exaggerates past the final keyframe value briefly, then snaps back. Simpler than full spring physics.

**When to use:** Snappy UI elements, playful icon animations.

```js
const overshootAmount = 1.15;  // EDIT: 1.0 = no overshoot, 1.2 = 20% overshoot
const decayTime       = 0.3;   // EDIT: seconds to settle after last keyframe

const n = numKeys;
if (n === 0 || time <= key(n).time) {
  value;
} else {
  const t       = time - key(n).time;
  const endVal  = key(n).value;
  const factor  = 1 + (overshootAmount - 1) * Math.exp(-t / decayTime) * Math.cos(20 * t);
  typeof endVal === "number" ? endVal * factor : endVal.map(v => v * factor);
}
```

---

## 4. Inertia / Follow-Through

**What it does:** After the last keyframe, the layer continues moving in the same direction with friction, eventually stopping.

**When to use:** Objects "throwing" off screen, physics-based slides.

```js
const friction = 8;  // EDIT: higher = stops faster (2 = barely slows, 20 = stops almost instantly)

const n = numKeys;
if (n === 0) {
  value;
} else {
  const t   = time - key(n).time;
  if (t <= 0) {
    value;
  } else {
    const v = velocityAtTime(key(n).time - thisComp.frameDuration);
    const endVal = key(n).value;
    if (typeof endVal === "number") {
      endVal + (v / friction) * (1 - Math.exp(-friction * t));
    } else {
      endVal.map((e, i) => e + (v[i] / friction) * (1 - Math.exp(-friction * t)));
    }
  }
}
```

---

## 5. Random Motion

### `seedRandom` for Reproducible Random

```js
seedRandom(index, true); // EDIT: index makes each layer unique; true = globally repeatable
random(0, 100)           // EDIT: min, max
```

> `seedRandom(index, true)` is essential when you have multiple layers with the same expression — each gets unique but stable random values.

---

### Gaussian Random (Bell Curve)

**What it does:** Returns random values clustered around 0, following a normal distribution. Better than `random()` for natural-looking variation.

```js
seedRandom(index, true);
gaussRandom() * 50  // EDIT: multiply by desired standard deviation
```

---

### Stable Random Offset Per Layer

**What it does:** Each layer gets a permanently fixed random offset — useful for staggered initial positions or random but consistent size variations.

```js
seedRandom(index, true);  // index = per-layer uniqueness
const offset = (random() - 0.5) * 200;  // EDIT: range ±200
value + offset
```

---

## 6. Circular / Orbit Motion

### Basic Orbit

**What it does:** Moves a layer in a perfect circle around a center point.

**Apply to:** Position

```js
const cx     = thisComp.width / 2;   // EDIT: orbit center X
const cy     = thisComp.height / 2;  // EDIT: orbit center Y
const radius = 150;                  // EDIT: orbit radius in pixels
const speed  = 0.5;                  // EDIT: revolutions per second (negative = clockwise)
const phase  = 0;                    // EDIT: starting angle offset in radians

const angle = time * speed * 2 * Math.PI + phase;
[cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]
```

---

### Elliptical Orbit

```js
const cx      = thisComp.width / 2;
const cy      = thisComp.height / 2;
const radiusX = 200;   // EDIT: horizontal radius
const radiusY = 100;   // EDIT: vertical radius
const speed   = 0.3;   // EDIT: revolutions per second
const phase   = 0;     // EDIT: phase offset

const angle = time * speed * 2 * Math.PI + phase;
[cx + Math.cos(angle) * radiusX, cy + Math.sin(angle) * radiusY]
```

---

### Layer Orbiting Another Layer

```js
const target  = thisComp.layer("Center");  // EDIT: name of center layer
const radius  = 100;                       // EDIT
const speed   = 1;                         // EDIT
const phase   = (index - 1) * (2 * Math.PI / thisComp.numLayers); // auto-distribute

const center = target.transform.position;
const angle  = time * speed * 2 * Math.PI + phase;
[center[0] + Math.cos(angle) * radius, center[1] + Math.sin(angle) * radius]
```

---

## 7. Wave Motion

### Sine Wave (Smooth)

**What it does:** Continuous smooth oscillation. The foundation of all wave motion.

```js
const freq   = 1;    // EDIT: cycles per second
const amp    = 50;   // EDIT: peak displacement
const center = 540;  // EDIT: rest position (e.g. comp center Y)
const phase  = 0;    // EDIT: starting phase (offset in radians, or use: index * 0.5)

center + Math.sin(time * freq * 2 * Math.PI + phase) * amp
```

---

### Sawtooth Wave (Linear Ramp, Reset)

**What it does:** Value linearly ramps from 0 to `amp` then instantly resets. Useful for counters, flicker, rotations that spin continuously.

```js
const freq = 1;    // EDIT: resets per second
const amp  = 360;  // EDIT: max value before reset (360 for full rotation)

(time * freq % 1) * amp
```

---

### Triangle Wave (Linear Bounce)

**What it does:** Value ramps up linearly then ramps down — like a bouncing ball with no physics.

```js
const freq   = 1;    // EDIT: cycles per second
const amp    = 100;  // EDIT: peak amplitude
const center = 0;    // EDIT: rest position

const t       = (time * freq) % 1;
const triangle = t < 0.5 ? t * 2 : (1 - t) * 2;
center + (triangle - 0.5) * 2 * amp
```

---

### Square Wave (Binary Toggle)

**What it does:** Alternates between two values at a given frequency.

```js
const freq   = 2;    // EDIT: toggles per second
const valA   = 0;    // EDIT: first value
const valB   = 100;  // EDIT: second value

Math.sin(time * freq * 2 * Math.PI) >= 0 ? valA : valB
```

---

## 8. Parent-Relative Offsets

### Fixed Offset from Another Layer

**What it does:** Positions this layer a fixed pixel distance from another layer's position.

```js
const parent  = thisComp.layer("Parent Layer");  // EDIT: layer name
const offsetX = 100;   // EDIT: X offset from parent
const offsetY = 0;     // EDIT: Y offset from parent

parent.transform.position + [offsetX, offsetY]
```

---

### Follow with Lag (Delayed Copy)

**What it does:** This layer follows another layer's position but with a time delay.

```js
const source = thisComp.layer("Leader");  // EDIT: layer to follow
const delay  = 0.15;                      // EDIT: lag in seconds

source.transform.position.valueAtTime(time - delay)
```

---

### Proportional Offset Using `fromComp` / `toComp`

**What it does:** Translates a comp-space point into a layer's local space — useful for aligning elements to world coordinates.

```js
// Get comp center in this layer's local space
const compCenter = [thisComp.width / 2, thisComp.height / 2];
fromComp(compCenter)
```

---

## Quick Reference Table

| Expression | Property | Use Case |
|---|---|---|
| `wiggle(freq, amp)` | Any | Organic noise motion |
| `wiggle(f, a)[0]` → `[w[0], value[1]]` | Position | One-axis wiggle |
| `temporalWiggle(freq, amp)` | Time Remap | Glitch/stutter timing |
| Spring bounce | Rotation/Scale/Position | Overshooting settle |
| Inertia (friction) | Position | Throw off screen |
| `seedRandom(index, true)` | Any | Per-layer repeatable random |
| `Math.cos/sin(time * speed * 2π) * radius` | Position | Circular orbit |
| Sine wave | Position/Rotation | Smooth oscillation |
| Sawtooth `(time * freq % 1) * amp` | Rotation | Continuous spin |
| `layer.position.valueAtTime(time - delay)` | Position | Follow with lag |
