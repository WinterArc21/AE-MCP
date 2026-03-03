# Optics Compensation

**Match Name:** `"ADBE Optics Compensation"`
**Category:** Distort

Corrects or introduces radial lens distortion (barrel or pincushion) based on a Field of View angle. Used to remove the curved-edge distortion from wide-angle lenses or to intentionally add fisheye / pincushion distortion for stylistic purposes.

## Properties

| Property | Type | Range | Default | Description |
|----------|------|-------|---------|-------------|
| Field of View (FOV) | number | 0–180° | 0° | The simulated field of view angle. Higher values apply stronger distortion correction or creation. |
| Reverse Lens Distortion | boolean | true / false | false | When enabled, applies the inverse of the compensation — adds distortion rather than removing it. Use to create fisheye from a flat source. |
| FOV Orientation | enum | "Horizontal" / "Vertical" / "Diagonal" | "Horizontal" | The axis along which the FOV is measured, affecting how the correction is scaled. |
| View Center | number[2] (point) | Comp center | The optical center of the lens distortion. Offset to match off-center lens distortion. |
| Optimal Pixels | boolean | true / false | false | When enabled, preserves pixels at the expense of a wider bounding box; prevents pixel loss at edges. |

## Common Use Cases

### Correct Barrel Distortion (Wide-Angle Lens)
Remove the curving barrel distortion from a 180° fisheye lens clip.
```json
{
  "effectMatchName": "ADBE Optics Compensation",
  "properties": {
    "Field of View": 100,
    "Reverse Lens Distortion": false,
    "FOV Orientation": "Horizontal",
    "View Center": [960, 540]
  }
}
```

### Add Fisheye Effect
Apply reverse compensation to a flat layer to create a fisheye look.
```json
{
  "effectMatchName": "ADBE Optics Compensation",
  "properties": {
    "Field of View": 90,
    "Reverse Lens Distortion": true,
    "FOV Orientation": "Horizontal",
    "View Center": [960, 540]
  }
}
```

### Subtle Pincushion Add
Mild reverse distortion for a slight pincushion/telephoto look.
```json
{
  "effectMatchName": "ADBE Optics Compensation",
  "properties": {
    "Field of View": 30,
    "Reverse Lens Distortion": true,
    "FOV Orientation": "Horizontal"
  }
}
```

### GoPro-Style Correction
Moderate correction for typical action camera (GoPro) barrel distortion.
```json
{
  "effectMatchName": "ADBE Optics Compensation",
  "properties": {
    "Field of View": 75,
    "Reverse Lens Distortion": false,
    "FOV Orientation": "Horizontal",
    "View Center": [960, 540]
  }
}
```

## Tips & Gotchas
- **Reverse Lens Distortion = false** corrects distortion (removes fisheye). **Reverse Lens Distortion = true** adds distortion to a flat source.
- The exact FOV value needed to correct real footage must be matched to the actual lens — you may need to test and iterate.
- **FOV of 0** produces no effect — always use a value above 0.
- After correction, **corners of the layer will be empty** (black or transparent) as the barrel-corrected image doesn't fill the full rectangle. Crop or scale the layer after applying.
- **Optimal Pixels** expands the canvas to fit the corrected image — useful when you cannot crop and need to preserve all pixel data.
- For accurate professional lens correction, consider using the **Lens Correction** plugin or Premiere Pro's Lens Distortion effect, which supports lens profile databases.
- View Center should match the optical center of the lens — usually the composition center but can be offset for off-axis lens configurations.
