# Linear Wipe

**Match Name:** `"ADBE Linear Wipe"`
**Category:** Transition

Reveals or conceals a layer with a straight-edged wipe that moves in any direction. The Transition Completion property drives the wipe from fully visible (0%) to fully hidden (100%). The Wipe Angle controls the direction, and Feather softens the wipe edge.

## Properties

| Property | Type | Range | Default | Description |
|----------|------|-------|---------|-------------|
| Transition Completion | number | 0–100% | 0% | Drives the wipe: 0% = fully revealed; 100% = fully concealed. Animate this to create the transition. |
| Wipe Angle | number (angle) | 0–360° | 90° | The direction of the wipe. 0° = top-to-bottom; 90° = right-to-left; 180° = bottom-to-top; 270° = left-to-right. |
| Feather | number | 0–500 | 0 | Softness of the wipe edge in pixels. 0 = hard crisp edge; higher = soft gradient edge. |

## Common Use Cases

### Left-to-Right Reveal
Classic horizontal reveal wipe used in presentations.
```json
{
  "effectMatchName": "ADBE Linear Wipe",
  "properties": {
    "Transition Completion": 0,
    "Wipe Angle": 270,
    "Feather": 0
  }
}
```

### Top-to-Bottom Wipe Out
Layer wipes down to reveal what's beneath.
```json
{
  "effectMatchName": "ADBE Linear Wipe",
  "properties": {
    "Transition Completion": 0,
    "Wipe Angle": 0,
    "Feather": 0
  }
}
```

### Soft-Edge Reveal (Feathered)
Feathered wipe for a soft, organic reveal (brush-like).
```json
{
  "effectMatchName": "ADBE Linear Wipe",
  "properties": {
    "Transition Completion": 0,
    "Wipe Angle": 270,
    "Feather": 80
  }
}
```

### Diagonal Wipe
45° diagonal wipe for a dynamic directional transition.
```json
{
  "effectMatchName": "ADBE Linear Wipe",
  "properties": {
    "Transition Completion": 0,
    "Wipe Angle": 45,
    "Feather": 20
  }
}
```

### Wipe With Gradient Edge
Very high feather creates a gradient reveal that fades rather than wipes.
```json
{
  "effectMatchName": "ADBE Linear Wipe",
  "properties": {
    "Transition Completion": 0,
    "Wipe Angle": 270,
    "Feather": 300
  }
}
```

## Tips & Gotchas
- **The primary keyframe is on Transition Completion** — animate from 0% (visible) to 100% (hidden) to wipe the layer out, or 100% to 0% to wipe it in.
- **Wipe Angle orientation:** 0° wipes top-down; 90° wipes right-to-left; 180° wipes bottom-up; 270° wipes left-to-right.
- For a **reveal wipe** (layer appears from behind a wipe), place the layer above others and animate Transition Completion from 100% to 0%.
- Feather of 0 is a sharp cut — appropriate for graphic/motion-graphics wipes. For video transitions, Feather of 20–100 looks more natural.
- To reveal a layer between two other layers, place the wiping layer between them in the stack and use Linear Wipe as a mask.
- Combine with the layer's **Opacity** animation for a combined wipe + fade effect.
- Use **Easy Ease** (F9) on the Transition Completion keyframes for a natural acceleration/deceleration.
