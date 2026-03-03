# Gaussian Blur

**Match Name:** `"ADBE Gaussian Blur 2"`
**Category:** Blur & Sharpen

Applies a smooth, weighted blur that averages pixels with a Gaussian (bell-curve) distribution. This is the most commonly used blur in After Effects due to its natural, visually pleasing result. Repeating edge pixels prevents dark or bright halos at layer boundaries.

## Properties

| Property | Type | Range | Default | Description |
|----------|------|-------|---------|-------------|
| Blurriness | number | 0–1000 | 0 | Controls the radius/strength of the blur. Higher values produce more blur. |
| Blur Dimensions | enum | "Horizontal and Vertical" / "Horizontal" / "Vertical" | "Horizontal and Vertical" | Restricts blur to one or both axes. |
| Repeat Edge Pixels | boolean | true / false | false | When enabled, extends edge pixel values instead of treating outside the layer as black, preventing dark edge halos. |

## Common Use Cases

### Background Blur / Depth of Field
Blur background elements to simulate shallow depth of field.
```json
{
  "effectMatchName": "ADBE Gaussian Blur 2",
  "properties": {
    "Blurriness": 40,
    "Blur Dimensions": "Horizontal and Vertical",
    "Repeat Edge Pixels": true
  }
}
```

### Frosted Glass Effect
Heavy blur on a duplicated layer behind a semi-transparent shape.
```json
{
  "effectMatchName": "ADBE Gaussian Blur 2",
  "properties": {
    "Blurriness": 80,
    "Blur Dimensions": "Horizontal and Vertical",
    "Repeat Edge Pixels": true
  }
}
```

### Soft Glow Pre-Pass
Light blur used as a first step before blending modes to create a glow.
```json
{
  "effectMatchName": "ADBE Gaussian Blur 2",
  "properties": {
    "Blurriness": 15,
    "Blur Dimensions": "Horizontal and Vertical",
    "Repeat Edge Pixels": false
  }
}
```

### Horizontal Motion Blur
Blur only along the horizontal axis to suggest horizontal motion.
```json
{
  "effectMatchName": "ADBE Gaussian Blur 2",
  "properties": {
    "Blurriness": 50,
    "Blur Dimensions": "Horizontal",
    "Repeat Edge Pixels": true
  }
}
```

## Tips & Gotchas
- **Always enable Repeat Edge Pixels** when the layer fills the composition frame, otherwise black edges will bleed in from outside the layer boundary.
- Blurriness values above ~200 are rarely useful for typical compositing; extreme values are mainly used for glow pre-passes or very stylized looks.
- Gaussian Blur 2 is the updated version (replaces the legacy "ADBE Gaussian Blur"); always prefer the match name `"ADBE Gaussian Blur 2"`.
- Animating Blurriness over time is a quick way to simulate a rack-focus pull. Ease the keyframes for natural feel.
- For very high blur values, **Fast Box Blur** with multiple iterations is significantly faster and produces a similar result.
- This effect respects the layer's alpha; pixels outside the alpha boundary do not contribute to the blur unless **Repeat Edge Pixels** is on.
