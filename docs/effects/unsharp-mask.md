# Unsharp Mask

**Match Name:** `"ADBE Unsharp Mask2"`
**Category:** Blur & Sharpen

A professional-grade sharpening technique that detects edges using a blurred version of the image and increases contrast only at those edges. Provides three controls — Amount, Radius, and Threshold — for precise sharpening without amplifying noise in smooth areas.

## Properties

| Property | Type | Range | Default | Description |
|----------|------|-------|---------|-------------|
| Amount | number | 0–500% | 0% | The strength of the edge contrast boost. 50–150% is typical for natural sharpening. |
| Radius | number | 0–1000 | 1 | The pixel radius used to detect edges. Larger radius sharpens broader/softer edges; smaller radius sharpens fine detail. |
| Threshold | number | 0–1000 | 0 | Minimum tonal difference required before sharpening is applied. Higher values protect smooth gradients and skin tones from being sharpened. |

## Common Use Cases

### Natural Footage Sharpening
Industry-standard settings for moderate footage sharpening.
```json
{
  "effectMatchName": "ADBE Unsharp Mask2",
  "properties": {
    "Amount": 80,
    "Radius": 1.5,
    "Threshold": 4
  }
}
```

### Fine Detail Enhancement
Small radius to target crisp pixel-level detail (product shots, text).
```json
{
  "effectMatchName": "ADBE Unsharp Mask2",
  "properties": {
    "Amount": 120,
    "Radius": 0.5,
    "Threshold": 2
  }
}
```

### Soft Focus / Portrait Sharpening
Higher threshold protects skin while sharpening hair and eyes.
```json
{
  "effectMatchName": "ADBE Unsharp Mask2",
  "properties": {
    "Amount": 100,
    "Radius": 2,
    "Threshold": 15
  }
}
```

### Aggressive Print-Style Sharpening
High amount and radius for a bold, defined look.
```json
{
  "effectMatchName": "ADBE Unsharp Mask2",
  "properties": {
    "Amount": 200,
    "Radius": 3,
    "Threshold": 8
  }
}
```

## Tips & Gotchas
- **Threshold is the most important differentiator** from simple Sharpen — increasing it prevents noisy, grainy areas from being sharpened while still crisping edges.
- Radius of 1–2 is best for video; larger radii (3–5) suit low-resolution or heavily compressed sources.
- Unsharp Mask works by blurring a copy of the image and subtracting it — conceptually the opposite of what its name implies.
- Always zoom to 100% when evaluating sharpening — smaller preview scales hide halos and artifacts.
- Stack two Unsharp Mask effects: one with small Radius for fine detail and one with large Radius for broad edge definition.
- Like Sharpen, apply this last in the effect stack after all other processing.
- Amount values above 300 produce noticeable halos on most footage.
