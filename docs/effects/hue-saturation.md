# Hue/Saturation

**Match Name:** `"ADBE HUE SATURATION"`
**Category:** Color Correction

Adjusts the hue (color), saturation (color intensity), and lightness of an image. Can target all colors (Master) or specific color ranges. Also includes a Colorize mode that converts the image to a monochrome tint using a chosen hue.

## Properties

| Property | Type | Range | Default | Description |
|----------|------|-------|---------|-------------|
| Channel Control | enum | "Master" / "Reds" / "Yellows" / "Greens" / "Cyans" / "Blues" / "Magentas" | "Master" | Selects which color range to affect. "Master" affects the entire image. |
| Channel Range | custom | Color range picker | varies | Defines the exact hue range and falloff for the selected channel. |
| Master Hue | number (angle) | -180° to +180° | 0° | Rotates all hues around the color wheel. |
| Master Saturation | number | -100 to +100 | 0 | Adjusts color intensity. -100 fully desaturates (grayscale); +100 doubles saturation. |
| Master Lightness | number | -100 to +100 | 0 | Adjusts overall brightness. Note: not equivalent to luminance-based lightness. |
| Colorize | boolean | true / false | false | Enables colorize mode — reduces image to monochrome and applies a single hue. |
| Colorize Hue | number (angle) | 0° to 360° | 0° | The hue applied in Colorize mode. |
| Colorize Saturation | number | 0 to 100 | 25 | Saturation of the applied colorize hue. |
| Colorize Lightness | number | -100 to +100 | 0 | Lightness of the colorized result. |

## Common Use Cases

### Full Desaturation (Grayscale)
Remove all color from a layer.
```json
{
  "effectMatchName": "ADBE HUE SATURATION",
  "properties": {
    "Channel Control": "Master",
    "Master Saturation": -100
  }
}
```

### Hue Shift (Color Change)
Rotate all hues — e.g., shift a red logo to blue.
```json
{
  "effectMatchName": "ADBE HUE SATURATION",
  "properties": {
    "Channel Control": "Master",
    "Master Hue": 120
  }
}
```

### Vibrant Color Boost
Increase saturation for punchy, vivid footage.
```json
{
  "effectMatchName": "ADBE HUE SATURATION",
  "properties": {
    "Channel Control": "Master",
    "Master Saturation": 30
  }
}
```

### Duotone / Sepia Colorize
Apply a warm sepia colorize tint.
```json
{
  "effectMatchName": "ADBE HUE SATURATION",
  "properties": {
    "Colorize": true,
    "Colorize Hue": 30,
    "Colorize Saturation": 40,
    "Colorize Lightness": 0
  }
}
```

### Selective Color Muting (Desaturate Greens)
Reduce saturation only in the green channel range.
```json
{
  "effectMatchName": "ADBE HUE SATURATION",
  "properties": {
    "Channel Control": "Greens",
    "Master Saturation": -60
  }
}
```

### Cool Blue Tint (Colorize)
Apply a cold blue colorize for a winter or sci-fi aesthetic.
```json
{
  "effectMatchName": "ADBE HUE SATURATION",
  "properties": {
    "Colorize": true,
    "Colorize Hue": 210,
    "Colorize Saturation": 50,
    "Colorize Lightness": 0
  }
}
```

## Tips & Gotchas
- **Master Lightness is not the same as Levels or Exposure** — it compresses the tonal range toward gray at extremes rather than purely brightening or darkening.
- **Hue rotation of ±180° results in complementary colors** (opposite on the color wheel).
- When targeting specific channel ranges (Reds, Greens, etc.), adjust Channel Range to fine-tune which exact hues are affected and how gradually the effect falls off.
- Colorize mode is useful for quickly checking if footage reads well as a single-color duotone.
- Saturation above +50 can posterize smooth gradients — use conservatively.
- For more nuanced saturation control, combine with the **Vibrance** effect which protects already-saturated colors.
- Animating Master Hue is a quick way to cycle through colors on a graphic element.
