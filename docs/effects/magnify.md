# Magnify

**Match Name:** `"ADBE Magnify"`
**Category:** Distort

Creates a magnifying glass effect that enlarges a circular or square region of a layer. The magnified area can be shaped, feathered, and blended with the original to produce realistic or stylized loupe effects.

## Properties

| Property | Type | Range | Default | Description |
|----------|------|-------|---------|-------------|
| Shape | enum | "Circle" / "Square" | "Circle" | The shape of the magnified region. |
| Center | number[2] (point) | [x, y] | Comp center | Center point of the magnified region. |
| Magnification | number | 0–1000% | 100% | How much the content is enlarged. 100% = no magnification; 200% = 2× zoom. |
| Link | enum | "Size & Feather to Magnification" / "None" | "None" | Automatically scales feather with magnification changes. |
| Size | number | 0–32767 | 80 | Radius (Circle) or half-width (Square) of the magnified area in pixels. |
| Feather | number | 0–100% | 0% | Softness of the magnified region's edge. 0% = hard edge; 100% = very soft fade. |
| Opacity | number | 0–100% | 100% | Opacity of the magnified region. Lower values blend the magnified view with the original. |
| Scaling | enum | "Standard" / "Soft" | "Standard" | "Soft" uses higher quality bicubic interpolation. |
| Blending Mode | enum | Standard AE blend modes | "None" | How the magnified area composites with the layer below. |

## Common Use Cases

### Classic Magnifying Glass
Circular loupe with soft edges showing a magnified detail area.
```json
{
  "effectMatchName": "ADBE Magnify",
  "properties": {
    "Shape": "Circle",
    "Center": [960, 540],
    "Magnification": 300,
    "Size": 120,
    "Feather": 20,
    "Opacity": 100,
    "Scaling": "Soft"
  }
}
```

### Animated Detail Callout
Animate Center to track a moving object while keeping it zoomed in.
```json
{
  "effectMatchName": "ADBE Magnify",
  "properties": {
    "Shape": "Circle",
    "Center": [500, 300],
    "Magnification": 400,
    "Size": 80,
    "Feather": 15,
    "Opacity": 100
  }
}
```

### Square Map Zoom
Square magnified area for a map or grid detail highlight.
```json
{
  "effectMatchName": "ADBE Magnify",
  "properties": {
    "Shape": "Square",
    "Center": [960, 540],
    "Magnification": 250,
    "Size": 150,
    "Feather": 10,
    "Opacity": 100
  }
}
```

### Subtle Highlight (Low Magnification)
Slight zoom (120%) to gently draw attention to a detail.
```json
{
  "effectMatchName": "ADBE Magnify",
  "properties": {
    "Shape": "Circle",
    "Center": [960, 540],
    "Magnification": 120,
    "Size": 200,
    "Feather": 40,
    "Opacity": 80
  }
}
```

## Tips & Gotchas
- **Magnification of 100%** shows the area at its original size — effectively no zoom. Values below 100% minify the region.
- The magnified area reads from the **same layer** — it zooms into the layer's own pixels, not a separate layer.
- For animating the magnifying glass following an object, **parent the Center point to a Null with tracking data**.
- **Feather** values above 50% produce a very soft transition that can look natural for glass edge effects — add an ellipse shape layer on top to simulate the glass frame.
- Scaling: "Soft" uses bicubic interpolation — recommended for smooth photographic content; "Standard" is fine for graphics.
- High Magnification on low-resolution footage will show pixelation — this may be desired (pixel art) or avoided by using only moderate values on HD/4K sources.
- Multiple Magnify effects can be stacked to create multiple simultaneous zoom circles.
