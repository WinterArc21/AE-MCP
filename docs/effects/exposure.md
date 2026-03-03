# Exposure

**Match Name:** `"ADBE Exposure2"`
**Category:** Color Correction

Simulates adjusting camera exposure in stops (like changing a camera's f-stop or shutter speed), working in linear light for physically accurate results. Operates differently from Levels/Brightness — one stop equals a doubling or halving of light. Best used on 32-bpc linear light compositions.

## Properties

| Property | Type | Range | Default | Description |
|----------|------|-------|---------|-------------|
| Master Exposure | number | -20 to +20 (stops) | 0 | Overall exposure adjustment in stops. +1 doubles brightness; -1 halves it. |
| Gamma Correction | number | 0–9.99 | 1.0 | Adjusts midtone gamma independently of the linear exposure. |
| Offset | number | -10 to +10 | 0 | Adds or subtracts a linear offset to all pixels, shifting very dark values. |

## Common Use Cases

### Brighten Underexposed Footage
Lift exposure to recover a dark shot.
```json
{
  "effectMatchName": "ADBE Exposure2",
  "properties": {
    "Master Exposure": 1.5,
    "Gamma Correction": 1.0,
    "Offset": 0
  }
}
```

### Darken Overexposed Footage
Reduce exposure to recover blown-out footage.
```json
{
  "effectMatchName": "ADBE Exposure2",
  "properties": {
    "Master Exposure": -1.0,
    "Gamma Correction": 1.0,
    "Offset": 0
  }
}
```

### HDR Tone Mapping
Use negative exposure with lifted gamma to compress a high dynamic range.
```json
{
  "effectMatchName": "ADBE Exposure2",
  "properties": {
    "Master Exposure": -2.0,
    "Gamma Correction": 1.8,
    "Offset": 0
  }
}
```

### Animated Exposure Flicker
Animate Master Exposure with random small values (±0.1 to 0.3) for a film flicker effect.
```json
{
  "effectMatchName": "ADBE Exposure2",
  "properties": {
    "Master Exposure": 0.2,
    "Gamma Correction": 1.0,
    "Offset": 0
  }
}
```

### Lift Shadows with Offset
Raise very dark pixels without affecting the rest of the range.
```json
{
  "effectMatchName": "ADBE Exposure2",
  "properties": {
    "Master Exposure": 0,
    "Gamma Correction": 1.0,
    "Offset": 0.05
  }
}
```

## Tips & Gotchas
- **Exposure is designed for linear light 32-bpc compositions.** On 8-bpc or gamma-encoded footage, results may look different than expected — it can still be used effectively but won't be physically accurate.
- One stop (+1) is **exactly equivalent to doubling all brightness values** in linear light — this is more aggressive than it appears in a gamma-encoded preview.
- **Offset** is primarily useful for controlling how near-black pixels behave; it adds a constant linear value, which can lift crush blacks or create a flat/matte look.
- For rough exposure adjustments on standard 8-bpc footage, **Levels** (gamma control) often produces more predictable results.
- Animate Master Exposure with the **wiggle()** expression (e.g., `wiggle(24, 0.15)`) for realistic projector/film flicker.
- Gamma Correction in Exposure is separate from Master Exposure and applies after the stop adjustment — useful for fine-tuning midtones independently.
