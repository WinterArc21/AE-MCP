# Emboss

**Match Name:** `"ADBE Emboss"`
**Category:** Stylize

Creates a raised, engraved, or relief texture effect by highlighting edges in a directional manner. Pixels are rendered as a grayscale relief based on their contrast with neighboring pixels in the specified direction. Blend With Original allows mixing the emboss back with the source image for subtler texturing.

## Properties

| Property | Type | Range | Default | Description |
|----------|------|-------|---------|-------------|
| Direction | number (angle) | 0–360° | 45° | The angle of the simulated light source. Determines which side of edges is highlighted vs. shadowed. |
| Relief | number | 1–1000 | 2 | Height/depth of the emboss in pixels. Higher = more pronounced surface detail. |
| Contrast | number | 0–1000% | 100% | Controls the intensity of highlight and shadow in the emboss. |
| Blend With Original | number | 0–100% | 0% | Blends the emboss result with the original image. 0% = pure grayscale emboss; 100% = original unchanged. |

## Common Use Cases

### Coin / Metal Engraving Look
High contrast, sharp emboss simulating metal stamping.
```json
{
  "effectMatchName": "ADBE Emboss",
  "properties": {
    "Direction": 135,
    "Relief": 5,
    "Contrast": 200,
    "Blend With Original": 0
  }
}
```

### Subtle Surface Texture
Low contrast emboss blended with original for a tactile paper/fabric texture.
```json
{
  "effectMatchName": "ADBE Emboss",
  "properties": {
    "Direction": 45,
    "Relief": 3,
    "Contrast": 80,
    "Blend With Original": 60
  }
}
```

### Edge Detection Look
High relief, high contrast for a striking edge-detected result.
```json
{
  "effectMatchName": "ADBE Emboss",
  "properties": {
    "Direction": 90,
    "Relief": 10,
    "Contrast": 300,
    "Blend With Original": 0
  }
}
```

### Textured Overlay (Blend Mode Use)
Full emboss at 0% blend, layer set to Overlay or Hard Light blend mode for texture.
```json
{
  "effectMatchName": "ADBE Emboss",
  "properties": {
    "Direction": 45,
    "Relief": 4,
    "Contrast": 150,
    "Blend With Original": 0
  }
}
```

## Tips & Gotchas
- **Emboss at 0% Blend With Original** produces a fully grayscale, detail-only relief image — ideal for use as a texture overlay layer set to **Overlay** or **Hard Light** blend mode.
- **Blend With Original** is the key to natural-looking texture — values of 50–80% layer the emboss subtly over the source.
- **Direction** corresponds to light angle: 135° = upper-left light; 45° = upper-right light. Changing direction dramatically shifts which edges appear raised vs. recessed.
- High **Relief** values (20+) exaggerate the depth and can create an intensely stylized, almost 3D look.
- Combine with **Find Edges** for a line-art/sketch hybrid effect.
- The output is always grayscale at 0% blend — add a **Tint** or **Hue/Saturation** effect after Emboss to introduce color.
- Emboss is not a true 3D displacement — it is a lighting simulation based on luminance gradients.
