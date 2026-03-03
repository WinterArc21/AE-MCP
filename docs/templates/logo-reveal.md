# Template: Logo Reveal

A logo reveal is a short animation (typically 3–6 seconds) that introduces a brand identity with cinematic polish. It combines a background, decorative elements, the logo itself, an optional tagline, and a light/glow effect.

---

## Specification

| Property | Value |
|---|---|
| Comp size | 1920×1080 (standard) |
| Duration | 4–6 seconds |
| FPS | 30 |
| Output | Often looped for brand bumpers; also used as intro/outro |
| Key constraint | Logo must be the clear focal point — all other elements are subordinate |

---

## Layer Structure

```
[1] Adjustment - Final Glow / Bloom   (optional: Fast Box Blur or Glow effect)
[2] Text - Tagline                    (brand slogan, below logo)
[3] Logo / Graphic                    (the actual logo layer)
[4] Shape - Light Streak              (animated bright streak that passes over logo)
[5] Shape - Particles / Decorative    (floating dots, rings, or geometric shapes)
[6] Shape - Background Radial         (subtle radial gradient brightest at center)
[7] Solid - Background                (base dark color)
```

---

### Layer Details

**Layer 7 — Solid: Background**
- Color: `#0A0A0A` (near-black) or `#0D1117` (dark tech) or `#08001A` (dark purple)
- Full comp size
- Static — no keyframes

**Layer 6 — Shape: Background Radial**
- Type: Shape Layer → Ellipse (or Rectangle with feather)
- Size: `800×600px` (larger than logo, soft feathered)
- Fill: Radial gradient — white/brand-color at center (opacity ~15%), fully transparent at edges
- Blending mode: `Screen` or `Add`
- Position: Comp center `[960, 540]`
- This creates the "halo" effect beneath the logo

**Layer 5 — Shape: Particles / Decorative**
- Simple approach: 6–12 small circles (8–16px diameter)
- Fill: Brand accent color at 60–80% opacity
- Distribution: Scattered around logo area using `index`-based positions with `seedRandom`
- Animation: Each particle drifts slowly upward or outward with subtle opacity pulse
- Complex approach: Use CC Particle World or Trapcode Particular pre-comp

**Particle Position Expression (apply to each particle's Position):**
```js
// Stable random position near comp center, with slow upward drift
seedRandom(index, true);
const startX   = 960 + (random() - 0.5) * 600;  // EDIT: spread range
const startY   = 540 + (random() - 0.5) * 400;
const driftY   = -30;  // EDIT: upward pixels per second
const driftX   = (random() - 0.5) * 10;

[startX + driftX * time, startY + driftY * time]
```

**Particle Opacity Expression:**
```js
// Subtle pulsing opacity per particle
seedRandom(index, true);
const baseOpacity = 40 + random() * 40;  // 40–80%
const freq        = 0.5 + random() * 1.5;
const phase       = random() * 2 * Math.PI;

baseOpacity + Math.sin(time * freq * 2 * Math.PI + phase) * 20
```

**Layer 4 — Shape: Light Streak**
- Type: Shape Layer → Rectangle
- Size: `4px × 600px` (tall thin streak), rotated 30–45°
- Fill: White, `[1, 1, 1, 1]`
- Blending Mode: `Add` or `Screen`
- Animation: Sweeps across the logo from left to right once
- This is the "shine" pass effect

**Light Streak — Position X Keyframes:**
| Time | X | Opacity | Easing |
|---|---|---|---|
| `1.6s` | `300px` (left of logo) | `0%` | — |
| `1.8s` | `300px` | `80%` | `easeOut` |
| `2.2s` | `1620px` (right of comp) | `0%` | `easeIn` |

> Blur the streak layer: Blur (Fast Box Blur, 20–40px horizontal) for soft glow look.

**Layer 3 — Logo / Graphic**
- Import logo as PNG (transparent background) or vector EPS/AI
- Scale to approximately 30–40% of comp width (max 576–768px wide in 1080p)
- Position: Comp center `[960, 510]` (slightly above center to leave room for tagline)
- Anchor Point: Must be set to center of logo

**Layer 2 — Text: Tagline**
- Font: Light or Regular weight, 20–28pt
- Color: `#888888` (muted, not competing with logo)
- Tracking: +150–200 for wide, airy spacing
- Alignment: Center
- Position: Below logo, `compCenterY + logoHalfHeight + 30px`

**Layer 1 — Adjustment: Final Glow (optional)**
- Effect: Fast Box Blur → `Blur Radius: 8–15` → `Iterations: 2`
- Set layer to `Screen` blend mode at 30–50% opacity
- Duplicate the underlying layers (logo + background), merge into pre-comp, apply glow
- This adds a global bloom/glow to the whole composition

---

## Animation Sequence

### Timing Overview

```
t=0.0s  ─── Background solid (static, always present)
t=0.0–0.5s ─ Background radial fades in (halo appears)
t=0.2–0.8s ─ Particles drift in — fade in one by one (staggered 0.05s)
t=0.8s  ─── Logo enters: scale from 70% → 105% → 100% (spring bounce)
t=0.8–1.1s ─ Logo fades in (opacity 0% → 100%)
t=1.6s  ─── Light streak sweeps across (0.6s duration)
t=1.8s  ─── Tagline fades in + rises from below
t=1.8–5.0s ─ Hold — logo, tagline, and ambient particles visible
t=5.0–5.5s ─ Tagline fades out
t=5.0–5.5s ─ Logo fades out
t=5.5s  ─── Background radial fades out
t=5.5–6.0s ─ Particles fade out
t=6.0s  ─── Comp end
```

---

### Step-by-Step Keyframes

#### Background Radial — Opacity
| Time | Opacity | Easing |
|---|---|---|
| `0.0s` | `0%` | — |
| `0.5s` | `100%` | `easeOut` |
| `5.5s` | `100%` | — |
| `6.0s` | `0%` | `easeIn` |

#### Logo — Scale + Opacity + Spring Bounce

**Keyframe-based approach:**
| Time | Scale | Opacity | Easing |
|---|---|---|---|
| `0.8s` | `70%` | `0%` | — |
| `1.1s` | `105%` | `100%` | `easeOut` |
| `1.3s` | `100%` | `100%` | `ease` |

**Expression approach (spring physics on Scale):**
Apply to Scale property after the keyframes above:
```js
// Spring settle after the last keyframe
const amp   = 0.06;
const freq  = 4.0;
const decay = 6.0;

const n = numKeys;
if (n === 0 || time <= key(n).time) {
  value;
} else {
  const t      = time - key(n).time;
  const v      = velocityAtTime(key(n).time - thisComp.frameDuration);
  const endVal = key(n).value;
  [
    endVal[0] + v[0] * amp * Math.exp(-decay * t) * Math.cos(freq * 2 * Math.PI * t),
    endVal[1] + v[1] * amp * Math.exp(-decay * t) * Math.cos(freq * 2 * Math.PI * t)
  ];
}
```

#### Tagline — Opacity + Position Y
| Time | Y offset | Opacity | Easing |
|---|---|---|---|
| `1.8s` | `+15px` | `0%` | — |
| `2.1s` | `0px` | `100%` | `easeOut` |
| `5.0s` | `0px` | `100%` | — |
| `5.3s` | `0px` | `0%` | `easeIn` |

---

## Recommended Tool Call Sequence

```
1. create_composition
   name: "Logo Reveal"
   width: 1920, height: 1080
   duration: 6.0, fps: 30
   background_color: [0.039, 0.039, 0.039]

2. create_solid
   name: "Solid - Background"
   color: [0.039, 0.039, 0.039, 1]   ← #0A0A0A

3. create_shape_layer
   name: "Shape - Background Radial"
   shape: ellipse
   width: 900, height: 700
   fill: radial gradient (brand color center → transparent)
   blend_mode: Screen
   opacity: 60%
   position: [960, 540]
   keyframes: Opacity 0%→60%, easeOut, t=0.0s–0.5s

4. create_shape_layers (particles)
   Create 8–12 small circles, each:
   name: "Shape - Particle [N]"
   width: 10, height: 10, shape: ellipse
   fill: accent color at 60% opacity
   blend_mode: Screen
   apply position + opacity expressions (see above)
   stagger fade-in: Opacity 0%→100%, each 0.05s apart starting at t=0.2s

5. import_footage (or create_solid as placeholder)
   name: "Logo"
   layer_type: footage
   file: path/to/logo.png
   position: [960, 500]
   scale: 35% (adjust to fit)
   keyframes: Scale 70%→105%→100% + Opacity 0%→100%, easeOut + spring

6. create_shape_layer
   name: "Shape - Light Streak"
   shape: rectangle
   width: 4, height: 600
   rotation: 35
   fill: [1, 1, 1, 1]
   blend_mode: Add
   add Fast Box Blur effect: horizontal 30px
   keyframes: PositionX + Opacity (sweep animation, t=1.6s–2.2s)

7. create_text_layer
   name: "Text - Tagline"
   text: "Your Brand Slogan"
   font_size: 24
   font_weight: light
   color: [0.533, 0.533, 0.533, 1]
   tracking: 180
   alignment: center
   position: [960, 600]
   keyframes: PositionY +15px→rest + Opacity 0%→100%, easeOut, t=1.8s–2.1s

8. (Optional) create_adjustment_layer
   name: "Adjustment - Glow"
   add Glow or Fast Box Blur effect for bloom
```

---

## Variations

### Minimal Logo Reveal (No Particles, No Streak)
- Keep only: Background solid + Logo (scale+fade in) + Tagline
- Duration: 3 seconds
- Suitable for lower-third bumpers or short brand idents

### Logo Build (Paths Animate On)
- Logo imported as vector, apply Trim Paths
- End value animates 0%→100% over 1.5s
- Fill appears after path completes (Opacity on fill sub-element)

### Cinematic Logo with Background Video
- Replace "Solid - Background" with footage pre-comp
- Add Color Overlay or Darken blend solid at 60% to ensure logo readability
- Keep radial glow, remove particles for cleaner look

---

## Common Mistakes

- Logo anchor point not set to center — scale animation will be off-center
- Logo is too large (over 50% comp width) — logos should breathe
- Too many particle effects competing with the logo — particles should be subtle (max 40% opacity)
- Light streak goes too fast (under 0.3s) — allow 0.5–0.8s for the streak pass to feel natural
- Tagline same weight/size as logo — tagline must be clearly secondary
- Forgetting the exit animation — even 0.5s fade-out feels much more polished than a cut
