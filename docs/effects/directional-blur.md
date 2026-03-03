# Directional Blur

**Match Name:** `"ADBE Motion Blur"`
**Category:** Blur & Sharpen

Blurs pixels along a single linear direction at a specified angle, simulating the streaking motion blur seen in fast-moving objects. Unlike Gaussian Blur, it produces directional streaks rather than a uniform softening.

## Properties

| Property | Type | Range | Default | Description |
|----------|------|-------|---------|-------------|
| Direction | number (angle) | 0–360° | 0° | The angle along which pixels are smeared. 0° is vertical streaks; 90° is horizontal streaks. |
| Blur Length | number | 0–1000 | 0 | The length in pixels of the blur streaks. Higher values = longer, more pronounced streaks. |

## Common Use Cases

### Horizontal Speed Streak
Simulate a fast car or object moving to the right.
```json
{
  "effectMatchName": "ADBE Motion Blur",
  "properties": {
    "Direction": 90,
    "Blur Length": 80
  }
}
```

### Vertical Fall Blur
Suggest rapid downward motion on a falling object.
```json
{
  "effectMatchName": "ADBE Motion Blur",
  "properties": {
    "Direction": 0,
    "Blur Length": 60
  }
}
```

### Diagonal Motion Trail
Streak a graphic diagonally for a dynamic entrance animation.
```json
{
  "effectMatchName": "ADBE Motion Blur",
  "properties": {
    "Direction": 45,
    "Blur Length": 120
  }
}
```

### Subtle Cinematic Blur
Add a hint of motion without full streaking for a cinematic feel.
```json
{
  "effectMatchName": "ADBE Motion Blur",
  "properties": {
    "Direction": 90,
    "Blur Length": 15
  }
}
```

## Tips & Gotchas
- **Direction is the angle of the blur streaks**, not the direction of movement. To blur something moving right (90°), set Direction to 90°.
- Directional Blur works on the layer in screen space — it does not account for 3D camera orientation.
- For simulating natural camera motion blur on a moving layer, After Effects' built-in **Motion Blur switch** (shutter angle) is more accurate; use Directional Blur for stylized or exaggerated effects.
- Animating **Blur Length** from a high value to 0 on a layer's first frames creates a fast "arrival" animation.
- Combine with a **Linear Wipe** or track matte to limit where the streaks appear.
- Extreme Blur Length values (500+) produce a strongly stylized, abstract streak rather than a realistic blur.
- This effect pads the edges with transparent pixels, so keep the layer slightly larger than the comp or use it pre-composed.
