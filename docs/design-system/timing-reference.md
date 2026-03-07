# Timing Reference — AE-MCP Design Reference

## Core Rules
- Exits are **20–30% faster** than entrances
- Vary duration across elements by ±20–30% to create visual rhythm
- Faster = lighter/secondary; slower = heavier/more important
- The most common mistake: uniform timing across all elements

---

## Duration Table by Motion Type

| Motion type | Frames @24fps | Frames @30fps | Duration | Notes |
|---|---|---|---|---|
| Micro-interaction (toggle) | 2–4 | 2–5 | 80–150ms | Feels instantaneous |
| Small fade/move | 4–6 | 5–7 | 150–200ms | Fast but perceptible |
| Standard UI transition | 6–8 | 7–10 | 200–300ms | Professional sweet spot |
| Text reveal — per character | 1–3 | 1–4 | 42–125ms | — |
| Text reveal — word fade | 4–8 | 5–10 | 167–333ms | — |
| Text reveal — line slide | 8–14 | 10–17 | 333–583ms | — |
| Full title card entrance | 12–24 | 15–30 | 500ms–1s | — |
| Lower-third slide | 10–18 | 12–22 | 417–750ms | — |
| Text exit | 6–12 | 8–15 | 250–500ms | 20–30% faster than entrance |
| Shape quick pop | 4–6 | 5–8 | 167–250ms | — |
| Shape morph (simple) | 12–20 | 15–25 | 500–833ms | — |
| Shape morph (complex) | 20–36 | 25–45 | 833ms–1.5s | — |
| Scale 0→100% (snappy) | 6–10 | 8–12 | 250–417ms | — |
| Scale 0→100% (weighted) | 12–18 | 15–22 | 500–750ms | — |
| Logo reveal (simple) | 18–36 | 22–45 | 750ms–1.5s | — |
| Logo reveal (complex) | 48–96 | 60–120 | 2–4s | — |
| Logo hold | 24–72 | 30–90 | 1–3s | Before exit |
| Logo exit | 12–24 | 15–30 | 500ms–1s | — |
| Full logo sting | 72–144 | 90–180 | 3–6s | In + hold + out |
| Quick cut (graphic match) | 0–2 | 0–2 | 0–83ms | Near-immediate |
| Cross-dissolve | 6–12 | 8–15 | 250–500ms | — |
| Wipe/slide transition | 8–14 | 10–17 | 333–583ms | — |
| Full-screen transition | 12–24 | 15–30 | 500ms–1s | — |
| Cinematic push/pull | 18–30 | 22–38 | 750ms–1.25s | — |
| Large element entrance | 12–20 | 15–25 | 300–500ms | Panels, modals |
| Cinematic reveal | 24–50 | 30–62 | 500ms–1.2s | Logo reveals, brand intros |

---

## Hold Time Minimums

| Element | Hold duration |
|---|---|
| Short graphic element | 6–12 frames |
| Data visualization label | 18–36 frames |
| Title card / important text | 24–72 frames (1–3s) |
| Logo / brand mark | 48–96 frames (2–4s) |
| Pose hold (stable, readable pose) | 6–12 frames |
| Comic timing hold | 12–24 frames |
| Impact hold (freeze frame) | 1–3 frames |
| Anticipation wind-up | 2–6 frames |

Hold time is as important as motion time. Amateur work rushes through holds.

---

## Stagger Delay Values

| Context | Stagger delay @24fps | Stagger delay @30fps | Feel |
|---|---|---|---|
| List items, cards | 2–3 frames (83–125ms) | 2–4 frames | Tight cascade |
| Navigation elements | 3–5 frames (125–208ms) | 4–6 frames | Crisp, organized |
| Content sections | 4–8 frames (167–333ms) | 5–10 frames | Deliberate |
| Hero elements | 8–16 frames (333–667ms) | 10–20 frames | Cinematic |
| Letter-by-letter text | 1–2 frames per char | 1–2 frames | Fast character reveal |
| Word-by-word text | 3–6 frames per word | 4–7 frames | Readable word reveal |

**Progressive stagger technique:** Accelerate stagger as elements come in, slow the last 1–2.
Example: Element 1 at t=0, +3f, +5f, +8f → natural, not mechanical.

**Index-based stagger expression:**
```javascript
delayFrames = 6;
delayTime = delayFrames * thisComp.frameDuration;
timeOffset = (index - 1) * delayTime;
targetLayer = thisComp.layer("Shape Layer 1");
targetLayer.position.valueAtTime(time - timeOffset);
```

---

## Brand/Energy Multipliers

Apply to base durations above:

| Brand character | Multiplier | Notes |
|---|---|---|
| Tech / SaaS | **0.7×** | Fast, crisp, efficient |
| Entertainment / Gaming | **0.6–0.8×** | Snappy with pops |
| Corporate / Finance | **1.0×** | Baseline |
| Consumer / Lifestyle | **1.1×** | Medium with spring |
| Healthcare | **1.2×** | Smooth, unhurried |
| Editorial | **1.2×** | Slightly extended |
| Luxury / Fashion | **1.5–2.0×** | Slow, weighted, cinematic |

---

## Anticipation Frames

| Type | Counter-movement | Frames |
|---|---|---|
| Micro (subtle UI) | 3–5px | 2–3 frames |
| Standard motion design | 10–20% of total travel | 3–5 frames |
| Stylized/bouncy | 20–40% counter | 5–8 frames |
| Cartoon | Up to 50% counter | 6–12 frames |

---

## Overshoot Expression Parameters by Intensity

### Micro / Snappy (1 fast bounce, settles in ~0.2s)
```javascript
// Inertial bounce — snappy
amp = 0.01; freq = 2.0; decay = 11.0;
```

### Standard (1–2 bounces, natural)
```javascript
// Inertial bounce — default
amp = 0.1; freq = 2.0; decay = 2.0;
```

### Playful (2–3 bounces, lively)
```javascript
// Inertial bounce — playful
amp = 0.2; freq = 3.0; decay = 1.5;
```

**Full Inertial Bounce expression (Harry Frank):**
```javascript
amp = .1; freq = 2.0; decay = 2.0;
n = 0; time_max = 4;
if (numKeys > 0){
  n = nearestKey(time).index;
  if (key(n).time > time){ n--; }
}
if (n == 0){ t = 0; }
else {
  t = time - key(n).time;
  if (n > 0 && t < time_max){
    v = velocityAtTime(key(n).time - thisComp.frameDuration/10);
    value + v * amp * Math.sin(freq * t * 2 * Math.PI) / Math.exp(decay * t);
  } else { value }
}
```

### Manual overshoot keyframe pattern (no expression needed):
```
Frame 0:   Start position
Frame 12:  Target +10–20% overshoot
Frame 16:  Pull back to 95–98%
Frame 19:  Settle at 100%
```
Overshoot keyframes use **decreasing intervals** (6f, 5f, 4f, 3f) mirroring physics.

### Overshoot amounts by context:
| Context | Overshoot past target | Oscillations |
|---|---|---|
| Corporate / subtle UI | 5–8% | 1–2 |
| Standard motion graphics | 10–15% | 1–2 |
| Playful / bouncy | 15–25% | 2–3 |
| Cartoonish | 30–50% | 3–4 |
| Scale pop (logo) | 110–120% then 100% | 1–2 |

---

## Hook / Build / Climax / Resolve Arc

| Total duration | Hook | Build | Climax | Resolve |
|---|---|---|---|---|
| 15 seconds | 0–2s | 2–9s | 9–12s | 12–15s |
| 30 seconds | 0–4s | 4–18s | 18–24s | 24–30s |
| 60 seconds | 0–8s | 8–36s | 36–48s | 48–60s |
| 90 seconds | 0–12s | 12–55s | 55–72s | 72–90s |

Percentages: Hook 0–15%, Build 15–60%, Climax 60–75%, Resolve 75–100%.

---

## Scene Count Guidelines

| Piece duration | Scene count | Avg. scene duration |
|---|---|---|
| 10s | 2–3 | 3–5s |
| 15s | 3–5 | 3–4s |
| 30s | 5–8 | 3.5–6s |
| 60s | 8–12 | 5–7s |
| 90s | 12–18 | 5–7.5s |

**Hold:Transition ratio:** Transitions = 15–25% of scene duration.
- 2s scene → 0.3–0.5s transition
- 5s scene → 0.75–1s transition

---

## BPM to Frame Sync

Formula: `Frames per beat = (FPS × 60) / BPM`

| BPM | @24fps frames | @30fps frames |
|---|---|---|
| 80 | 18 | 22.5 |
| 100 | 14.4 | 18 |
| 120 | **12** | **15** |
| 128 | 11.3 | 14.1 |
| 140 | 10.3 | 12.9 |

120 BPM = 12 frames/beat @24fps = cleanest number to work with.
