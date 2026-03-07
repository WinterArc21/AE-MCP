# Texture & Depth — AE-MCP Design Reference

## Core Rules
- Grain should be **felt, not seen** — if someone notices the grain, it's too much
- Vignette should be **invisible** at 10–20%, **noticeable but professional** at 30–50%
- Chromatic aberration: **3–8px** = lens effect; above 10px = intentional glitch
- Apply CA only at transition points — constant CA on text makes it illegible
- One sharp focal plane maximum — multiple sharp planes dilute hierarchy

---

## Film Grain Settings

### By Style
| Style | Intensity | Size | Blend mode | Opacity |
|---|---|---|---|---|
| Modern / clean | 0.2–0.4 | 0.8px | Screen | 25% |
| Cinematic / film | 0.5–0.8 | 1.0–1.2px | Screen | 40% |
| Vintage / analog | 0.9–1.5 | 1.5–2.0px | Screen | 55% |
| Heavy / degraded | 2.0+ | 2.0–3.0px | Overlay | 40% |

### AE Add Grain (best quality, slowest render)
Effect → Noise & Grain → Add Grain
- **Intensity:** 0.3–0.6 (subtle) or 0.8–1.2 (heavy vintage)
- **Size:** 0.8–1.2px for modern digital film grain
- **Blue channel:** Add 10–20% more grain to Blue channel (emulates film stock — blue is grainiest)
- **Animation Speed:** 0.8–1.0 (grain drifts, not buzzes)
- Blend Mode: Screen or Overlay at 30–60% opacity

### Fast Render Alternative (Noise + Gaussian Blur)
1. Solid layer → Effect → Noise (basic)
2. Noise amount: 5–15%
3. Gaussian Blur: 0.5–1.5px (softens digital noise into film grain)
4. Blend mode: **Screen** (hides black grain particles)
5. Opacity: 20–40%

### Noise HLS Auto (best speed/quality balance)
Effect → Noise & Grain → Noise HLS Auto
- Noise Type: **Grain** (not Uniform)
- Lightness noise: 5–15%
- Hue noise: 2–5%

---

## Vignette Values

**AE method:**
1. Ellipse shape layer, larger than comp
2. Mask feather: **200–400px**
3. Invert mask
4. Fill: black
5. Layer opacity: 30–60%

**Vignette strength guide:**
| Opacity | Effect |
|---|---|
| 10–20% | Invisible — just shapes the eye |
| 30–50% | Noticeable but professional |
| 60–80% | Stylistic/cinematic, intentional |

**Shape tip:** Use a slightly wider-than-tall ellipse that mirrors the 16:9 aspect ratio. A perfect circle vignette looks symmetric and cheap.

**Alternative — Lens Blur effect:** Feather a black solid with an ellipse mask. Or use Multiply blend mode at 100% on a black solid (stronger dark edges).

---

## Chromatic Aberration

**AE method (no plugins):**
1. Duplicate source layer × 3
2. Apply Effect → Channel → Shift Channels to each:
   - Layer 1 (Red channel): Red from Red, G/B from Full Off
   - Layer 2 (Green channel): Green from Green, R/B from Full Off
   - Layer 3 (Blue channel): Blue from Blue, R/G from Full Off
3. All three layers: blend mode **Add** or **Screen**
4. Offset Red layer: +2 to +5px (horizontal)
5. Offset Blue layer: −2 to −5px (opposite direction)
6. Green layer: static (center)

**Offset amounts:**
| Amount | Effect |
|---|---|
| 2–4px | Subtle lens character |
| 5–8px | Noticeable lens effect |
| 8–10px | Edge of acceptable |
| 10px+ | Intentional glitch |

**When to apply:** Only at transition points or for stylistic emphasis — not constant.

---

## Light Leaks

**AE method:**
1. New solid → Effect → Generate → Gradient Ramp
2. Ramp Shape: Radial
3. Colors: Warm orange/white → transparent
4. Blend mode: **Screen**
5. Gaussian Blur: 40–100px
6. Opacity: 40–80% (keyframe for organic feel)
7. Animate position to sweep across frame

**Light leak color palettes:**
| Style | Color range |
|---|---|
| Classic film | Warm amber `#FFB347` → orange `#FF6B1A` → transparent |
| Blue / teal | `#00B4CC` → `#0EA5E9` → transparent |
| Gold / luxury | `#FFD700` → `#FFA500` → transparent |

---

## Bokeh Simulation

**Shape-based method (more controlled):**
1. New Shape Layer → large ellipses, 50–200px diameter
2. Fill: bright color from palette (50–70% saturation)
3. Apply Camera Lens Blur → Blur Radius: **30–80**
4. Layer opacity: 30–60%
5. Slow drift: `wiggle(0.3, 8)` on Position

**Layering:** 2–4 separate bokeh layers at different scales and opacities.
- Larger shapes → more blur → foreground
- Smaller shapes → less blur → midground

**Anamorphic bokeh:** Scale Y to 50–60% for oval bokeh (anamorphic lens characteristic).

**Fast method — Fractal Noise:**
Effect → Noise & Grain → Fractal Noise
- Type: Turbulent Smooth, Complexity: 1.0, Scale: 300–500%
- Animate slowly → Screen blend mode → creates soft light bloom approximating bokeh

---

## Fog / Atmosphere Settings

### Complete Fractal Noise Fog Setup
```
Effect: Noise & Grain → Fractal Noise
Fractal Type: Dynamic Progressive
Noise Type: Soft Linear
Contrast: 50
Brightness: +15 to +25
Complexity: 6.0
Scale Width: 200–400% (uncheck Uniform Scaling)
Scale Height: 100%
Layer: 3D, rotate X +80 to +90° (lay flat on ground plane)
Mask: rectangular at bottom, feather 200–400px
Blend Mode: Screen or Add
Opacity: 30–60%
Animate: Offset Turbulence X → 0 to 500 over 10–20s (drifting fog)
```

### Fog presets
| Fog type | Contrast | Brightness | Opacity | Blend |
|---|---|---|---|---|
| Morning ground mist | 30 | +20 | 40% | Screen |
| Thick atmosphere | 60 | +10 | 60% | Add |
| Haze / air | 20 | +30 | 25% | Screen |

---

## Depth of Field Settings by Mood

### Camera Settings (3D layers with AE camera)
| Mood | Focal length | Aperture | Blur level | Feel |
|---|---|---|---|---|
| Cinematic standard | 35mm | 150–250 | 1.0 | Noticeable shallow DOF |
| Intimate / portrait | 85mm | 200–300 | 1.0 | Strong background separation |
| Product / typography | 50mm | 50–100 | 0.8 | Moderate, clean |
| Wide / environment | 20mm | 400–600 | 1.0 | Dramatic, distorted |

### Camera Lens Blur settings (2D faked DOF)
| Layer distance | Blur radius |
|---|---|
| In focus | 0px |
| One plane away | 4–8px |
| Two planes away | 10–20px |
| Far background | 20–40px |

Settings: Iris Shape = Hexagon, Blade Curvature = 50–70%, Highlights Threshold = 90, Saturation = 30–50%.

---

## The 5-Depth-Cue 2D System

Complete layer stack example:
```
[Layer 7] Foreground overlay (bokeh, particles) — Screen, 40%
[Layer 6] Main subject — 100% opacity, 0 blur, full saturation
[Layer 5] Near background — 90% opacity, 3px blur, −5% saturation
[Layer 4] Mid background — 80% opacity, 8px blur, −15% saturation
[Layer 3] Far background — 70% opacity, 15px blur, −25% saturation
[Layer 2] Atmospheric haze solid — Screen, 20%
[Layer 1] Sky gradient — base layer
```

### Five cues and ranges
| Cue | How to apply | Range |
|---|---|---|
| **Scale** | Farther = smaller | BG at 60–80% of FG scale |
| **Blur** | Farther = blurrier | BG: 4–15px, FG: 0px |
| **Opacity** | Farther = more transparent (haze) | BG: 70–85%, FG: 100% |
| **Saturation** | Farther = less saturated | BG: −10 to −30% via Hue/Sat |
| **Color temperature** | Farther = cooler/bluer | BG: +5 blue shift in color balance |

**Atmospheric perspective in color:**
- Background desaturation: 20–30%, push blue channel up, reduce contrast 10–15%
- Midground: neutral temperature, 70–80% saturation
- Foreground: warm tones, full saturation (100%), higher contrast
- Atmospheric haze tint: `#B0C4DE` (light steel blue) at 10–20% opacity
- Warm foreground highlight: `#FFD700`–`#FFA500` range
- Desaturation rate: −5% per perceived depth layer

---

## Lens Distortion (Barrel / Pincushion)

Effect → Distort → Optics Compensation
- Enable Reverse Lens Distortion: ON
- FOV 30–60: subtle barrel distortion (use during camera shake / title entries)
- FOV 80–120: fish-eye effect
