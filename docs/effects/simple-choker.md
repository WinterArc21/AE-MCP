# Simple Choker

**Match Name:** `"ADBE Simple Choker"`
**Category:** Matte

Contracts (chokes) or expands (spreads) a layer's alpha matte boundary. Positive values shrink the matte inward, removing semi-transparent edges. Negative values grow the matte outward. The primary use is cleaning up rough or fringing matte edges in keying workflows.

## Properties

| Property | Type | Range | Default | Description |
|----------|------|-------|---------|-------------|
| Choke Matte | number | -100 to +100 | 0 | Positive values contract the alpha matte (choke inward). Negative values expand the matte (spread outward). Units are in percentage of the edge width. |

## Common Use Cases

### Matte Edge Cleanup (Choke In)
After keying, choke the matte slightly to remove semi-transparent fringe/halo.
```json
{
  "effectMatchName": "ADBE Simple Choker",
  "properties": {
    "Choke Matte": 3
  }
}
```

### Expand Matte (Spread Out)
Grow the alpha boundary outward to ensure a layer covers an underlying element.
```json
{
  "effectMatchName": "ADBE Simple Choker",
  "properties": {
    "Choke Matte": -5
  }
}
```

### Significant Choke for Hair/Fine Detail
Moderate choke to aggressively remove edge fringing on difficult keys.
```json
{
  "effectMatchName": "ADBE Simple Choker",
  "properties": {
    "Choke Matte": 10
  }
}
```

### Pre-Expand Before Feather
Expand matte before applying a feather-based edge tool for accurate spread.
```json
{
  "effectMatchName": "ADBE Simple Choker",
  "properties": {
    "Choke Matte": -8
  }
}
```

## Tips & Gotchas
- **Simple Choker operates on the alpha channel only** — it does not affect RGB color values, only the transparency boundary.
- **Positive values choke (shrink) the matte inward.** This removes semi-transparent pixels at the edge, which is useful for eliminating green-screen spill fringes visible at alpha boundaries.
- **Negative values expand (spread) the matte outward.** This adds semi-transparent pixels at the edge, which can help blend the subject into the background.
- For more sophisticated matte refinement with separate choke/spread and feather controls, use **Matte Choker** (a more advanced version) or the **Refine Matte** effect.
- Simple Choker is non-destructive — it modifies how the alpha reads but doesn't permanently alter the source.
- In a typical keying workflow: (1) apply a keyer (Keylight, etc.), (2) use Simple Choker to clean up the matte edge, (3) apply Spill Suppressor for color correction.
- Very high choke values (60–100) can cause hard-edged clipping that cuts too far into the subject. Use small increments (1–10) for precise control.
- Apply on the topmost version in a pre-compose workflow to avoid the effect compounding unexpectedly.
