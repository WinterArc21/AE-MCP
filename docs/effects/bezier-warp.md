# Bezier Warp

**Match Name:** `"ADBE BEZMESH"`
**Category:** Distort

Warps a layer using a mesh of Bezier control points along its four edges (top, bottom, left, right). Each edge has three vertex points (corners + midpoint) and associated tangent handles, giving fine control over how the layer's geometry is deformed. Commonly used for perspective corrections, screen replacements, and organic shape deformation.

## Properties

> **Note:** All point properties are `[x, y]` coordinate pairs in layer pixel space.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| Top Left Vertex | number[2] | [0, 0] | Top-left corner point. |
| Top Left Tangent 1 | number[2] | [w/3, 0] | Left tangent handle for the top-left vertex. |
| Top Left Tangent 2 | number[2] | [0, h/3] | Right tangent handle for the top-left vertex. |
| Top Midpoint Vertex | number[2] | [w/2, 0] | Midpoint vertex of the top edge. |
| Top Midpoint Tangent 1 | number[2] | [w/3, 0] | Left tangent of the top midpoint. |
| Top Midpoint Tangent 2 | number[2] | [2w/3, 0] | Right tangent of the top midpoint. |
| Top Right Vertex | number[2] | [w, 0] | Top-right corner point. |
| Top Right Tangent 1 | number[2] | [2w/3, 0] | Left tangent of the top-right vertex. |
| Top Right Tangent 2 | number[2] | [w, h/3] | Right tangent of the top-right vertex. |
| Bottom Left Vertex | number[2] | [0, h] | Bottom-left corner. |
| Bottom Left Tangent 1 | number[2] | [0, 2h/3] | Top tangent of the bottom-left vertex. |
| Bottom Left Tangent 2 | number[2] | [w/3, h] | Right tangent of the bottom-left vertex. |
| Bottom Midpoint Vertex | number[2] | [w/2, h] | Midpoint vertex of the bottom edge. |
| Bottom Midpoint Tangent 1 | number[2] | [w/3, h] | Left tangent of the bottom midpoint. |
| Bottom Midpoint Tangent 2 | number[2] | [2w/3, h] | Right tangent of the bottom midpoint. |
| Bottom Right Vertex | number[2] | [w, h] | Bottom-right corner. |
| Bottom Right Tangent 1 | number[2] | [w, 2h/3] | Top tangent of the bottom-right vertex. |
| Bottom Right Tangent 2 | number[2] | [2w/3, h] | Left tangent of the bottom-right vertex. |
| Left Midpoint Vertex | number[2] | [0, h/2] | Midpoint vertex of the left edge. |
| Left Midpoint Tangent 1 | number[2] | [0, h/3] | Top tangent of the left midpoint. |
| Left Midpoint Tangent 2 | number[2] | [0, 2h/3] | Bottom tangent of the left midpoint. |
| Right Midpoint Vertex | number[2] | [w, h/2] | Midpoint vertex of the right edge. |
| Right Midpoint Tangent 1 | number[2] | [w, h/3] | Top tangent of the right midpoint. |
| Right Midpoint Tangent 2 | number[2] | [w, 2h/3] | Bottom tangent of the right midpoint. |
| Quality | enum | "Normal" / "High" | "Normal" | Rendering quality. High is smoother but slower. |

> In the above table, `w` = layer width, `h` = layer height.

## Common Use Cases

### Perspective Screen Replacement (Simple 4-Corner)
For basic perspective warp, move only the four corner vertices:
```json
{
  "effectMatchName": "ADBE BEZMESH",
  "properties": {
    "Top Left Vertex": [50, 80],
    "Top Right Vertex": [1850, 60],
    "Bottom Right Vertex": [1900, 1010],
    "Bottom Left Vertex": [30, 990]
  }
}
```

### Curved Banner / Flag Warp
Move edge midpoints inward/outward to create a curved edge effect:
```json
{
  "effectMatchName": "ADBE BEZMESH",
  "properties": {
    "Top Midpoint Vertex": [960, 40],
    "Bottom Midpoint Vertex": [960, 980]
  }
}
```

### Barrel Distortion (Outward Bulge on All Edges)
Push all midpoints outward to simulate barrel lens distortion:
```json
{
  "effectMatchName": "ADBE BEZMESH",
  "properties": {
    "Top Midpoint Vertex": [960, -40],
    "Bottom Midpoint Vertex": [960, 1120],
    "Left Midpoint Vertex": [-50, 540],
    "Right Midpoint Vertex": [1970, 540]
  }
}
```

## Tips & Gotchas
- **Bezier Warp is best suited for edge/boundary warps.** For complex internal warping, use **Puppet Tool** or **Displacement Map** instead.
- The 12 vertex + 12 tangent control scheme can be confusing — each vertex on an edge has two tangent handles (one pointing left/up along the edge and one pointing right/down).
- When tangent handles are left at their defaults (collinear with the edge), the edge will be straight. Moving them creates a curved edge.
- **Corner Pin** is faster and simpler for pure 4-corner perspective replacements — use Bezier Warp only when you need curved edges.
- Quality: High is recommended for final renders involving curved deformations to prevent interpolation artifacts.
- Bezier Warp does not support motion tracking directly — use Corner Pin with the tracker instead and switch to Bezier Warp for refinement.
