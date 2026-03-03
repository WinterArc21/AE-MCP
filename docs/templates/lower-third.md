# Template: Lower Third

A lower third is a graphic overlay in the lower portion of the frame used to display names, titles, locations, or contextual information. This template provides a production-ready lower third with animated entry/exit and editable text layers.

## Template Overview

| Parameter | Value |
|-----------|-------|
| Comp Size | 1920 × 1080 px |
| Duration | 8 seconds (extendable) |
| In Point | 0:00 |
| Hold | 0:30–5:30 (extendable) |
| Out Point | 6:00 |
| Frame Rate | 29.97 fps |

## Layer Stack

```
[●] Name Text          (text layer)
[●] Title Text         (text layer)
[●] Accent Bar         (shape layer — horizontal rule)
[●] Background Pill    (shape layer — rounded rect)
[ ] Lower Third NULL   (null — master position controller)
```

## Build Instructions

### Step 1: Create the Composition
```json
{
  "tool": "create_composition",
  "name": "Lower Third",
  "width": 1920,
  "height": 1080,
  "frameRate": 29.97,
  "duration": 8
}
```

### Step 2: Create NULL Controller
```json
{
  "tool": "create_null",
  "name": "Lower Third NULL",
  "position": [200, 900]
}
```

### Step 3: Create Background Pill
```json
{
  "tool": "create_shape_layer",
  "name": "Background Pill",
  "shapeType": "rectangle",
  "size": [520, 90],
  "position": [300, 900],
  "fillColor": [0.039, 0.039, 0.039, 0.85],
  "strokeWidth": 0,
  "cornerRadius": 8
}
```

### Step 4: Create Accent Bar
```json
{
  "tool": "create_shape_layer",
  "name": "Accent Bar",
  "shapeType": "rectangle",
  "size": [4, 60],
  "position": [80, 900],
  "fillColor": [0.176, 0.490, 0.969, 1]
}
```

### Step 5: Create Name Text Layer
```json
{
  "tool": "create_text_layer",
  "name": "Name Text",
  "text": "John Smith",
  "fontSize": 42,
  "fontFamily": "Inter",
  "fontWeight": "Bold",
  "fillColor": [0.941, 0.941, 0.941, 1],
  "position": [110, 888],
  "anchorPoint": "left"
}
```

### Step 6: Create Title Text Layer
```json
{
  "tool": "create_text_layer",
  "name": "Title Text",
  "text": "Senior Producer",
  "fontSize": 28,
  "fontFamily": "Inter",
  "fontWeight": "Regular",
  "fillColor": [0.600, 0.600, 0.600, 1],
  "position": [110, 926],
  "anchorPoint": "left"
}
```

## Animation: Entry (Slide In from Left)

### Background Pill — Position Keyframes
```json
{
  "tool": "set_keyframe",
  "layer": "Background Pill",
  "property": "transform.position",
  "keyframes": [
    { "time": 0.0, "value": [-300, 900], "easing": "easeOut" },
    { "time": 0.5, "value": [300, 900],  "easing": "easeOut" }
  ]
}
```

### Accent Bar — Scale Keyframes (wipe in)
```json
{
  "tool": "set_keyframe",
  "layer": "Accent Bar",
  "property": "transform.scale",
  "keyframes": [
    { "time": 0.1, "value": [100, 0],   "easing": "easeOut" },
    { "time": 0.5, "value": [100, 100], "easing": "easeOut" }
  ]
}
```

### Name Text — Opacity Fade In
```json
{
  "tool": "set_keyframe",
  "layer": "Name Text",
  "property": "transform.opacity",
  "keyframes": [
    { "time": 0.3, "value": 0,   "easing": "easeOut" },
    { "time": 0.7, "value": 100, "easing": "easeOut" }
  ]
}
```

### Title Text — Opacity Fade In (delayed)
```json
{
  "tool": "set_keyframe",
  "layer": "Title Text",
  "property": "transform.opacity",
  "keyframes": [
    { "time": 0.5, "value": 0,   "easing": "easeOut" },
    { "time": 0.9, "value": 100, "easing": "easeOut" }
  ]
}
```

## Animation: Exit (Slide Out to Left)

Mirror the entry keyframes at the end of the hold period:

```json
{
  "tool": "set_keyframe",
  "layer": "Background Pill",
  "property": "transform.position",
  "keyframes": [
    { "time": 5.5, "value": [300, 900],  "easing": "easeIn" },
    { "time": 6.0, "value": [-300, 900], "easing": "easeIn" }
  ]
}
```

## Customization Parameters

| Layer | Property | What to Change |
|-------|----------|----------------|
| Name Text | Source Text | Person's name |
| Title Text | Source Text | Title or location |
| Accent Bar | Fill Color | Brand accent color |
| Background Pill | Fill Color | Background color + opacity |
| Lower Third NULL | Position | Move entire graphic |
| All layers | Out Point | Extend hold duration |

## Tips & Gotchas
- **Parent all layers to the NULL** to move the entire lower third with one position control.
- **Use a pre-comp** if you need to apply blur or drop shadow to the whole graphic as one unit.
- The **Accent Bar scale animation** anchors at the bottom — set the anchor point to `[2, 60]` (bottom of the bar) before animating scale.
- **Title Text** deliberately lags behind Name Text by 0.2s for a staggered reveal.
- For a **wipe-in reveal** of the text, use a Linear Wipe effect on the text layers instead of opacity fades.
- Keep **Background Pill opacity at 85%** (not 100%) so underlying video is subtly visible — this feels more professional and less heavy.
- Do not start the animation at t=0 with no breathing room from scene start
