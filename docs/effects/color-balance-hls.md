# Color Balance (HLS)

**Match Name:** `"ADBE Color Balance (HLS)"`
**Category:** Color Correction

A straightforward HSL (Hue, Saturation, Lightness) color correction effect that adjusts the overall hue, lightness, and saturation of a layer. Simpler and faster than Hue/Saturation — does not support per-channel range targeting but is easy to use for global adjustments.

## Properties

| Property | Type | Range | Default | Description |
|----------|------|-------|---------|-------------|
| Hue | number (angle) | -180° to +180° | 0° | Rotates all hues uniformly around the color wheel. |
| Lightness | number | -100 to +100 | 0 | Adjusts overall brightness/lightness of the layer. |
| Saturation | number | -100 to +100 | 0 | Adjusts the intensity of all colors. -100 = grayscale. |

## Common Use Cases

### Hue Rotation (Color Swap)
Shift all colors by 120° to rotate from one primary to the next.
```json
{
  "effectMatchName": "ADBE Color Balance (HLS)",
  "properties": {
    "Hue": 120,
    "Lightness": 0,
    "Saturation": 0
  }
}
```

### Brighten Layer
Lift overall brightness without changing hue or saturation.
```json
{
  "effectMatchName": "ADBE Color Balance (HLS)",
  "properties": {
    "Hue": 0,
    "Lightness": 25,
    "Saturation": 0
  }
}
```

### Desaturate Slightly for Muted Look
Reduce saturation for a softer, less vivid appearance.
```json
{
  "effectMatchName": "ADBE Color Balance (HLS)",
  "properties": {
    "Hue": 0,
    "Lightness": 0,
    "Saturation": -40
  }
}
```

### Quick Color + Brightness Combo
Shift hue, bump lightness and saturation simultaneously.
```json
{
  "effectMatchName": "ADBE Color Balance (HLS)",
  "properties": {
    "Hue": -30,
    "Lightness": 10,
    "Saturation": 20
  }
}
```

## Tips & Gotchas
- **Color Balance (HLS) is simpler but less flexible than Hue/Saturation.** Use it when you only need global adjustments and don't need per-channel color range control.
- **Lightness at +100 produces pure white; -100 produces pure black.** This is more extreme than the Levels or Exposure effects.
- For animations where you want a color to cycle continuously, animate Hue with a linear keyframe or use the expression `time * 60` (60°/second).
- This effect does not have a Colorize mode — use **Hue/Saturation** or **Tint** for monochromatic coloring.
- Saturation in Color Balance (HLS) behaves identically to the Saturation slider in Hue/Saturation when Channel Control is set to Master.
- Best used as a fast, lightweight global adjustment when render performance is important.
