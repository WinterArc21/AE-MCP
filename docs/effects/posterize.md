# Posterize

**Match Name:** `"ADBE Posterize"`
**Category:** Stylize

Reduces the number of tonal levels in each color channel to the specified count, creating a flat, limited-palette graphic style. Fewer levels produces a more stark, poster-like look. Widely used for retro aesthetics, comic book effects, and stylized animation.

## Properties

| Property | Type | Range | Default | Description |
|----------|------|-------|---------|-------------|
| Level | number (integer) | 2–256 | 6 | The number of tonal levels per channel. 2 = only two tones (very stark); 256 = no change (full tonal range). |

## Common Use Cases

### Retro Poster / Silk Screen Look
Strong posterization for a limited-palette graphic poster aesthetic.
```json
{
  "effectMatchName": "ADBE Posterize",
  "properties": {
    "Level": 4
  }
}
```

### Comic Book / Cell Shading
Moderate posterization for a hand-drawn illustrated look.
```json
{
  "effectMatchName": "ADBE Posterize",
  "properties": {
    "Level": 6
  }
}
```

### Extreme / Abstract Pop Art
Very few levels for a bold, high-contrast Warhol-style effect.
```json
{
  "effectMatchName": "ADBE Posterize",
  "properties": {
    "Level": 2
  }
}
```

### Subtle Tonal Simplification
Higher level count that simplifies fine gradients without looking obviously posterized.
```json
{
  "effectMatchName": "ADBE Posterize",
  "properties": {
    "Level": 12
  }
}
```

## Tips & Gotchas
- **Level = 2** is the most extreme setting — each channel has only two values (e.g., 0 or 255 per channel), producing 8 or fewer total colors depending on interaction between channels.
- Posterize operates independently on each channel (R, G, B), so 4 levels per channel = up to 4³ = 64 possible colors.
- Combine with **Find Edges** (Invert = true) to add outlines, completing a cartoon/comic book cel-shaded style.
- **Level = 256** is visually identical to no effect — anything above ~20 is very subtle.
- Apply **Gaussian Blur** (Blurriness 1–2) before Posterize to reduce noise/grain artifacts in the flat color areas.
- For animated transitions, animating Level from high to low creates a dramatic stylization-in effect. Use Hold keyframes for a stepped, snapping feel.
- Posterize works well with desaturated (grayscale) footage combined with a **Tint** or **Tritone** to assign a custom color palette.
