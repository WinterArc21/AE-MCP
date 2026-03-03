# Template: Social Story (Instagram / TikTok / Reels)

Vertical video content for short-form social platforms. This format has unique layout rules — the composition is taller than it is wide, and different zones of the frame have different purposes.

---

## Specification

| Property | Value |
|---|---|
| Comp size | 1080×1920 (9:16 aspect ratio) |
| FPS | 30 |
| Duration | 3–15 seconds (Instagram Stories: 15s max, TikTok: up to 3 min) |
| Safe zones | See zone map below |
| Target platforms | Instagram Stories, Instagram Reels, TikTok, YouTube Shorts |

---

## Vertical Composition: Zone Map

The 1080×1920 canvas is divided into functional zones. Design content to fit these zones — especially for Stories where UI elements overlap the frame:

```
┌─────────────────────┐  Y=0
│                     │
│  TOP UI ZONE        │  Y=0–150    ← Platform UI overlays here (time, battery)
│  (avoid content)    │
├─────────────────────┤  Y=150
│                     │
│  TOP CONTENT ZONE   │  Y=150–550  ← Secondary info, labels, captions
│                     │
├─────────────────────┤  Y=550
│                     │
│  CENTER/HERO ZONE   │  Y=550–1100 ← Primary visual focus (logo, image, video)
│  (primary content)  │
├─────────────────────┤  Y=1100
│                     │
│  LOWER CONTENT ZONE │  Y=1100–1600 ← Title text, supporting copy
│                     │
├─────────────────────┤  Y=1600
│  BOTTOM CTA ZONE    │  Y=1600–1820 ← Call-to-action, swipe-up, link
│                     │
├─────────────────────┤  Y=1820
│  BOTTOM UI ZONE     │  Y=1820–1920 ← Platform navigation UI
│  (avoid content)    │
└─────────────────────┘  Y=1920
```

**Horizontal safe zone:** Minimum `80px` from left and right edges. Center-aligned text works best.

---

## Layer Structure

```
[1] Text - CTA / Swipe Label       (bottom zone call-to-action)
[2] Shape - CTA Button / Arrow     (visual affordance for CTA)
[3] Text - Body Copy               (supporting text, lower content zone)
[4] Text - Headline                (primary text, lower content zone)
[5] Text - Tag / Label             (optional: brand tag or category, top zone)
[6] Image/Video - Hero Visual      (center/hero zone)
[7] Shape - Gradient Overlay       (scrim to ensure text readability)
[8] Solid - Background             (base background color or gradient)
```

---

### Layer Details

**Layer 8 — Solid: Background**
- Color: Brand primary color, near-black, or any vivid single color
- For gradient: Use a Shape Layer rectangle with gradient fill instead
- Size: 1080×1920

**Layer 7 — Shape: Gradient Overlay (Scrim)**
- Type: Shape Layer → Rectangle, full comp size (1080×1920)
- Fill: Linear gradient (top-to-bottom or bottom-to-top)
  - Top portion: fully transparent (`alpha = 0`)
  - Bottom 60% of comp: gradient from transparent → black/dark at 70–80% opacity
- This makes text at the bottom readable regardless of background image
- Blending Mode: Normal (don't change blend mode for scrims)

**Layer 6 — Image/Video: Hero Visual**
- Import: Background image or pre-comp video
- Scale: Fill entire comp (1080×1920) or fit to hero zone
- If using a 16:9 background image: Scale up and crop to fill 9:16
- Position: Comp center `[540, 960]`

**Layer 5 — Text: Tag / Label (optional)**
- Font: Regular, 18–22pt, all-caps
- Color: `#FFFFFF` at 70% opacity, or brand accent
- Tracking: +150
- Position: Top content zone, centered or left-aligned — Y ≈ `250`
- Example: `"@YOURBRAND"` or `"TUTORIAL"` or `"DAY 01"`

**Layer 4 — Text: Headline**
- Font: Bold or Black weight, 56–72pt
- Color: `#FFFFFF`
- Alignment: Center
- Max width: `880px` (80% of comp width)
- Position: Lower content zone — Y ≈ `1200–1300`
- Line height: 1.2× font size

**Layer 3 — Text: Body Copy**
- Font: Regular, 28–36pt
- Color: `#E0E0E0` or `#CCCCCC`
- Alignment: Center
- Max 2–3 lines
- Position: Below headline, Y ≈ `1350–1450`

**Layer 2 — Shape: CTA Button / Arrow**
- Type: Shape Layer → Rounded Rectangle (pill shape)
- Size: `320×64px`
- Fill: Brand accent color or white
- Corner Radius: `32px` (fully rounded)
- Position: Bottom CTA zone — Y ≈ `1700`
- Contains the CTA text (parent text layer to this shape or place above it)

**Layer 1 — Text: CTA / Swipe Label**
- Font: Bold, 24–28pt
- Color: Dark (if button is white) or White (if button is dark)
- Alignment: Center
- Text: `"Swipe Up"`, `"Learn More"`, `"Follow"`, `"Shop Now"`, etc.
- Position: Centered on CTA button

---

## Gradient Overlay Expression (Scrim)

For a bottom-focused scrim that adapts to comp height:

```js
// Apply as fill on the scrim shape layer
// This is a guide — use AE's gradient fill tool with these parameters:
// Start point: [540, 700]    (Y = ~35% of comp height)
// End point:   [540, 1920]   (Y = comp bottom)
// Start color: [0, 0, 0, 0]  (transparent)
// End color:   [0, 0, 0, 0.8] (black, 80% opacity)
```

Or use this expression for a soft vignette:

```js
// Distance-based dark gradient — apply to a shape layer opacity
// Not a standard AE approach; use gradient fill UI instead
```

---

## Animation Sequence

### Standard Story Animation (3-Part Reveal)

```
t=0.0s  ─── Background visible (static or slow zoom-in)
t=0.0–0.3s ─ Gradient scrim fades in
t=0.3s  ─── Tag/label slides in from top (optional)
t=0.5s  ─── Headline slides in from bottom + fades in
t=0.7s  ─── Body copy slides in from bottom (staggered +0.15s after headline)
t=1.0s  ─── CTA button pops in (scale 80%→105%→100%)
t=1.0–12s ─ Hold — all elements static
t=12.5s ─── CTA pulse animation begins (attention-getter)
t=14.5s ─── Fade out all elements
t=15.0s ─── Comp end
```

---

### Step-by-Step Keyframes

#### Hero Visual (Background Image/Video)
| Time | Scale | Easing |
|---|---|---|
| `0.0s` | `105%` | — |
| `5.0s` | `100%` | `linear` (Ken Burns slow zoom) |

> Slow zoom (Ken Burns effect) adds life to static images. Keep it subtle — 5–10% over 5s.

#### Gradient Scrim — Opacity
| Time | Opacity | Easing |
|---|---|---|
| `0.0s` | `0%` | — |
| `0.3s` | `100%` | `easeOut` |

#### Headline — Position Y + Opacity
| Time | Y offset | Opacity | Easing |
|---|---|---|---|
| `0.5s` | `+40px` | `0%` | — |
| `0.8s` | `0px` | `100%` | `easeOut` |

#### Body Copy — Position Y + Opacity (staggered)
| Time | Y offset | Opacity | Easing |
|---|---|---|---|
| `0.65s` | `+30px` | `0%` | — |
| `0.95s` | `0px` | `100%` | `easeOut` |

#### CTA Button — Scale + Opacity
| Time | Scale | Opacity | Easing |
|---|---|---|---|
| `1.0s` | `80%` | `0%` | — |
| `1.2s` | `105%` | `100%` | `easeOut` |
| `1.35s` | `100%` | `100%` | `ease` |

---

## Swipe-Up CTA Bounce Animation (Attention Loop)

Apply to CTA button and text after they've settled (starting at ~t=1.5s), looping forever:

```js
// Gentle pulsing scale for the CTA button — apply to Scale
const pulseStart = 1.5;   // EDIT: when pulsing begins
const pulseFreq  = 0.8;   // EDIT: pulses per second (0.8 = slightly slow, attention-grabbing)
const pulseAmp   = 4;     // EDIT: % scale overshoot (keep subtle: 3–6%)

if (time < pulseStart) {
  value;
} else {
  const t     = time - pulseStart;
  const pulse = 1 + (pulseAmp / 100) * Math.abs(Math.sin(t * pulseFreq * Math.PI));
  [value[0] * pulse, value[1] * pulse];
}
```

---

## Swipe-Up Arrow Animation

A bouncing upward arrow that draws attention to the CTA:

```js
// Vertical bounce on an upward arrow shape — apply to Position Y
const bounceFreq = 1.5;   // EDIT: bounces per second
const bounceAmp  = 12;    // EDIT: pixels of vertical travel

value[1] + Math.abs(Math.sin(time * bounceFreq * Math.PI)) * -bounceAmp
// Apply as: [value[0], expression_result]
```

---

## Recommended Tool Call Sequence

```
1. create_composition
   name: "Social Story"
   width: 1080, height: 1920
   duration: 15.0, fps: 30
   background_color: [0.039, 0.039, 0.039]

2. create_solid OR import_footage
   name: "Background"
   size: 1080x1920
   If footage: scale/position to fill 9:16 frame
   keyframes: Scale 105%→100%, linear, t=0.0s–5.0s (Ken Burns)

3. create_shape_layer
   name: "Shape - Gradient Scrim"
   shape: rectangle, size: 1080x1920
   fill: linear gradient (transparent top → black 80% bottom)
   keyframes: Opacity 0%→100%, easeOut, t=0.0s–0.3s

4. create_text_layer (optional)
   name: "Text - Brand Tag"
   text: "@YOURBRAND"
   font_size: 20, tracking: 150, all-caps
   color: [1,1,1,0.7]
   position: [540, 250]
   keyframes: PositionY -20px→rest + Opacity 0%→100%, easeOut, t=0.3s–0.5s

5. create_text_layer
   name: "Text - Headline"
   text: "Your Headline Here"
   font_size: 64, font_weight: bold
   color: [1, 1, 1, 1]
   alignment: center
   position: [540, 1260]
   max_width: 880
   keyframes: PositionY +40px→rest + Opacity 0%→100%, easeOut, t=0.5s–0.8s

6. create_text_layer
   name: "Text - Body Copy"
   text: "Supporting detail line here"
   font_size: 32, font_weight: regular
   color: [0.878, 0.878, 0.878, 1]
   alignment: center
   position: [540, 1380]
   keyframes: PositionY +30px→rest + Opacity 0%→100%, easeOut, t=0.65s–0.95s

7. create_shape_layer
   name: "Shape - CTA Button"
   shape: rectangle, width: 320, height: 64
   corner_radius: 32
   fill: [0.176, 0.490, 0.969, 1]   ← brand blue, or white [1,1,1,1]
   position: [540, 1720]
   keyframes: Scale 80%→105%→100% + Opacity 0%→100%, easeOut, t=1.0s–1.35s
   apply pulse expression after t=1.5s

8. create_text_layer
   name: "Text - CTA Label"
   text: "Learn More"
   font_size: 26, font_weight: bold
   color: [1, 1, 1, 1]   ← or [0.1, 0.1, 0.1, 1] if button is white
   alignment: center
   position: [540, 1720]   ← same as button center
```

---

## Platform-Specific Notes

### Instagram Stories
- Safe zone: Avoid content in top 150px and bottom 250px (UI overlays)
- Max duration: 15 seconds per story segment
- Text should be readable in 3 seconds without sound

### Instagram Reels / TikTok
- Safe zone: Avoid content in top 120px, bottom 300px (thicker nav + captions)
- Caption area (Y: 1400–1700) may be covered by platform captions — place key text higher
- Motion and quick cuts preferred — first 2 seconds must capture attention

### YouTube Shorts
- Same 1080×1920, 9:16 format
- Less aggressive UI overlay — more screen real estate usable
- Can include subscribe button area: avoid bottom 200px

---

## Common Mistakes

- Content in platform UI zones (top/bottom) gets covered by platform chrome
- Headline too small for mobile screens — minimum 48pt for mobile readability
- Gradient scrim not dark enough — text becomes unreadable on complex backgrounds
- CTA text too small (under 20pt) — use minimum 24pt on mobile
- Ken Burns zoom too fast — slow zoom should take 5+ seconds to feel like motion not jitter
- Portrait video footage used without reframing — faces/subjects cut off in 9:16
