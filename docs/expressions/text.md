# Text Expressions

Expressions applied to **Source Text** properties and text animators. All expressions that return text must produce a **string** as their final value — AE will display whatever string is returned.

> **Important:** Apply these to the **Source Text** property of a text layer. Do not apply to transform properties.

---

## 1. Typewriter Effect (Character Reveal)

### Basic Typewriter

**What it does:** Reveals characters one at a time from left to right, starting at `startTime` and completing by `endTime`.

**Apply to:** Source Text

```js
const fullText  = "Your text here";  // EDIT: the full string to reveal
const startTime = 0.5;               // EDIT: when the first character appears (seconds)
const endTime   = 2.5;               // EDIT: when the last character appears (seconds)

const totalChars = fullText.length;
const charsToShow = Math.round(linear(time, startTime, endTime, 0, totalChars));
fullText.substring(0, Math.max(0, Math.min(charsToShow, totalChars)))
```

---

### Typewriter with Blinking Cursor

```js
const fullText  = "Your text here";  // EDIT
const startTime = 0.5;               // EDIT
const endTime   = 2.5;               // EDIT
const cursorChar = "|";              // EDIT: cursor character

const totalChars = fullText.length;
const charsToShow = Math.round(linear(time, startTime, endTime, 0, totalChars));
const revealed   = fullText.substring(0, Math.max(0, Math.min(charsToShow, totalChars)));

// Blink cursor at 2Hz after last character is revealed, hide it before
const showCursor = charsToShow >= totalChars
  ? Math.floor(time * 2) % 2 === 0  // blink at 2Hz
  : true;                             // always show while typing

revealed + (showCursor ? cursorChar : "")
```

---

### Character-by-Character Reveal (Visible Characters Only)

**What it does:** Reveals text where previously-typed characters stay visible, one frame per character.

```js
const fullText    = "Hello, World!";  // EDIT
const charsPerSec = 20;               // EDIT: typing speed in characters per second
const startTime   = 1.0;             // EDIT

const elapsed     = Math.max(0, time - startTime);
const charsToShow = Math.min(fullText.length, Math.floor(elapsed * charsPerSec));
fullText.substring(0, charsToShow)
```

---

## 2. Number Counter

### Integer Counter

**What it does:** Counts from `startVal` to `endVal` over a time window using smooth easing.

```js
const startTime = 0.5;    // EDIT: when counting starts
const endTime   = 2.5;    // EDIT: when counting ends
const startVal  = 0;      // EDIT
const endVal    = 1000;   // EDIT

Math.round(ease(time, startTime, endTime, startVal, endVal)).toString()
```

---

### Decimal Counter

```js
const startTime = 0.5;
const endTime   = 2.5;
const startVal  = 0;
const endVal    = 99.9;
const decimals  = 1;  // EDIT: decimal places

ease(time, startTime, endTime, startVal, endVal).toFixed(decimals)
```

---

### Counter with Comma Formatting

**What it does:** Formats large numbers with thousands separators (e.g., 1,234,567).

```js
const startTime = 0.5;
const endTime   = 3.0;
const startVal  = 0;
const endVal    = 1250000;  // EDIT

const val = Math.round(ease(time, startTime, endTime, startVal, endVal));
val.toLocaleString("en-US")
```

---

### Counter with Prefix / Suffix

```js
const startTime = 0.5;
const endTime   = 2.0;
const startVal  = 0;
const endVal    = 98.6;
const prefix    = "";     // EDIT: e.g. "$", "€"
const suffix    = "%";    // EDIT: e.g. "%", "K", "M", "°"
const decimals  = 1;

const val = ease(time, startTime, endTime, startVal, endVal);
`${prefix}${val.toFixed(decimals)}${suffix}`
```

---

## 3. Date / Time Display

### Current Comp Time as Timecode

**What it does:** Displays the current time as HH:MM:SS.

```js
const t       = Math.floor(time);
const hours   = Math.floor(t / 3600);
const minutes = Math.floor((t % 3600) / 60);
const seconds = t % 60;

[hours, minutes, seconds]
  .map(n => String(n).padStart(2, "0"))
  .join(":")
```

---

### SMPTE Timecode Display

```js
const fps   = thisComp.frameDuration > 0 ? Math.round(1 / thisComp.frameDuration) : 30;
const frame = Math.floor(time / thisComp.frameDuration);

const h  = Math.floor(frame / (fps * 3600));
const m  = Math.floor((frame % (fps * 3600)) / (fps * 60));
const s  = Math.floor((frame % (fps * 60)) / fps);
const f  = frame % fps;

[h, m, s].map(n => String(n).padStart(2, "0")).join(":") + ":" + String(f).padStart(2, "0")
```

---

### Static Date String (Baked In)

**What it does:** Shows a hardcoded date — useful for motion graphics that represent a specific date.

```js
// Hardcoded date display — update manually
"March 3, 2026"  // EDIT: replace with your date string
```

---

## 4. Conditional Text (Based on Time or Markers)

### Toggle Between Two Strings Over Time

```js
const switchTime = 2.0;   // EDIT: time in seconds to switch
const textBefore = "Before";  // EDIT
const textAfter  = "After";   // EDIT

time < switchTime ? textBefore : textAfter
```

---

### Cycle Through Multiple Strings

```js
const texts = [   // EDIT: add/remove strings
  "First line",
  "Second line",
  "Third line",
  "Fourth line",
];
const holdTime = 2.0;  // EDIT: seconds per string

const index = Math.floor(time / holdTime) % texts.length;
texts[index]
```

---

### Text from Nearest Marker

**What it does:** Displays the comment string of the closest marker that has passed.

```js
let markerText = "";  // EDIT: default text before first marker

for (let i = 1; i <= thisLayer.marker.numKeys; i++) {
  if (time >= thisLayer.marker.key(i).time) {
    markerText = thisLayer.marker.key(i).comment;
  }
}

markerText
```

---

## 5. Text from Layer Name

**What it does:** Displays this layer's own name as its text content. Useful for template slides where you rename layers to change the text.

```js
thisLayer.name
```

---

### Text from Another Layer's Name

```js
const targetLayer = thisComp.layer(index - 1);  // EDIT: or use layer name "Layer 2"
targetLayer.name
```

---

## 6. Source Text from Another Text Layer

**What it does:** Mirrors the source text of another layer. Changes to the source propagate automatically.

```js
thisComp.layer("Source Text Layer").text.sourceText  // EDIT: layer name
```

---

### Uppercase / Lowercase Transform

```js
thisComp.layer("Source Layer").text.sourceText.toUpperCase()
// or .toLowerCase() or .trim()
```

---

### Concatenate Two Text Layers

```js
const first = thisComp.layer("First Name").text.sourceText;
const last  = thisComp.layer("Last Name").text.sourceText;   // EDIT: layer names
`${first} ${last}`
```

---

## 7. Random Character Reveal

**What it does:** Scrambles the text with random characters before resolving into the final string. Hacker/decode aesthetic.

**Apply to:** Source Text

```js
const fullText  = "TARGET TEXT";  // EDIT: final text
const startTime = 0.5;            // EDIT: scramble begins
const endTime   = 2.0;            // EDIT: all characters resolved
const charset   = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";  // EDIT: random chars

const progress    = linear(time, startTime, endTime, 0, 1);
const resolvedN   = Math.floor(progress * fullText.length);

let result = "";
for (let i = 0; i < fullText.length; i++) {
  if (i < resolvedN) {
    // Character is resolved
    result += fullText[i];
  } else if (fullText[i] === " ") {
    result += " ";
  } else {
    // Still scrambling — pick a random character
    seedRandom(i + Math.floor(time * 15), false);
    result += charset[Math.floor(random() * charset.length)];
  }
}
result
```

---

## 8. Substring Reveal with Word Control

**What it does:** Reveals text word by word (instead of character by character).

```js
const fullText  = "The quick brown fox jumps over";  // EDIT
const startTime = 0.5;   // EDIT
const endTime   = 3.0;   // EDIT

const words       = fullText.split(" ");
const wordsToShow = Math.round(linear(time, startTime, endTime, 0, words.length));
words.slice(0, Math.max(0, wordsToShow)).join(" ")
```

---

## 9. Text Size / Formatting Hints

> These expressions apply to **Source Text** and return strings. To change font size or style dynamically, use text animators or add a second expression-controlled effect — Source Text expressions can only control the string content, not formatting (that requires TextDocument API).

### TextDocument API — Changing Font Size Dynamically

```js
// Requires AE 2022+ (22.x+) TextDocument expression API
const doc = text.sourceText.createStyle();

const baseFontSize = 72;    // EDIT
const scaledSize   = ease(time, 0, 1, 20, baseFontSize);

doc.setFontSize(scaledSize);
doc.setText("My Text");  // EDIT
doc
```

---

## Quick Reference Table

| Recipe | Apply To | Key Parameters |
|---|---|---|
| Typewriter | Source Text | `fullText`, `startTime`, `endTime` |
| Counter (integer) | Source Text | `startVal`, `endVal`, `startTime`, `endTime` |
| Counter (decimal) | Source Text | + `decimals` |
| Counter (formatted) | Source Text | `toLocaleString("en-US")` |
| Counter with prefix/suffix | Source Text | `prefix`, `suffix` |
| Timecode display | Source Text | Uses `time`, `frameDuration` |
| Toggle strings | Source Text | `switchTime`, two strings |
| Cycle strings | Source Text | `texts[]`, `holdTime` |
| Marker-driven text | Source Text | Marker comments on layer |
| Layer name | Source Text | `thisLayer.name` |
| Mirror another layer | Source Text | `layer.text.sourceText` |
| Random character reveal | Source Text | `fullText`, `charset`, timing |
| Word-by-word reveal | Source Text | `fullText`, timing |
