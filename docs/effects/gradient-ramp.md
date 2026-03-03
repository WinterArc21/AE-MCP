# Gradient Ramp

**Match Name:** `"ADBE Ramp"`
**Category:** Generate

Generates a two-color gradient directly on a layer, either as a linear or radial ramp. Commonly applied to a solid layer to create gradient backgrounds, vignettes, or colored light overlays. The Ramp Scatter option dithers the gradient to reduce banding.

## Properties

| Property | Type | Range | Default | Description |
|----------|------|-------|---------|-------------|
| Start of Ramp | number[2] (point) | [x, y] | [960, 0] (top-center) | The position where the gradient starts (Start Color). |
| Start Color | color | RGB | [0, 0, 0] (black) | The color at the start of the gradient. |
| End of Ramp | number[2] (point) | [x, y] | [960, 1080] (bottom-center) | The position where the gradient ends (End Color). |
| End Color | color | RGB | [255, 255, 255] (white) | The color at the end of the gradient. |
| Ramp Shape | enum | "Linear Ramp" / "Radial Ramp" | "Linear Ramp" | Linear produces a straight-line gradient; Radial produces a circular gradient from Start of Ramp outward. |
| Ramp Scatter | number | 0–1000 | 0 | Dithers the gradient to reduce visible color banding. Values of 50–200 are usually sufficient. |
| Blend With Original | number | 0–100% | 0% | Blends the gradient with the original layer content. 0% = pure gradient; 100% = original unchanged. |

## Common Use Cases

### Dark-to-Light Background Gradient
Classic top-black to bottom-white or top-dark to bottom-light vertical gradient.
```json
{
  "effectMatchName": "ADBE Ramp",
  "properties": {
    "Start of Ramp": [960, 0],
    "Start Color": [20, 20, 40],
    "End of Ramp": [960, 1080],
    "End Color": [180, 200, 255],
    "Ramp Shape": "Linear Ramp",
    "Ramp Scatter": 100
  }
}
```

### Radial Vignette (Dark Edges)
Radial gradient centered in the frame, bright center fading to dark.
```json
{
  "effectMatchName": "ADBE Ramp",
  "properties": {
    "Start of Ramp": [960, 540],
    "Start Color": [255, 255, 255],
    "End of Ramp": [0, 0],
    "End Color": [0, 0, 0],
    "Ramp Shape": "Radial Ramp",
    "Ramp Scatter": 50,
    "Blend With Original": 0
  }
}
```

### Colored Light Leak Overlay
Warm-to-transparent diagonal gradient on a Screen-blended layer.
```json
{
  "effectMatchName": "ADBE Ramp",
  "properties": {
    "Start of Ramp": [0, 0],
    "Start Color": [255, 200, 100],
    "End of Ramp": [1920, 1080],
    "End Color": [0, 0, 0],
    "Ramp Shape": "Linear Ramp",
    "Ramp Scatter": 80
  }
}
```

### Horizon Sky Gradient
Blue-to-orange gradient for a sunset sky background.
```json
{
  "effectMatchName": "ADBE Ramp",
  "properties": {
    "Start of Ramp": [960, 0],
    "Start Color": [30, 80, 200],
    "End of Ramp": [960, 1080],
    "End Color": [255, 140, 40],
    "Ramp Shape": "Linear Ramp",
    "Ramp Scatter": 150
  }
}
```

## Tips & Gotchas
- **Ramp Scatter** is important for gradients spanning many similar shades — without it, 8-bpc renders will show visible banding steps. Set to at least 50 for smooth gradients.
- For a **Radial Ramp**, the Start of Ramp is the center point and End of Ramp defines the outer radius point — the gradient radiates outward from Start to End.
- To create a transparent vignette, apply on a Black Solid layer set to **Multiply** blend mode, with the gradient going from white (center) to black (edges).
- Gradient Ramp only supports **two color stops**. For multi-stop gradients, layer multiple Gradient Ramp solids with different blend modes.
- The **Blend With Original** option lets you tint a footage layer without losing the underlying image.
- Animate Start of Ramp and End of Ramp positions to create a moving gradient sweep.
- In 32-bpc compositions, Ramp Scatter is less necessary as banding is already much reduced.
