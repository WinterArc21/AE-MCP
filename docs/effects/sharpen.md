# Sharpen

**Match Name:** `"ADBE Sharpen"`
**Category:** Blur & Sharpen

Increases the contrast between adjacent pixels to make edges appear crisper and more defined. A simple, single-parameter sharpening effect suitable for quick detail enhancement. For more control over radius and threshold, use Unsharp Mask instead.

## Properties

| Property | Type | Range | Default | Description |
|----------|------|-------|---------|-------------|
| Sharpen Amount | number | 0–1000 | 0 | The strength of the sharpening. Values above 100 begin to produce halos and noise artifacts. |

## Common Use Cases

### Light Detail Enhancement
Subtle sharpening to recover softness from compressed video.
```json
{
  "effectMatchName": "ADBE Sharpen",
  "properties": {
    "Sharpen Amount": 25
  }
}
```

### Text or Graphic Crisp-Up
Sharpen text layers that appear slightly soft due to subpixel rendering.
```json
{
  "effectMatchName": "ADBE Sharpen",
  "properties": {
    "Sharpen Amount": 40
  }
}
```

### Footage Recovery
Moderate sharpening on soft or slightly out-of-focus footage.
```json
{
  "effectMatchName": "ADBE Sharpen",
  "properties": {
    "Sharpen Amount": 60
  }
}
```

### Stylized Over-Sharpen
Extreme sharpening for a harsh, gritty aesthetic.
```json
{
  "effectMatchName": "ADBE Sharpen",
  "properties": {
    "Sharpen Amount": 200
  }
}
```

## Tips & Gotchas
- **Values above 100 produce visible halo artifacts** around high-contrast edges. Keep below 75 for natural-looking results.
- Sharpen amplifies noise — if the source footage is noisy, apply a light Gaussian Blur first (Blurriness ~1–2) before sharpening.
- For precise sharpening with radius and threshold control, use **Unsharp Mask** instead.
- Sharpening is best applied last in the effect stack, after color correction and other processing.
- On compressed video (H.264, etc.), sharpening can make compression artifacts more visible. Use conservatively.
- Sharpen Amount of 0 has no effect — always set a value above 0 to activate the effect.
