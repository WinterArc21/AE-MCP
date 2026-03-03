# Template: Data Visualization Card

A data card presents a single statistic or metric with visual emphasis — large number, label, background card shape, and an accent element. Used in data-driven presentations, dashboards, infographics, and financial summaries.

---

## Specification

| Property | Value |
|---|---|
| Card size | 360×220px (standard) or 460×280px (large) |
| Comp size | 1920×1080 (parent comp) or card can be its own pre-comp |
| Duration | 4–6 seconds visible |
| Number entrance | Counter animation (0 → final value) |
| Character | Bold, confident, data-first |

---

## Layer Structure

```
[1] Text - Number / Stat       (the big animated number)
[2] Text - Label               (descriptor below the number)
[3] Text - Unit / Prefix       (optional: "$", "%", "K", "M" etc.)
[4] Shape - Accent Bar         (horizontal or vertical accent line)
[5] Shape - Background Card    (rounded rectangle card body)
```

### Layer Details

**Layer 5 — Shape: Background Card**
- Type: Shape Layer → Rectangle
- Size: `360×220px` (standard)
- Fill: `[0.071, 0.082, 0.098, 1]` (dark card, e.g. #121520)
- Corner Radius: `12px`
- Optional stroke: `1px` border at `[0.150, 0.160, 0.190, 0.6]`
- Position: Card center in comp

**Layer 4 — Shape: Accent Bar**
- Type: Shape Layer → Rectangle
- Dimensions (horizontal style): `60px × 4px`
- Fill: Brand accent color (`[0.176, 0.490, 0.969, 1]`)
- Position: Top of card — `cardTop + 20px`, left-aligned to number text
- Anchor Point: Left edge (draws left-to-right)

OR vertical accent bar:
- Dimensions: `4px × 160px`
- Position: Left edge of card + 20px, centered vertically
- This variant is common for "stat with side stripe" style cards

**Layer 3 — Text: Unit / Prefix (optional)**
- Font: Bold, 28–36pt (smaller than the main number)
- Color: `#5B7ABF` or muted accent
- Position: Left of the number text, baseline-aligned
- Examples: `$`, `€`, `+`, `↑`

**Layer 2 — Text: Label**
- Font: Regular/Medium, 18–22pt
- Color: `#7A8299` (muted, secondary)
- Tracking: +50–100 for uppercase labels
- Position: Below the stat number, with 12px gap

**Layer 1 — Text: Number / Stat**
- Font: Bold or Black weight, 64–80pt
- Color: `#F0F0F0` (bright, dominant)
- Alignment: Left (within card) or center
- Source Text: Use the **counter expression** (see below)

---

## Counter Expression for Stat Number

Apply to the **Source Text** property of the number text layer:

```js
// Animated number counter — apply to Source Text
const startTime = 0.4;    // EDIT: when counting begins
const endTime   = 1.8;    // EDIT: when counting ends
const startVal  = 0;      // EDIT: starting value
const endVal    = 4200;   // EDIT: final stat value
const prefix    = "";     // EDIT: e.g. "$", "+"
const suffix    = "";     // EDIT: e.g. "%", "K", "M"
const decimals  = 0;      // EDIT: 0 for integer, 1+ for decimal

const val = ease(time, startTime, endTime, startVal, endVal);
`${prefix}${val.toFixed(decimals)}${suffix}`
```

> For large numbers (10K+), use `toLocaleString("en-US")` instead of `toFixed()` to add comma separators automatically.

---

## Animation Sequence

### Timing Overview

```
t=0.0s  ─── Card background appears (fade in)
t=0.2s  ─── Accent bar draws in (scale X: 0%→100%)
t=0.4s  ─── Number starts counting (0 → final value over 1.4s)
t=0.5s  ─── Label text fades in + slides up
t=0.6s  ─── Unit/prefix fades in (if applicable)
t=0.4–1.8s ─ Counter animation runs
t=1.8s  ─── Counter reaches final value, slight bounce/overshoot
t=1.8–4.5s ─ Hold — all elements static
t=4.5s  ─── All elements fade out simultaneously (0.3s)
t=4.8s  ─── Composition end
```

---

### Step-by-Step Keyframes

#### Background Card — Opacity + Scale
| Time | Scale | Opacity | Easing |
|---|---|---|---|
| `0.0s` | `96%` | `0%` | — |
| `0.25s` | `100%` | `100%` | `easeOut` |
| `4.5s` | `100%` | `100%` | — |
| `4.8s` | `100%` | `0%` | `easeIn` |

#### Accent Bar — Scale X + Opacity
| Time | Scale X | Opacity | Easing |
|---|---|---|---|
| `0.2s` | `0%` | `0%` | — |
| `0.45s` | `100%` | `100%` | `easeOut` |
| `4.5s` | `100%` | `100%` | — |
| `4.8s` | `100%` | `0%` | `easeIn` |

#### Stat Number — Opacity (counter handles value via expression)
| Time | Opacity | Easing |
|---|---|---|
| `0.35s` | `0%` | — |
| `0.55s` | `100%` | `easeOut` |
| `4.5s` | `100%` | — |
| `4.8s` | `0%` | `easeIn` |

#### Label Text — Opacity + Position Y
| Time | Y offset | Opacity | Easing |
|---|---|---|---|
| `0.5s` | `+12px` | `0%` | — |
| `0.75s` | `0px` | `100%` | `easeOut` |
| `4.5s` | `0px` | `100%` | — |
| `4.8s` | `0px` | `0%` | `easeIn` |

---

## Recommended Tool Call Sequence

```
1. create_composition (or use as pre-comp inside parent)
   name: "Data Card - [Stat Name]"
   width: 1920, height: 1080
   duration: 5.0, fps: 30

2. create_shape_layer
   name: "Shape - Background Card"
   shape: rectangle
   width: 360, height: 220
   corner_radius: 12
   fill: [0.071, 0.082, 0.098, 1]
   position: [960, 540]   ← centered, or place in composition
   keyframes: Scale 96%→100% + Opacity 0%→100%, easeOut, t=0.0s–0.25s

3. create_shape_layer
   name: "Shape - Accent Bar"
   shape: rectangle
   width: 60, height: 4
   fill: [0.176, 0.490, 0.969, 1]
   anchor_point: left edge
   position: [left edge of card + 30px, card top + 20px]
   keyframes: ScaleX 0%→100% + Opacity 0%→100%, easeOut, t=0.2s–0.45s

4. create_text_layer
   name: "Text - Stat Number"
   text: "0"   ← will be overridden by expression
   font_size: 72
   font_weight: bold
   color: [0.941, 0.941, 0.941, 1]
   position: [centered or left in card]
   set_expression on Source Text: (counter expression above)
   keyframes: Opacity 0%→100%, easeOut, t=0.35s–0.55s

5. create_text_layer (optional prefix/suffix if not in counter expression)
   name: "Text - Unit"
   text: "%"   ← or "$", "K", etc.
   font_size: 32
   font_weight: bold
   color: [0.357, 0.478, 0.749, 1]
   position: right of number or as superscript

6. create_text_layer
   name: "Text - Label"
   text: "Monthly Active Users"   ← EDIT
   font_size: 20
   font_weight: regular
   color: [0.478, 0.510, 0.600, 1]
   position: below stat number, 12px gap
   keyframes: PositionY +12px → rest + Opacity 0%→100%, easeOut, t=0.5s–0.75s

7. Add exit keyframes to all layers at t=4.5s–4.8s (Opacity → 0%)
```

---

## Multiple Cards in a Grid

When displaying multiple data cards (e.g., 3 stats in a row), use the index-based stagger pattern:

```js
// Stagger entrance by layer index — apply to Opacity keyframe timing offset
const stagger     = 0.15;   // EDIT: seconds between cards
const baseStart   = 0.0;    // EDIT: when first card enters
const myStart     = baseStart + (index - 1) * stagger;
const myEnd       = myStart + 0.3;

ease(time, myStart, myEnd, 0, 100)
```

### 3-Card Row Positioning (1920×1080)
```
Card 1: position [420, 540]   (left third)
Card 2: position [960, 540]   (center)
Card 3: position [1500, 540]  (right third)
Card spacing: 540px between centers
```

---

## Accent Bar Variants

### Bottom Horizontal Bar (Progress Bar Style)
- Width: Full card width
- Height: 4px
- Position: Bottom edge of card
- Animate: ScaleX 0%→(data_value / max_value * 100)%
- Use this when the bar should represent the stat's proportion

### Vertical Left Stripe
- Width: 6px, Height: full card height
- Position: Left edge of card
- Static, no animation needed
- Color: Category color (use per-card color for multi-card grids)

### Circular Progress Ring
- Create using trim paths on an ellipse
- End point expression: `linear(time, startT, endT, 0, targetPercent)`
- Requires trim paths on shape layer

---

## Common Mistakes

- Counter that counts too fast (under 0.5s total) — allow 1.0–1.5s minimum for dramatic impact
- Label text larger than the stat number — number must dominate
- No accent element — data cards feel cold without a color accent
- Card background same color as comp background — use a slightly lighter dark tone for the card
- Forgetting to add comma separators on large numbers (`toLocaleString`)
