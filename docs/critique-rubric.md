# AE-MCP Frame Critique Rubric

A structured quality checklist for AI agents evaluating After Effects frames. Every check includes the rule, the numeric threshold, and a remediation action if the check fails.

---

## Layout Checks

### 1. Safe Zones

**Rule:** No element may be positioned within the safe-zone margin of the frame edge.

| Context | Minimum inset |
|---------|--------------|
| Broadcast (1080p) | 48 px from every edge |
| Social / web (1080p) | 24 px from every edge |

**Threshold:** Any element whose bounding box edge is closer than the context-appropriate value fails.

**Remediation:** Move or scale the offending element inward until its nearest edge clears the margin. If the element is a full-bleed background it is exempt; apply the rule only to foreground text and graphics.

---

### 2. Text Size Hierarchy

**Rule:** Font sizes must follow a clear typographic scale.

| Relationship | Ratio |
|---|---|
| Title ÷ Body | ≥ 2.0× |
| Subtitle ÷ Body | 1.3×–1.6× |

**Threshold:** Ratio below the minimum or above the maximum fails.

**Remediation:** Adjust font sizes so every tier satisfies the ratio. Anchor the body size and scale titles and subtitles proportionally. If a subtitle is missing, verify the design intentionally omits a second tier.

---

### 3. Spacing Consistency

**Rule:** Gaps between related elements (e.g., icon-to-label, headline-to-body) must be uniform within a group.

**Threshold:** Any gap that deviates by more than ±4 px from the group's median gap value fails.

**Remediation:** Measure all gaps in the group, compute the median, then nudge elements so every gap falls within [median − 4 px, median + 4 px]. Use guides or a grid to lock spacing.

---

### 4. Alignment

**Rule:** All text layers must share either a common left edge OR a common center axis — not a mix of both.

**Threshold:** Any text layer whose left edge (left-aligned layout) or center X (center-aligned layout) differs by more than 2 px from the established axis fails.

**Remediation:** Choose one alignment strategy for the composition. Select all text layers, align to the dominant axis, and confirm no layer drifts outside the 2 px tolerance.

---

### 5. Element Density

**Rule:** A single frame should contain no more than 4–5 distinct visual elements (text blocks, icons, shapes, and image areas each count as one element; decorative lines and dividers count together as one).

**Threshold:** 6 or more distinct elements in a single frame fails.

**Remediation:** Group subordinate elements, consolidate decorative details into a single graphic layer, or split content across multiple sequential frames. Aim for 3–4 elements for maximum clarity.

---

### 6. Contrast

**Rule:** The luminance difference between text and its immediate background must be sufficient for legibility.

**Threshold:** Luminance difference (L_text − L_bg) < 40 % fails. Measured using relative luminance (0–100 scale).

**Remediation:** Darken or lighten the text color, add a semi-transparent background plate behind the text, or choose a higher-contrast color from the approved palette. Do not rely on stroke alone.

---

### 7. Negative Space

**Rule:** A minimum portion of the frame must remain visually empty (no opaque elements, gradients, or busy textures).

| Context | Minimum empty area |
|---|---|
| General / social | ≥ 25 % of frame |
| Corporate / brand | 40–50 % of frame |

**Threshold:** Computed empty area below the context threshold fails.

**Remediation:** Remove or reduce decorative fill elements, shrink background textures to the content region, or redistribute content to leave clear breathing room around the focal element.

---

## Animation Checks

### 1. No Unintentional Linear Keyframes

**Rule:** Linear (constant velocity) keyframes are only acceptable when the design intentionally simulates strobe effects or mechanical/robotic motion.

**Threshold:** Any non-intentional linear keyframe on a position, scale, opacity, or rotation property fails.

**Remediation:** Select the keyframe(s) in the Graph Editor and convert to Easy Ease (F9) or apply a custom Bezier curve. Document intentional linear usage with a layer comment.

---

### 2. Entrances Use Ease-Out

**Rule:** Elements animating into their resting position must decelerate as they arrive (ease-out / decelerate-in).

**Threshold:** Entrance keyframes whose outgoing velocity is not decreasing (i.e., speed curve is flat or accelerating at the end) fail.

**Remediation:** Open the Graph Editor on the speed curve. The speed at the final keyframe must approach 0. Apply Ease-Out via the keyframe assistant or manually pull the right Bezier handle down.

---

### 3. Exits Use Ease-In

**Rule:** Elements leaving the frame must accelerate as they depart (ease-in / accelerate-out).

**Threshold:** Exit keyframes whose outgoing velocity is not increasing (i.e., speed curve is flat or decelerating at departure) fail.

**Remediation:** In the Graph Editor, ensure the speed curve rises toward the final exit keyframe. Apply Ease-In or manually raise the right Bezier handle.

---

### 4. Stagger Consistency

**Rule:** When multiple elements stagger onto screen sequentially, the delay between each element must be uniform.

**Threshold:** Any stagger delay that differs by more than ±0.02 s from the group's intended stagger interval fails.

**Remediation:** Recalculate the desired stagger interval, then shift each layer's in-point so consecutive in-points are exactly [interval] seconds apart. Use a stagger expression if manual placement is imprecise.

---

### 5. Duration Ranges

**Rule:** Animation durations must fall within professional timing windows.

| Phase | Acceptable range |
|---|---|
| Entrances | 0.3 s – 0.8 s |
| Exits | 0.2 s – 0.5 s |

**Threshold:** Any entrance shorter than 0.3 s or longer than 0.8 s fails. Any exit shorter than 0.2 s or longer than 0.5 s fails.

**Remediation:** Adjust keyframe spacing to bring the animation duration within range. Slow entrances may feel sluggish; speed them up. Fast exits below 0.2 s read as cuts, not animations — extend slightly.

---

### 6. Hold Time

**Rule:** Text must remain fully visible and static for a minimum duration before an exit animation begins.

**Threshold:** Hold time (first frame text is fully in to first frame of exit keyframe) < 2.0 s fails.

**Remediation:** Extend the out-point of the static hold period so the gap between the last entrance keyframe and the first exit keyframe is ≥ 2.0 s.

---

### 7. Overshoot on Arriving Elements

**Rule:** Elements that arrive at a resting position must exhibit a subtle overshoot or inertial bounce to feel physical and alive.

**Threshold:** No detectable overshoot (0 % past target) fails. Overshoot must be 5–15 % past the target value (position, scale, or rotation), or an inertial bounce expression must be present on the property.

**Remediation:** Add an intermediate keyframe ~60–70 % through the animation at 105–115 % of target value, then ease back to 100 % at the final keyframe. Alternatively, apply the standard inertial bounce expression:
```
n = 0;
if (numKeys > 0){
  n = nearestKey(time).index;
  if (key(n).time > time){ n--; }
}
if (n == 0){ t = 0; }
else{ t = time - key(n).time; }
if (n > 0 && n < numKeys){
  v = velocityAtTime(key(n).time - thisComp.frameDuration/10);
  amp = .05; freq = 4; decay = 6;
  value + v*amp*Math.sin(freq*2*Math.PI*t)*Math.exp(-decay*t);
}else{ value; }
```

---

## Color Checks

### 1. Maximum Three Primary Hues

**Rule:** The palette must use no more than 3 distinct primary hues (measured in HSL hue angle). Tints, shades, and neutrals derived from a primary hue do not count as separate hues.

**Threshold:** 4 or more unrelated primary hues in a single frame fails.

**Remediation:** Identify the dominant hue, one supporting hue, and one accent hue. Remap any additional colors to tints or shades of one of the three approved hues.

---

### 2. Accent Color Area

**Rule:** The accent color (highest chroma / most saturated color in the palette) must not dominate the composition.

**Threshold:** Accent color occupies > 20 % of frame pixel area fails.

**Remediation:** Reduce the size, opacity, or frequency of accent-colored elements. Reserve the accent for key focal points: a single icon, underline, or CTA element.

---

### 3. Text-to-Background Contrast Ratio

**Rule:** WCAG contrast ratio between text color and its direct background must be sufficient for readability.

**Threshold:** Contrast ratio < 4.5 : 1 fails (WCAG AA standard for normal text).

**Remediation:** Use a contrast calculator (e.g., WebAIM Contrast Checker) to verify the ratio. Adjust the text color toward white or black, or darken/lighten the background plate. For large display text (≥ 18 pt bold) the minimum is 3 : 1, but 4.5 : 1 is the default requirement.

---

### 4. No Pure Black or Pure White

**Rule:** Pure black (#000000 / rgb(0,0,0)) and pure white (#FFFFFF / rgb(255,255,255)) are forbidden. They create harsh, flat-looking compositions.

**Threshold:** Any layer or text using exact #000000 or #FFFFFF fails.

**Remediation:**
- Replace pure black with near-black: #0A0A0A–#1A1A1A (or a dark tinted hue, e.g., #0D0F14).
- Replace pure white with near-white: #F0F0F0–#FAFAFA (or a warm/cool tint, e.g., #F5F4F2).

---

### 5. Saturation Consistency

**Rule:** All non-neutral colors in the palette must occupy a similar saturation band so the palette reads as cohesive.

**Threshold:** If the saturation range across primary and accent colors spans more than 40 percentage points (e.g., one color at 20 % saturation, another at 80 %), the check fails.

**Remediation:** Measure HSL saturation for each color. Identify the target saturation band (e.g., 50–70 %). Shift outliers within the band, adjusting lightness to compensate and maintain intended visual weight.
