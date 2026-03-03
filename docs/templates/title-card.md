# Template: Title Card

A full-screen title card presents a primary message with a subtitle in a cinematic, branded style. This is the most common "hero" slide in motion graphics — used for intros, section dividers, and key statements.

---

## Specification

| Property | Value |
|---|---|
| Comp size | 1920×1080 (adjust for other formats) |
| Duration | 6–8 seconds |
| FPS | 30 |
| Color mode | 16-bit recommended |
| Primary feel | Clean, bold, professional |

---

## Layer Structure

```
[1] Adjustment - Color Grade     (optional: curves/levels on top)
[2] Text - Title                 (primary headline)
[3] Text - Subtitle              (secondary line)
[4] Shape - Divider Line         (thin horizontal accent between title and subtitle)
[5] Shape - Background Overlay   (gradient or semi-transparent texture layer)
[6] Solid - Background Color     (base background solid)
```

### Layer Details

**Layer 6 — Solid: Background Color**
- Color: `#0D1117` (deep dark blue-black) or brand dark color
- Size: 1920×1080 (full comp)
- No animation needed

**Layer 5 — Shape: Background Overlay**
- Type: Shape Layer → Rectangle, full comp size
- Fill: Radial gradient from center (slightly lighter near center, fully transparent at edges)
- Or: Leave blank / use a subtle noise texture (optional)
- Opacity: 20–40% if used

**Layer 4 — Shape: Divider Line**
- Type: Shape Layer → Rectangle
- Width: 80px (short accent mark), or 400px (longer rule)
- Height: 3px
- Fill: Brand accent color (`[0.176, 0.490, 0.969, 1]`)
- Position: Centered horizontally, positioned between title and subtitle
- Anchor Point: Center

**Layer 3 — Text: Subtitle**
- Font: Regular or Medium weight, 36–44pt
- Color: `#888888` or `#B0B0B0` (muted, subordinate to title)
- Tracking: +50–100 if uppercase
- Alignment: Center
- Position: Below divider line, Y ≈ compCenterY + 60px

**Layer 2 — Text: Title**
- Font: Bold or Black weight, 80–100pt
- Color: `#F0F0F0` (off-white)
- Alignment: Center
- Position: Above divider line, Y ≈ compCenterY - 40px
- Max width: 1400px (break to two lines if longer)

**Layer 1 — Adjustment: Color Grade (optional)**
- Add Lumetri Color or Curves for final color polish
- Subtle S-curve, slight desaturation of midtones for cinematic feel

---

## Color Theme Setup

Define colors before building layers. Recommended theme presets:

### Dark Technology Theme
```
Background:  #0D1117   → [0.051, 0.067, 0.090, 1]
Title text:  #F0F0F0   → [0.941, 0.941, 0.941, 1]
Subtitle:    #8B949E   → [0.545, 0.580, 0.620, 1]
Accent line: #2D7DF7   → [0.176, 0.490, 0.969, 1]
```

### Corporate Premium Theme
```
Background:  #1A1A2E   → [0.102, 0.102, 0.180, 1]
Title text:  #FFFFFF   → [1.000, 1.000, 1.000, 1]
Subtitle:    #A0A0C0   → [0.627, 0.627, 0.753, 1]
Accent line: #FFC629   → [1.000, 0.773, 0.161, 1]
```

### Clean Minimal Theme
```
Background:  #F8F8F8   → [0.973, 0.973, 0.973, 1]
Title text:  #111111   → [0.067, 0.067, 0.067, 1]
Subtitle:    #666666   → [0.400, 0.400, 0.400, 1]
Accent line: #2ECC71   → [0.180, 0.800, 0.443, 1]
```

---

## Animation Sequence

### Timing Overview

```
t=0.0s  ─── Background solid (already present — no animation needed)
t=0.0–0.4s ── Background overlay fades in (if used), opacity 0%→40%
t=0.5s  ─── Title scales in + fades in
t=0.9s  ─── Divider line draws in (scale X: 0%→100%)
t=1.1s  ─── Subtitle slides in from below + fades in
t=1.5s–5.5s ── Hold (all elements visible)
t=5.5s  ─── Subtitle fades out (0.3s)
t=5.7s  ─── Divider fades out (0.2s)
t=5.7s  ─── Title fades out (0.4s)
t=6.0s  ─── Background overlay fades out (0.3s)
t=6.3s  ─── Composition end (or cut to next scene)
```

---

### Step-by-Step Keyframes

#### Background Overlay — Opacity
| Time | Opacity | Easing |
|---|---|---|
| `0.0s` | `0%` | — |
| `0.4s` | `40%` | `easeOut` |
| `5.5s` | `40%` | — |
| `6.0s` | `0%` | `easeIn` |

#### Title — Scale + Opacity
| Time | Scale | Opacity | Easing |
|---|---|---|---|
| `0.5s` | `92%` | `0%` | — |
| `0.9s` | `100%` | `100%` | `easeOut` |
| `5.7s` | `100%` | `100%` | — |
| `6.1s` | `100%` | `0%` | `easeIn` |

> **Scale from 92% → 100%** gives a gentle "expand into place" feel. Do NOT use 0% → 100% scale — it looks cheap.

#### Divider Line — Scale X + Opacity
| Time | Scale X | Opacity | Easing |
|---|---|---|---|
| `0.9s` | `0%` | `0%` | — |
| `1.1s` | `100%` | `100%` | `easeOut` |
| `5.7s` | `100%` | `100%` | — |
| `5.9s` | `100%` | `0%` | `easeIn` |

> Set anchor point of divider line to LEFT edge so it draws from left to right. Or set to CENTER for a symmetric draw-on from center outward.

#### Subtitle — Position Y + Opacity
| Time | Y offset | Opacity | Easing |
|---|---|---|---|
| `1.1s` | `+25px` (below rest) | `0%` | — |
| `1.45s` | `0px` (at rest) | `100%` | `easeOut` |
| `5.5s` | `0px` | `100%` | — |
| `5.8s` | `0px` | `0%` | `easeIn` |

---

## Recommended Tool Call Sequence

```
1. create_composition
   name: "Title Card"
   width: 1920, height: 1080
   duration: 6.5, fps: 30
   background_color: [0.051, 0.067, 0.090]   ← matches BG solid

2. create_solid
   name: "Solid - Background"
   color: [0.051, 0.067, 0.090, 1]   ← #0D1117
   size: 1920x1080
   (no keyframes — static)

3. create_shape_layer (optional overlay)
   name: "Shape - BG Overlay"
   shape: rectangle, full comp size
   fill: radial gradient or flat semi-transparent
   opacity keyframes: 0%→40% over 0.4s

4. create_text_layer
   name: "Text - Title"
   text: "Your Title Here"
   font_size: 88
   font_weight: bold
   color: [0.941, 0.941, 0.941, 1]
   alignment: center
   position: [960, 500]   ← slightly above center
   keyframes: Scale 92%→100% + Opacity 0%→100%, easeOut, t=0.5s–0.9s

5. create_shape_layer
   name: "Shape - Divider Line"
   shape: rectangle
   width: 120, height: 3
   fill: [0.176, 0.490, 0.969, 1]   ← accent blue
   position: [960, 565]   ← below title
   anchor_point: left edge (or center for symmetric draw)
   keyframes: ScaleX 0%→100% + Opacity 0%→100%, easeOut, t=0.9s–1.1s

6. create_text_layer
   name: "Text - Subtitle"
   text: "Your subtitle or descriptor"
   font_size: 36
   font_weight: regular
   color: [0.545, 0.580, 0.620, 1]
   alignment: center
   position: [960, 610]
   keyframes: PositionY shift 25px down → rest + Opacity 0%→100%, easeOut, t=1.1s–1.45s

7. Add exit keyframes to all layers (see timing table)

8. (Optional) create_adjustment_layer
   name: "Adjustment - Color Grade"
   add Curves effect: gentle S-curve for contrast polish
```

---

## Variations

### Split-Screen Title Card
- Left half: background color or image
- Right half: title text + subtitle on dark overlay
- Divider: vertical line at X=960

### Animated Background Variant
- Replace "Solid - Background" with a pre-comp containing:
  - Slow particle drift or geometric shape animation
  - Blurred overlay to keep text readable

### Minimal One-Liner
- Remove subtitle and divider line
- Title centered vertically: Y = 540
- Shorter duration: 4–5s

### Chapter Marker / Section Title
- Add a small label above the title (e.g., "CHAPTER 01")
- Small caps, 18pt, accent color, +100 tracking
- Enters 0.2s before the title
