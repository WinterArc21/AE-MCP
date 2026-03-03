# Circle

**Match Name:** `"ADBE Circle"`
**Category:** Generate

Generates a filled or outlined circle/ring shape on a layer. Supports multiple edge modes for creating rings, thick outlines, and feathered circles. Faster and more flexible than drawing a shape layer for simple circular elements.

## Properties

| Property | Type | Range/Options | Default | Description |
|----------|------|---------------|---------|-------------|
| Center | number[2] (point) | [x, y] | Comp center | Center point of the circle. |
| Radius | number | 0–32767 | 80 | Radius of the circle in pixels. |
| Edge | enum | "None" / "Edge Radius" / "Thickness" / "Thickness*Radius" / "Thickness & Feather" / "Thickness & Feather*Radius" | "None" | Controls whether a hollow ring or feathered border is created. "None" = solid filled circle. |
| Edge Radius | number | 0–32767 | 0 | Inner radius for ring/hollow mode. |
| Thickness | number | 0–32767 | 0 | Stroke thickness (for ring/outline modes). |
| Feather | number | 0–32767 | 0 | Softens the edge of the circle. |
| Invert | boolean | true / false | false | Inverts the circle — fills everything outside the circle instead of inside. |
| Color | color | RGB | [255, 0, 0] (red) | Fill color of the circle. |
| Opacity | number | 0–100% | 100% | Opacity of the circle. |
| Blending Mode | enum | Standard AE blend modes | "Normal" | How the circle composites with the layer below. |

## Common Use Cases

### Solid Filled Circle
A basic solid disc shape.
```json
{
  "effectMatchName": "ADBE Circle",
  "properties": {
    "Center": [960, 540],
    "Radius": 200,
    "Edge": "None",
    "Color": [255, 200, 0],
    "Opacity": 100
  }
}
```

### Hollow Ring / Circle Outline
Ring shape using Thickness edge mode.
```json
{
  "effectMatchName": "ADBE Circle",
  "properties": {
    "Center": [960, 540],
    "Radius": 200,
    "Edge": "Thickness",
    "Thickness": 10,
    "Feather": 0,
    "Color": [255, 255, 255],
    "Opacity": 100
  }
}
```

### Soft Feathered Spotlight
Large feathered circle for a spotlight/vignette effect.
```json
{
  "effectMatchName": "ADBE Circle",
  "properties": {
    "Center": [960, 540],
    "Radius": 300,
    "Edge": "Thickness & Feather",
    "Feather": 150,
    "Color": [255, 255, 255],
    "Opacity": 80
  }
}
```

### Animated Expanding Ring
Animate Radius from small to large with Thickness edge for a ripple/pulse effect.
```json
{
  "effectMatchName": "ADBE Circle",
  "properties": {
    "Center": [960, 540],
    "Radius": 50,
    "Edge": "Thickness",
    "Thickness": 8,
    "Feather": 20,
    "Color": [100, 200, 255],
    "Opacity": 100
  }
}
```

## Tips & Gotchas
- **Edge: "None"** creates a completely filled disc with no ring. To create a ring, use "Thickness" or "Edge Radius" mode.
- **"Thickness*Radius"** scales the stroke thickness proportionally as the Radius changes — useful for animated expanding rings where you want consistent visual weight.
- **Invert** is powerful for creating a circular mask: place a dark circle at the edges on a separate layer with Invert = true to create a vignette.
- For multiple circles or complex shapes, **Shape Layers** offer more control. Use Circle effect when a simple programmatic circle is sufficient.
- The **Feather** value applies uniformly around the entire edge of the circle.
- Circles can also be used as a fast matte by setting the layer to Alpha Matte mode after pre-composing.
- Animating **Radius** and **Opacity** together (radius grows, opacity fades) creates a natural-looking pulse/ripple animation.
