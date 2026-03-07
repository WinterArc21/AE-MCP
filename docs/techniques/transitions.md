# Transitions — AE Technique Reference

## Overview
9 transition types. Core philosophy: transfer kinetic energy from scene A into scene B. Momentum is never discarded.

---

## 1. Whip Pan

**Setup:** Adjustment layer, 5 frames before cut → 5 frames after cut (10 frames total).

**Effects to apply (in order):**
1. `Effect → Distort → Transform` — uncheck "Use Composition's Shutter Angle", set Shutter Angle: **360**
2. `Effect → Blur & Sharpen → Fast Box Blur` — NOT Directional Blur (lacks Repeat Edge Pixels)
3. `Effect → Distort → Motion Tile`

**Horizontal right-to-left keyframes:**

| Frame offset | Transform X Position | Fast Box Blur (Horizontal) |
|---|---|---|
| −5 (start) | 0 | 0 |
| 0 (cut point) | −1,880 (~−2× comp width) | 200 |
| +5 (end) | −2,500 (extra ~600 for ease-out) | 0 |

- Blur Dimensions: **Horizontal Only**
- Motion Tile: Output Width **400%**, Output Height **350%**, Mirror Edges **ON**
- Apply F9 Easy Ease to first and last keyframes
- For vertical whip: use Y position instead; set Blur Dimensions to Vertical

---

## 2. Zoom Transition

**Zoom-In (push into scene B):**

| Layer | Effect | Keyframes |
|---|---|---|
| Adj Layer 1 (−5 to cut) | Transform, Shutter 360 | Scale: 100% → 300% |
| Adj Layer 2 (cut to +5) | Transform, Shutter 360 | Scale: 25% → 100% |

**Graph Editor:** Speed Graph, pull center handles outward — sharp speed spike at cut point.

**CC RepeTile / Motion Tile:** Output Width **400**, Height **350**, Mirror Edges **ON** (fills frame during zoom-out).

**Zoom-Out (pull away):** Reverse — Layer 1: 100→25; Layer 2: 300→100.

**Overlap tip:** Move Layer 1's last keyframe +1 frame, Layer 2's first keyframe −1 frame. Eliminates gap at cut.

**Super/Crash Zoom:** 2–4 frame transition, scale 100%→300%+, motion blur ON, add Radial Fast Blur at midframe.

---

## 3. Shape Wipes

### Circle / Iris Wipe — 3 Methods

**Method 1 — Circle Effect (fastest):**
- `Effect → Generate → Circle` on solid above content
- Blending Mode within effect: **Stencil Alpha**
- Keyframe Radius: **0 → 1,200** (1920×1080 comp)
- To invert: `Effect → Channel → Invert`, channel = Alpha

**Method 2 — Mask Expansion:**
- Square solid, double-click Ellipse Tool for centered mask
- Animate Mask Expansion: **−960 → 0** (iris open) or **0 → −960** (iris close)
- Use solid as Alpha Matte for scene layer

**Method 3 — Radial Wipe Effect:**
- `Effect → Transition → Radial Wipe` on scene layer
- Keyframe Transition Completion: **100% → 0%**
- Wipe Style: clockwise or counter-clockwise

### Linear Wipe
- `Effect → Transition → Linear Wipe` on adjustment layer
- Transition Completion: **100% → 0%**
- Wipe Angle: 0°/45°/90°/135° as needed
- Feather: **50–100px**

### Polygon / Star
- `CC Radial ScaleWipe` for multi-point
- Or: shape layer with polygon path + alpha matte

---

## 4. Morph Transitions

### Shape Path Morphing
1. Keyframe **Path** property on shape layer at frame 0 (Shape A)
2. Advance frames; modify vertices to target shape (Shape B)
3. **Critical:** Both shapes must have the **same vertex count**
4. Fix vertex order: right-click path in timeline → **First Vertex**, align manually
5. Intermediate "breakpoint" shapes help for complex morphs (circle → diamond → star)

### Image/Footage Morph (no plugins)
1. Stack scene A and scene B
2. Apply **Displacement Map** (Fractal Noise or gradient) to both layers
3. Keyframe displacement: scene A displaces outward to **100**, scene B from **100 → 0**
4. Cross-fade opacity over **~8 frames** simultaneously

### Match Cut (seamless)
- Mask shared element in scene A; align exactly with same element in scene B
- Match: position, color temperature, motion direction at cut point

---

## 5. Glitch Transition — Complete Setup

### Step 1 — Glitch Map Solid
1. New Solid → `Effect → Noise & Grain → Fractal Noise`

| Setting | Value |
|---|---|
| Noise Type | Block |
| Contrast | 400 |
| Complexity | 2 |
| Uniform Scaling | OFF |
| Scale Width | 600 |
| Scale Height | 5 |

2. Alt-click Random Seed stopwatch → expression: `time * 100`
3. Hide layer

### Step 2 — Displacement Adjustment Layer (−5 to +5 frames around cut)
1. New Adjustment Layer
2. `Effect → Distort → Motion Tile` — Output Width **400**, Height **350**, Mirror Edges **ON**
3. `Effect → Distort → Displacement Map`
   - Map Layer: Glitch Map solid
   - Use For Horizontal: **Red**
   - Use For Vertical: **Green**
   - Max Vertical Displacement: **0**

**Horizontal Displacement keyframes:**

| Frame offset | Max Horizontal Displacement |
|---|---|
| −5 | 0 |
| −3 | 50 |
| −1 | 200 |
| +1 | 50 |
| +3 | 200 |
| +5 | 0 |

### Step 3 — RGB Channel Split
1. Duplicate scene layer → Pre-compose
2. Apply `Effect → Channel → Shift Channels` (3 instances):
   - Instance 1: Red channel shifted **−8 to −20px** left
   - Instance 2: Green channel shifted **+8 to +20px** right
   - Instance 3: Blue channel shifted **±8px** vertically
3. Blending mode: **Screen** or **Difference**
4. Animate shift: 0px at start → 8–20px at mid-glitch → 0px at end

### Step 4 — Optional Invert Flash
- New Adjustment Layer, 1–2 frames at cut point
- `Effect → Channel → Invert` + `Effect → Color Correction → Exposure`
- Keyframe Exposure: **0 → +2 → 0** over 2 frames

---

## 6. Luma/Alpha Mattes

**How mattes work:**
- **Alpha Matte:** Upper layer's alpha controls lower layer visibility
- **Luma Matte:** Upper layer's brightness controls lower layer (white = visible, black = transparent)
- Set via Track Matte (TrkMat) column on the **lower** layer

**Animated matte transition:**
1. Animated white shape expanding across frame (matte layer)
2. Scene B directly beneath
3. Set scene B's TrkMat → **Luma Matte**

**Ink blot / organic reveal:**
1. B&W ink splat footage or animated Fractal Noise above scene B
2. TrkMat → **Luma Matte**
3. Inverted checkbox flips which areas reveal

---

## 7. Cross-Dissolve + Alpha Add Fix

**Problem:** Two 50%-opacity layers in Normal mode = ~75% combined opacity (ghosting).

**Fix 1 — Alpha Add Mode:**
- Pre-compose the two layers together
- Set incoming layer blending mode → **Alpha Add**
- Two 50%-opacity layers now sum to 100%

**Fix 2 — Offset Keyframes:**
- Outgoing: fades 100% → 0% over 10 frames
- Incoming: starts fading in at **frame 3** (not frame 0), reaches 100% at frame 10

**Fix 3 — Channel Blend:**
- `Effect → Channel → Blend` on one layer
- Blend With Layer = other dissolving layer, Mode = Normal
- Animate "Blend With Original": 0% → 100%

**Stylized variants:**
- **Texture dissolve:** Animated Fractal Noise as Luma Matte between scenes
- **Pixel sort dissolve:** Horizontal displacement map with animated max displacement
- **Fade through black/white:** implies longer time passage

---

## 8. Particle-Based Transition

**CC Particle World settings (disintegration/reassembly):**

| Parameter | Value |
|---|---|
| Birth Rate | 5–10 |
| Longevity | 2–3 seconds |
| Producer Position XYZ | 0, 0, 0 |
| Particle Type | Faded Sphere or Cube |
| Gravity | 0 (float) or 0.1–0.3 (fall) |
| Velocity | 0.5–1.0 |

**Technique:**
1. Scene A: freeze on last frame via Time Remap
2. Particles generate from scene A's position
3. After 12–20 frames of particles filling screen, scene B fades in underneath
4. Reverse particle animation on scene B (Time Remap backward) = reassembly effect

**Quick particle wipe:**
1. Gradient Ramp solid animated left-to-right
2. Use as Luma Matte for particle solid
3. Particles revealed progressively across frame

---

## 9. Timing Cheatsheet

| Transition Type | Total Duration | Peak Frame | Blur/Effect Value | Motion Blur |
|---|---|---|---|---|
| Whip Pan | 10 frames | Frame 5 (cut) | Fast Box Blur 150–200 | 360° shutter |
| Zoom In/Out | 10 frames | Frame 5 (cut) | Radial Fast Blur | 360° shutter |
| Iris Expand | 12–20 frames | Midpoint | Mask Feather 20–50px | Optional |
| Glitch | 8–10 frames | Frame 4–5 | Displacement 50–200 | ON |
| Shape Morph | 12–24 frames | Midpoint | Path interpolation | Optional |
| Luma Matte Reveal | 12–30 frames | Variable | Matte feather 20–100px | Optional |
| Particle Disintegrate | 20–40 frames | N/A | N/A | ON for particles |
| Cross-Dissolve | 10–20 frames | Midpoint | Alpha Add at 50% each | Off |
