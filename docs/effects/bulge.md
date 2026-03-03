# Bulge

**Match Name:** `"ADBE Bulge"`
**Category:** Distort

Creates a circular lens-like distortion that either pushes pixels outward (bulge) or pulls them inward (pinch) from a center point. Simulates fisheye lenses, droplets, or bubble distortions.

## Properties

| Property | Type | Range | Default | Description |
|----------|------|-------|---------|-------------|
| Horizontal Radius | number | 1–32767 | 100 | The horizontal radius of the distortion area in pixels. |
| Vertical Radius | number | 1–32767 | 100 | The vertical radius of the distortion area in pixels. |
| Bulge Center | number[2] (point) | [x, y] | Comp center | The center point of the bulge effect. |
| Bulge Height | number | -4 to +4 | 1.0 | The strength and direction of distortion. Positive = outward bulge; negative = inward pinch. 0 = no effect. |
| Taper Radius | number | 0–1000% | 0% | Tapers the strength of the distortion toward the outer edge of the radius. Higher = smoother falloff. |
| Antialiasing | enum | "Low" / "High" | "Low" | Rendering quality. High reduces jagged edges. |
| Pin Edges | boolean | true / false | false | Prevents the outer area from being affected, containing distortion within the radius. |

## Common Use Cases

### Fisheye Lens Effect
Strong outward bulge over the full layer.
```json
{
  "effectMatchName": "ADBE Bulge",
  "properties": {
    "Horizontal Radius": 800,
    "Vertical Radius": 800,
    "Bulge Center": [960, 540],
    "Bulge Height": 2.0,
    "Taper Radius": 50,
    "Antialiasing": "High"
  }
}
```

### Water Droplet Bulge
Small, sharp bulge simulating a water droplet lens.
```json
{
  "effectMatchName": "ADBE Bulge",
  "properties": {
    "Horizontal Radius": 150,
    "Vertical Radius": 150,
    "Bulge Center": [960, 540],
    "Bulge Height": 3.0,
    "Taper Radius": 30,
    "Antialiasing": "High"
  }
}
```

### Pinch / Tunnel Effect
Negative Bulge Height pulls pixels inward for a sucking-in effect.
```json
{
  "effectMatchName": "ADBE Bulge",
  "properties": {
    "Horizontal Radius": 500,
    "Vertical Radius": 500,
    "Bulge Center": [960, 540],
    "Bulge Height": -2.5,
    "Taper Radius": 60,
    "Antialiasing": "High"
  }
}
```

### Animated Eye Bulge
Moderate bulge positioned over an eye for a comedic exaggeration effect.
```json
{
  "effectMatchName": "ADBE Bulge",
  "properties": {
    "Horizontal Radius": 120,
    "Vertical Radius": 100,
    "Bulge Center": [640, 360],
    "Bulge Height": 1.5,
    "Taper Radius": 40,
    "Antialiasing": "High"
  }
}
```

## Tips & Gotchas
- **Bulge Height = 0** produces no distortion; values between -1 and +1 are subtle; values near ±4 are very extreme.
- Use different **Horizontal Radius** and **Vertical Radius** values to create an elliptical, asymmetric distortion.
- **Taper Radius** controls the smoothness of the distortion falloff — keep it above 20 for natural-looking results; 0 produces a harsh, ring-like boundary.
- **Antialiasing: High** is recommended for final output, especially for large distortions.
- Animating Bulge Height from 0 to a value and back creates a "pulse" effect.
- For full-frame fisheye correction/creation, set the radius values to exceed the layer dimensions.
- Bulge is applied in layer space, so moving the layer does not move the distortion center unless you also move Bulge Center.
