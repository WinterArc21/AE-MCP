# Utility Expressions

General-purpose helper expressions for layout, logic, math, and layer coordination.

---

## 1. Delay / Follow with `valueAtTime`

### Delayed Property Copy

**What it does:** This layer's property mirrors another property but shifted back in time — creating a "follow" or "echo" effect.

**When to use:** Trailing elements, delayed echoes, wave-propagation effects across multiple layers.

```js
// This layer's position follows "Leader" layer with a delay
const source = thisComp.layer("Leader");  // EDIT: source layer name
const delay  = 0.2;                       // EDIT: delay in seconds

source.transform.position.valueAtTime(time - delay)
```

---

### Self-Delay (Delayed Copy of Own Keyframes)

```js
const delay = 0.3;  // EDIT: seconds to delay own animation
valueAtTime(time - delay)
```

---

### Staggered Delay Using Layer Index

**What it does:** Each layer in a group delays proportionally to its index — automatic staggering with one expression.

```js
const source    = thisComp.layer("Leader");  // EDIT
const stagger   = 0.08;                      // EDIT: seconds between each layer
const myDelay   = (index - 1) * stagger;

source.transform.position.valueAtTime(time - myDelay)
```

---

## 2. Coordinate Conversion

### `toComp()` — Layer Space to Comp Space

**What it does:** Converts a point in the layer's local coordinate space to comp-space coordinates.

**When to use:** Finding where a layer's anchor point actually is in the comp — accounting for parenting, 3D transforms, etc.

```js
// Get this layer's anchor point in comp space
thisLayer.toComp(thisLayer.transform.anchorPoint)
```

```js
// Get the top-left corner of this layer in comp space
thisLayer.toComp([0, 0])
```

---

### `fromComp()` — Comp Space to Layer Space

**What it does:** Converts a comp-space coordinate to this layer's local coordinate space.

**When to use:** Positioning something relative to comp center in a parented/transformed layer.

```js
// Position this layer to align with comp center, accounting for parent transforms
fromComp([thisComp.width / 2, thisComp.height / 2])
```

---

### Align to Another Layer's Position (Comp Space)

```js
// Follow another layer's comp-space position
const target = thisComp.layer("Target Layer");  // EDIT
target.toComp(target.transform.anchorPoint)
```

---

## 3. Responsive Layout with `sourceRectAtTime`

### Get Text Layer Bounds

**What it does:** Returns the bounding box `{left, top, width, height}` of a text or shape layer at a given time. Essential for responsive designs where the background should fit the text.

**When to use:** Background shapes that auto-resize to text content (text badge / label backgrounds).

```js
// Get the bounding rect of a text layer
const textLayer = thisComp.layer("Label Text");  // EDIT: text layer name
const rect      = textLayer.sourceRectAtTime(time);

// rect.width, rect.height, rect.left, rect.top
rect.width   // width of the text
```

---

### Background Pill that Wraps Text Width

**Apply to:** The **Scale** or **Size** of a shape layer rectangle behind a text layer.

```js
// Width of background = text width + padding
const textLayer  = thisComp.layer("Label Text");  // EDIT
const padding    = 40;                             // EDIT: horizontal padding total (px)
const rect       = textLayer.sourceRectAtTime(time);

// Apply to the Rectangle Path size:
[rect.width + padding, rect.height + padding]  // EDIT: adjust padding per axis
```

---

### Position Background Behind Text (Centered)

**Apply to:** The **Position** of the background shape layer.

```js
const textLayer  = thisComp.layer("Label Text");   // EDIT
const rect       = textLayer.sourceRectAtTime(time);

// Center of the text bounding box (in text layer's own space)
const textCenter = [
  rect.left + rect.width / 2,
  rect.top  + rect.height / 2
];

// Convert to comp space
textLayer.toComp(textCenter)
```

---

## 4. Resolution Independence

### Center of Comp

```js
[thisComp.width / 2, thisComp.height / 2]
```

---

### Safe Zone Margins

```js
// 10% safe zone position (top-left of safe area)
const marginX = thisComp.width  * 0.10;  // EDIT: margin percentage
const marginY = thisComp.height * 0.10;
[marginX, marginY]
```

---

### Scale Relative to Comp Size

**What it does:** Keeps an element the same visual proportion regardless of comp resolution.

```js
// Scale a 100px element proportionally to comp width (designed at 1920w)
const designWidth = 1920;  // EDIT: reference comp width
const elementSize = 100;   // EDIT: intended pixel size at reference width

(thisComp.width / designWidth) * elementSize
```

---

### Resolution-Independent Position (% of Comp)

```js
// Position at 25% from left, 80% from top
const xPercent = 0.25;  // EDIT
const yPercent = 0.80;  // EDIT

[thisComp.width * xPercent, thisComp.height * yPercent]
```

---

## 5. Index-Based Offsets (Stagger)

### Staggered Position (Horizontal)

**What it does:** Each layer is offset horizontally by its index. Perfect for grid/list layouts.

```js
const spacing  = 120;   // EDIT: pixels between elements
const startX   = 200;   // EDIT: X position of first element
const fixedY   = 540;   // EDIT: Y position (constant)

[startX + (index - 1) * spacing, fixedY]
```

---

### Staggered Animation Start Time

**What it does:** Each layer begins its animation later than the previous one.

```js
// Each layer's opacity fades in, offset by index
const stagger   = 0.1;   // EDIT: seconds between layers
const fadeIn    = 0.4;   // EDIT: fade duration
const startTime = (index - 1) * stagger;

ease(time, startTime, startTime + fadeIn, 0, 100)
```

---

### Grid Layout (Rows and Columns)

```js
const cols    = 4;       // EDIT: items per row
const spacingX = 200;   // EDIT: horizontal spacing
const spacingY = 150;   // EDIT: vertical spacing
const startX  = 200;    // EDIT: X of first element
const startY  = 200;    // EDIT: Y of first element
const i       = index - 1;

[startX + (i % cols) * spacingX, startY + Math.floor(i / cols) * spacingY]
```

---

## 6. Layer Linking (Pick-Whip Equivalents)

### Link to Another Layer's Rotation

```js
thisComp.layer("Controller").transform.rotation  // EDIT: layer name
```

---

### Link with Multiplier

```js
// This layer rotates at 2x the speed of the controller
thisComp.layer("Controller").transform.rotation * 2  // EDIT: multiplier
```

---

### Link and Offset

```js
// Follow another layer's opacity + 20
thisComp.layer("Source").transform.opacity + 20  // EDIT
```

---

### Two-Way Link with Clamp

```js
// Mirror another layer's slider but keep it within 0–100
const val = thisComp.layer("Controls").effect("Slider Control")("Slider");
Math.max(0, Math.min(100, val))  // clamp to 0–100
```

---

## 7. Conditional / Ternary Logic

### Basic If/Else (Ternary)

```js
// Apply 100 after t=2, else 0
time > 2 ? 100 : 0  // EDIT: condition, true value, false value
```

---

### If/Else with Ease

```js
// Snap on at t=2 with a smooth transition
const switchTime = 2.0;  // EDIT
const duration   = 0.3;  // EDIT: transition duration

ease(time, switchTime, switchTime + duration, 0, 100)
```

---

### Range Check

```js
// True (100) only while between t=1 and t=3
(time >= 1 && time <= 3) ? 100 : 0  // EDIT: start/end times, on/off values
```

---

### Multi-Branch Conditions

```js
const val = time < 1   ? "intro"
          : time < 3   ? "main"
          : time < 5   ? "outro"
          : "end";
val
```

---

## 8. Math Helpers

### `clamp(value, min, max)`

**What it does:** Restricts a value to a specific range. AE does not have a built-in `clamp()`, so use this pattern.

```js
const v   = wiggle(2, 80);   // EDIT: any expression producing a value
const min = 0;               // EDIT
const max = 100;             // EDIT

Math.max(min, Math.min(max, v))
```

---

### `normalize(value, min, max)` → 0–1

**What it does:** Maps any value from `[min, max]` to `[0, 1]`. Useful as an intermediate step before re-mapping.

```js
const v   = thisComp.layer("Slider Layer").effect("Slider")("Slider");
const min = 0;    // EDIT: input range minimum
const max = 200;  // EDIT: input range maximum

Math.max(0, Math.min(1, (v - min) / (max - min)))
```

---

### Remap (normalize + remap to new range)

```js
// Map v from [inputMin, inputMax] to [outputMin, outputMax]
const v         = value;        // EDIT: input value
const inputMin  = 0;            // EDIT
const inputMax  = 100;          // EDIT
const outputMin = 0;            // EDIT
const outputMax = 1920;         // EDIT

const t = (v - inputMin) / (inputMax - inputMin);
outputMin + t * (outputMax - outputMin)
```

---

### `length(a, b)` — Distance Between Two Points

**What it does:** Returns the Euclidean distance between two 2D points.

**When to use:** Driving effects based on how far apart two layers are, proximity fades, connection lines.

```js
const layerA = thisComp.layer("Point A");  // EDIT
const layerB = thisComp.layer("Point B");  // EDIT

const posA = layerA.transform.position;
const posB = layerB.transform.position;

length(posA, posB)
```

---

### Proximity-Based Fade

**What it does:** Opacity fades to 0 as distance between two layers increases beyond a threshold.

```js
const target    = thisComp.layer("Cursor");  // EDIT: layer to measure distance from
const maxDist   = 300;  // EDIT: distance at which opacity = 0
const minDist   = 50;   // EDIT: distance at which opacity = 100

const dist = length(thisLayer.transform.position, target.transform.position);
linear(dist, minDist, maxDist, 100, 0)
```

---

### Round to Nearest Step

**What it does:** Snaps a value to multiples of a given step — useful for grid snapping, quantized animation.

```js
const step = 45;  // EDIT: snap interval (e.g. 45° for rotation quantize)
Math.round(value / step) * step
```

---

## Quick Reference Table

| Expression | Property | Use Case |
|---|---|---|
| `valueAtTime(time - delay)` | Any | Delayed follow |
| `toComp(point)` | Position | Layer → comp coords |
| `fromComp(point)` | Position | Comp → layer coords |
| `sourceRectAtTime(t).width` | Size | Responsive text backgrounds |
| `thisComp.width/height` | Position/Size | Resolution independence |
| `(index - 1) * spacing` | Position | Grid / stagger offset |
| `time > N ? A : B` | Any | Conditional values |
| `Math.max(min, Math.min(max, v))` | Any | Clamp |
| `(v - min) / (max - min)` | Any | Normalize 0–1 |
| `length(a, b)` | — | Euclidean distance |
| `Math.round(value / step) * step` | Any | Snap to grid |
