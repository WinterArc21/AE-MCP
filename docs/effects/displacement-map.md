# Displacement Map

**Match Name:** `"ADBE Displacement Map"`
**Category:** Distort

Displaces pixels of one layer based on the color values of a separate map layer. Bright pixels in the map push the target layer in the positive direction; dark pixels push in the negative direction; mid-gray (128) causes no displacement. Enables precise, texture-driven distortion effects.

## Properties

| Property | Type | Range | Default | Description |
|----------|------|-------|---------|-------------|
| Displacement Map Layer | layer reference | Any layer in comp | None | The layer whose pixel values drive the displacement. |
| Use For Horizontal Displacement | enum | "Red" / "Green" / "Blue" / "Alpha" / "Luminance" / "Hue" / "Lightness" / "Saturation" / "Full" / "Half" | "Red" | Which channel of the map layer controls horizontal (X) displacement. |
| Max Horizontal Displacement | number | -32767 to 32767 | 0 | Maximum horizontal displacement in pixels. Positive = right for bright pixels; negative = left. |
| Use For Vertical Displacement | enum | "Red" / "Green" / "Blue" / "Alpha" / "Luminance" / "Hue" / "Lightness" / "Saturation" / "Full" / "Half" | "Green" | Which channel of the map layer controls vertical (Y) displacement. |
| Max Vertical Displacement | number | -32767 to 32767 | 0 | Maximum vertical displacement in pixels. Positive = down for bright pixels; negative = up. |
| Displacement Map Behavior | enum | "Center Map" / "Stretch Map to Fit" / "Tile Map" | "Center Map" | How the map layer is sized/positioned relative to the target layer. |
| Edge Behavior | enum | "Wrap Pixels Around" / "Smear Edge Pixels" / "Mirror Pixels" | "Wrap Pixels Around" | How pixels at the boundary of the layer are handled when displaced beyond the edge. |
| Expand Output | boolean | true / false | false | Expands the output bounds to include all displaced pixels. |

## Common Use Cases

### Water Ripple Displacement
Use a radially-animated noise layer to displace reflections.
```json
{
  "effectMatchName": "ADBE Displacement Map",
  "properties": {
    "Use For Horizontal Displacement": "Red",
    "Max Horizontal Displacement": 20,
    "Use For Vertical Displacement": "Green",
    "Max Vertical Displacement": 20,
    "Displacement Map Behavior": "Stretch Map to Fit",
    "Edge Behavior": "Smear Edge Pixels"
  }
}
```

### Texture Warp (Emboss-Driven)
Displace based on a texture layer to add surface relief.
```json
{
  "effectMatchName": "ADBE Displacement Map",
  "properties": {
    "Use For Horizontal Displacement": "Luminance",
    "Max Horizontal Displacement": 15,
    "Use For Vertical Displacement": "Luminance",
    "Max Vertical Displacement": 15,
    "Displacement Map Behavior": "Tile Map",
    "Edge Behavior": "Mirror Pixels"
  }
}
```

### Heat Distortion (Using Fractal Noise as Map)
Use an animated Fractal Noise layer as the displacement map.
```json
{
  "effectMatchName": "ADBE Displacement Map",
  "properties": {
    "Use For Horizontal Displacement": "Luminance",
    "Max Horizontal Displacement": 30,
    "Use For Vertical Displacement": "Luminance",
    "Max Vertical Displacement": 10,
    "Displacement Map Behavior": "Stretch Map to Fit",
    "Edge Behavior": "Smear Edge Pixels"
  }
}
```

### Shockwave Ring Displacement
Large displacement from a radial gradient to simulate an explosion shockwave.
```json
{
  "effectMatchName": "ADBE Displacement Map",
  "properties": {
    "Use For Horizontal Displacement": "Luminance",
    "Max Horizontal Displacement": 80,
    "Use For Vertical Displacement": "Luminance",
    "Max Vertical Displacement": 80,
    "Displacement Map Behavior": "Stretch Map to Fit",
    "Edge Behavior": "Smear Edge Pixels"
  }
}
```

## Tips & Gotchas
- **Mid-gray (128 / 50%) in the map layer causes zero displacement.** Pure white displaces maximally positive; pure black displaces maximally negative. Always start your displacement map at 50% gray to avoid unexpected shifts.
- The **Displacement Map Layer** should usually be set as a Guide Layer or pre-composed so it doesn't appear in the final render.
- **"Luminance" is the most common channel choice** for grayscale displacement maps since it reads all channels equally.
- **Stretch Map to Fit** is usually the safest Behavior setting when the map and target layers are different sizes.
- For animated distortion, apply Fractal Noise or Turbulent Noise to a separate comp layer and use that as the Displacement Map Layer.
- **Edge Behavior: "Smear Edge Pixels"** is most natural for organic distortions; "Wrap Pixels Around" creates a tiled repeat that can look artificial on footage.
- Displacement Map is composited before transforms — apply it via pre-comp if you need displacement to interact with layer position/scale.
