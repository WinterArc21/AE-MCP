# Camera Lens Blur

**Match Name:** `"ADBE Camera Lens Blur"`
**Category:** Blur & Sharpen

Simulates an optical camera lens blur (bokeh), including realistic iris shapes and specular highlight behavior. Produces the characteristic hexagonal or circular out-of-focus discs seen in real camera footage. Supports blur maps for depth-of-field based on grayscale depth mattes.

## Properties

| Property | Type | Range | Default | Description |
|----------|------|-------|---------|-------------|
| Blur Radius | number | 0–500 | 0 | The radius of the lens blur / bokeh discs in pixels. |
| Iris Shape | enum | "Triangle" / "Square" / "Pentagon" / "Hexagon" / "Heptagon" / "Octagon" / "Nonagon" / "Decagon" | "Hexagon" | The polygon shape of the iris aperture. Affects bokeh disc shape. |
| Iris Rotation | number (angle) | 0–360° | 0° | Rotates the iris polygon. |
| Iris Roundness | number | 0–100% | 0% | Rounds the corners of the iris polygon toward a perfect circle. |
| Iris Aspect Ratio | number | 0.1–4.0 | 1.0 | Stretches the iris shape horizontally or vertically. |
| Iris Diffraction Fringe | number | 0–100 | 0 | Adds chromatic fringe around bokeh highlights. |
| Specular Threshold | number | 0–255 | 128 | Brightness threshold above which highlights are boosted. |
| Specular Saturation | number | 0–8 | 1 | Color saturation of the specular highlights in the bokeh discs. |
| Blur Focal Distance | number | 0–1 | 0 | Depth value (0–1) at which the layer is in focus when a blur map is used. |
| Blur Map Layer | layer reference | — | None | A grayscale layer used as a depth map. White = far, Black = near (or reverse depending on settings). |
| Blur Map Channel | enum | "Luminance" / "Red" / "Green" / "Blue" / "Alpha" | "Luminance" | Which channel of the blur map layer to read depth from. |
| Blur Map Maximum | boolean | true / false | false | When enabled, uses the maximum value from all channels. |
| Noise | number | 0–100% | 0 | Adds noise to the blur for a more filmic look. |
| Linear Color Space | boolean | true / false | true | Processes blur in linear color space for physically accurate results. |
| Repeat Edge Pixels | boolean | true / false | false | Prevents dark edge halos by repeating boundary pixel values. |

## Common Use Cases

### Cinematic Bokeh Blur
Beautiful out-of-focus background with hexagonal bokeh discs.
```json
{
  "effectMatchName": "ADBE Camera Lens Blur",
  "properties": {
    "Blur Radius": 35,
    "Iris Shape": "Hexagon",
    "Iris Roundness": 40,
    "Specular Threshold": 180,
    "Specular Saturation": 2,
    "Repeat Edge Pixels": true
  }
}
```

### Depth-of-Field with Blur Map
Use a grayscale depth matte to blur far objects more than near ones.
```json
{
  "effectMatchName": "ADBE Camera Lens Blur",
  "properties": {
    "Blur Radius": 50,
    "Iris Shape": "Octagon",
    "Iris Roundness": 60,
    "Blur Focal Distance": 0.3,
    "Specular Threshold": 200,
    "Specular Saturation": 1.5,
    "Repeat Edge Pixels": true
  }
}
```

### Anamorphic Lens Blur
Oval bokeh simulating an anamorphic cinema lens.
```json
{
  "effectMatchName": "ADBE Camera Lens Blur",
  "properties": {
    "Blur Radius": 28,
    "Iris Shape": "Decagon",
    "Iris Roundness": 80,
    "Iris Aspect Ratio": 2.0,
    "Iris Rotation": 0,
    "Repeat Edge Pixels": true
  }
}
```

### Subtle Focus Highlight
Very slight blur to soften background while boosting bright specular points.
```json
{
  "effectMatchName": "ADBE Camera Lens Blur",
  "properties": {
    "Blur Radius": 10,
    "Iris Shape": "Hexagon",
    "Specular Threshold": 220,
    "Specular Saturation": 3,
    "Repeat Edge Pixels": true
  }
}
```

## Tips & Gotchas
- **Camera Lens Blur is the slowest blur effect** in After Effects. Use Gaussian Blur or Fast Box Blur for previews, then swap to Camera Lens Blur for final renders.
- **Specular Threshold** controls which bright pixels become visible bokeh discs. Lower the threshold to see more discs in the background.
- **Linear Color Space** should generally be left on for physically accurate bokeh; disabling it may produce brighter or differently-colored highlights.
- When using a **Blur Map Layer**, pre-render the depth matte as a grayscale image for best performance.
- Iris Roundness at 100% produces a perfect circle regardless of Iris Shape.
- Combine with **Glow** effect on a separate layer for extra-bright highlight halos.
- The effect renders more slowly on 32-bpc compositions.
