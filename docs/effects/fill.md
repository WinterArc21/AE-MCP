# Fill

**Match Name:** `"ADBE Fill"`
**Category:** Generate

Fills all or specific masked areas of a layer with a solid color. Unlike changing the layer's solid color, Fill works as an effect that can be animated, blended, and stacked. Supports feathering for soft-edged fills.

## Properties

| Property | Type | Range | Default | Description |
|----------|------|-------|---------|-------------|
| Fill Mask | mask reference | Any mask on the layer | None | Restricts the fill to a specific mask shape. If empty, fills the entire layer. |
| All Masks | boolean | true / false | false | When true, fills all masks simultaneously, ignoring the specific Fill Mask selection. |
| Color | color | RGB + Alpha | [255, 0, 0] (red) | The fill color. |
| Invert | boolean | true / false | false | Inverts the fill region — fills outside the mask instead of inside. |
| Horizontal Feather | number | 0–32767 | 0 | Softens the fill edges horizontally. |
| Vertical Feather | number | 0–32767 | 0 | Softens the fill edges vertically. |
| Opacity | number | 0–1 (or 0–100%) | 1 | Transparency of the fill. 1 = fully opaque; 0 = fully transparent. |

## Common Use Cases

### Solid Color Overlay on Masked Area
Fill a drawn mask shape with a specific color (e.g., color a shape on top of footage).
```json
{
  "effectMatchName": "ADBE Fill",
  "properties": {
    "All Masks": true,
    "Color": [255, 200, 0],
    "Invert": false,
    "Opacity": 1
  }
}
```

### Semi-Transparent Color Tint
Add a translucent color wash over the entire layer.
```json
{
  "effectMatchName": "ADBE Fill",
  "properties": {
    "All Masks": false,
    "Color": [0, 100, 255],
    "Invert": false,
    "Horizontal Feather": 0,
    "Vertical Feather": 0,
    "Opacity": 0.4
  }
}
```

### Inverted Mask Fill (Vignette Color)
Fill everything outside a mask with a dark color for a vignette frame.
```json
{
  "effectMatchName": "ADBE Fill",
  "properties": {
    "All Masks": true,
    "Color": [0, 0, 0],
    "Invert": true,
    "Horizontal Feather": 80,
    "Vertical Feather": 80,
    "Opacity": 0.7
  }
}
```

### Animated Color Change
Animate the Color property over time for a color-cycling fill effect.
```json
{
  "effectMatchName": "ADBE Fill",
  "properties": {
    "All Masks": false,
    "Color": [255, 0, 128],
    "Invert": false,
    "Opacity": 1
  }
}
```

## Tips & Gotchas
- **Fill completely replaces the layer's visual content with the chosen color** (at Opacity 1.0) — it does not overlay; it overwrites. For a transparent overlay, use Opacity < 1 or change the layer's blend mode.
- When **Fill Mask** is unset and **All Masks** is false, the fill covers the entire layer bounds.
- Opacity uses a **0–1 scale** (not 0–100%) in the effect property. Set 0.5 for 50% transparency.
- **Horizontal/Vertical Feather** apply a Gaussian feather to the fill boundary — most useful when a mask is defined.
- For a simple colored background, a Solid layer is often simpler than Fill — use Fill when you need color effects on existing layer content.
- Stack multiple Fill effects with different masks and blend modes to create multi-color fills on a single layer.
