# Levels

**Match Name:** `"ADBE Levels2"`
**Category:** Color Correction

Remaps the tonal range of an image by setting input black/white points, adjusting gamma (midtone brightness), and setting output black/white points. Works on the composite RGB channel or individual color channels. The most fundamental and widely used color correction tool in After Effects.

## Properties

| Property | Type | Range | Default | Description |
|----------|------|-------|---------|-------------|
| Channel | enum | "RGB" / "Red" / "Green" / "Blue" / "Alpha" | "RGB" | Selects which channel the tonal adjustments apply to. |
| Input Black | number | 0–255 | 0 | The darkest input value remapped to output black. Raises to crush shadows. |
| Input White | number | 0–255 | 255 | The brightest input value remapped to output white. Lowers to clip highlights. |
| Gamma | number | 0.1–9.99 | 1.0 | Controls midtone brightness. Values >1 brighten midtones; values <1 darken them. |
| Output Black | number | 0–255 | 0 | Maps the darkest output value (raises black level / reduces contrast). |
| Output White | number | 0–255 | 255 | Maps the brightest output value (reduces white level / reduces contrast). |

## Common Use Cases

### Increase Contrast (Levels Crush)
Lift Input Black and lower Input White for stronger contrast.
```json
{
  "effectMatchName": "ADBE Levels2",
  "properties": {
    "Channel": "RGB",
    "Input Black": 20,
    "Input White": 230,
    "Gamma": 1.0,
    "Output Black": 0,
    "Output White": 255
  }
}
```

### Brighten Midtones
Raise gamma to lift midtones without blowing out highlights.
```json
{
  "effectMatchName": "ADBE Levels2",
  "properties": {
    "Channel": "RGB",
    "Input Black": 0,
    "Input White": 255,
    "Gamma": 1.6,
    "Output Black": 0,
    "Output White": 255
  }
}
```

### Color Channel Tint (Red Push)
Boost red channel input/gamma to add a warm tint.
```json
{
  "effectMatchName": "ADBE Levels2",
  "properties": {
    "Channel": "Red",
    "Input Black": 0,
    "Input White": 220,
    "Gamma": 1.2,
    "Output Black": 0,
    "Output White": 255
  }
}
```

### TV Safe / Broadcast Levels
Clamp output to broadcast-safe range (16–235).
```json
{
  "effectMatchName": "ADBE Levels2",
  "properties": {
    "Channel": "RGB",
    "Input Black": 0,
    "Input White": 255,
    "Gamma": 1.0,
    "Output Black": 16,
    "Output White": 235
  }
}
```

### Alpha Channel Expansion
Expand a soft alpha matte to full black/white contrast.
```json
{
  "effectMatchName": "ADBE Levels2",
  "properties": {
    "Channel": "Alpha",
    "Input Black": 30,
    "Input White": 200,
    "Gamma": 1.0,
    "Output Black": 0,
    "Output White": 255
  }
}
```

## Tips & Gotchas
- **Input Black > Input White will invert** the tonal range — ensure Input Black is always less than Input White.
- The **Alpha channel** option is extremely useful for matte cleanup: raise Input Black and lower Input White to make semi-transparent edges fully transparent or fully opaque.
- Use individual **Red/Green/Blue** channels to perform white balance and color grading without dedicated color tools.
- Levels operates in the composition's bit depth — in 32-bpc projects, values beyond 0–255 (super-whites/super-blacks) are preserved.
- **Gamma** is non-linear — a value of 2.2 is a significant brightening; use small increments (0.8–1.5) for subtle adjustments.
- Animating Input Black and Input White is a fast way to create a "lights fade in/out" transition.
- Levels2 is the updated version; always use `"ADBE Levels2"` rather than `"ADBE Levels"`.
