# Radial Blur

**Match Name:** `"ADBE Radial Blur"`
**Category:** Blur & Sharpen

Blurs pixels radially from a center point, either by spinning them around the center (Spin) or zooming them outward from the center (Zoom). Produces dramatic speed-zoom or vortex effects.

## Properties

| Property | Type | Range | Default | Description |
|----------|------|-------|---------|-------------|
| Amount | number | 0–1000 | 0 | Strength of the blur. Higher values produce more intense rotation or zoom streaks. |
| Center | number[2] (point) | [x, y] | [960, 540] (comp center) | The point around which the blur radiates or spins. |
| Type | enum | "Spin" / "Zoom" | "Spin" | Spin rotates pixels around the center; Zoom streaks them outward/inward. |
| Antialiasing | enum | "Low" / "High" | "Low" | High produces smoother results at the cost of render time. |

## Common Use Cases

### Zoom Blast Transition
Zoom blur from center for a dramatic scene transition.
```json
{
  "effectMatchName": "ADBE Radial Blur",
  "properties": {
    "Amount": 60,
    "Center": [960, 540],
    "Type": "Zoom",
    "Antialiasing": "High"
  }
}
```

### Spin / Vortex Effect
Spin blur for a hypnotic rotating look.
```json
{
  "effectMatchName": "ADBE Radial Blur",
  "properties": {
    "Amount": 25,
    "Center": [960, 540],
    "Type": "Spin",
    "Antialiasing": "High"
  }
}
```

### Off-Center Spin (Logo Reveal)
Spin blur centered on a logo element rather than the frame center.
```json
{
  "effectMatchName": "ADBE Radial Blur",
  "properties": {
    "Amount": 40,
    "Center": [720, 400],
    "Type": "Spin",
    "Antialiasing": "Low"
  }
}
```

### Subtle Focus Pull
Very light Zoom blur to simulate a lens focus effect.
```json
{
  "effectMatchName": "ADBE Radial Blur",
  "properties": {
    "Amount": 8,
    "Center": [960, 540],
    "Type": "Zoom",
    "Antialiasing": "High"
  }
}
```

## Tips & Gotchas
- **Radial Blur is computationally expensive** at High antialiasing — use Low during preview and switch to High only for final render.
- The Center point is defined in layer space, not composition space, unless the layer fills the entire comp.
- Animating Amount from a high value (e.g., 80) down to 0 creates an effective "zoom in" reveal from blurred to sharp.
- Zoom type can simulate a security camera or VHS zoom artifact at low Amount values (~5–15).
- Combine Spin type with a Hue/Saturation effect for a color-twisted vortex look.
- At Amount values above ~200, the result becomes heavily abstract. Values of 10–60 are typical for most cinematic uses.
