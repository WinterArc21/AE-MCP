# Color Expressions

Color in After Effects expressions is always represented as `[r, g, b, a]` where each channel is a **float from 0 to 1** (not 0–255). These expressions handle conversion, linking, and programmatic generation.

---

## 1. Hex to RGBA

### Convert a Hex String to AE Color Array

**What it does:** Takes a hex color code and returns the `[r, g, b, a]` array AE expects.

**When to use:** When specifying brand colors by hex code, or reading colors from a design spec.

```js
// Converts a hex color to AE [r, g, b, a] (0-1 range)
const hex = "#FF5733";  // EDIT: your hex color (with or without #)

const h    = hex.replace("#", "");
const r    = parseInt(h.substring(0, 2), 16) / 255;
const g    = parseInt(h.substring(2, 4), 16) / 255;
const b    = parseInt(h.substring(4, 6), 16) / 255;
const a    = 1.0;  // EDIT: alpha (0.0–1.0)

[r, g, b, a]
```

---

### Hex Color Reference Table (Common Brand-Safe Colors)

```js
// Near-black background
const BG_DARK      = [0.039, 0.039, 0.039, 1];  // #0A0A0A
const BG_MIDNIGHT  = [0.102, 0.102, 0.176, 1];  // #1A1A2E
// Off-white text
const TEXT_WHITE   = [0.941, 0.941, 0.941, 1];  // #F0F0F0
const TEXT_CREAM   = [0.910, 0.910, 0.910, 1];  // #E8E8E8
// Accent colors
const ACCENT_BLUE  = [0.176, 0.490, 0.969, 1];  // #2D7DF7
const ACCENT_CYAN  = [0.000, 0.831, 0.945, 1];  // #00D4F1
const ACCENT_GREEN = [0.180, 0.800, 0.443, 1];  // #2ECC71
const ACCENT_RED   = [0.937, 0.267, 0.267, 1];  // #EF4444
const ACCENT_GOLD  = [1.000, 0.773, 0.161, 1];  // #FFC629
```

---

## 2. HSL to RGB

### Programmatic Color from HSL Values

**What it does:** Converts Hue (0–360), Saturation (0–1), Lightness (0–1) to `[r, g, b, a]`. HSL is more intuitive for programmatic color design.

**When to use:** Generating palettes, color cycling, keeping saturation/lightness constant while shifting hue.

```js
// HSL → RGB conversion
const h = 210;   // EDIT: hue in degrees (0–360)
const s = 0.8;   // EDIT: saturation (0–1)
const l = 0.5;   // EDIT: lightness (0–1)
const a = 1.0;   // EDIT: alpha

const hslToRgb = (h, s, l) => {
  const c  = (1 - Math.abs(2 * l - 1)) * s;
  const x  = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m  = l - c / 2;
  let r = 0, g = 0, b = 0;

  if      (h < 60)  { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else              { r = c; g = 0; b = x; }

  return [r + m, g + m, b + m, a];
};

hslToRgb(h, s, l)
```

---

### Constant Saturation, Controlled Hue

```js
// Rotate hue while keeping saturation and lightness fixed
const hueSpeed = 30;   // EDIT: degrees per second
const s        = 0.85; // EDIT: saturation (0–1)
const l        = 0.55; // EDIT: lightness (0–1)
const hue      = (time * hueSpeed) % 360;

const hslToRgb = (h, s, l) => {
  const c  = (1 - Math.abs(2 * l - 1)) * s;
  const x  = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m  = l - c / 2;
  let r = 0, g = 0, b = 0;
  if      (h < 60)  { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else              { r = c; g = 0; b = x; }
  return [r + m, g + m, b + m, 1];
};

hslToRgb(hue, s, l)
```

---

## 3. Color Cycling / Rainbow

### Full Rainbow Cycle

**What it does:** Continuously cycles through the full hue spectrum (rainbow).

**Apply to:** Fill Color, Stroke Color, any color property.

```js
const speed = 0.25;  // EDIT: full cycles per second (0.25 = one cycle per 4 seconds)
const s     = 0.9;   // EDIT: saturation
const l     = 0.6;   // EDIT: lightness

const hue = (time * speed * 360) % 360;

const hslToRgb = (h, s, l) => {
  const c  = (1 - Math.abs(2 * l - 1)) * s;
  const x  = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m  = l - c / 2;
  let r = 0, g = 0, b = 0;
  if      (h < 60)  { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else              { r = c; g = 0; b = x; }
  return [r + m, g + m, b + m, 1];
};

hslToRgb(hue, s, l)
```

---

### Per-Layer Color from Palette

**What it does:** Each layer gets a different color from a defined palette, using its `index`.

```js
const palette = [
  [0.176, 0.490, 0.969, 1],  // #2D7DF7 blue
  [0.000, 0.831, 0.945, 1],  // #00D4F1 cyan
  [0.180, 0.800, 0.443, 1],  // #2ECC71 green
  [1.000, 0.773, 0.161, 1],  // #FFC629 gold
  [0.937, 0.267, 0.267, 1],  // #EF4444 red
];                            // EDIT: replace with your palette

palette[(index - 1) % palette.length]
```

---

## 4. Referencing Color Controls

### Pull Color from an Effects Control Layer

**What it does:** Reads the color value from a Color Control effect on a designated "Controls" null or solid layer. This is the correct way to centralize color management across a comp.

**Setup:**
1. Create a Null or Solid layer, name it `"Controls"`
2. Apply **Effect > Expression Controls > Color Control** to it
3. Name the effect (e.g. `"Primary Color"`)
4. Apply this expression to any Fill Color or Stroke Color property

```js
// Reference a Color Control effect from a controller layer
thisComp.layer("Controls").effect("Primary Color")("Color")
// EDIT: "Controls" = controller layer name
// EDIT: "Primary Color" = Color Control effect name
```

---

### Multiple Named Colors from One Control Layer

```js
// For the "primary" fill
thisComp.layer("Controls").effect("Primary Color")("Color")
```

```js
// For the "secondary" fill (separate Color Control effect)
thisComp.layer("Controls").effect("Secondary Color")("Color")
```

```js
// Accent
thisComp.layer("Controls").effect("Accent Color")("Color")
```

---

### Alpha-Modified Color from Control

**What it does:** Takes the color from a control but overrides the alpha (useful for semi-transparent fills).

```js
const ctrl  = thisComp.layer("Controls").effect("Primary Color")("Color");
const alpha = 0.6;  // EDIT: desired alpha 0–1
[ctrl[0], ctrl[1], ctrl[2], alpha]
```

---

### Fade Color to Transparent with Opacity

**What it does:** Multiplies all channels' alpha by an opacity value (0–1) without touching RGB.

```js
const baseColor = thisComp.layer("Controls").effect("BG Color")("Color");
const opacity   = ease(time, 0, 0.5, 0, 1);  // EDIT: fade timing
[baseColor[0], baseColor[1], baseColor[2], baseColor[3] * opacity]
```

---

## 5. Linking Fill Color to Layer Opacity / Value

### Fill Color Driven by a Slider

**What it does:** Uses a Slider Control on this layer to drive one color channel (e.g., brightness).

```js
const brightness = thisLayer.effect("Brightness")("Slider") / 100;  // EDIT: effect name
[brightness, brightness, brightness, 1]  // grayscale based on slider
```

---

## 6. Gradient via Expression (Color Interpolation)

### Interpolate Between Two Colors Over Time

**What it does:** Smoothly blends between two `[r, g, b, a]` colors from `t0` to `t1`.

```js
const colorA = [0.039, 0.039, 0.039, 1];  // EDIT: start color [r,g,b,a] 0–1
const colorB = [0.176, 0.490, 0.969, 1];  // EDIT: end color [r,g,b,a] 0–1
const t0     = 0.5;  // EDIT: start time
const t1     = 2.0;  // EDIT: end time

const t = ease(time, t0, t1, 0, 1);  // 0 = colorA, 1 = colorB

[
  colorA[0] + (colorB[0] - colorA[0]) * t,
  colorA[1] + (colorB[1] - colorA[1]) * t,
  colorA[2] + (colorB[2] - colorA[2]) * t,
  colorA[3] + (colorB[3] - colorA[3]) * t,
]
```

---

### Gradient Along Layer Index (Palette Sweep)

**What it does:** Layers distributed across a palette — first layer gets colorA, last gets colorB. Good for stacked bar charts, equalizers, tiled backgrounds.

```js
const colorA    = [0.180, 0.800, 0.443, 1];  // EDIT: start color
const colorB    = [0.176, 0.490, 0.969, 1];  // EDIT: end color
const totalLayers = 8;  // EDIT: total number of layers in the group

const t = (index - 1) / (totalLayers - 1);  // 0 at first layer, 1 at last

[
  colorA[0] + (colorB[0] - colorA[0]) * t,
  colorA[1] + (colorB[1] - colorA[1]) * t,
  colorA[2] + (colorB[2] - colorA[2]) * t,
  1
]
```

---

### Gradient Across Position (Horizontal Sweep)

**What it does:** A layer's color shifts based on its X position in the comp — useful for gradient-filled elements without using gradient effects.

```js
const colorA = [0.180, 0.800, 0.443, 1];  // EDIT: left color
const colorB = [0.176, 0.490, 0.969, 1];  // EDIT: right color

const posX = thisLayer.transform.position[0];
const t    = posX / thisComp.width;  // 0 at left edge, 1 at right edge

[
  colorA[0] + (colorB[0] - colorA[0]) * t,
  colorA[1] + (colorB[1] - colorA[1]) * t,
  colorA[2] + (colorB[2] - colorA[2]) * t,
  1
]
```

---

## 7. Flash / Strobe Color

**What it does:** Alternates between two colors at a given rate — useful for alert indicators, UI notifications.

```js
const colorA   = [0.937, 0.267, 0.267, 1];  // EDIT: e.g. red
const colorB   = [1.000, 1.000, 1.000, 1];  // EDIT: e.g. white
const flashFPS = 4;  // EDIT: flashes per second

Math.sin(time * flashFPS * Math.PI) >= 0 ? colorA : colorB
```

---

## Quick Reference Table

| Recipe | Apply To | Notes |
|---|---|---|
| Hex to `[r,g,b,a]` | Fill/Stroke Color | Divide channels by 255 |
| HSL to RGB | Fill/Stroke Color | Intuitive for palette work |
| Hue cycle | Fill/Stroke Color | `(time * speed * 360) % 360` |
| Per-layer palette | Fill/Stroke Color | `palette[(index-1) % palette.length]` |
| Color Control reference | Fill/Stroke Color | Best practice for centralized colors |
| Color interpolation over time | Fill/Stroke Color | `ease(time, t0, t1, 0, 1)` blend |
| Color by index gradient | Fill/Stroke Color | Useful for stacked/tiled layers |
| Strobe/flash | Fill/Stroke Color | `Math.sin(...) >= 0 ? A : B` |
