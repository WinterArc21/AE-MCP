# Camera Animation — AE Technique Reference

---

## Parallax Speed Ratios (2D / 2.5D)

| Layer | Relative Speed | Notes |
|---|---|---|
| Sky / distant background | 0.05–0.1× | Barely moves |
| Far mountains / horizon | 0.1–0.2× | Slight drift |
| Mid-ground buildings | 0.3–0.5× | Noticeable motion |
| Ground / near elements | 0.7–0.9× | Almost full speed |
| Foreground overlay | 1.0–1.2× | Faster than scene = feels "in front" |

---

## Parallax Expression (2D, Null Controller)

**Setup:**
1. Create Null → name "Camera Control"
2. Add `Effect → Expression Controls → Slider Control` to null
3. On each layer's **Position** property:

```javascript
// Apply to Position on each scene layer
var spread = index * 10 * thisComp.layer("Camera Control").effect("Slider Control")("Slider");
[transform.position[0] - spread, transform.position[1]]
```

4. Lower index layers (top of stack) move faster; higher index = slower
5. Animate Slider: **0 → 20–50** across timeline
6. Re-order layers to assign depth

**Scale-based zoom parallax:**
- Background: Scale **140%**, Z pushed back
- Midground: Scale **200%**
- Foreground: Scale **250–450%**

---

## 3D Camera Null Rig — Step by Step

1. Create camera: `Layer → New → Camera` → choose **35mm preset**
2. Enable **Depth of Field** checkbox
3. Create Null → enable 3D → name "CamController"
4. Parent camera to null via pick-whip
5. **Animate the null only — never the camera directly** (prevents arc-motion artifacts)
6. Position moves: keyframe null's Position
7. Orbit/rotation: keyframe null's Y Rotation (L/R) or X Rotation (tilt)

**Orbit Null (auto-orbit):**
1. Select camera → Right-click → Camera → **Create Orbit Null**
2. AE creates 3D null at Point of Interest, auto-parents camera
3. Keyframe Orbit Null's **Y Rotation**: 0° → 360° over desired duration

**Crane/Jib:**
1. Two nulls: "Crane Arm" (parent) + "Camera Head" (child)
2. Parent Camera Head to Crane Arm
3. Animate Crane Arm Y Position (vertical) + Camera Head X/Z (arc)

---

## Focal Length Mood Table

| Focal Length | Feel | Use For |
|---|---|---|
| 15mm | Ultra-wide, heavy distortion | Dynamic action, kinetic MG |
| 20mm | Wide, dramatic, slight disorientation | Environments, action |
| 28–35mm | Cinematic, natural | Standard scenes, dialogue, reveals |
| 50mm | Neutral, "normal" perspective | Product, typography, general |
| 85mm | Intimate, slightly compressed | Hero moments, portrait, emphasis |
| 135–200mm | Heavy telephoto, subjects pop from BG | Rack focus, isolated subjects |

---

## Depth of Field Settings by Mood

| Look | Aperture | Blur Level | Notes |
|---|---|---|---|
| Subtle cinematic | 100 | 60% | Near-background blur |
| Strong cinematic | 200–300 | 70% | Clear FG/BG separation |
| Dreamy / portrait | 400+ | 80% | Heavily blurred BG |
| Product shot | 150 | 50% | Subject sharp, BG soft |
| Tight rack focus | 250 | 75% | For dramatic focus shifts |

**Iris Shape (cinematic bokeh):**
- Iris Shape: **Heptagon (7 sides)**
- Iris Rotation: animate slowly for living bokeh
- Highlight Gain: **0.5–1.5** (specular highlights bloom in blur)
- Highlight Threshold: **0.5** (only bright areas bloom)
- Highlight Saturation: **0.5** (colored bokeh)

---

## Rack Focus Technique

### True 3D Rack Focus
1. Enable DOF on camera
2. Place objects at different Z depths:
   - Foreground: **Z = −500**
   - Background: **Z = +1,000**
3. Aperture: **100–300** for cinematic blur
4. Keyframe **Focus Distance**:
   - Frame 0: distance to background
   - Frame 30: distance to foreground
5. Easy Ease → asymmetric curve: fast into focus, slightly slower release

**Lock focus to Point of Interest:**
```javascript
// Apply to camera Focus Distance
length(position, pointOfInterest)
```

**Lock focus to a moving layer:**
```javascript
// Apply to camera Focus Distance
length(position, thisComp.layer("hero_layer").position)
```

### Fake Rack Focus (2D — faster render)
- Separate layers into FG / MG / BG
- Apply `Camera Lens Blur` or Fast Blur to each

| Distance from focus | Blur radius |
|---|---|
| In focus | 0 |
| One plane away | 4–8px |
| Two planes away | 10–20px |
| Far background | 20–40px |

- Focused on BG: FG blur = 8–15, BG blur = 0
- Focused on FG: FG blur = 0, BG blur = 8–15
- MG peaks at ~5px as it passes through focus

---

## Handheld Wiggle Presets

| Style | Expression | Notes |
|---|---|---|
| Subtle / breathing | `wiggle(1, 10)` | Organic, confident |
| Standard handheld | `wiggle(2, 20)` | News documentary |
| Tense / nervous | `wiggle(3, 35)` | Chase, suspense |
| Extreme shaky | `wiggle(6, 50)` | Action, emergency |

**Controllable rig (keyframeable intensity):**
1. Create Null "Controller" → add two Slider Controls: "Frequency" and "Amplitude"
2. On layer Position:

```javascript
// Apply to Position
wiggle(
  thisComp.layer("Controller").effect("Frequency")("Slider"),
  thisComp.layer("Controller").effect("Amplitude")("Slider")
)
```

3. Keyframe sliders independently to ramp up/down intensity

**Apply to all layers at once:**
- Adjustment Layer → `Effect → Distort → Transform`
- Add wiggle expression to Transform's Position property

**Looping wiggle (seamless loop):**
```javascript
// Apply to Position — loopTime must match comp loop duration
var freq = 2;
var amp = 15;
var loopTime = 4;
var t = time % loopTime;
seedRandom(index, true);
var w1 = wiggle(freq, amp, 1, 0.5, t);
seedRandom(index, true);
var w2 = wiggle(freq, amp, 1, 0.5, t - loopTime);
linear(t, 0, loopTime, w1, w2)
```

**Rotation shake:**
```javascript
// Apply to Rotation of camera null parent
wiggle(8, 0.5)  // subtle rotation jitter
```

**Scale buffer:** Scale layer to **105–110%** so wiggle never reveals edges.

---

## Push-In Scale Timing Table

| Duration | Start Scale | End Scale | Feel |
|---|---|---|---|
| 4s | 100% | 105% | Barely perceptible, elegant breathing |
| 3s | 100% | 110% | Subtle push, cinematic |
| 2s | 100% | 120% | Noticeable, energetic |
| 1s | 100% | 150% | Dramatic punch |

**Method 1 — Null parent scale:**
1. Null parent for all layers
2. Keyframe null Scale: 100% → 115–120% over 3–5s
3. Keyframe Position simultaneously to keep subject centered
4. Graph Editor: slow start, maintain speed, gentle tail-off

**Method 2 — 3D Camera Z-position:**
- Camera Z position: **0 → −200** (moving toward scene)
- Preserves depth (unlike flat scale)

---

## Dolly Zoom (Vertigo Effect)

1. Animate camera moving forward (Z-axis)
2. Simultaneously animate Focal Length in **opposite direction** (zoom out as camera moves in, or vice versa)
3. Subject stays same size; background perspective warps dramatically
4. Works best at longer focal lengths: **85–200mm range**

---

## Camera Orbit Expression (automatic)

```javascript
// Apply to Camera Position
var radius = 800;
var speed = 0.5;  // revolutions per second
var angle = time * speed * 2 * Math.PI;
var centerX = thisComp.width / 2;
var centerY = thisComp.height / 2;
[centerX + Math.sin(angle) * radius, centerY, Math.cos(angle) * radius]
```
