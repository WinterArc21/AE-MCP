# Shape Animation — AE Technique Reference

---

## Trim Paths — Draw-On Effect

**Basic keyframe setup:**
- Frame 0: `End = 0%`
- Frame ~24: `End = 100%`
- Apply F9 Easy Ease to both keyframes
- Graph Editor speed curve: slow start → fast middle → ease to full

**Dual-Stroke Shimmer (logo reveal):**
1. Draw path with stroke only (outer stroke, e.g., **12px**)
2. Apply Trim Paths — animate `End`: 0% → 100%
3. Duplicate layer → inner stroke (**8px**, brighter color)
4. Inner stroke: Line Cap = **Round Cap**, Round Join
5. Add expression to inner layer's Trim Paths `Start`:

```javascript
// On inner layer Trim Paths Start — creates traveling shimmer dot
thisComp.layer("outer_stroke").content("Trim Paths 1").end - 5
```

6. Link inner layer's Trim Paths `End`:

```javascript
// On inner layer Trim Paths End
thisComp.layer("outer_stroke").content("Trim Paths 1").end + 0.1
```

Result: a bright dot races along the path ahead of the drawing stroke.

---

## Radial Wipe Using Shapes

1. Create ellipse (circle) shape layer — **stroke only, no fill**
2. Add Trim Paths
3. Animate `End`: **0% → 100%** (wipe starts at 12 o'clock by default)
4. To offset start position: rotate the shape path's **inner Transform** (not the layer)
5. Combine with Trim Paths `Offset` to start from a different clock position

---

## Shape Explosion / Burst

**Step-by-step:**
1. Create short vertical line shape (e.g., **60px**, centered at origin [0,0])
2. Add Trim Paths: keyframe Start AND End both **0% at frame 0 → 100% at frame 12**
3. Add **Repeater** inside the shape group
4. Repeater placement matters:
   - **Above** Trim Paths in stack = all copies animate simultaneously
   - **Below** Trim Paths = staggered animation per copy

**Repeater settings for burst:**

| Parameter | Value |
|---|---|
| Copies | 8 (dense: 12) |
| Position | [0, 0] |
| Rotation | 360 ÷ copies (e.g., 45° for 8) |
| Anchor Point | [0, 0] |
| Scale Each Copy | 100% |

5. Pre-compose, duplicate, rotate by **22.5°** for double-ring burst effect

---

## Geometric Pattern Table — Repeater Params

| Parameter | Tiled Grid | Radial Burst | Spiral |
|---|---|---|---|
| Copies | 8–20 | 6–16 | 12–36 |
| Position X | 80–120px | 0 | 0 |
| Position Y | 0 | 0 | 5–15px |
| Rotation | 0° | 360 ÷ copies | 10–15° |
| Scale each copy | 100% | 100% | 97–99% |
| Opacity each copy | 100% | 90–95% | 90–100% |

**Spiral key:** Set Scale Each Copy to **~98%** and Rotation to **~12°** — each copy slightly smaller and more rotated.

**Kaleidoscope:** 6 copies, rotation = 60°, Anchor Point offset [100, 0], enable Merge Paths → Add.

---

## Shape Morphing

### Vertex Matching Rules
- Both shapes must have **identical vertex counts**
- Use Pen tool to create matching point counts on both shapes
- Keyframe `Path` property: Shape A at frame 0, Shape B at later frame
- Right-click path in timeline → **First Vertex** to manually align start point
- Apply Roving keyframes + Easy Ease for organic flow
- Add intermediate breakpoint shapes for complex morphs

### Metaball / Liquid Merge Technique

1. Create 2+ circles (shape layers with fills) in one comp
2. Add Adjustment Layer above all shapes
3. Apply `Effect → Blur & Sharpen → Gaussian Blur` — value: **30–50px**
4. Apply `Effect → Matte → Simple Choker` — choke value: **−20 to −40**
5. Animate circle positions to merge and separate

The high blur + choker creates organic "liquid" connection between shapes.

**Organic floating expression (on circle Position):**
```javascript
// Apply to Position of each circle shape layer
value + [Math.sin(time * 3) * 50, Math.cos(time * 2) * 40]
```

**Liquid blob (single shape):**
1. Ellipse with fill, no stroke
2. Add Wiggle Paths: Size = **20**, Detail = **2**, Points = Smooth, Wiggles/Second = **2**
3. Apply Gaussian Blur **3–5px** to soften edge

---

## Wiggle Paths — Organic Motion

Add via: Shape Contents → **Add → Wiggle Paths**

| Setting | Value | Effect |
|---|---|---|
| Size | 10–80 | Amplitude of displacement |
| Detail | 1–3 | Smooth/organic |
| Detail | 8–15 | Jagged/noise |
| Points | Smooth | Fluid/liquid |
| Points | Corner | Sharp organic |
| Wiggles/Second | 3–8 | Lively motion |

**Animate growth:** Keyframe Size: **0 at frame 0 → desired value at frame 12**

**Layering:** Stack multiple lines with slight Size/Detail variation for rich patterns.

**Fire simulation (no particles):**
1. Tall irregular polygon with Wiggle Paths: Size = **30**, Detail = **5**, Points = Corner
2. Add second Wiggle Paths: Size = **10**, Detail = **10**
3. Add `Effect → Distort → Turbulent Displace`: Amount **20**, Size **30**, Evolution = `time * 200`

---

## Repeater + Wiggle Transform Combined

1. Add shape to shape layer group
2. Add **Repeater** (e.g., 8 copies, Rotation 45°)
3. Set Repeater Transform Anchor Point offset from center
4. Add **Wiggle Transform** below Repeater in contents stack:

| Setting | Value |
|---|---|
| Size | 5–20 |
| Detail | 1–3 |
| Wiggles/Second | 2–5 |

Result: each Repeater copy wiggles independently → organic living burst.

---

## Expression-Controlled Repeater Grid

1. Rectangle shape + Repeater X-axis + second Repeater Y-axis
2. Add Slider Controls: "Cell Size", "Copies X", "Copies Y"
3. Expression on Repeater 1 Transform Position:

```javascript
// On Repeater Transform Position X
var cellSize = effect("Cell Size")("Slider");
[cellSize, 0]
```

4. Link Copies to Slider Controls for a fully procedural grid.

---

## Reshape Effect Morph (for footage/video layers)

1. Draw Source mask (Shape A) and Destination mask (Shape B) on same layer
2. `Effect → Distort → Reshape`
3. Source Mask = Shape A, Destination Mask = Shape B
4. Alt-click on mask edges to add Correspondence Points
5. Animate **Percent**: 0% = source, 100% = destination
6. Add opacity fade (0→100) on morph layer for seamless blend
7. Apply `Effect → Distort → Liquify` after Reshape to push overlapping areas together
