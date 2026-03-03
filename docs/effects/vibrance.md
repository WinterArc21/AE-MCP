# Vibrance

**Match Name:** `"ADBE Vibrance"`
**Category:** Color Correction

Intelligently boosts saturation in a way that protects already-saturated colors and skin tones. The Vibrance slider applies a non-linear saturation increase — muted colors are boosted more aggressively than vivid ones. The Saturation slider applies a flat, uniform saturation change to all colors.

## Properties

| Property | Type | Range | Default | Description |
|----------|------|-------|---------|-------------|
| Vibrance | number | -100 to +100 | 0 | Non-linear saturation boost. Preferentially saturates muted colors while protecting already-vivid colors and skin tones. |
| Saturation | number | -100 to +100 | 0 | Linear saturation adjustment. Affects all colors equally. -100 = grayscale; +100 doubles saturation uniformly. |

## Common Use Cases

### Natural Color Enhancement
Boost perceived color richness without oversaturating vivid areas.
```json
{
  "effectMatchName": "ADBE Vibrance",
  "properties": {
    "Vibrance": 40,
    "Saturation": 0
  }
}
```

### Portrait / Skin-Safe Saturation Boost
High Vibrance with neutral Saturation to enrich background colors while preserving natural skin tones.
```json
{
  "effectMatchName": "ADBE Vibrance",
  "properties": {
    "Vibrance": 60,
    "Saturation": 0
  }
}
```

### Subtle Overall Boost
Combine a small Vibrance with a slight Saturation for a balanced lift.
```json
{
  "effectMatchName": "ADBE Vibrance",
  "properties": {
    "Vibrance": 25,
    "Saturation": 10
  }
}
```

### Desaturate for Muted Look
Negative Vibrance creates a muted, moody appearance.
```json
{
  "effectMatchName": "ADBE Vibrance",
  "properties": {
    "Vibrance": -50,
    "Saturation": 0
  }
}
```

### Full Desaturation (Uniform)
Use Saturation at -100 for complete grayscale conversion.
```json
{
  "effectMatchName": "ADBE Vibrance",
  "properties": {
    "Vibrance": 0,
    "Saturation": -100
  }
}
```

## Tips & Gotchas
- **Vibrance is always preferable to Saturation** for natural-looking results on footage with people — it won't turn skin orange or red.
- The distinction: **Saturation** scales all colors equally; **Vibrance** applies a higher boost to less-saturated colors and a lower boost to already-saturated colors.
- Negative Vibrance values create a subtle muted/bleached look that is less drastic than negative Saturation.
- Combine Vibrance (+30–50) with a slight Levels gamma increase for an efficient "make footage pop" one-two punch.
- On animated graphics (no skin tones), Saturation boost may be more predictable than Vibrance.
- Vibrance does not affect grayscale pixels (zero saturation to begin with), so it cannot restore color from a fully desaturated layer.
