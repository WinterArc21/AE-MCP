# Mosaic

**Match Name:** `"ADBE Mosaic"`
**Category:** Stylize

Divides the layer into a grid of rectangular blocks and fills each block with the average color of that region, creating a pixelated/mosaic appearance. Commonly used to censor faces, create retro pixel art looks, or add stylized blocky effects.

## Properties

| Property | Type | Range | Default | Description |
|----------|------|-------|---------|-------------|
| Horizontal Blocks | number (integer) | 1–1000 | 10 | Number of pixel blocks horizontally. Fewer blocks = larger, more pixelated tiles. |
| Vertical Blocks | number (integer) | 1–1000 | 10 | Number of pixel blocks vertically. |
| Sharp Colors | boolean | true / false | false | When true, uses a nearest-neighbor sampling mode for harder block boundaries. |

## Common Use Cases

### Face Censor / Privacy Blur
Heavy pixelation over a face or sensitive area.
```json
{
  "effectMatchName": "ADBE Mosaic",
  "properties": {
    "Horizontal Blocks": 15,
    "Vertical Blocks": 15,
    "Sharp Colors": true
  }
}
```

### Pixel Art / Retro 8-Bit Style
Strong pixelation for an 8-bit game aesthetic.
```json
{
  "effectMatchName": "ADBE Mosaic",
  "properties": {
    "Horizontal Blocks": 40,
    "Vertical Blocks": 22,
    "Sharp Colors": true
  }
}
```

### Subtle Artistic Texture
Large blocks, soft colors for a painterly mosaic effect.
```json
{
  "effectMatchName": "ADBE Mosaic",
  "properties": {
    "Horizontal Blocks": 80,
    "Vertical Blocks": 45,
    "Sharp Colors": false
  }
}
```

### Animated Pixelation (Transition)
Animate Horizontal Blocks and Vertical Blocks from low to high values for a "pixelate-in" transition.
```json
{
  "effectMatchName": "ADBE Mosaic",
  "properties": {
    "Horizontal Blocks": 5,
    "Vertical Blocks": 3,
    "Sharp Colors": true
  }
}
```

## Tips & Gotchas
- **Fewer blocks = larger tiles = more pixelated**. At 1×1, the entire layer becomes a single solid color.
- **Horizontal Blocks and Vertical Blocks can differ** — use a 16:9 ratio (e.g., 192×108) to produce square pixels on a 1920×1080 composition.
- **Sharp Colors: true** is almost always preferred for pixel art or censoring as it creates clearly defined block boundaries. Sharp Colors: false produces softer averages.
- To censor only a specific region, apply Mosaic to a pre-composed layer or use it in combination with a mask.
- **Animating block count** from low to high (or high to low) creates a smooth pixelate/depixelate transition — ease keyframes for natural feel.
- Mosaic computes the average color per block, not a median — it will be influenced by outlier bright/dark pixels.
- For square tiles on any composition size, calculate: Horizontal Blocks = comp_width / desired_tile_size; Vertical Blocks = comp_height / desired_tile_size.
