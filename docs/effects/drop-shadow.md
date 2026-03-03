# Drop Shadow

**Match Name:** `"ADBE Drop Shadow"`
**Category:** Stylize

Adds a configurable drop shadow beneath a layer, simulating a light source casting a shadow from the layer's alpha boundary. Direction and Distance control shadow placement; Softness controls edge blur. The Shadow Only option renders just the shadow without the original layer, enabling custom shadow compositing.

## Properties

| Property | Type | Range/Options | Default | Description |
|----------|------|---------------|---------|-------------|
| Shadow Color | color | RGB | [0, 0, 0] (black) | Color of the shadow. Can be tinted for colored shadows. |
| Opacity | number | 0–100% | 50% | Transparency of the shadow. Higher = more opaque shadow. |
| Direction | number (angle) | 0–360° | 135° | The angle of the light source, determining shadow direction. 135° = upper-left light, shadow falls lower-right. |
| Distance | number | 0–30000 | 5 | Distance the shadow is offset from the layer in pixels. |
| Softness | number | 0–1000 | 0 | Blur radius of the shadow edge. 0 = hard shadow; higher = soft, diffused shadow. |
| Shadow Only | boolean | true / false | false | When true, renders only the shadow (hides the original layer content). |

## Common Use Cases

### Classic Text Drop Shadow
Subtle shadow for text legibility over a background.
```json
{
  "effectMatchName": "ADBE Drop Shadow",
  "properties": {
    "Shadow Color": [0, 0, 0],
    "Opacity": 60,
    "Direction": 135,
    "Distance": 8,
    "Softness": 10,
    "Shadow Only": false
  }
}
```

### Floating UI Element Shadow
Larger, softer shadow for a Material Design-style elevated card effect.
```json
{
  "effectMatchName": "ADBE Drop Shadow",
  "properties": {
    "Shadow Color": [0, 0, 0],
    "Opacity": 35,
    "Direction": 180,
    "Distance": 20,
    "Softness": 40,
    "Shadow Only": false
  }
}
```

### Hard Graphic Shadow
No softness, high opacity for a bold graphic illustration shadow.
```json
{
  "effectMatchName": "ADBE Drop Shadow",
  "properties": {
    "Shadow Color": [30, 0, 60],
    "Opacity": 80,
    "Direction": 145,
    "Distance": 12,
    "Softness": 0,
    "Shadow Only": false
  }
}
```

### Shadow Only for Custom Compositing
Render just the shadow layer separately for independent compositing.
```json
{
  "effectMatchName": "ADBE Drop Shadow",
  "properties": {
    "Shadow Color": [0, 0, 0],
    "Opacity": 70,
    "Direction": 135,
    "Distance": 15,
    "Softness": 25,
    "Shadow Only": true
  }
}
```

### Colored Glow Shadow
Tinted shadow (e.g., purple) for stylized neon or fantasy lighting.
```json
{
  "effectMatchName": "ADBE Drop Shadow",
  "properties": {
    "Shadow Color": [80, 0, 200],
    "Opacity": 80,
    "Direction": 180,
    "Distance": 5,
    "Softness": 30,
    "Shadow Only": false
  }
}
```

## Tips & Gotchas
- **Direction is the angle the light comes FROM** — 0° means light from directly below (shadow above the layer), 135° means light from the upper-left (standard shadow below-right).
- **Distance of 0** with Softness > 0 creates a glowing halo/soft outline around the layer rather than an offset shadow.
- **Shadow Only = true** is very useful when you want to apply your own blend mode (e.g., Multiply) or color correction to the shadow independently.
- By default, the shadow clips to the layer bounds. To extend the shadow beyond the layer, pre-compose first or enable the "Collapse Transformations" flag on a pre-comp.
- **Softness** is a blur radius, not a percentage — values of 5–30 are typical for most design work.
- Colored shadows (non-black) work best when used on a light background where the color tint is visible.
- Drop Shadow does not interact with 3D lighting — it is a 2D effect only.
