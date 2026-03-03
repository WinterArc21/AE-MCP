# Tint

**Match Name:** `"ADBE Tint"`
**Category:** Color Correction

Maps the shadow values of an image to one color and the highlight values to another, creating a two-color (duotone) effect. The Amount to Tint slider blends between the original colors and the mapped result. Simple, fast, and effective for stylized looks.

## Properties

| Property | Type | Range | Default | Description |
|----------|------|-------|---------|-------------|
| Map Black To | color | RGB color | [0, 0, 0] (black) | The color that replaces the darkest tones (shadows). |
| Map White To | color | RGB color | [255, 255, 255] (white) | The color that replaces the brightest tones (highlights). |
| Amount to Tint | number | 0–100% | 100% | Blends between the original image (0%) and the full tint (100%). |

## Common Use Cases

### Classic Sepia Tone
Warm brown shadows and light cream highlights for vintage sepia look.
```json
{
  "effectMatchName": "ADBE Tint",
  "properties": {
    "Map Black To": [112, 66, 20],
    "Map White To": [255, 240, 200],
    "Amount to Tint": 100
  }
}
```

### Duotone (Blue/Orange)
High-contrast cinematic blue-shadow / orange-highlight duotone.
```json
{
  "effectMatchName": "ADBE Tint",
  "properties": {
    "Map Black To": [0, 20, 80],
    "Map White To": [255, 180, 50],
    "Amount to Tint": 100
  }
}
```

### Subtle Color Grade Blend
Partial tint (50%) to add warmth without fully replacing colors.
```json
{
  "effectMatchName": "ADBE Tint",
  "properties": {
    "Map Black To": [20, 10, 0],
    "Map White To": [255, 250, 220],
    "Amount to Tint": 50
  }
}
```

### Night Vision Green
Map to dark green shadows and bright green highlights.
```json
{
  "effectMatchName": "ADBE Tint",
  "properties": {
    "Map Black To": [0, 30, 0],
    "Map White To": [100, 255, 80],
    "Amount to Tint": 100
  }
}
```

### Desaturate with Tint Blend
First use Hue/Saturation to desaturate, then apply Tint at 40% for a muted color result.
```json
{
  "effectMatchName": "ADBE Tint",
  "properties": {
    "Map Black To": [0, 0, 40],
    "Map White To": [240, 230, 255],
    "Amount to Tint": 40
  }
}
```

## Tips & Gotchas
- **Tint does not care about the original hue** — it maps purely based on luminosity. A fully saturated red and a fully saturated blue at the same brightness will be mapped to the same color.
- Unlike **Tritone**, Tint only has two color stops (shadows and highlights) with no separate midtone control.
- **Amount to Tint at 100%** completely replaces the original color information — only luminosity is preserved.
- For a grayscale result, set Map Black To = black and Map White To = white; the image will be desaturated.
- Tint renders in 8-bpc internally even on 16/32-bpc compositions — for high-quality color work, consider using **Curves** or **Tritone** instead.
- Combining Tint with a Screen or Multiply blend mode can produce interesting stylized color interactions.
