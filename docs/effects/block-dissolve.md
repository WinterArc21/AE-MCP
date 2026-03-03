# Block Dissolve

**Match Name:** `"ADBE Block Dissolve"`
**Category:** Transition

Dissolves a layer using randomly placed rectangular blocks that disappear progressively as Transition Completion increases. Creates a pixelated scatter/dissolve effect useful for dramatic transitions and digital disintegration effects.

## Properties

| Property | Type | Range | Default | Description |
|----------|------|-------|---------|-------------|
| Transition Completion | number | 0–100% | 0% | Controls the dissolve progress: 0% = fully visible; 100% = fully invisible (all blocks removed). |
| Block Width | number | 1–500 | 1 | Width of each dissolve block in pixels. Larger = chunkier dissolution. |
| Block Height | number | 1–500 | 1 | Height of each dissolve block in pixels. |
| Feather | number | 0–100 | 0 | Softens the edges of each block for a less harsh pixelated look. |
| Soft Edges | boolean | true / false | false | When enabled, block edges are anti-aliased for smoother appearance. |

## Common Use Cases

### Digital Disintegration
Large blocks scatter away for a dramatic "breaking apart" transition.
```json
{
  "effectMatchName": "ADBE Block Dissolve",
  "properties": {
    "Transition Completion": 0,
    "Block Width": 40,
    "Block Height": 40,
    "Feather": 0,
    "Soft Edges": false
  }
}
```

### Fine Particle Dissolve
Small blocks for a sand/grain dissolve effect.
```json
{
  "effectMatchName": "ADBE Block Dissolve",
  "properties": {
    "Transition Completion": 0,
    "Block Width": 4,
    "Block Height": 4,
    "Feather": 2,
    "Soft Edges": true
  }
}
```

### Rectangular Pixel Scatter
Medium blocks, horizontal emphasis.
```json
{
  "effectMatchName": "ADBE Block Dissolve",
  "properties": {
    "Transition Completion": 0,
    "Block Width": 80,
    "Block Height": 20,
    "Feather": 0,
    "Soft Edges": false
  }
}
```

### Soft Block Fade
Block dissolve with feathering for a softer transition.
```json
{
  "effectMatchName": "ADBE Block Dissolve",
  "properties": {
    "Transition Completion": 0,
    "Block Width": 15,
    "Block Height": 15,
    "Feather": 8,
    "Soft Edges": true
  }
}
```

## Tips & Gotchas
- **Animate Transition Completion from 0% to 100%** to dissolve the layer out. Animate from 100% to 0% to have it appear from scattered blocks.
- Block sizes above 100px create a dramatic, coarse disintegration look. Block sizes of 1–5px produce a very fine, sandy dissolve.
- **Block Width and Block Height can differ** — rectangular blocks add visual interest compared to square blocks.
- The block randomization is based on the layer's pixel data — different source footage will produce different patterns even with identical settings.
- For a classic film/projector-burn look, use Block Dissolve combined with an orange tint overlay.
- **Feather** applies only to individual block edges, not globally — for an overall soft dissolve, combine with Opacity animation.
- Block Dissolve is purely random — there is no control over the order in which blocks disappear.
