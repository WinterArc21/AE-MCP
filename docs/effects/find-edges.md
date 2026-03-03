# Find Edges

**Match Name:** `"ADBE Find Edges"`
**Category:** Stylize

Detects and highlights the edges in an image by identifying areas of high contrast between neighboring pixels. The result is a line-art style image with edges rendered as colored or white lines on a black or white background. Invert flips the result to dark lines on a white background (classic sketch look).

## Properties

| Property | Type | Range | Default | Description |
|----------|------|-------|---------|-------------|
| Invert | boolean | true / false | false | When false: bright edges on black background. When true: dark edges on white background (sketch/line-art look). |
| Blend With Original | number | 0–100% | 0% | Blends the find edges result with the original image. 0% = pure edge image; 100% = original unchanged. |

## Common Use Cases

### Classic Sketch / Line Art
Invert enabled for dark lines on white background.
```json
{
  "effectMatchName": "ADBE Find Edges",
  "properties": {
    "Invert": true,
    "Blend With Original": 0
  }
}
```

### Neon Edge Effect
Bright colored edges on black — apply color grading after for neon look.
```json
{
  "effectMatchName": "ADBE Find Edges",
  "properties": {
    "Invert": false,
    "Blend With Original": 0
  }
}
```

### Soft Edge Overlay Blend
Find edges with high original blend to add a subtle edge-detail texture.
```json
{
  "effectMatchName": "ADBE Find Edges",
  "properties": {
    "Invert": false,
    "Blend With Original": 70
  }
}
```

### Edge Matte for Selective Sharpening
Use Find Edges output as a track matte to limit sharpening to edge areas only.
```json
{
  "effectMatchName": "ADBE Find Edges",
  "properties": {
    "Invert": false,
    "Blend With Original": 0
  }
}
```

## Tips & Gotchas
- **Find Edges preserves the original colors** of edges — the edge lines will match the hue of the original pixels. For monochrome line art, desaturate with **Hue/Saturation** afterward.
- The effect is sensitive to noise — apply a light **Gaussian Blur** (Blurriness 1–3) before Find Edges to reduce noisy, chaotic edge detection.
- **Blend With Original at 20–40%** with a Screen or Overlay blend mode creates a beautiful stylized video look.
- For a comic book / cel-shaded animation effect, combine Find Edges (Invert = true) with **Posterize**.
- Find Edges is often used as an intermediate step (pre-composed away from view) to drive other effects or track mattes.
- The effect has no radius or threshold controls — all sensitivity is determined by the input image. Pre-blur for less detail; high-contrast images produce more prominent edges.
