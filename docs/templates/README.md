# AE MCP Templates

Production-ready motion graphics templates for After Effects. Each template includes a complete layer structure, timing breakdown, keyframe tables, and a recommended tool call sequence for programmatic construction.

All templates follow the professional standards defined in [`../best-practices.md`](../best-practices.md).

---

## Templates

### [`lower-third.md`](./lower-third.md)
**Name + Title Bar (Broadcast Lower Third)**

The most common motion graphics element. A name and role/title combination displayed in the lower portion of the frame, animating in from the left and exiting cleanly.

| Property | Value |
|---|---|
| Comp size | 1920×1080 (matches parent) |
| Duration | 5 seconds |
| Key animation | Slide in from left → hold → slide out |
| Layers | 5 (null, 2 text, 2 shapes) |
| Use case | Broadcast name tags, interviews, presenters, explainer videos |

**Animation style:** Accent bar slides in first, background card follows, text fades in with 0.1s stagger. Clean professional exit in reverse.

---

### [`title-card.md`](./title-card.md)
**Full-Screen Hero Title + Subtitle**

A cinematic full-screen card with a dominant title, optional divider accent line, and subordinate subtitle. The standard for intros, section dividers, and key message slides.

| Property | Value |
|---|---|
| Comp size | 1920×1080 |
| Duration | 6–8 seconds |
| Key animation | Title scales in (92%→100%) + fade; line draws; subtitle slides from below |
| Layers | 5–6 (solid BG, overlay, text ×2, divider line, optional adjustment) |
| Use case | Intro cards, chapter markers, key statement slides, brand intros |

**Animation style:** Gentle scale entrance for title (not a flashy scale-from-zero — 92%→100% is subtle and professional). Divider draws from center outward. Subtitle arrives last.

---

### [`data-card.md`](./data-card.md)
**Animated Stat / Data Visualization Card**

A self-contained card displaying a single metric with an animated counter, label, background card, and accent element. Designed to work standalone or in a 3-card grid layout.

| Property | Value |
|---|---|
| Card size | 360×220px (standard) |
| Comp size | 1920×1080 (parent) |
| Duration | 5 seconds |
| Key animation | Card fades in → counter counts 0→N with easing → label slides in |
| Layers | 5 (text ×2–3, shape ×2) |
| Use case | Dashboard stats, annual report numbers, social proof metrics, KPI slides |

**Key expression:** Source Text counter — `ease(time, startT, endT, 0, finalValue)` with `toFixed()` and optional comma formatting via `toLocaleString("en-US")`.

---

### [`logo-reveal.md`](./logo-reveal.md)
**Cinematic Logo Reveal with Glow and Particles**

A branded intro sequence that introduces a logo with ambient particles, a sweep of light, and an optional tagline. Professional enough for broadcast bumpers and social media openers.

| Property | Value |
|---|---|
| Comp size | 1920×1080 |
| Duration | 6 seconds |
| Key animation | Radial halo + particles fade in → logo springs in (70%→105%→100%) → light streak sweeps → tagline appears |
| Layers | 7–10 (solid, radial shape, particles ×8, logo, light streak, tagline, optional glow adjustment) |
| Use case | Brand idents, intro/outro bumpers, social media openers, product launches |

**Key expression:** Spring bounce on logo scale using damped oscillation physics. Particle position uses `seedRandom(index, true)` for stable unique positions per layer.

---

### [`social-story.md`](./social-story.md)
**Instagram / TikTok / Reels Story (1080×1920)**

A vertical 9:16 composition with zone-aware layout, gradient scrim for text readability, animated headline and CTA button, and platform-specific safe zone guidance.

| Property | Value |
|---|---|
| Comp size | 1080×1920 (9:16) |
| Duration | 3–15 seconds |
| Key animation | Ken Burns on BG → scrim fades in → text slides from bottom → CTA pops in → CTA pulse loop |
| Layers | 7–8 (background, scrim, tag, headline, body, CTA button, CTA text) |
| Use case | Instagram Stories, Instagram Reels, TikTok, YouTube Shorts |

**Zones defined:** Top UI zone (0–150px), top content zone (150–550px), hero zone (550–1100px), lower content zone (1100–1600px), CTA zone (1600–1820px), bottom UI zone (1820–1920px).

---

## Choosing the Right Template

| Goal | Template |
|---|---|
| Introduce a person on screen | [`lower-third.md`](./lower-third.md) |
| Open a video or section | [`title-card.md`](./title-card.md) |
| Show a key metric or statistic | [`data-card.md`](./data-card.md) |
| Reveal a brand logo | [`logo-reveal.md`](./logo-reveal.md) |
| Create vertical social content | [`social-story.md`](./social-story.md) |

---

## Template Construction Workflow (Agent Instructions)

1. **Identify** which template matches the user's intent (see table above)
2. **Open** the relevant template file
3. **Read** the full Specification table to confirm comp settings
4. **Follow** the "Recommended Tool Call Sequence" section in order
5. **Apply** keyframes per the timing tables — use `easeOut` for entrances, `easeIn` for exits
6. **Add expressions** from the `../expressions/` directory as specified in each template
7. **Name every layer** exactly as shown in the Layer Structure (this matters for expression references)
8. **Verify** against the Common Mistakes section before delivery

---

## Global Defaults

When in doubt, these values apply to all templates:

| Property | Default |
|---|---|
| Comp FPS | 30 |
| Background | Near-black `#0A0A0A` or dark theme color |
| Title font size | 72–100pt |
| Subtitle font size | 32–44pt |
| Entrance duration | 0.4–0.6s |
| Exit duration | 0.25–0.4s |
| Stagger between elements | 0.08–0.1s |
| Entrance easing | `easeOut` |
| Exit easing | `easeIn` |
| Text color (dark BG) | `#F0F0F0` |
| Accent color | `#2D7DF7` (blue — override with brand color) |
| Minimum text margin | 80–100px from comp edge |
