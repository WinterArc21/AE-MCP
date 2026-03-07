# Expressions Library — AE Technique Reference

ES3 only: `var` only, no `let`/`const`, no arrow functions, no template literals.

---

## Inertial Bounce (Harry Frank / graymachine.com)

**Apply to:** Any property with 2+ keyframes (Position, Scale, Rotation)

```javascript
var amp = 0.1;
var freq = 2.0;
var decay = 2.0;
var n = 0;
var time_max = 4;
if (numKeys > 0) {
  n = nearestKey(time).index;
  if (key(n).time > time) { n--; }
}
if (n === 0) { var t = 0; } else { var t = time - key(n).time; }
if (n > 0 && t < time_max) {
  var v = velocityAtTime(key(n).time - thisComp.frameDuration / 10);
  value + v * amp * Math.sin(freq * t * 2 * Math.PI) / Math.exp(decay * t);
} else { value; }
```

| Preset | amp | freq | decay |
|---|---|---|---|
| Snappy (Derek Lieu) | 0.01 | 2.0 | 11.0 |
| Playful (Harry Frank) | 0.10 | 2.0 | 2.0 |
| Micro bounce (UI) | 0.03 | 3.0 | 5.0 |
| Heavy landing | 0.05 | 1.5 | 4.0 |
| Rubber logo | 0.15 | 2.0 | 1.8 |
| Bouncy button | 0.08 | 3.0 | 2.5 |

---

## Overshoot — Adobe Official

**Apply to:** Position, Scale, Rotation — any property with keyframes  
Note: amp×0.001, freq×0.1, decay×0.1 are effective rates (amp=40 → 0.04; freq=30 → 3Hz; decay=50 → 5)

```javascript
var amp = 40;
var freq = 30;
var decay = 50;
var nK = nearestKey(time);
var n = (nK.time <= time) ? nK.index : nK.index - 1;
var t = (n === 0) ? 0 : time - key(n).time;
if (n > 0 && t < 1) {
  var v = velocityAtTime(key(n).time - thisComp.frameDuration / 10);
  value + v * amp * 0.001 * Math.sin(freq * 0.1 * t * 2 * Math.PI) / Math.exp(decay * 0.1 * t);
} else { value; }
```

---

## Wiggle Variants

**Basic** — apply to Position:
```javascript
wiggle(2, 30)  // freq (wiggles/sec), amp (pixels)
```

**On top of keyframes** (preserves keyframed motion):
```javascript
var freq = 1; var amp = 15;
value + wiggle(freq, amp)
```

**Axis-limited (Y only)**:
```javascript
var w = wiggle(3, 20);
[value[0], w[1]]
```

**Time-gated (active between t1 and t2 seconds)**:
```javascript
var t1 = 2; var t2 = 4;
if (time > t1 && time < t2) { wiggle(3, 25); } else { value; }
```

**Looping wiggle (seamless — loopTime must match comp loop duration)**:
```javascript
var freq = 1; var amp = 100; var loopTime = 5;
var t = time % loopTime;
seedRandom(index, true);
var w1 = wiggle(freq, amp, 1, 0.5, t);
seedRandom(index, true);
var w2 = wiggle(freq, amp, 1, 0.5, t - loopTime);
linear(t, 0, loopTime, w2, w1)
```

**Damped (decays to stillness)** — apply to Position:
```javascript
var freq = 5; var amp = 50; var decay = 2.0;
var result = amp / Math.exp(decay * time) * Math.sin(freq * time * 2 * Math.PI);
[value[0], value[1] + result]
```

---

## Loop Types

**Apply to:** Any property with keyframes
```javascript
loopOut("cycle")              // repeats all keyframes forward
loopIn("cycle")               // repeats from start backward
loopOut("pingpong")           // forward then reverse
loopOut("offset")             // continues value trajectory (infinite scroll)
loopOut("offset", 2)          // last 2 keyframes only
loopOutDuration("cycle", 3)   // loops last 3 seconds
```

**Infinite rotation** — apply to Rotation:
```javascript
time * 90     // 90°/sec = 1 rotation per 4s
time * 360    // 1 rotation per second
time * -45    // counter-clockwise 45°/sec
```

---

## Index-Based Stagger

**Time offset stagger** — apply to Time Remap:
```javascript
var delayFrames = 5;
var delaySeconds = delayFrames * thisComp.frameDuration;
var start = key(1).time;
var loopDuration = key(numKeys).time - start;
var offsetTime = (index - 1) * delaySeconds;
var loopedTime = (time - offsetTime) % loopDuration;
if (loopedTime < 0) { loopedTime += loopDuration; }
start + loopedTime
```

**Position stagger (horizontal spread)** — apply to Position:
```javascript
var spacing = 100;
[value[0] + (index - 1) * spacing, value[1]]
```

**Rotation stagger** — apply to Rotation:
```javascript
(index - 1) * (360 / thisComp.numLayers)
```

**Hue stagger** — apply to Hue/Saturation Master Hue:
```javascript
(index - 1) * 25  // each layer shifts 25° in hue
```

---

## Circular Orbit (Math.sin / Math.cos)

**Apply to:** Position
```javascript
var radius = 200;
var speed = 1.0;  // revolutions per second
var cx = thisComp.width / 2;
var cy = thisComp.height / 2;
var x = Math.sin(time * speed * 2 * Math.PI) * radius;
var y = Math.cos(time * speed * 2 * Math.PI) * radius;
[cx + x, cy - y]
```

---

## Wave Patterns

**Basic sine Y oscillation** — apply to Position:
```javascript
[value[0], value[1] + Math.sin(time * 10) * 100]
// time*10 = freq multiplier; 100 = amplitude px
```

**Traveling wave (sinusoidal path with movement)**:
```javascript
var veloc = 200; var amp = 80; var freq = 2.0;
var x = time * veloc;
var y = amp * Math.sin(freq * time * 2 * Math.PI) + thisComp.height / 2;
[x, y]
```

**Undulating wave (spaced objects bob in sequence)**:
```javascript
var xAmp = 50; var xFreq = 0.8; var xSpeed = 200;
var wl = xSpeed / xFreq;
var phaseOffset = ((position[0] % wl) / wl) * 2 * Math.PI;
var y = xAmp * Math.sin(2 * Math.PI * xFreq * time + phaseOffset);
value + [0, y]
```

**Modulated sine (two frequencies — swells and recedes)**:
```javascript
var veloc = 40; var amp = 40; var freq1 = 0.25; var freq2 = 3.0;
var x = time * veloc;
var y = amp * Math.sin(freq1 * time * 2 * Math.PI) * Math.sin(freq2 * time * 2 * Math.PI) + thisComp.height / 2;
[x, y]
```

---

## Autofade

**Apply to:** Opacity — `transition` = frames for fade in/out
```javascript
var transition = 20;
var tSecs = transition / (1 / thisComp.frameDuration);
linear(time, inPoint, inPoint + tSecs, 0, 100) - linear(time, outPoint - tSecs, outPoint, 0, 100)
```

---

## Number Counter

**Apply to:** Source Text on text layer
```javascript
var start = 0; var end = 1000; var dur = 2;
var n = Math.round(linear(time, inPoint, inPoint + dur, start, end));
if (n < start) { n = start; }
if (n > end) { n = end; }
n.toFixed(0)
```

---

## Audio-Reactive Scale

**Prerequisites:** `Animation → Keyframe Assistant → Convert Audio to Keyframes` — creates "Audio Amplitude" null.

**Apply to:** Scale
```javascript
var audioLev = thisComp.layer("Audio Amplitude").effect("Both Channels")("Slider");
var s = linear(audioLev, 0, 36, 95, 140);
[s, s]
// 95% at silence → 140% at peak. Adjust 0,36 to match actual audio level range.
```

**Smoothed version (reduces jitter)**:
```javascript
var audioLev = thisComp.layer("Audio Amplitude").effect("Both Channels")("Slider");
var smoothed = smooth(audioLev, 0.3, 7);
var s = linear(smoothed, 0, 36, 95, 140);
[s, s]
```
