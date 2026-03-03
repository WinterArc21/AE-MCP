# Glow

**Match Name:** `"ADBE Glo2"`
**Category:** Stylize

Creates a glowing halo effect around bright areas of a layer by blurring and compositing the highlights. Threshold and Radius controls define where and how broadly the glow spreads. Supports colored glow using custom Color A/B values and multiple blending modes for different looks.

## Properties

| Property | Type | Range/Options | Default | Description |
|----------|------|---------------|---------|-------------|
| Glow Threshold | number | 0–100% | 60% | Brightness level above which the glow effect is applied. Lower threshold = more areas glow. |
| Glow Radius | number | 0–1000 | 10 | The spread radius of the glow in pixels. Larger = wider, softer glow halo. |
| Glow Intensity | number | 0–10 | 1.0 | Multiplier for the brightness of the glow. Higher = brighter, more intense glow. |
| Composite Original | enum | "On Top" / "Behind" / "None" | "On Top" | How the original image composites with the glow result. |
| Glow Operation | enum | "None" / "Normal" / "Add" / "Screen" / "Multiply" / "Overlay" / "Soft Light" / "Hard Light" / "Color Dodge" / "Color Burn" | "None" | Blend mode used to composite the glow over the layer. |
| Glow Colors | enum | "Original Colors" / "A & B Colors" | "Original Colors" | Whether the glow uses the layer's original colors or custom A & B gradient colors. |
| Color A | color | RGB | [255, 255, 255] (white) | First glow color (used at bright end) when Glow Colors = "A & B Colors". |
| Color B | color | RGB | [0, 0, 0] (black) | Second glow color (used at dim end) when Glow Colors = "A & B Colors". |
| Color A/B Midpoint | number | 0–100% | 50% | The balance point between Color A and Color B in the gradient. |
| Glow Dimensions | enum | "Horizontal and Vertical" / "Horizontal" / "Vertical" | "Horizontal and Vertical" | Restricts glow spread to one or both axes. |

## Common Use Cases

### Neon Sign Glow
Bright, wide electric-blue glow around text or shapes.
```json
{
  "effectMatchName": "ADBE Glo2",
  "properties": {
    "Glow Threshold": 30,
    "Glow Radius": 40,
    "Glow Intensity": 2.5,
    "Composite Original": "On Top",
    "Glow Operation": "Add",
    "Glow Colors": "A & B Colors",
    "Color A": [100, 200, 255],
    "Color B": [0, 50, 150],
    "Color A/B Midpoint": 50
  }
}
```

### Soft Bloom / Cinematic Glow
Gentle wide glow over bright highlights for a filmic bloom effect.
```json
{
  "effectMatchName": "ADBE Glo2",
  "properties": {
    "Glow Threshold": 55,
    "Glow Radius": 80,
    "Glow Intensity": 0.8,
    "Composite Original": "On Top",
    "Glow Operation": "Screen",
    "Glow Colors": "Original Colors"
  }
}
```

### Fire / Warm Emission Glow
Orange-red glow emanating from fire or emissive particles.
```json
{
  "effectMatchName": "ADBE Glo2",
  "properties": {
    "Glow Threshold": 20,
    "Glow Radius": 30,
    "Glow Intensity": 3.0,
    "Composite Original": "On Top",
    "Glow Operation": "Add",
    "Glow Colors": "A & B Colors",
    "Color A": [255, 200, 50],
    "Color B": [200, 50, 0],
    "Color A/B Midpoint": 40
  }
}
```

### Subtle UI Element Highlight
Light glow at threshold to add a soft luminous edge to interface elements.
```json
{
  "effectMatchName": "ADBE Glo2",
  "properties": {
    "Glow Threshold": 70,
    "Glow Radius": 15,
    "Glow Intensity": 1.2,
    "Composite Original": "On Top",
    "Glow Operation": "Add",
    "Glow Colors": "Original Colors"
  }
}
```

## Tips & Gotchas
- **Lowering Glow Threshold** causes more of the image to glow — at 0%, even dark areas contribute, creating an overall soft-light effect. Keep above 40% for selective highlight glowing.
- **Glow Intensity above 3** can quickly oversaturate and blow out the glow area — use in combination with Glow Operation to control blending.
- **Glow Operation: "Add"** brightens the layer additively and is best for neon/light-emission effects. **"Screen"** is more natural for photographic glows.
- The Glo2 match name is the updated version — always use `"ADBE Glo2"` instead of `"ADBE Glo"`.
- For very fine control, pre-compose the layer, apply Glow, then composite manually with blend modes.
- **A & B Colors** can create colorful gradient glows (e.g., purple-to-cyan for a vaporwave aesthetic).
- Glow Radius and Intensity interact — lower radius + higher intensity = tight, bright halo; higher radius + lower intensity = wide, soft bloom.
