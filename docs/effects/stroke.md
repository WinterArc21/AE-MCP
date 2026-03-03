# Stroke

**Match Name:** `"ADBE Stroke"`
**Category:** Generate

Draws a colored stroke (line) along a mask path on a layer. The Start and End properties allow animating the stroke to progressively appear or disappear, making it ideal for write-on animations. Multiple paint style options control how the stroke interacts with layer content.

## Properties

| Property | Type | Range/Options | Default | Description |
|----------|------|---------------|---------|-------------|
| Path | mask reference | Any mask on the layer | None | The mask path that the stroke follows. |
| All Masks | boolean | true / false | false | When true, strokes all masks on the layer simultaneously. |
| Stroke Sequentially | boolean | true / false | false | When all masks are stroked, draws them one at a time in sequence rather than all at once. |
| Color | color | RGB | [255, 0, 0] (red) | Color of the stroke. |
| Brush Size | number | 0–32767 | 10 | Width of the stroke in pixels. |
| Brush Hardness | number | 0–100% | 100% | Edge softness of the stroke. 100% = hard edge; lower = soft, feathered edge. |
| Opacity | number | 0–100% | 100% | Transparency of the stroke. |
| Start | number | 0–100% | 0% | Starting point of the stroke along the path. 0% = beginning of path. |
| End | number | 0–100% | 100% | Ending point of the stroke along the path. 100% = end of path. |
| Spacing | number | 0–32767 | 15 | Distance between brush stamps along the path. Lower values produce a more solid line. |
| Paint Style | enum | "On Original Image" / "On Transparent" / "Reveal Original" | "On Original Image" | Controls how the stroke composites with the layer. |

## Common Use Cases

### Write-On Text Animation
Animate End from 0% to 100% over time to draw a stroke along a text path.
```json
{
  "effectMatchName": "ADBE Stroke",
  "properties": {
    "All Masks": false,
    "Color": [255, 255, 255],
    "Brush Size": 4,
    "Brush Hardness": 100,
    "Opacity": 100,
    "Start": 0,
    "End": 100,
    "Spacing": 2,
    "Paint Style": "On Transparent"
  }
}
```

### Signature Write-On Effect
Soft brush on transparent background mimicking handwriting or signature.
```json
{
  "effectMatchName": "ADBE Stroke",
  "properties": {
    "All Masks": false,
    "Color": [0, 0, 0],
    "Brush Size": 6,
    "Brush Hardness": 70,
    "Opacity": 90,
    "Start": 0,
    "End": 0,
    "Spacing": 3,
    "Paint Style": "On Transparent"
  }
}
```

### Dashed Outline on Original
Stroke following the outline of a graphic element, painted over the original.
```json
{
  "effectMatchName": "ADBE Stroke",
  "properties": {
    "All Masks": true,
    "Color": [255, 200, 0],
    "Brush Size": 3,
    "Brush Hardness": 100,
    "Opacity": 100,
    "Start": 0,
    "End": 100,
    "Spacing": 20,
    "Paint Style": "On Original Image"
  }
}
```

### Reveal Original Through Stroke
Reveal underlying layer content by painting along a path.
```json
{
  "effectMatchName": "ADBE Stroke",
  "properties": {
    "All Masks": false,
    "Brush Size": 40,
    "Brush Hardness": 80,
    "Opacity": 100,
    "Start": 0,
    "End": 0,
    "Spacing": 5,
    "Paint Style": "Reveal Original"
  }
}
```

## Tips & Gotchas
- **Animate End from 0% to 100%** for a forward write-on. Animate Start from 0% to 100% for a stroke that erases from the beginning.
- **Spacing** must be kept low (1–5) for solid lines — higher spacing creates dashes or dotted lines.
- **Paint Style: "On Transparent"** places the stroke on a transparent background, letting you composite it freely with blend modes.
- **Paint Style: "Reveal Original"** uses the stroke as an animated reveal mask — great for ink-wipe transitions.
- The mask used for the stroke path must be on the **same layer** as the Stroke effect.
- For complex multi-path animations, enable **Stroke Sequentially** with All Masks to draw each mask path in order.
- **Brush Hardness** below 50% creates a soft, painterly stroke — combine with low Opacity for watercolor effects.
- Ease keyframes on the End property to simulate natural drawing acceleration/deceleration.
