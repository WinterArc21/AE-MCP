# Corner Pin

**Match Name:** `"ADBE Corner Pin"`
**Category:** Distort

Repositions the four corners of a layer to any position, creating a perspective warp. Commonly used for replacing screens, mapping footage onto flat surfaces, and correcting or creating keystoned perspectives. Can be directly linked to motion tracking data.

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| Upper Left | number[2] (point) | [0, 0] | Position of the upper-left corner of the layer. |
| Upper Right | number[2] (point) | [w, 0] | Position of the upper-right corner. `w` = layer width. |
| Lower Left | number[2] (point) | [0, h] | Position of the lower-left corner. `h` = layer height. |
| Lower Right | number[2] (point) | [w, h] | Position of the lower-right corner. |

> All coordinates are in **composition space** (pixels from top-left of composition).

## Common Use Cases

### Screen / Monitor Replacement
Pin a layer to the four corners of a screen tracked in the footage.
```json
{
  "effectMatchName": "ADBE Corner Pin",
  "properties": {
    "Upper Left": [320, 180],
    "Upper Right": [1100, 210],
    "Lower Right": [1080, 780],
    "Lower Left": [310, 760]
  }
}
```

### Book / Magazine Page Map
Map a flat design onto a slightly angled book page.
```json
{
  "effectMatchName": "ADBE Corner Pin",
  "properties": {
    "Upper Left": [200, 150],
    "Upper Right": [800, 120],
    "Lower Right": [820, 950],
    "Lower Left": [180, 970]
  }
}
```

### Billboard Replacement
Map a new ad onto a billboard surface tracked with perspective.
```json
{
  "effectMatchName": "ADBE Corner Pin",
  "properties": {
    "Upper Left": [450, 100],
    "Upper Right": [1400, 80],
    "Lower Right": [1420, 500],
    "Lower Left": [440, 520]
  }
}
```

### Keystone Correction
Remove trapezoidal perspective distortion from a projected slide or tilted camera.
```json
{
  "effectMatchName": "ADBE Corner Pin",
  "properties": {
    "Upper Left": [100, 0],
    "Upper Right": [1820, 0],
    "Lower Right": [1920, 1080],
    "Lower Left": [0, 1080]
  }
}
```

## Tips & Gotchas
- Corner Pin uses **composition coordinates**, not layer coordinates. [0, 0] is the top-left of the composition.
- When the default values match the layer's natural bounds, the layer appears undistorted. Deviating from defaults creates the perspective warp.
- **Motion tracking** in After Effects can export tracked corner data directly to a Corner Pin effect — use the Tracker panel and target "Corner Pin" as the apply target.
- For **curved** or non-rectilinear distortion, use **Bezier Warp** instead.
- Extremely distorted corner pins (very acute angles) can produce rendering artifacts — Bezier Warp with High Quality handles this better.
- The effective resolution degrades at extreme angles — pre-render high-resolution source footage for best results.
- Corner Pin is computed on the layer's full pixel grid, so the layer should ideally match or exceed the size of the target surface.
