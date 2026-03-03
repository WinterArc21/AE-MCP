# Tritone

**Match Name:** `"ADBE Tritone"`
**Category:** Color Correction

Maps image tones to three user-defined colors: one for highlights, one for midtones, and one for shadows. More versatile than the two-point Tint effect, allowing independent control of the mid-gray range. The Blend With Original slider blends the tritone result back with the source footage.

## Properties

| Property | Type | Range | Default | Description |
|----------|------|-------|---------|-------------|
| Highlights | color | RGB color | [255, 255, 255] (white) | Color mapped to the brightest tones. |
| Midtones | color | RGB color | [128, 128, 128] (gray) | Color mapped to the mid-gray range. |
| Shadows | color | RGB color | [0, 0, 0] (black) | Color mapped to the darkest tones. |
| Blend With Original | number | 0–100% | 0% | Blends the tritone result with the original image. 0% = full tritone; 100% = original unchanged. |

## Common Use Cases

### Cinematic Orange & Teal (Tritone)
Teal shadows, gray midtones, orange highlights — iconic cinematic grade.
```json
{
  "effectMatchName": "ADBE Tritone",
  "properties": {
    "Highlights": [255, 180, 80],
    "Midtones": [80, 100, 100],
    "Shadows": [0, 30, 50],
    "Blend With Original": 0
  }
}
```

### Vintage Newspaper Print
Dark brown shadows, tan midtones, off-white highlights.
```json
{
  "effectMatchName": "ADBE Tritone",
  "properties": {
    "Highlights": [240, 230, 200],
    "Midtones": [160, 130, 90],
    "Shadows": [40, 25, 10],
    "Blend With Original": 0
  }
}
```

### Neon Color Grade
Dark purple shadows, deep red midtones, hot pink highlights.
```json
{
  "effectMatchName": "ADBE Tritone",
  "properties": {
    "Highlights": [255, 80, 200],
    "Midtones": [150, 20, 60],
    "Shadows": [20, 0, 60],
    "Blend With Original": 20
  }
}
```

### Partial Tritone Blend
Apply tritone at 60% to retain some original color.
```json
{
  "effectMatchName": "ADBE Tritone",
  "properties": {
    "Highlights": [255, 255, 220],
    "Midtones": [150, 140, 120],
    "Shadows": [10, 5, 20],
    "Blend With Original": 40
  }
}
```

## Tips & Gotchas
- **Midtones color** is the key differentiator from Tint. Setting an unexpected midtone (e.g., a warm orange while keeping neutral shadows and highlights) creates complex color grading effects.
- Tritone maps based on **luminosity only** — original hue information is discarded. Use Blend With Original to mix in the original color.
- Setting all three colors to different shades of the same hue creates a convincingly photographic monochrome with toning.
- **Highlights brighter than Shadows** is the standard order — inverting them (dark highlights, light shadows) will invert the tonal result.
- Like Tint, Tritone is a luminosity-based remap. For hue-preserving color adjustments, use **Hue/Saturation** or **Curves**.
- Blend With Original at 100% means the effect does nothing — leave at 0% for a pure tritone.
