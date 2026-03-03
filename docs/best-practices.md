# Motion Design Best Practices for AI Agents

This document is a professional standards guide for generating motion graphics with After Effects. It encodes taste, craft knowledge, and common pitfalls. **Follow these rules unless the user explicitly requests otherwise.**

---

## 1. Timing & Pacing

### Standard Animation Durations

| Duration | Character | Best For |
|---|---|---|
| `0.2s` | Instant / micro | Cursor feedback, icon toggles |
| `0.3s` | Snappy | UI transitions, icon entrances |
| `0.5s` | Standard | Most element animations |
| `0.6–0.8s` | Smooth | Complex motion, multi-part moves |
| `1.0s` | Cinematic | Hero elements, emotional moments |
| `1.5s` | Dramatic / deliberate | Logo reveals, key reveals |
| `2.0s+` | Slow burn | Background elements, atmosphere |

**Default rule:** When in doubt, use `0.5s` for entrances and `0.3s` for exits.

---

### Scene Duration Guidelines

| Scene Type | Duration |
|---|---|
| Transition / bumper | 1–2s |
| Information-dense slide (stats, lists) | 3–5s |
| Standard content slide | 5–7s |
| Hero / title slide | 5–8s |
| Emotional / cinematic moment | 8–12s |
| Background loop | Seamless, typically 3–6s |

> If you're unsure how long a scene should be, **5 seconds** is the safe default for a single-message slide.

---

### Stagger Delays

Staggering element entrances is the single biggest difference between amateur and professional motion graphics. **Never animate all elements simultaneously.**

| Stagger Speed | Delay Between Elements | Feel |
|---|---|---|
| Fast | `0.05s` | Quick, energetic, snappy |
| Standard | `0.08–0.1s` | Professional, clean |
| Deliberate | `0.15–0.2s` | Relaxed, premium |
| Slow | `0.3s+` | Cinematic, high-end |

**Rule:** If you have N elements entering, stagger them `0.08s` apart, starting the last element no later than `0.5s` after the first.

---

### Easing Rules

**Linear motion looks robotic and amateur. Always ease.**

| Situation | Easing Type | AE Equivalent |
|---|---|---|
| Default (any motion) | Ease in + out | `ease()` or Easy Ease |
| Entrance (arriving) | Ease out | `easeOut()` — fast in, slow settle |
| Exit (leaving) | Ease in | `easeIn()` — slow start, fast out |
| Bounce/spring | Custom overshoot | Spring physics expression |
| Data/utility motion | Ease in + out | `ease()` |

> In keyframe editor terms: **Ease Out** = decelerate = F9 Easy Ease In. **Ease In** = accelerate = F9 Easy Ease Out. This naming is counterintuitive — the expression names (`easeOut()`, `easeIn()`) refer to the output value curve direction, not the keyframe button names.

---

### The 12 Animation Principles (Relevant Subset)

**1. Anticipation:** Before a big move, hint at it. An icon about to shoot up slightly dips first. Scale down ~5% before a scale-up entrance.

**2. Overshoot / Squash and Stretch:** Elements that arrive with energy should overshoot slightly (go past target) then settle back. Use the spring bounce expression. Scale: 100% → 108% → 100%.

**3. Follow-through:** Secondary elements (shadow, highlight, badge) lag behind the main element. Implement with `valueAtTime(time - 0.05)`.

**4. Staging:** Only one thing should demand attention at a time. If your title is entering, don't animate the background simultaneously. Use stagger to create a clear reading order.

**5. Slow in / Slow out:** Already covered by easing. Every property must ease.

**6. Appeal:** Clean > complex. One well-crafted animation is worth ten mediocre ones. If adding an effect doesn't make the composition significantly better, don't add it.

---

## 2. Visual Hierarchy

### Element Count Per Scene

**Maximum 3–4 primary elements per scene.** More than this creates visual noise. If you have more content, break it into multiple scenes.

| Layer Type | Max Simultaneous |
|---|---|
| Hero text (title) | 1 |
| Supporting text (subtitle/label) | 1–2 |
| Supporting visuals (icons, shapes) | 2–3 |
| Background elements | 1–2 (subtle) |
| Animated particles / noise | 1 system |

---

### Text Size Hierarchy

| Role | Size Range | Weight | Notes |
|---|---|---|---|
| Main title | 72–120pt | Bold (700–900) | Dominant element |
| Section title | 56–80pt | Bold or Semi-bold | |
| Subtitle | 36–52pt | Regular or Medium | Max 1 per scene |
| Body / descriptor | 24–36pt | Regular (400) | Short lines only |
| Caption / label | 16–24pt | Regular or Light | |
| UI micro-label | 12–18pt | Regular | |

**Ratio rule:** Title should be **2–3x** the size of body text. If your title is 80pt, body should be 28–40pt.

---

### Breathing Room (Margins & Padding)

- **Minimum margin from comp edge:** 80–100px (10% of 960 = standard inner border)
- **Text needs padding:** Background shapes behind text should add at least 20px horizontal, 12px vertical padding
- **Vertical spacing between text elements:** At minimum 1.2× the line height of the smaller element
- **Safe zone for broadcast/social:** Keep all important content within the inner 80% of the comp

---

### Visual Weight Order

When designing what the eye sees first → last:

1. **Largest** element wins attention first
2. **Brightest** element (highest luminance contrast)
3. **Most saturated** color
4. **Moving** element (any animation draws the eye)
5. **Everything else** (static, mid-tone, desaturated)

Design your hierarchy deliberately: title should score highest on at least 2–3 of these dimensions.

---

## 3. Color

### Background Color Rules

| Rule | Why |
|---|---|
| Never use pure black `#000000` | Looks flat, lacks depth, exposes any compression artifacts |
| Use near-black: `#0A0A0A` or `#111111` | Softer, more refined look |
| For dark blue themes: `#0D1117` or `#1A1A2E` | Richer and more dimensional |
| Never use pure white `#FFFFFF` as background | Too harsh, reduces perceived quality |
| For light themes: `#F8F8F8` or `#FAFAFA` | Softer, professional |

---

### Text Color Rules

| Background | Text Color | Hex |
|---|---|---|
| Dark background | Off-white | `#F0F0F0` or `#E8E8E8` |
| Dark background (secondary) | Light gray | `#B0B0B0` |
| Light background | Near-black | `#111111` or `#1A1A1A` |
| Light background (secondary) | Dark gray | `#555555` |
| Any background | Accent color (for CTAs/highlights) | Brand color |

> **Contrast requirement:** Minimum 4.5:1 contrast ratio for body text. 3:1 for large text (18pt+ bold). Always check before finalizing.

---

### Color Palette Rules

**60–30–10 Rule:**
- **60%** — Dominant color (usually background)
- **30%** — Secondary color (major shapes, containers)
- **10%** — Accent color (CTAs, highlights, key data points)

**Palette limits:**
- Maximum **3–5 colors** in a composition
- 1 primary (background), 1 secondary (container/text), 1 accent (highlight), 1 text light, 1 text muted
- **Never more than 2 saturated colors** competing in the same scene

---

### Color Temperature & Mood

| Temperature | Colors | Mood |
|---|---|---|
| Cool | Blues, cyans, purples | Technology, data, trust, calm |
| Warm | Reds, oranges, yellows | Energy, urgency, passion, creativity |
| Neutral | Grays, greens | Professional, balanced, stable |
| High contrast | Black + bright accent | Premium, luxury, bold tech |

---

## 4. Typography

### Font Selection Rules

- **Maximum 2 typefaces** per project
- Combine a geometric sans-serif (title) + same or different weight of same family (body)
- **Do not mix** decorative fonts with other decorative fonts
- Avoid ultra-thin weights on dark backgrounds — they disappear
- For screen legibility: prefer weights 400 (regular), 500 (medium), 700 (bold)

### Recommended Safe Typefaces

| Typeface | Style | Best For |
|---|---|---|
| Montserrat | Geometric sans | Titles, bold statements |
| Inter | Humanist sans | UI, tech, data |
| Poppins | Geometric sans | Social media, modern branding |
| Roboto | Humanist sans | Data-heavy, neutral |
| Playfair Display | Serif | Luxury, editorial |
| Source Code Pro | Monospace | Code, data, techy labels |

---

### Typographic Spacing

| Property | Value | Notes |
|---|---|---|
| Line height | `1.2–1.5×` font size | `1.2` for tight titles, `1.5` for body |
| Letter spacing (normal) | `0` (default) | For sentence-case body text |
| Letter spacing (uppercase) | `50–150` units | Uppercase labels need tracking |
| Paragraph spacing | `0.5–1×` line height | Space between blocks |

**All-caps rule:** Use all-caps only for short labels (1–3 words), never for sentences. Always add tracking (+75–100) when using all-caps.

---

## 5. Animation Patterns

### Standard Entrance (Default)

The safest, most professional default entrance animation. Works in 95% of cases.

1. **Start:** Opacity 0%, position shifted DOWN by 20–40px (or opacity only for static elements)
2. **Animate:** `easeOut` over `0.5s`
3. **End:** Opacity 100%, position at rest

```
Opacity:   0% → 100%, easeOut, 0.5s
Position:  [x, y+30] → [x, y], easeOut, 0.5s
```

---

### Standard Exit

The reverse of the entrance.

```
Opacity:   100% → 0%, easeIn, 0.3s
Position:  [x, y] → [x, y-20], easeIn, 0.3s
```

> Exit is always faster than entrance. Leaving quickly respects attention span.

---

### Scale Entrance (Emphasis / Pop)

Good for icons, badges, highlights.

```
Scale:    0% → 105% → 100%, easeOut + overshoot, 0.4s total
Opacity:  0% → 100%, easeOut, 0.2s
```

---

### Scale Pulse (Emphasis Loop)

For drawing attention to an element that's already on screen.

```
Scale:  100% → 108% → 100%, ease in/out, 0.4s
        (repeat 2–3 times with 0.3s gap between)
```

---

### Scene Transition Guidelines

| Transition | Duration | Use Case |
|---|---|---|
| Cut (no transition) | 0s | Fast-paced, energetic |
| Cross dissolve | 0.3–0.5s | Standard, universal |
| Fade to black / Fade from black | 0.4s | Segment separator, emotional beat |
| Slide in new content | 0.5s | Narrative progression |
| Overlap (elements stay, new enters) | 0.3s overlap | Contextual continuity |

---

### What NOT to Animate

- Don't animate properties that aren't improving the communication
- Don't use spinning text unless it's a logo reveal
- Don't rotate without a reason (rotation implies circular motion — use it intentionally)
- Don't scale a text layer for an entrance (scale affects stroke weights and looks incorrect) — use `Opacity + Position` instead
- Don't use blur entrance unless the design calls for a depth-of-field feel

---

## 6. Composition Setup

### Standard Output Formats

| Format | Dimensions | FPS | Use Case |
|---|---|---|---|
| Social/Web | 1920×1080 | 30 | YouTube, LinkedIn, Twitter/X |
| Instagram Story / TikTok | 1080×1920 | 30 | Vertical social content |
| Instagram Square | 1080×1080 | 30 | Feed posts |
| 4K | 3840×2160 | 30 | Premium, scalable deliverables |
| Broadcast HD | 1920×1080 | 29.97 or 25 | TV distribution |
| Broadcast 4K | 3840×2160 | 29.97 | Broadcast TV |
| Social 4K Story | 2160×3840 | 30 | Ultra-HD vertical |

> Default when not specified: **1920×1080 @ 30fps**

---

### Layer Order (Bottom to Top)

This is the canonical layer stack for any composition:

```
[TOP]
  Adjustment Layers (color grade, blur, vignette)
  Foreground Text / CTAs
  Primary Text (title, data)
  Supporting Graphics (icons, shapes, lines)
  Secondary Text (subtitles, labels)
  Background Elements (decorative shapes, particles)
  Background Overlay (gradient, semi-transparent solid)
  Background Visual (image, video, gradient solid)
  Background Solid (base color)
[BOTTOM]
```

---

### Layer Naming Convention

**Mandatory naming rules:**
- Every layer must have a descriptive name — no `"Shape Layer 1"` or `"Text 3"`
- Use this format: `[Type] - [Content]` (e.g. `"Text - Title"`, `"Shape - Background Card"`, `"Null - Controller"`)
- Pre-comps: name them by their function (`"PC - Lower Third Animation"`)
- Control layers: prefix with `"CTRL -"` or use all-caps `"[CONTROLS]"`

---

### Null Objects and Pre-Comps

**Use null objects to:**
- Control a group of layers (parent all to null, animate the null)
- Create an abstraction point for expressions to reference
- Move groups of layers without flattening them

**Use pre-comps when:**
- A set of layers will be reused (lower third, icon animation, transition)
- A sequence is complex enough that it needs its own timeline
- You need to apply effects to a group of layers together

**Pre-comp size rule:** Match pre-comp dimensions to the parent comp unless there's a reason (e.g., a lower-third pre-comp can be smaller).

---

## 7. Common Mistakes to Avoid

### Layout Mistakes

| Mistake | Correct Approach |
|---|---|
| Text too close to edges | Minimum 80–100px margin |
| Overlapping text layers | Ensure z-order and vertical spacing |
| Text running too wide | Max 80% of comp width for readability |
| Title and subtitle same size | Title must be clearly dominant |

### Animation Mistakes

| Mistake | Correct Approach |
|---|---|
| Linear easing on everything | Use `ease()` or Easy Ease on all keyframes |
| All elements animate simultaneously | Stagger by 0.08–0.1s |
| Entrance = Exit (same animation) | Exit should be shorter and reverse direction |
| Too many things moving at once | Max 2–3 animated elements at once |
| Forgetting to animate out | Elements should exit before scene ends |
| Rotation that serves no purpose | Only rotate when it communicates spin/turning |

### Technical Mistakes

| Mistake | Correct Approach |
|---|---|
| Forgetting comp background color | Set via Composition > Background Color |
| Expressions on wrong property | Double-check which property gets each expression |
| Not pre-comping complex scenes | Pre-comp anything with 10+ layers |
| Effects applied to text directly | Apply heavy effects to a pre-comp |
| Anchor point not at visual center | Set anchor point before animating |
| Text layers left as default name | Rename every layer descriptively |
| Working in 8-bit color | Set to 16-bit or 32-bit for gradients/VFX |

### Color Mistakes

| Mistake | Correct Approach |
|---|---|
| Pure black `#000000` background | Use `#0A0A0A` or `#111111` |
| Pure white `#FFFFFF` text | Use `#F0F0F0` or `#E8E8E8` |
| Too many saturated colors | Max 1–2 saturated accent colors |
| Low-contrast text | Verify 4.5:1+ contrast ratio |
| Inconsistent accent colors | Define once via Color Control effect |

---

## 8. Motion Design Quality Checklist

Before finalizing any composition, verify:

- [ ] Every layer has a descriptive name
- [ ] Background is not pure black or pure white
- [ ] Text contrast ratio ≥ 4.5:1
- [ ] No more than 4 primary elements per scene
- [ ] All motion is eased (no linear keyframes on primary elements)
- [ ] Stagger delay applied between sequential elements
- [ ] Entrances use `easeOut`, exits use `easeIn`
- [ ] Text is within safe zone margins (80–100px from edges)
- [ ] Font size hierarchy is clear (title 2–3× body)
- [ ] All elements animate out before comp end (no sudden cuts)
- [ ] Layer order follows: BG → content → text → adjustments
- [ ] Duration appropriate for content density (3–5s info, 5–8s hero)
