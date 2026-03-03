# Fractal Noise

**Match Name:** `"ADBE Fractal Noise"`
**Category:** Generate

Generates procedural fractal noise patterns that can simulate clouds, fire, water, smoke, terrain, and many other organic textures. Highly customizable with fractal types, transform controls, and animated evolution. One of the most powerful and versatile effects in After Effects.

## Properties

| Property | Type | Range/Options | Default | Description |
|----------|------|---------------|---------|-------------|
| Fractal Type | enum | "Basic" / "Turbulent Smooth" / "Turbulent Basic" / "Turbulent Sharp" / "Turbulent Smoother" / "Terrain" / "Marble" / "Dynamic" / "Dynamic Twist" / "Dynamic Progressive" / "Max" / "Rocky" / "Threads" / "Vines" / "Streaks" | "Basic" | The shape and structure of the fractal noise pattern. |
| Noise Type | enum | "Block" / "Soft Linear" / "Spline" / "Linear" | "Soft Linear" | The interpolation method between noise samples. Spline is smoothest; Block is pixelated. |
| Invert | boolean | true / false | false | Inverts the brightness values of the noise. |
| Contrast | number | 0–400 | 100 | Increases or decreases contrast of the noise. Higher values push noise toward black and white. |
| Brightness | number | -200 to +200 | 0 | Shifts the overall brightness of the noise up or down. |
| Overflow | enum | "Clip" / "Soft Clamp" / "Wrap Back" / "Allow HDR Results" | "Clip" | How out-of-range values (from high contrast/brightness) are handled. |
| Transform > Rotation | number (angle) | 0–360° | 0° | Rotates the noise pattern. |
| Transform > Uniform Scaling | boolean | true / false | true | When enabled, locks X and Y scale together. |
| Transform > Scale | number | 10–10000 | 100 | Overall scale of the noise pattern. Larger = broader features. |
| Transform > Scale Width | number | 10–10000 | 100 | Horizontal scale (when Uniform Scaling is off). |
| Transform > Scale Height | number | 10–10000 | 100 | Vertical scale (when Uniform Scaling is off). |
| Transform > Offset Turbulence | number[2] | [x, y] | [0, 0] | Offsets the noise pattern. Animate to pan the noise. |
| Transform > Perspective Offset | number[2] | [x, y] | [0, 0] | Adds a perspective-like offset to the noise. |
| Complexity | number | 1–10 | 6 | Number of fractal octaves. Higher = more detail but slower to render. |
| Sub Settings > Sub Influence | number | 0–100% | 70% | Strength of higher-octave detail relative to the base. |
| Sub Settings > Sub Scaling | number | 10–10000 | 50 | Scale multiplier for each successive octave. |
| Sub Settings > Sub Rotation | number | 0–360° | 0° | Rotation applied to each successive octave. |
| Sub Settings > Sub Offset | number[2] | [x, y] | [0, 0] | Offset applied to each successive octave. |
| Evolution | number (angle) | 0–unlimited° | 0° | Animates the noise pattern. Incrementing this over time creates flowing motion. |
| Evolution Options > Cycle Evolution | boolean | true / false | false | Loops the evolution for seamless looping. |
| Evolution Options > Cycle (in Revolutions) | number | 1–unlimited | 1 | Number of evolution revolutions in the cycle loop. |
| Evolution Options > Random Seed | number | 0–unlimited | 0 | Changes the base seed for a unique noise pattern. |
| Opacity | number | 0–100% | 100% | Opacity of the generated noise over the original. |
| Blending Mode | enum | Standard AE blend modes | "Normal" | How the noise composites with the layer's original content. |

## Common Use Cases

### Cloud / Sky Background
Soft, white/gray cloud-like noise on a blue solid layer.
```json
{
  "effectMatchName": "ADBE Fractal Noise",
  "properties": {
    "Fractal Type": "Turbulent Smooth",
    "Noise Type": "Spline",
    "Contrast": 120,
    "Brightness": 10,
    "Transform > Scale": 400,
    "Complexity": 5,
    "Evolution": 0
  }
}
```

### Animated Fire / Smoke Texture
Turbulent noise rising vertically — animate Evolution and Offset.
```json
{
  "effectMatchName": "ADBE Fractal Noise",
  "properties": {
    "Fractal Type": "Turbulent Sharp",
    "Noise Type": "Linear",
    "Contrast": 200,
    "Brightness": -30,
    "Transform > Scale": 150,
    "Complexity": 7,
    "Evolution": 0
  }
}
```

### Organic Water / Ripple Texture
Use as a displacement map layer for water ripples.
```json
{
  "effectMatchName": "ADBE Fractal Noise",
  "properties": {
    "Fractal Type": "Dynamic Twist",
    "Noise Type": "Spline",
    "Contrast": 80,
    "Brightness": 0,
    "Transform > Scale": 200,
    "Complexity": 4,
    "Evolution": 0
  }
}
```

### Looping Animated Texture
Enable Cycle Evolution for a perfectly looping noise animation.
```json
{
  "effectMatchName": "ADBE Fractal Noise",
  "properties": {
    "Fractal Type": "Basic",
    "Noise Type": "Soft Linear",
    "Contrast": 100,
    "Transform > Scale": 300,
    "Complexity": 5,
    "Evolution Options > Cycle Evolution": true,
    "Evolution Options > Cycle (in Revolutions)": 2,
    "Evolution": 0
  }
}
```

### Grain / Film Noise
Very small scale, low complexity noise for film grain texture.
```json
{
  "effectMatchName": "ADBE Fractal Noise",
  "properties": {
    "Fractal Type": "Basic",
    "Noise Type": "Block",
    "Contrast": 150,
    "Brightness": 0,
    "Transform > Scale": 30,
    "Complexity": 1,
    "Evolution": 0
  }
}
```

## Tips & Gotchas
- **Always animate Evolution** when you want the noise to move over time. A static Evolution creates a frozen pattern.
- Use the expression `time * 100` on Evolution for smooth continuous animation (100°/second).
- **Cycle Evolution** enables seamless looping — essential for motion graphics loops. Set Cycle (in Revolutions) to 1 or 2 and match the comp duration to those revolutions.
- **Contrast** is the most impactful control after Fractal Type — push to 200–400 to get high-contrast binary-style patterns suitable for mattes.
- **Overflow: "Wrap Back"** creates interesting multiple-wave patterns by wrapping values that exceed the 0–1 range back around.
- Fractal Noise renders in grayscale — colorize by stacking **Tint**, **Tritone**, or **Hue/Saturation** effects after it.
- For fire, animate **Offset Turbulence Y** to move upward (negative Y values) while also evolving.
- **Random Seed** lets you create multiple unique noise patterns using identical settings — helpful for variation across layers.
- High Complexity (8–10) dramatically increases render time. Use 4–6 for most purposes.
