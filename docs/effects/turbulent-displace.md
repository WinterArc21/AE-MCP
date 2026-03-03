# Turbulent Displace

**Match Name:** `"ADBE Turbulent Displace"`
**Category:** Distort

Displaces pixels using a fractal noise pattern to create organic, fluid distortions. Animating the Evolution parameter creates flowing, animated movement. Widely used for water ripples, heat haze, fire distortion, and organic warp effects.

## Properties

| Property | Type | Range | Default | Description |
|----------|------|-------|---------|-------------|
| Displacement | enum | "Turbulent" / "Turbulent Smoother" / "Bulge" / "Bulge Smoother" / "Twist" / "Twist Smoother" / "Vertical Displacement" / "Vertical Displacement Smoother" / "Horizontal Displacement" / "Horizontal Displacement Smoother" / "Cross Displacement" / "Cross Displacement Smoother" | "Turbulent" | The type of displacement pattern applied. Smoother variants produce softer transitions. |
| Amount | number | 0–1000 | 50 | Strength of the displacement in pixels. Higher = more extreme distortion. |
| Size | number | 1–1000 | 100 | Scale of the turbulence noise pattern. Larger values = bigger, broader undulations. |
| Offset (Turbulence) | number[2] (point) | [x, y] | [0, 0] | Offsets the turbulence pattern in x/y space. Animate to make the distortion drift. |
| Complexity | number | 1–10 | 2 | Number of fractal noise octaves. Higher = more detailed, intricate distortion pattern. |
| Evolution | number (angle) | 0–unlimited° | 0° | Animates the turbulence pattern over time. Rotating this creates animated flow. |
| Evolution Options > Cycle Evolution | boolean | true / false | false | Loops the evolution animation seamlessly. |
| Evolution Options > Random Seed | number | 0–unlimited | 0 | Changes the base noise seed for a different pattern. |
| Pinning | enum | "Pin All" / "Pin Edges" / "Pin Horizontal Edges" / "Pin Vertical Edges" | "None" | Prevents the specified edges from being displaced, anchoring them in place. |
| Resize Layer | boolean | true / false | false | Allows the displaced layer to extend beyond its original bounds. |
| Antialiasing (Best Quality) | enum | "Low" / "High" | "Low" | Smoothing quality. High reduces pixelation in displaced areas. |

## Common Use Cases

### Heat Haze / Air Shimmer
Subtle turbulent displacement for atmospheric heat distortion.
```json
{
  "effectMatchName": "ADBE Turbulent Displace",
  "properties": {
    "Displacement": "Turbulent Smoother",
    "Amount": 15,
    "Size": 80,
    "Complexity": 2,
    "Evolution": 0
  }
}
```

### Water Ripple Effect
Undulating distortion for underwater or water-surface look.
```json
{
  "effectMatchName": "ADBE Turbulent Displace",
  "properties": {
    "Displacement": "Cross Displacement",
    "Amount": 30,
    "Size": 60,
    "Complexity": 3,
    "Evolution": 0
  }
}
```

### Organic Liquid Morph
Large-scale turbulence for a liquid/morphing blob effect.
```json
{
  "effectMatchName": "ADBE Turbulent Displace",
  "properties": {
    "Displacement": "Turbulent",
    "Amount": 150,
    "Size": 200,
    "Complexity": 4,
    "Evolution": 0
  }
}
```

### Twist / Swirl Distortion
Twist type for a spinning, swirling distortion.
```json
{
  "effectMatchName": "ADBE Turbulent Displace",
  "properties": {
    "Displacement": "Twist",
    "Amount": 80,
    "Size": 300,
    "Complexity": 2,
    "Evolution": 0
  }
}
```

### Animated Flag Wave
Horizontal displacement with evolution animation for waving cloth.
```json
{
  "effectMatchName": "ADBE Turbulent Displace",
  "properties": {
    "Displacement": "Horizontal Displacement Smoother",
    "Amount": 25,
    "Size": 150,
    "Complexity": 2,
    "Pinning": "Pin Vertical Edges",
    "Evolution": 0
  }
}
```

## Tips & Gotchas
- **Always animate Evolution** to make the distortion move — a static Evolution value produces a frozen, unnatural look.
- Use the expression `time * 90` on Evolution for a smooth constant flow (90°/second). Adjust multiplier for faster/slower animation.
- **Complexity above 4** significantly increases render time with diminishing visual returns for most use cases.
- **Smoother displacement types** (e.g., Turbulent Smoother) are preferable for organic, natural-looking distortion. The non-smooth types have sharper, more abrupt transitions.
- **Pinning** is essential for flag or cloth simulations — pin the leading edge to keep it anchored while the rest waves.
- Large Amount values (200+) combined with small Size values produce a very chaotic, shattered look.
- Enable **Cycle Evolution** when looping an animation to prevent a visual pop when the loop restarts.
