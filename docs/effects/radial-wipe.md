# Radial Wipe

**Match Name:** `"ADBE Radial Wipe"`
**Category:** Transition

Reveals or conceals a layer with a sweeping rotation around a center point, similar to a clock hand sweeping. The wipe can go clockwise or counter-clockwise. Commonly used for clock-face countdowns, radar sweeps, and pie-chart-style reveals.

## Properties

| Property | Type | Range | Default | Description |
|----------|------|-------|---------|-------------|
| Transition Completion | number | 0–100% | 0% | Drives the sweep: 0% = fully revealed; 100% = fully concealed. Animate to create the wipe. |
| Start Angle | number (angle) | 0–360° | 0° | The angle at which the wipe begins. 0° = 12 o'clock (top); 90° = 3 o'clock (right). |
| Wipe Center | number[2] (point) | [x, y] | Comp center | The center point around which the sweep rotates. |
| Wipe | enum | "Clockwise" / "Counter Clockwise" / "Both" | "Clockwise" | Direction of the wipe sweep. "Both" sweeps from both directions simultaneously. |
| Feather | number | 0–500 | 0 | Softness of the wipe sweep edge. |

## Common Use Cases

### Clock-Face Countdown Wipe
Clockwise sweep starting from the top (12 o'clock).
```json
{
  "effectMatchName": "ADBE Radial Wipe",
  "properties": {
    "Transition Completion": 0,
    "Start Angle": 0,
    "Wipe Center": [960, 540],
    "Wipe": "Clockwise",
    "Feather": 0
  }
}
```

### Radar Sweep Effect
Clockwise sweep with feathering for a radar/sonar look.
```json
{
  "effectMatchName": "ADBE Radial Wipe",
  "properties": {
    "Transition Completion": 0,
    "Start Angle": 0,
    "Wipe Center": [960, 540],
    "Wipe": "Clockwise",
    "Feather": 40
  }
}
```

### Circular Reveal (Both Directions)
Sweep inward from both sides simultaneously — meets at the middle.
```json
{
  "effectMatchName": "ADBE Radial Wipe",
  "properties": {
    "Transition Completion": 0,
    "Start Angle": 0,
    "Wipe Center": [960, 540],
    "Wipe": "Both",
    "Feather": 10
  }
}
```

### Counter-Clockwise Reveal
Reveals from 3 o'clock counter-clockwise (like an arc filling backward).
```json
{
  "effectMatchName": "ADBE Radial Wipe",
  "properties": {
    "Transition Completion": 100,
    "Start Angle": 90,
    "Wipe Center": [960, 540],
    "Wipe": "Counter Clockwise",
    "Feather": 0
  }
}
```

## Tips & Gotchas
- **Animate Transition Completion from 100% to 0%** to reveal a layer (wipe in), or **0% to 100%** to hide it (wipe out).
- **Start Angle = 0** begins at the top (12 o'clock position). Adjust to start from any clock position.
- The **Wipe Center** should match the center of any circular graphic (e.g., a timer or pie chart) for maximum effect.
- **Feather** is useful for organic reveal effects — high feather values produce a soft, painterly sweep edge.
- Combine with a **Circle** effect on the same layer to create a progress ring or timer arc.
- **Wipe: "Both"** is great for symmetric reveals — both directions sweep simultaneously and meet in the middle, completing at 50% completion per side.
- To create an animated progress bar (arc), animate Transition Completion from 100% → target% to show progress.
