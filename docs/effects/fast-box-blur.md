# Fast Box Blur

**Match Name:** `"ADBE Box Blur2"`
**Category:** Blur & Sharpen

Applies a box (average) blur that is significantly faster than Gaussian Blur, especially at large radii. Multiple iterations approximate a Gaussian distribution. Ideal for real-time previews, large-area blurs, and background processing where render speed matters.

## Properties

| Property | Type | Range | Default | Description |
|----------|------|-------|---------|-------------|
| Blur Radius | number | 0–1000 | 0 | The radius of the box kernel in pixels. Larger values create more blur. |
| Iterations | number (integer) | 1–10 | 3 | Number of times the box blur is applied in sequence. More iterations produce a smoother, more Gaussian-like result. |
| Blur Dimensions | enum | "Horizontal and Vertical" / "Horizontal" / "Vertical" | "Horizontal and Vertical" | Restricts blur to one or both axes. |
| Repeat Edge Pixels | boolean | true / false | false | Prevents dark edge halos by repeating boundary pixel values. |

## Common Use Cases

### Fast Background Blur
Quick background defocus without long render times.
```json
{
  "effectMatchName": "ADBE Box Blur2",
  "properties": {
    "Blur Radius": 30,
    "Iterations": 3,
    "Blur Dimensions": "Horizontal and Vertical",
    "Repeat Edge Pixels": true
  }
}
```

### Glow Pre-Pass (Fast)
Low-radius blur before applying a Screen blend mode to create a glow.
```json
{
  "effectMatchName": "ADBE Box Blur2",
  "properties": {
    "Blur Radius": 12,
    "Iterations": 2,
    "Blur Dimensions": "Horizontal and Vertical",
    "Repeat Edge Pixels": false
  }
}
```

### Heavy Blur (Large Area)
Extreme blur for dreamy/abstract backgrounds.
```json
{
  "effectMatchName": "ADBE Box Blur2",
  "properties": {
    "Blur Radius": 150,
    "Iterations": 5,
    "Blur Dimensions": "Horizontal and Vertical",
    "Repeat Edge Pixels": true
  }
}
```

### Horizontal-Only Streak
Directional box blur for horizontal softening.
```json
{
  "effectMatchName": "ADBE Box Blur2",
  "properties": {
    "Blur Radius": 40,
    "Iterations": 1,
    "Blur Dimensions": "Horizontal",
    "Repeat Edge Pixels": true
  }
}
```

## Tips & Gotchas
- **Fast Box Blur is preferred over Gaussian Blur for large radii** — it renders much faster and at high iterations is visually nearly identical.
- With **Iterations = 1**, the box kernel produces a boxy, slightly artificial look. Use 3+ iterations for a natural blur.
- **Iterations = 5–7** very closely approximates a true Gaussian blur.
- Like Gaussian Blur, always enable **Repeat Edge Pixels** when the layer covers the full composition frame.
- The match name is `"ADBE Box Blur2"` (not `"ADBE Box Blur"`) — the updated version supports Repeat Edge Pixels.
- Box Blur at radius 1 with Iterations 1 can be used as a subtle anti-aliasing pass on sharp-edged graphics.
