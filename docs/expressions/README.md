# AE Expressions Knowledge Base

This directory contains expression recipes for After Effects, organized by category. All expressions use modern JavaScript (ES6+) syntax — **not** ExtendScript ES3. AE's expression engine (since CC 2019) supports arrow functions, `const`/`let`, template literals, destructuring, and most ES6+ features.

---

## Files in This Directory

### [`time-based.md`](./time-based.md)
Expressions that work with time, keyframes, and temporal control.
- Linear & smooth interpolation (`linear`, `ease`, `easeIn`, `easeOut`)
- Time remapping & posterize time
- Loop types: cycle, pingpong, offset, continue
- Timer/elapsed time display

### [`motion.md`](./motion.md)
Expressions that drive position, rotation, scale, and organic motion.
- Wiggle and variants (one-axis, temporal, smooth)
- Bounce / elastic spring physics
- Overshoot and inertia
- Random motion with `seedRandom` / `gaussRandom`
- Circular orbit and wave motion (sine, sawtooth, triangle)
- Parent-relative offsets

### [`text.md`](./text.md)
Expressions applied to Source Text and text animators.
- Typewriter character reveal
- Animated number counter
- Live date/time display
- Conditional text via markers
- Layer name as text source
- Random character reveal

### [`color.md`](./color.md)
Expressions for color manipulation and linking.
- Hex-to-RGBA conversion
- HSL-to-RGB programmatic color
- Color cycling / rainbow cycle
- Referencing Color Controls from an effects layer
- Gradient interpolation between two colors

### [`utility.md`](./utility.md)
General-purpose helper expressions.
- Delay / follow with `valueAtTime`
- Coordinate conversion: `toComp` / `fromComp`
- Responsive layout with `sourceRectAtTime`
- Resolution independence with `thisComp.width/height`
- Index-based stagger offsets
- Conditional / ternary logic
- `clamp`, `normalize`, `length` math helpers

---

## Quick Reference: Expression Engine Rules

| Topic | Rule |
|---|---|
| Syntax | ES6+ JS — use `const`, `let`, arrow functions, template literals |
| Return value | Last evaluated expression is the output value |
| Vector properties | Return arrays: `[x, y]` for 2D, `[x, y, z]` for 3D |
| Color properties | Return `[r, g, b, a]` where each channel is **0–1**, not 0–255 |
| Time | `time` is the current comp time in seconds |
| Frame rate | `thisComp.frameDuration` = 1/fps; `1/thisComp.frameDuration` = fps |
| Layer access | `thisComp.layer("Layer Name")` or `thisComp.layer(index)` |
| Effect access | `thisLayer.effect("Effect Name")("Parameter Name")` |
| No semicolons required | But they are allowed — be consistent |
| `value` | Refers to the current keyframed value of the property |

---

## How to Use These Docs (Agent Instructions)

1. **Identify the category** of the effect you need (time-based, motion, text, color, utility).
2. **Open the relevant file** and find the named recipe.
3. **Copy the expression block** — every code block is a complete, paste-ready expression.
4. **Substitute the editable parameters** highlighted with `// EDIT:` comments.
5. **Apply** via `set_expression` on the target property.

When in doubt, prefer simpler expressions — a clean `linear()` interpolation is better than a complex custom curve that's hard to debug.
