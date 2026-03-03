# Venetian Blinds

**Match Name:** `"ADBE Venetian Blinds"`
**Category:** Transition

Reveals or conceals a layer using a set of parallel slats, similar to opening or closing venetian window blinds. The slat direction, width, and feathering are all controllable. A classic broadcast transition effect.

## Properties

| Property | Type | Range | Default | Description |
|----------|------|-------|---------|-------------|
| Transition Completion | number | 0–100% | 0% | Drives the wipe: 0% = fully visible; 100% = fully hidden (slats fully closed/opened). |
| Direction | number (angle) | 0–360° | 90° | Angle of the slats. 0° = horizontal slats; 90° = vertical slats; 45° = diagonal. |
| Width | number | 1–500 | 10 | Width of each individual slat in pixels. |
| Feather | number | 0–500 | 0 | Softness of slat edges. 0 = hard crisp slats; higher = soft, blurred slat edges. |

## Common Use Cases

### Classic Horizontal Venetian Blinds
Standard blinds-opening reveal with horizontal slats.
```json
{
  "effectMatchName": "ADBE Venetian Blinds",
  "properties": {
    "Transition Completion": 0,
    "Direction": 0,
    "Width": 30,
    "Feather": 0
  }
}
```

### Vertical Slat Wipe
Vertical bars for a curtain-style transition.
```json
{
  "effectMatchName": "ADBE Venetian Blinds",
  "properties": {
    "Transition Completion": 0,
    "Direction": 90,
    "Width": 40,
    "Feather": 0
  }
}
```

### Diagonal Blind Effect
45° diagonal slats for a more dynamic look.
```json
{
  "effectMatchName": "ADBE Venetian Blinds",
  "properties": {
    "Transition Completion": 0,
    "Direction": 45,
    "Width": 25,
    "Feather": 5
  }
}
```

### Fine Scan Lines
Very narrow slats for a CRT scan line or printing press effect.
```json
{
  "effectMatchName": "ADBE Venetian Blinds",
  "properties": {
    "Transition Completion": 0,
    "Direction": 0,
    "Width": 4,
    "Feather": 0
  }
}
```

### Soft-Edge Blinds
Feathered slats for a glowing, textured reveal.
```json
{
  "effectMatchName": "ADBE Venetian Blinds",
  "properties": {
    "Transition Completion": 0,
    "Direction": 90,
    "Width": 50,
    "Feather": 30
  }
}
```

## Tips & Gotchas
- **Animate Transition Completion from 0% to 100%** to close the blinds (hide). Animate from 100% to 0% to open them (reveal).
- **Width** controls how many slats appear — narrow width (2–8) creates many thin slats; wide width (80–200) creates fewer thick slats.
- **Direction = 0°** creates horizontal slats (like real venetian blinds). **Direction = 90°** creates vertical bars.
- Feather creates a soft glow along slat edges — attractive for stylized designs but less realistic for actual blind simulations.
- At Transition Completion 50%, exactly half of each slat's area is visible — the slats appear to be at 45° from the viewer.
- Venetian Blinds is a relatively retro transition — best suited for nostalgic, broadcast, or deliberately kitsch aesthetics.
- For a striped pattern rather than a transition, use a static (non-animated) Transition Completion value in the 20–80% range.
