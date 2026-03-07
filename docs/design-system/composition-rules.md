# Composition Rules — AE-MCP Design Reference

## Core Rules
- All key content inside **80% title-safe zone** (conservative, safe for all platforms)
- Hero element = **3–5× larger** than secondary elements
- Max **4–5 independently moving elements** per frame (cognitive load limit: ~3)
- Negative space: **40–50%** of frame for corporate/tech; can drop to 25% for dense/busy styles
- Always place the first animating element in the **top-left** to establish the reading anchor

---

## Safe Zone Pixel Values (1920×1080)

| Zone | % of frame | Pixel area | Use |
|---|---|---|---|
| **Title Safe (legacy/conservative)** | **80%** | **1536×864px** | Keep ALL text inside this |
| Action Safe | 93% | 1785×1004px | Critical action/graphics |
| SMPTE Title Safe (2009) | 90% | 1728×972px | Current broadcast standard |
| 4:3 Center Cut Safe | — | 1440×1080px | SD-compatible channel delivery |

**Web/social recommendation:** Use 80% title safe for all text — safest for mobile full-screen viewing.

**Practical margins for 1080p:**
- Outer margin: 96px (5%) each side
- Inner margin (critical content): 192px (10%) each side
- Column grid: 12 columns, 24px gutters

---

## Rule of Thirds Power Points (1920×1080)

Grid lines:
- Vertical: x = **640** and x = **1280**
- Horizontal: y = **360** and y = **720**

| Power point | Coordinates | Best for |
|---|---|---|
| Top-left | (640, 360) | Entry point / first animated element |
| Top-right | (1280, 360) | Strong secondary focal area |
| Bottom-left | (640, 720) | Lower third anchor (F-pattern start) |
| Bottom-right | (1280, 720) | Logo, CTA, terminal area |

**Rules:**
- Primary focal element (hero text, animated subject) → at a power point, not dead center
- Entry point of an animation should arrive FROM outside frame TOWARD a power point
- Logo / watermark → bottom-right (terminal zone, natural eye rest)
- Lower thirds → bottom third, aligned to left crash point (x=640)
- Every element's destination should land on a power point

**Golden ratio vertical split:** x = **727** (1920 / 1.618) — slightly left of center, more interesting than dead center.

---

## Grid Systems for Broadcast

### Standard 12-column broadcast grid (1920×1080)
```
Column width: (1920 - 24×11 gutters) / 12 = 137px per column
Gutter: 24px
Left/right safe margin: 192px (10%)
```

### Key zones (vertical)
| Zone | Y range | Use |
|---|---|---|
| Header | 0–270px | Title, show name |
| Content | 270–810px | Primary content area |
| Lower third | 810–1080px | Lower thirds, tickers |

---

## Z-Pattern and F-Pattern

### Z-Pattern (sparse information — title cards, lower thirds)
```
START → → → → → → → → → → TOP-RIGHT
↓ ↗ (diagonal scan)
BOTTOM-LEFT → → → → → → → TERMINAL (bottom-right = CTA, logo)
```
- Eye starts: top-left (primary optical area)
- Crosses to: top-right (strong fallow)
- Diagonal to: bottom-left (weak fallow)
- Terminates: bottom-right (logo, CTA)

**Animate in Z-pattern order** — elements arrive exactly when the eye looks for them.

### F-Pattern (dense text — data viz, scorecards, tickers)
```
→ → → → → → → → →  (primary horizontal scan — top)
→ → → →             (secondary, shorter scan — below)
↓ (vertical scan down left edge)
```
- Most critical information: **top bar** and **left edge**
- These zones get maximum dwell time

### Reading path rule
- First element to animate: always **top-left** (establishes reading anchor)
- In Z-pattern: terminal bottom-right is the strongest position for final holds (logo, tagline)

---

## Negative Space Requirements

| Style | Negative space target | Notes |
|---|---|---|
| Corporate / tech (clean) | 40–50% of frame | Breathing room is authority |
| Consumer / lifestyle | 30–40% | Warmer, denser feel |
| Entertainment / high energy | 25–35% | Busy is okay here |
| Luxury / editorial | 50–70% | Space = elegance |

**Negative space around text:** 50–100 tracking units in AE for large display type.
**Dark negative space** makes bright elements pop harder than light negative space.

---

## Visual Hierarchy Rules

### Scale hierarchy
| Level | Scale vs. hero | Example at 1080p |
|---|---|---|
| Hero / primary | 1.0× base | 80px title |
| Secondary | 0.35–0.45× | 28–36px |
| Supporting | 0.20–0.28× | 16–22px |
| Fine detail | 0.12–0.18× | 10–14px |

**The gap is the hierarchy:** 72px vs. 60px = no hierarchy. 72px vs. 28px = clear hierarchy.
**Hero element should occupy no more than 25–30% of frame area** — leaves space to breathe.

### Element density
- **Maximum 4–5 distinct visual elements** per frame
- Maximum **3 independently moving elements** at once (viewer cognitive limit)
- The 4th independently moving element must be a texture/background that doesn't demand attention

### Scale + motion combined technique
- Hero element scales slightly up (1.0 → 1.05×) while secondary elements scale down (1.0 → 0.97×)
- Creates illusion that hero is pressing toward viewer

---

## Blur-as-Hierarchy Technique

Sharply focused element + blurred background = instant primary subject designation.

| Layer distance from focus | Blur radius (Camera Lens Blur) |
|---|---|
| In focus (primary) | 0px |
| One plane away | 4–8px |
| Two planes away | 10–20px |
| Far background | 20–40px |

**Camera Lens Blur settings (most realistic):**
- Iris Shape: Hexagon or Octagon (real lens apertures)
- Iris Radius: 15–40 (moderate), 50–100 (heavy focus separation)
- Blade Curvature: 50–70%
- Highlights Threshold: 90, Saturation: 30–50%

**Blur test for hierarchy validation:** Apply 15–20px Gaussian blur to entire screenshot. If the most important element remains visually dominant, hierarchy is working.

**Rule:** Only one depth plane should be in sharp focus at a time.

---

## Motion as Hierarchy Signal

In motion, **movement is the strongest hierarchy signal** — hardwired in human vision.

| Priority | Motion state |
|---|---|
| 1st (immediate attention) | Moving element |
| 2nd (after motion stops) | Static large element |
| 3rd (background/tertiary) | Static small element |

**Practical rules:**
- Never animate two elements simultaneously at equal speeds — one leads
- Slow = important/heavy, Fast = secondary/supportive
- More motion blur = lighter/secondary; less blur = stable/primary

---

## Color as Hierarchy Signal

| Signal | Primary | Secondary |
|---|---|---|
| Saturation | High saturation | Desaturated |
| Temperature | Warm (orange/red) — advances | Cool (blue/teal) — recedes |
| Contrast | High contrast element | Low contrast background |

**Red dot on gray effect:** Single high-contrast element on a low-contrast field dominates even at small size.

---

## Focal Point Placement

- Single focal point: max **25–30% of total frame area**
- Minimum distance between competing focal points: **1/3 of frame width** (≥640px on 1080p)
- Closer than 640px between two strong elements = unresolved visual tension
