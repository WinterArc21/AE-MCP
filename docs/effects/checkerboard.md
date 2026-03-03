# Checkerboard

**Match Name:** `"ADBE Checkerboard"`
**Category:** Generate

Generates a two-color checkerboard pattern directly on a layer. Useful for creating grid backgrounds, UV reference patterns, test cards, and repeating tile textures.

## Properties

| Property | Type | Range | Default | Description |
|----------|------|-------|---------|-------------|
| Anchor | number[2] (point) | [x, y] | Comp center | The anchor point from which the checkerboard grid originates. |
| Size | enum | "Width Slider" / "Width & Height Sliders" / "Corner Point" | "Width Slider" | Determines how tile size is specified. |
| Width | number | 0–32767 | 30 | Width of each checker tile in pixels (used with Width Slider or Width & Height Sliders). |
| Height | number | 0–32767 | 30 | Height of each checker tile in pixels (used with Width & Height Sliders). |
| Feather | number | 0–32767 | 0 | Softens/blurs the edges between the checker colors. |
| Color | color | RGB | [0, 0, 0] (black) | The first checker color. The second color is the layer's existing color or a transparent/white fill. |
| Opacity | number | 0–100% | 100% | Opacity of the checkerboard overlay. |
| Blending Mode | enum | Standard AE blend modes | "Normal" | How the checkerboard composites with the original layer. |

## Common Use Cases

### Standard Black and White Checkerboard
Classic 50×50px black/white grid.
```json
{
  "effectMatchName": "ADBE Checkerboard",
  "properties": {
    "Anchor": [960, 540],
    "Width": 50,
    "Height": 50,
    "Color": [0, 0, 0],
    "Opacity": 100,
    "Feather": 0
  }
}
```

### Fine Reference Grid
Small checker tiles for alignment reference.
```json
{
  "effectMatchName": "ADBE Checkerboard",
  "properties": {
    "Anchor": [0, 0],
    "Width": 20,
    "Height": 20,
    "Color": [50, 50, 50],
    "Opacity": 100,
    "Feather": 0
  }
}
```

### Soft Blurred Checkerboard Texture
Feathered checker for a soft pattern background.
```json
{
  "effectMatchName": "ADBE Checkerboard",
  "properties": {
    "Anchor": [960, 540],
    "Width": 80,
    "Height": 80,
    "Color": [200, 200, 200],
    "Opacity": 100,
    "Feather": 30
  }
}
```

### Colored Grid Overlay
Colored checkerboard at reduced opacity as an artistic overlay.
```json
{
  "effectMatchName": "ADBE Checkerboard",
  "properties": {
    "Anchor": [960, 540],
    "Width": 100,
    "Height": 100,
    "Color": [255, 100, 0],
    "Opacity": 40,
    "Feather": 0
  }
}
```

## Tips & Gotchas
- The **two colors** of a checkerboard are: (1) the **Color** property and (2) the underlying layer color or transparency. To get a true two-color checker, apply it on a Solid layer of the second color.
- **Anchor** sets the origin of the grid — if you want the grid to start at the top-left corner of the composition, set Anchor to [0, 0].
- **Size: "Width & Height Sliders"** enables rectangular (non-square) tiles, useful for non-square grids.
- Feather values above 50% heavily blur the checker until it looks more like a soft gradient than a grid.
- Animate **Anchor** to scroll/pan the checkerboard across the frame.
- Combining Checkerboard with a **Hue/Saturation** effect or color correction allows dynamic color changes on the grid.
