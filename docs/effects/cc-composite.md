# CC Composite

**Match Name:** `"CC Composite"`
**Category:** Utility

Composites the effect result with the original source layer in various blending modes. Placed at the end of an effect stack, it blends the fully-processed result back onto the original layer with a chosen blend mode and opacity. Useful for controlling how an effect chain interacts with the source.

## Properties

| Property | Type | Range/Options | Default | Description |
|----------|------|---------------|---------|-------------|
| Composite Original | enum | "In Front" / "Behind" / "Difference" / "Only" | "In Front" | Controls the compositing relationship between the effect result and the original image. |
| Opacity | number | 0–100% | 100% | Transparency of the blend between the effect result and the original. |
| RGB Only | boolean | true / false | false | When enabled, compositing affects only RGB channels, not alpha. |

### Composite Original Modes
| Mode | Description |
|------|-------------|
| `"In Front"` | The effect result is placed in front of (over) the original image. |
| `"Behind"` | The effect result is placed behind the original image. |
| `"Difference"` | Shows the difference between the effect result and the original. |
| `"Only"` | Shows only the effect result without the original image. |

## Common Use Cases

### Effect Over Original (Blend)
Place a processed version of the layer on top of the original at reduced opacity.
```json
{
  "effectMatchName": "CC Composite",
  "properties": {
    "Composite Original": "In Front",
    "Opacity": 60,
    "RGB Only": false
  }
}
```

### Show Effect Result Only
Display only the effect-processed version (ignore original).
```json
{
  "effectMatchName": "CC Composite",
  "properties": {
    "Composite Original": "Only",
    "Opacity": 100,
    "RGB Only": false
  }
}
```

### Behind Blend
Keep the original image on top and place effect result underneath it.
```json
{
  "effectMatchName": "CC Composite",
  "properties": {
    "Composite Original": "Behind",
    "Opacity": 80,
    "RGB Only": false
  }
}
```

### Difference Check
Use Difference mode to compare effect result with original — black areas are unchanged; colored areas show differences.
```json
{
  "effectMatchName": "CC Composite",
  "properties": {
    "Composite Original": "Difference",
    "Opacity": 100,
    "RGB Only": false
  }
}
```

## Tips & Gotchas
- **CC Composite is most useful at the end of a long effect stack** when you want to blend the cumulative processed result back onto the original source.
- **"Only" mode** is equivalent to having no CC Composite at all — it shows the fully-processed effect chain.
- **"In Front"** blends the processed result over the original — reducing Opacity blends between the processed look and the unprocessed original.
- **"Behind"** is less common but useful when you want the original to "show through" the processed layer.
- **"Difference"** is primarily a diagnostic/QA tool — it shows exactly what the effect stack is changing. A completely black Difference result means no change.
- **RGB Only = true** preserves the original alpha channel while blending RGB — useful when effects alter the alpha unintentionally.
- Note: The property name may differ slightly in AE's internal API representation. The standard label in the Effect Controls panel is "Composite Original" and options are listed as "In Front", "Behind", "Difference", and "Only". Verify exact string values against the AE MCP API when setting programmatically.
