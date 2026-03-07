# Scene Building — AE Technique Reference

---

## Gradient Background Layering

**Base setup:** New Solid → `Effect → Generate → Gradient Ramp`

| Setting | Value |
|---|---|
| Ramp Shape | Linear (horizon) or Radial (center glow) |
| Start Color | Horizon/warm tone (amber, pale blue, near-white) |
| End Color | Deep background (dark blue, purple, black) |
| Ramp Scatter | 10–20 (breaks up digital smoothness) |

**3-Layer system (minimum):**

| Layer | Setup | Blend Mode | Opacity |
|---|---|---|---|
| 1 — Base | Gradient Ramp (sky tone) | Normal | 100% |
| 2 — Middle glow | Solid, radial gradient, complementary color | Soft Light | 30–60% |
| 3 — Edge depth | Solid, slight color difference | Multiply | 20–30% |

**Animated drift:** Keyframe Ramp Start Point over 5–10s for subtle atmospheric color shift.

---

## Particle Field (CC Particle World — Ambient)

New Solid → `Effect → Simulation → CC Particle World`

| Parameter | Value |
|---|---|
| Birth Rate | 0.5 |
| Longevity | 4 seconds |
| Velocity | 0.1 |
| Gravity | −0.02 (slight upward float) |
| Particle Type | Faded Sphere |
| Size | 0.05 |
| Color | Warm white (match scene highlight) |

- Blend mode on solid: **Screen** or **Add**
- Layer opacity: **20%**

**Dust/foreground particles:** Size **0.2–0.4**, Birth Rate **0.1–0.3**, Longevity **8–12s**, opacity **15–30%**

---

## Fake Bokeh Technique

1. New Shape Layer → draw large ellipses (**50–200px diameter**)
2. Fill: bright, slightly warm or cool color (match scene color grade)
3. `Effect → Blur & Sharpen → Camera Lens Blur` → Blur Radius: **30–80**
4. Layer opacity: **30–60%**
5. Animate position with:

```javascript
// On Position — barely perceptible drift
wiggle(0.3, 8)
```

**Anamorphic bokeh:** Scale Y to **50–60%** (oval bokeh, like anamorphic lenses).

**Layering:** 2–4 bokeh layers at different scales and opacities. Larger shapes in FG (more blur), smaller in MG (less blur).

---

## Light Streaks Setup

**Method 1 — Lens Flare:**
1. New Solid (black) → `Effect → Generate → Lens Flare`
   - Preset: **35mm Prime** (clean) or **105mm Prime** (more artifacts)
   - Flare Brightness: **60–100**
2. Blend mode: **Screen** (black disappears)
3. Animate Flare Center along a path (pick-whip to a null)
4. Brightness flicker expression:

```javascript
// On Flare Brightness — subtle 20% flicker at 0.5Hz
wiggle(0.5, 20)
```

**Method 2 — Manual Streaks:**
1. New Shape Layer → long thin rectangle (**1920 × 2px**)
2. Gaussian Blur (vertical only): **4–8px**
3. Opacity **20–40%**, blend mode **Add**
4. Animate position: off-screen top-left → bottom-right over **2–4s**
5. Duplicate **3–5 times** with different timing offsets and opacities

---

## Fog / Atmosphere — Fractal Noise Settings

New Solid → `Effect → Noise & Grain → Fractal Noise`

| Fog Type | Fractal Type | Noise Type | Contrast | Brightness | Complexity | Opacity | Blend |
|---|---|---|---|---|---|---|---|
| Morning ground mist | Dynamic Progressive | Soft Linear | 30 | +20 | 6 | 40% | Screen |
| Thick atmosphere | Dynamic Progressive | Soft Linear | 60 | +10 | 6 | 60% | Add |
| Haze / air | Dynamic Progressive | Soft Linear | 20 | +30 | 6 | 25% | Screen |

**Additional settings for all fog types:**
- Uniform Scaling: **OFF**
- Scale Width: **200–400%**, Scale Height: **100%** (stretch horizontal bands)
- Enable 3D Layer, rotate X: **+80–90°** to lay flat on ground plane
- Add rectangular Mask feathered **200–400px** at top (fog fades upward)
- Animate Offset Turbulence X: **0 → 500** over **10–20s** (slowly drifting fog)

---

## Volumetric Light Rays — 3 Methods

### Method 1 — CC Light Rays
1. New Solid (white/light-colored)
2. `Effect → Simulation → CC Light Rays`
   - Center: position of light source (top of frame, behind subject)
   - Intensity: **100–200**
   - Radius: **150–300**
   - Warp Softness: **30–60**
3. Blend mode: **Screen**, Opacity: **30–60%**

### Method 2 — Directional Blur Streak
1. Small ellipse shape layer defining light source
2. `Effect → Blur & Sharpen → Directional Blur`
   - Direction: angle from light source toward viewer (usually downward)
   - Blur Length: **300–600**
3. Blend mode: **Screen**, Opacity: **40–70%**

### Method 3 — Fractal Noise + Directional Blur
1. New Solid → Fractal Noise (Fractal Type: **Threads**, Complexity: **3–5**)
2. `Directional Blur` — vertical or angled, Blur Length: **200–400**
3. Blend mode: **Screen**, Opacity: **25–40%**
4. Mask to a cone shape from the light source

---

## The 5-Depth-Cue 2D System

| Depth Cue | AE Application | Range |
|---|---|---|
| Scale | Farther = smaller | BG at 60–80% of FG scale |
| Blur | Farther = blurrier | BG: 4–15px blur; FG: 0px |
| Opacity | Farther = more transparent | BG: 70–85%; FG: 100% |
| Saturation | Farther = less saturated | BG: −10 to −30% via Hue/Sat |
| Color temperature | Farther = cooler/bluer | BG: +5 blue shift in Color Balance |

**Full layer stack example:**

```
[Layer 7] Foreground bokeh + particles     Screen, 40%
[Layer 6] Main subject                     Normal, 100%, 0px blur, full sat
[Layer 5] Near BG                          Normal, 90%, 3px blur, −5% sat
[Layer 4] Mid BG                           Normal, 80%, 8px blur, −15% sat
[Layer 3] Far BG                           Normal, 70%, 15px blur, −25% sat
[Layer 2] Atmospheric haze solid           Screen, 20%
[Layer 1] Sky gradient base                Normal, 100%
```

---

## Blending Mode Lighting Simulation

| Lighting Effect | Blend Mode | Opacity | Notes |
|---|---|---|---|
| Key light (luminosity) | Soft Light | 20–40% | Radial gradient solid at light source |
| Key light (contrast) | Overlay | 15–25% | Stronger, more contrast |
| Fill / ambient | Soft Light | 10–20% | Medium gray or complementary color |
| Rim light / edge glow | Outer Glow layer style | — | Size 15–40px |
| Shadow / vignette | Multiply | 40–80% | Black solid, inverted ellipse mask, feather 300–500px |
| Color cast (teal shadows) | Multiply | 8–12% | Blue-green solid |
| Orange/teal look | Overlay (highlights) + Multiply (shadows) | 10% + 8% | Orange highlights, cyan shadows |

---

## Complete "Rich Background" Recipe

Stack in this order (top to bottom):

1. **Dust particles** — CC Particle World, Screen, 20%
2. **Bokeh layer A** — large ellipses (100–200px), Camera Lens Blur r=60, Screen, 40%
3. **Bokeh layer B** — smaller ellipses (50–80px), Camera Lens Blur r=30, Screen, 25%
4. **Light streak A** — thin rectangle, Gaussian Blur 6px, Add, 30%
5. **Light streak B** — thinner, different angle, Add, 20%
6. **Volumetric rays** — CC Light Rays or Fractal Noise+DirBlur, Screen, 35%
7. **Fog layer** — Fractal Noise (Dynamic Progressive), Screen, 40%
8. **Gradient layer 3** — solid, complementary color, Multiply, 25%
9. **Gradient layer 2** — solid, radial glow, Soft Light, 40%
10. **Gradient base** — Gradient Ramp solid, Normal, 100%

Render cost tip: pre-compose layers 7–10 into a single "BG Base" pre-comp and collapse it.
