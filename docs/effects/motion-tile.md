# Motion Tile

**Match Name:** `"ADBE Tile"`
**Category:** Stylize

Tiles (repeats) the layer content across a larger area by expanding the output size beyond the original layer boundaries. Supports mirrored tiling for seamless patterns. Also includes phase offset for animated tiling motion. Useful for creating infinite scrolling backgrounds and seamless repeating textures.

## Properties

| Property | Type | Range | Default | Description |
|----------|------|-------|---------|-------------|
| Tile Center | number[2] (point) | [x, y] | Comp center | The position in the original layer from which tiling expands. |
| Tile Width | number | 1–10000% | 100% | Width of the output tiled area as a percentage of the original layer width. 200% = 2× as wide. |
| Tile Height | number | 1–10000% | 100% | Height of the output tiled area. |
| Output Width | number | 1–10000% | 100% | Width of the output frame. |
| Output Height | number | 1–10000% | 100% | Height of the output frame. |
| Mirror Edges | boolean | true / false | false | When true, alternating tiles are mirrored, creating seamless edge-to-edge reflections. |
| Phase | number | 0–360° | 0° | Shifts the phase of the tiling horizontally, enabling animated scrolling. |
| Horizontal Phase Shift | boolean | true / false | false | When true, Phase shifts horizontally; when false, shifts vertically. |

## Common Use Cases

### Infinite Tiling Background
Tile a texture or pattern across the full composition frame.
```json
{
  "effectMatchName": "ADBE Tile",
  "properties": {
    "Tile Center": [960, 540],
    "Tile Width": 100,
    "Tile Height": 100,
    "Output Width": 400,
    "Output Height": 300,
    "Mirror Edges": false,
    "Phase": 0
  }
}
```

### Seamless Mirror Tile
Use Mirror Edges for a seamlessly repeating pattern without visible seams.
```json
{
  "effectMatchName": "ADBE Tile",
  "properties": {
    "Tile Width": 100,
    "Tile Height": 100,
    "Output Width": 600,
    "Output Height": 400,
    "Mirror Edges": true,
    "Phase": 0
  }
}
```

### Animated Scrolling Tile
Animate Phase to scroll the tiled texture across the frame.
```json
{
  "effectMatchName": "ADBE Tile",
  "properties": {
    "Tile Width": 50,
    "Tile Height": 50,
    "Output Width": 300,
    "Output Height": 200,
    "Mirror Edges": false,
    "Phase": 0,
    "Horizontal Phase Shift": true
  }
}
```

### Small Repeating Pattern
Very small tile size for a dense repeating graphic pattern.
```json
{
  "effectMatchName": "ADBE Tile",
  "properties": {
    "Tile Width": 20,
    "Tile Height": 20,
    "Output Width": 500,
    "Output Height": 500,
    "Mirror Edges": true,
    "Phase": 0
  }
}
```

## Tips & Gotchas
- **Tile Width/Height are percentages of the original layer size**, not pixel values. A 1920×1080 layer at Tile Width 50% = each tile is 960px wide.
- **Output Width/Height** must be set larger than 100% to actually see the tiled area — at 100% you see only the original layer.
- **Mirror Edges: true** eliminates visible seaming at tile boundaries by flipping alternating tiles. This only works well if the source layer has compatible edge content.
- **Phase** animation is the best way to create a continuously scrolling tile — use the expression `time * 60` for a steady horizontal scroll.
- Motion Tile expands the layer's effective bounds — combine with a pre-comp set to "Collapse Transformations" to render the full tiled area.
- Output Width/Height values much larger than 500% can significantly increase render time.
- Tile Center shifts which part of the original layer is used as the tile origin point.
