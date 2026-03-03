# Curves

**Match Name:** `"ADBE CurvesCustom"`
**Category:** Color Correction

Provides precise tonal and color adjustment by manipulating a curve that maps input values to output values. Each point on the curve can be moved independently, allowing for complex, nuanced grading that Levels cannot achieve. Works on the composite RGB channel or individual color channels.

## Properties

| Property | Type | Range | Default | Description |
|----------|------|-------|---------|-------------|
| Channel | enum | "RGB" / "Red" / "Green" / "Blue" / "Alpha" | "RGB" | Selects which channel's curve to edit. |
| Curve | custom (curve data) | Points array: each point [input 0–255, output 0–255] | Diagonal (identity) | The curve shape defined by control points. The default is a straight diagonal line (no change). |

> **Note on curve data format:** When setting Curves via the API, the curve is defined as a series of spline control points. The exact serialization depends on the AE MCP API implementation — consult `apply_effect` and `set_effect_property` documentation for the correct format. Typically represented as an array of `[x, y]` pairs where both values are in the 0–255 range.

## Common Use Cases

### S-Curve Contrast
Classic S-curve to lift shadows and compress highlights, increasing perceived contrast.
```json
{
  "effectMatchName": "ADBE CurvesCustom",
  "properties": {
    "Channel": "RGB",
    "Curve": [[0, 0], [64, 40], [128, 128], [192, 210], [255, 255]]
  }
}
```

### Darken Highlights Only
Pull down the top of the curve to recover overexposed highlights.
```json
{
  "effectMatchName": "ADBE CurvesCustom",
  "properties": {
    "Channel": "RGB",
    "Curve": [[0, 0], [128, 128], [220, 190], [255, 220]]
  }
}
```

### Warm Shadow / Cool Highlight Split Tone
Boost red in shadows, reduce red in highlights for a cinematic split tone.
```json
{
  "effectMatchName": "ADBE CurvesCustom",
  "properties": {
    "Channel": "Red",
    "Curve": [[0, 30], [128, 128], [255, 220]]
  }
}
```

### Faded / Matte Film Look
Lift the shadows off black (raise the bottom-left anchor) for a faded film look.
```json
{
  "effectMatchName": "ADBE CurvesCustom",
  "properties": {
    "Channel": "RGB",
    "Curve": [[0, 30], [128, 128], [255, 235]]
  }
}
```

### Invert a Channel
Flip the curve upside-down to invert a single channel.
```json
{
  "effectMatchName": "ADBE CurvesCustom",
  "properties": {
    "Channel": "Green",
    "Curve": [[0, 255], [255, 0]]
  }
}
```

## Tips & Gotchas
- **Curves is more powerful than Levels** because you can set multiple control points, enabling complex tonal shapes like S-curves, split-tones, and selective range edits.
- Control points are interpolated with a spline, so adding too many closely-spaced points can create an unnatural wavy curve — use the minimum number of points needed.
- Adjusting individual **Red, Green, Blue** channels creates color cast shifts: lifting the shadow point on Red adds warm red to dark areas.
- When using the AE MCP API, verify the exact curve data format accepted by `set_effect_property` before sending — some implementations use normalized 0–1 values instead of 0–255.
- The **Alpha channel** curve is useful for non-linearly remapping transparency gradients.
- Curves edits in 8-bpc mode can introduce banding in smooth gradients. Use 16-bpc or 32-bpc if smooth tonal transitions are required.
- An identity curve (no change) is a straight diagonal from [0,0] to [255,255].
