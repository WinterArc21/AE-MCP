/**
 * tools/compound.ts
 *
 * Compound tools that orchestrate multiple AE operations into single,
 * intention-driven calls with professional defaults.
 *
 * Registers:
 *   1. position_layer_semantic   — Position layer by human-readable name
 *   2. apply_text_style          — Apply professional typography presets
 *   3. apply_overshoot           — Add elastic/bounce/spring expression to a property
 *   4. animate_entrance          — Animate a layer entering the scene
 *   5. animate_exit              — Animate a layer leaving the scene
 *   6. stagger_animation         — Apply staggered entrance animation to multiple layers
 *
 * All ExtendScript is ES3 (var only, no arrow fns, no template literals).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { bridge } from "../bridge.js";
import {
  escapeString,
  wrapWithReturn,
  wrapInUndoGroup,
  findCompById,
  findLayerByIndex,
  transformProp,
  colorLiteral,
  arrayToAE,
} from "../script-builder.js";

// ---------------------------------------------------------------------------
// Lookup tables
// ---------------------------------------------------------------------------

const EASING_PRESETS = {
  smooth:  { in: { speed: 0, influence: 20 }, out: { speed: 0, influence: 80 } },
  snappy:  { in: { speed: 0, influence: 10 }, out: { speed: 0, influence: 90 } },
  heavy:   { in: { speed: 0, influence: 50 }, out: { speed: 0, influence: 60 } },
  elastic: { in: { speed: 0, influence: 15 }, out: { speed: 0, influence: 95 } },
} as const;

const TIMING_DEFAULTS: Record<string, Record<string, number>> = {
  fade:          { corporate: 0.4,  cinematic: 0.8,  energetic: 0.25, minimal: 0.5,  default: 0.5  },
  "slide-up":    { corporate: 0.5,  cinematic: 0.8,  energetic: 0.3,  minimal: 0.5,  default: 0.5  },
  "slide-down":  { corporate: 0.5,  cinematic: 0.8,  energetic: 0.3,  minimal: 0.5,  default: 0.5  },
  "slide-left":  { corporate: 0.5,  cinematic: 0.8,  energetic: 0.3,  minimal: 0.5,  default: 0.5  },
  "slide-right": { corporate: 0.5,  cinematic: 0.8,  energetic: 0.3,  minimal: 0.5,  default: 0.5  },
  scale:         { corporate: 0.4,  cinematic: 0.7,  energetic: 0.25, minimal: 0.4,  default: 0.4  },
  "scale-rotate":{ corporate: 0.5,  cinematic: 0.8,  energetic: 0.3,  minimal: 0.5,  default: 0.5  },
  pop:           { corporate: 0.35, cinematic: 0.6,  energetic: 0.2,  minimal: 0.35, default: 0.35 },
  drop:          { corporate: 0.5,  cinematic: 0.8,  energetic: 0.3,  minimal: 0.5,  default: 0.5  },
  typewriter:    { corporate: 2.0,  cinematic: 3.0,  energetic: 1.5,  minimal: 2.0,  default: 2.0  },
  shrink:        { corporate: 0.35, cinematic: 0.6,  energetic: 0.2,  minimal: 0.35, default: 0.35 },
  "drop-out":    { corporate: 0.5,  cinematic: 0.8,  energetic: 0.3,  minimal: 0.5,  default: 0.5  },
};

const SEMANTIC_POSITIONS: Record<string, (w: number, h: number, margin: number) => [number, number]> = {
  "center":            (w, h) => [w / 2, h / 2],
  "top-left":          (w, h, m) => [m, m],
  "top-center":        (w, h, m) => [w / 2, m],
  "top-right":         (w, h, m) => [w - m, m],
  "bottom-left":       (w, h, m) => [m, h - m],
  "bottom-center":     (w, h, m) => [w / 2, h - m],
  "bottom-right":      (w, h, m) => [w - m, h - m],
  "left-center":       (w, h, m) => [m, h / 2],
  "right-center":      (w, h, m) => [w - m, h / 2],
  "lower-third":       (w, h, m) => [m + 200, h * 0.78],
  "upper-third":       (w, h, m) => [m + 200, h * 0.22],
  "title-safe-center": (w, h) => [w / 2, h * 0.45],
};

const TEXT_STYLES: Record<string, Record<string, { font: string; size: number; tracking: number; leading?: number; weight?: string }>> = {
  corporate: {
    title:    { font: "Inter", size: 72,  tracking: -10,  weight: "Bold"      },
    subtitle: { font: "Inter", size: 36,  tracking: 30,   weight: "Regular"   },
    body:     { font: "Inter", size: 22,  tracking: 20,   weight: "Regular"   },
    caption:  { font: "Inter", size: 18,  tracking: 75,   weight: "Light"     },
    label:    { font: "Inter", size: 14,  tracking: 150,  weight: "Medium"    },
    accent:   { font: "Inter", size: 48,  tracking: 0,    weight: "Black"     },
  },
  cinematic: {
    title:    { font: "Inter", size: 90,  tracking: -20,  weight: "Black"     },
    subtitle: { font: "Inter", size: 32,  tracking: 50,   weight: "Light"     },
    body:     { font: "Inter", size: 24,  tracking: 20,   weight: "Regular"   },
    caption:  { font: "Inter", size: 18,  tracking: 100,  weight: "Light"     },
    label:    { font: "Inter", size: 14,  tracking: 150,  weight: "Regular"   },
    accent:   { font: "Inter", size: 60,  tracking: -10,  weight: "ExtraBold" },
  },
  minimal: {
    title:    { font: "Inter", size: 64,  tracking: 0,    weight: "Medium"    },
    subtitle: { font: "Inter", size: 28,  tracking: 40,   weight: "Regular"   },
    body:     { font: "Inter", size: 20,  tracking: 20,   weight: "Regular"   },
    caption:  { font: "Inter", size: 16,  tracking: 100,  weight: "Light"     },
    label:    { font: "Inter", size: 12,  tracking: 200,  weight: "Regular"   },
    accent:   { font: "Inter", size: 42,  tracking: 10,   weight: "SemiBold"  },
  },
  bold: {
    title:    { font: "Inter", size: 100, tracking: -30,  weight: "Black"     },
    subtitle: { font: "Inter", size: 42,  tracking: 20,   weight: "Bold"      },
    body:     { font: "Inter", size: 26,  tracking: 10,   weight: "Medium"    },
    caption:  { font: "Inter", size: 20,  tracking: 50,   weight: "Regular"   },
    label:    { font: "Inter", size: 16,  tracking: 100,  weight: "Bold"      },
    accent:   { font: "Inter", size: 72,  tracking: -20,  weight: "Black"     },
  },
  editorial: {
    title:    { font: "Inter", size: 80,  tracking: -10,  weight: "Bold"      },
    subtitle: { font: "Inter", size: 34,  tracking: 40,   weight: "Regular"   },
    body:     { font: "Inter", size: 22,  tracking: 20,   weight: "Regular"   },
    caption:  { font: "Inter", size: 17,  tracking: 80,   weight: "Light"     },
    label:    { font: "Inter", size: 13,  tracking: 150,  weight: "Medium"    },
    accent:   { font: "Inter", size: 56,  tracking: 0,    weight: "ExtraBold" },
  },
};

const STYLE_COLORS: Record<string, number[]> = {
  corporate:  [0.976, 0.980, 0.984],
  cinematic:  [0.898, 0.898, 0.918],
  minimal:    [0.180, 0.204, 0.251],
  bold:       [1.0,   1.0,   1.0  ],
  editorial:  [0.949, 0.957, 0.965],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function textResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}

async function runScript(script: string, toolName: string) {
  const result = await bridge.executeScript(script, toolName);
  return textResult(result);
}

/**
 * Resolve animation duration: use provided value, fall back to TIMING_DEFAULTS,
 * then fall back to a hardcoded default.
 */
function resolveDuration(
  preset: string,
  style: string | undefined,
  provided: number | undefined,
  fallback: number
): number {
  if (provided !== undefined) return provided;
  const row = TIMING_DEFAULTS[preset];
  if (!row) return fallback;
  const s = style ?? "default";
  return row[s] ?? row["default"] ?? fallback;
}

/**
 * Generate ExtendScript snippet that applies easing to both keyframes of a
 * single-property entrance (ease-out feel: high influence arriving at kf1).
 *
 * @param propExpr  - The ExtendScript property expression string
 * @param kf0Var    - Variable name holding keyframe index 0 (start)
 * @param kf1Var    - Variable name holding keyframe index 1 (end)
 * @param easing    - Easing preset name
 * @param is2D      - True for Position/Scale (need 2-element ease array)
 * @param prefix    - Variable name prefix for uniqueness
 */
function buildEntranceEasing(
  propExpr: string,
  kf0Var: string,
  kf1Var: string,
  easing: keyof typeof EASING_PRESETS,
  is2D: boolean,
  prefix: string
): string {
  const preset = EASING_PRESETS[easing];
  const inInfluence = preset.in.influence;
  const outInfluence = preset.out.influence;
  const easeArr = is2D
    ? "[" + prefix + "EaseIn, " + prefix + "EaseIn]"
    : "[" + prefix + "EaseIn]";
  const easeOutArr = is2D
    ? "[" + prefix + "EaseOut, " + prefix + "EaseOut]"
    : "[" + prefix + "EaseOut]";

  return (
    "var " + prefix + "EaseIn = new KeyframeEase(0, " + inInfluence + ");\n" +
    "var " + prefix + "EaseOut = new KeyframeEase(0, " + outInfluence + ");\n" +
    propExpr + ".setInterpolationTypeAtKey(" + kf0Var + ", KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);\n" +
    propExpr + ".setTemporalEaseAtKey(" + kf0Var + ", " + easeArr + ", " + easeArr + ");\n" +
    propExpr + ".setInterpolationTypeAtKey(" + kf1Var + ", KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);\n" +
    propExpr + ".setTemporalEaseAtKey(" + kf1Var + ", " + easeOutArr + ", " + easeOutArr + ");\n"
  );
}

/**
 * Generate ExtendScript snippet that applies easing to both keyframes of a
 * single-property exit (ease-in feel: high influence leaving at kf0).
 */
function buildExitEasing(
  propExpr: string,
  kf0Var: string,
  kf1Var: string,
  easing: keyof typeof EASING_PRESETS,
  is2D: boolean,
  prefix: string
): string {
  const preset = EASING_PRESETS[easing];
  const inInfluence = preset.in.influence;
  const outInfluence = preset.out.influence;
  const easeArr = is2D
    ? "[" + prefix + "EaseIn, " + prefix + "EaseIn]"
    : "[" + prefix + "EaseIn]";
  const easeOutArr = is2D
    ? "[" + prefix + "EaseOut, " + prefix + "EaseOut]"
    : "[" + prefix + "EaseOut]";

  // For exits: first kf has high influence (ease-in/acceleration), last has low
  return (
    "var " + prefix + "EaseIn = new KeyframeEase(0, " + outInfluence + ");\n" +
    "var " + prefix + "EaseOut = new KeyframeEase(0, " + inInfluence + ");\n" +
    propExpr + ".setInterpolationTypeAtKey(" + kf0Var + ", KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);\n" +
    propExpr + ".setTemporalEaseAtKey(" + kf0Var + ", " + easeArr + ", " + easeArr + ");\n" +
    propExpr + ".setInterpolationTypeAtKey(" + kf1Var + ", KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);\n" +
    propExpr + ".setTemporalEaseAtKey(" + kf1Var + ", " + easeOutArr + ", " + easeOutArr + ");\n"
  );
}

/**
 * Build the overshoot expression string (to be set as prop.expression).
 * All values are computed in TypeScript and embedded as literals.
 */
function buildOvershootExpression(
  type: "elastic" | "bounce" | "spring",
  intensity: number
): string {
  function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  let amp: number;
  let decay: number;
  let freq: number;

  if (type === "elastic") {
    amp   = lerp(0.01, 0.15, intensity);
    decay = lerp(10,   2,    intensity);
    freq  = 2.0;
  } else if (type === "bounce") {
    amp   = lerp(0.02, 0.10, intensity);
    decay = lerp(8,    2.5,  intensity);
    freq  = 3.0;
  } else {
    // spring
    amp   = lerp(0.05, 0.20, intensity);
    decay = lerp(6,    1.5,  intensity);
    freq  = 1.5;
  }

  // Round to 4 decimal places for cleanliness
  const ampStr   = amp.toFixed(4);
  const decayStr = decay.toFixed(4);
  const freqStr  = freq.toFixed(1);

  return (
    "var amp = " + ampStr + ";\n" +
    "var freq = " + freqStr + ";\n" +
    "var decay = " + decayStr + ";\n" +
    "var n = 0;\n" +
    "if (numKeys > 0) {\n" +
    "  n = nearestKey(time).index;\n" +
    "  if (key(n).time > time) { n--; }\n" +
    "}\n" +
    "if (n === 0) { var t = 0; } else { var t = time - key(n).time; }\n" +
    "if (n > 0 && t < 4) {\n" +
    "  var v = velocityAtTime(key(n).time - thisComp.frameDuration / 10);\n" +
    "  value + v * amp * Math.sin(freq * t * 2 * Math.PI) / Math.exp(decay * t);\n" +
    "} else { value; }"
  );
}

/**
 * Generate ExtendScript body for an entrance animation on a single layer.
 * layerVar:     the ExtendScript variable name that already holds the layer
 * compVar:      the ExtendScript variable name holding the comp
 * preset:       animation preset name
 * t0Expr:       ExtendScript expression for start time
 * duration:     seconds (number literal)
 * easing:       easing preset key
 * overshoot:    whether to apply overshoot expression
 * prefix:       unique prefix for all local variable names
 */
function buildEntranceBody(
  layerVar: string,
  preset: string,
  t0Expr: string,
  duration: number,
  easing: keyof typeof EASING_PRESETS,
  overshoot: boolean,
  prefix: string
): string {
  const opacProp  = layerVar + ".property(\"Transform\").property(\"Opacity\")";
  const posProp   = layerVar + ".property(\"Transform\").property(\"Position\")";
  const scaleProp = layerVar + ".property(\"Transform\").property(\"Scale\")";
  const rotProp   = layerVar + ".property(\"Transform\").property(\"Rotation\")";

  const t0v  = prefix + "_t0";
  const t1v  = prefix + "_t1";
  const kf0v = prefix + "_kf0";
  const kf1v = prefix + "_kf1";
  const restv = prefix + "_rest";

  let body = "";
  body += "var " + t0v + " = " + t0Expr + ";\n";
  body += "var " + t1v + " = " + t0v + " + " + duration + ";\n";

  if (preset === "fade") {
    body += opacProp + ".setValueAtTime(" + t0v + ", 0);\n";
    body += "var " + kf0v + " = " + opacProp + ".nearestKeyIndex(" + t0v + ");\n";
    body += opacProp + ".setValueAtTime(" + t1v + ", 100);\n";
    body += "var " + kf1v + " = " + opacProp + ".nearestKeyIndex(" + t1v + ");\n";
    body += buildEntranceEasing(opacProp, kf0v, kf1v, easing, false, prefix + "o");

  } else if (preset === "slide-up") {
    body += "var " + restv + " = " + posProp + ".valueAtTime(0, false);\n";
    body += posProp + ".setValueAtTime(" + t0v + ", [" + restv + "[0], " + restv + "[1] + 200]);\n";
    body += "var " + kf0v + " = " + posProp + ".nearestKeyIndex(" + t0v + ");\n";
    body += posProp + ".setValueAtTime(" + t1v + ", [" + restv + "[0], " + restv + "[1]]);\n";
    body += "var " + kf1v + " = " + posProp + ".nearestKeyIndex(" + t1v + ");\n";
    body += buildEntranceEasing(posProp, kf0v, kf1v, easing, true, prefix + "p");
    // also fade opacity
    body += opacProp + ".setValueAtTime(" + t0v + ", 0);\n";
    body += "var " + prefix + "_okf0 = " + opacProp + ".nearestKeyIndex(" + t0v + ");\n";
    body += opacProp + ".setValueAtTime(" + t1v + ", 100);\n";
    body += "var " + prefix + "_okf1 = " + opacProp + ".nearestKeyIndex(" + t1v + ");\n";
    body += buildEntranceEasing(opacProp, prefix + "_okf0", prefix + "_okf1", easing, false, prefix + "o");

  } else if (preset === "slide-down") {
    body += "var " + restv + " = " + posProp + ".valueAtTime(0, false);\n";
    body += posProp + ".setValueAtTime(" + t0v + ", [" + restv + "[0], " + restv + "[1] - 200]);\n";
    body += "var " + kf0v + " = " + posProp + ".nearestKeyIndex(" + t0v + ");\n";
    body += posProp + ".setValueAtTime(" + t1v + ", [" + restv + "[0], " + restv + "[1]]);\n";
    body += "var " + kf1v + " = " + posProp + ".nearestKeyIndex(" + t1v + ");\n";
    body += buildEntranceEasing(posProp, kf0v, kf1v, easing, true, prefix + "p");
    body += opacProp + ".setValueAtTime(" + t0v + ", 0);\n";
    body += "var " + prefix + "_okf0 = " + opacProp + ".nearestKeyIndex(" + t0v + ");\n";
    body += opacProp + ".setValueAtTime(" + t1v + ", 100);\n";
    body += "var " + prefix + "_okf1 = " + opacProp + ".nearestKeyIndex(" + t1v + ");\n";
    body += buildEntranceEasing(opacProp, prefix + "_okf0", prefix + "_okf1", easing, false, prefix + "o");

  } else if (preset === "slide-left") {
    body += "var " + restv + " = " + posProp + ".valueAtTime(0, false);\n";
    body += posProp + ".setValueAtTime(" + t0v + ", [" + restv + "[0] + 200, " + restv + "[1]]);\n";
    body += "var " + kf0v + " = " + posProp + ".nearestKeyIndex(" + t0v + ");\n";
    body += posProp + ".setValueAtTime(" + t1v + ", [" + restv + "[0], " + restv + "[1]]);\n";
    body += "var " + kf1v + " = " + posProp + ".nearestKeyIndex(" + t1v + ");\n";
    body += buildEntranceEasing(posProp, kf0v, kf1v, easing, true, prefix + "p");
    body += opacProp + ".setValueAtTime(" + t0v + ", 0);\n";
    body += "var " + prefix + "_okf0 = " + opacProp + ".nearestKeyIndex(" + t0v + ");\n";
    body += opacProp + ".setValueAtTime(" + t1v + ", 100);\n";
    body += "var " + prefix + "_okf1 = " + opacProp + ".nearestKeyIndex(" + t1v + ");\n";
    body += buildEntranceEasing(opacProp, prefix + "_okf0", prefix + "_okf1", easing, false, prefix + "o");

  } else if (preset === "slide-right") {
    body += "var " + restv + " = " + posProp + ".valueAtTime(0, false);\n";
    body += posProp + ".setValueAtTime(" + t0v + ", [" + restv + "[0] - 200, " + restv + "[1]]);\n";
    body += "var " + kf0v + " = " + posProp + ".nearestKeyIndex(" + t0v + ");\n";
    body += posProp + ".setValueAtTime(" + t1v + ", [" + restv + "[0], " + restv + "[1]]);\n";
    body += "var " + kf1v + " = " + posProp + ".nearestKeyIndex(" + t1v + ");\n";
    body += buildEntranceEasing(posProp, kf0v, kf1v, easing, true, prefix + "p");
    body += opacProp + ".setValueAtTime(" + t0v + ", 0);\n";
    body += "var " + prefix + "_okf0 = " + opacProp + ".nearestKeyIndex(" + t0v + ");\n";
    body += opacProp + ".setValueAtTime(" + t1v + ", 100);\n";
    body += "var " + prefix + "_okf1 = " + opacProp + ".nearestKeyIndex(" + t1v + ");\n";
    body += buildEntranceEasing(opacProp, prefix + "_okf0", prefix + "_okf1", easing, false, prefix + "o");

  } else if (preset === "scale") {
    body += scaleProp + ".setValueAtTime(" + t0v + ", [0, 0]);\n";
    body += "var " + kf0v + " = " + scaleProp + ".nearestKeyIndex(" + t0v + ");\n";
    body += scaleProp + ".setValueAtTime(" + t1v + ", [100, 100]);\n";
    body += "var " + kf1v + " = " + scaleProp + ".nearestKeyIndex(" + t1v + ");\n";
    body += buildEntranceEasing(scaleProp, kf0v, kf1v, easing, true, prefix + "s");
    if (overshoot) {
      const expr = buildOvershootExpression("elastic", 0.5);
      body += scaleProp + ".expression = \"" + escapeString(expr) + "\";\n";
    }

  } else if (preset === "scale-rotate") {
    body += scaleProp + ".setValueAtTime(" + t0v + ", [0, 0]);\n";
    body += "var " + prefix + "_skf0 = " + scaleProp + ".nearestKeyIndex(" + t0v + ");\n";
    body += scaleProp + ".setValueAtTime(" + t1v + ", [100, 100]);\n";
    body += "var " + prefix + "_skf1 = " + scaleProp + ".nearestKeyIndex(" + t1v + ");\n";
    body += buildEntranceEasing(scaleProp, prefix + "_skf0", prefix + "_skf1", easing, true, prefix + "s");
    body += rotProp + ".setValueAtTime(" + t0v + ", -15);\n";
    body += "var " + prefix + "_rkf0 = " + rotProp + ".nearestKeyIndex(" + t0v + ");\n";
    body += rotProp + ".setValueAtTime(" + t1v + ", 0);\n";
    body += "var " + prefix + "_rkf1 = " + rotProp + ".nearestKeyIndex(" + t1v + ");\n";
    body += buildEntranceEasing(rotProp, prefix + "_rkf0", prefix + "_rkf1", easing, false, prefix + "r");

  } else if (preset === "pop") {
    body += scaleProp + ".setValueAtTime(" + t0v + ", [0, 0]);\n";
    body += "var " + kf0v + " = " + scaleProp + ".nearestKeyIndex(" + t0v + ");\n";
    body += scaleProp + ".setValueAtTime(" + t1v + ", [100, 100]);\n";
    body += "var " + kf1v + " = " + scaleProp + ".nearestKeyIndex(" + t1v + ");\n";
    body += buildEntranceEasing(scaleProp, kf0v, kf1v, "snappy", true, prefix + "s");
    if (overshoot) {
      const expr = buildOvershootExpression("elastic", 0.6);
      body += scaleProp + ".expression = \"" + escapeString(expr) + "\";\n";
    }

  } else if (preset === "drop") {
    body += "var " + restv + " = " + posProp + ".valueAtTime(0, false);\n";
    body += posProp + ".setValueAtTime(" + t0v + ", [" + restv + "[0], " + restv + "[1] - 200]);\n";
    body += "var " + kf0v + " = " + posProp + ".nearestKeyIndex(" + t0v + ");\n";
    body += posProp + ".setValueAtTime(" + t1v + ", [" + restv + "[0], " + restv + "[1]]);\n";
    body += "var " + kf1v + " = " + posProp + ".nearestKeyIndex(" + t1v + ");\n";
    body += buildEntranceEasing(posProp, kf0v, kf1v, "heavy", true, prefix + "p");
    if (overshoot) {
      const expr = buildOvershootExpression("bounce", 0.5);
      body += posProp + ".expression = \"" + escapeString(expr) + "\";\n";
    }

  } else if (preset === "typewriter") {
    const startExpr = t0v;
    const expression =
      "var fullText = thisLayer.text.sourceText.toString();\n" +
      "var dur = " + duration + ";\n" +
      "var startT = " + startExpr + ";\n" +
      "var elapsed = time - startT;\n" +
      "var numChars = Math.ceil((elapsed / dur) * fullText.length);\n" +
      "numChars = Math.max(0, Math.min(numChars, fullText.length));\n" +
      "fullText.substring(0, numChars);";
    body += "var _twProp" + prefix + " = " + layerVar + ".property(\"Source Text\");\n";
    body += "if (_twProp" + prefix + ") {\n";
    body += "  _twProp" + prefix + ".expression = \"" + escapeString(expression) + "\";\n";
    body += "}\n";
  }

  return body;
}

/**
 * Generate ExtendScript body for an exit animation on a single layer.
 */
function buildExitBody(
  layerVar: string,
  preset: string,
  t0Expr: string,
  t1Expr: string,
  easing: keyof typeof EASING_PRESETS,
  prefix: string
): string {
  const opacProp  = layerVar + ".property(\"Transform\").property(\"Opacity\")";
  const posProp   = layerVar + ".property(\"Transform\").property(\"Position\")";
  const scaleProp = layerVar + ".property(\"Transform\").property(\"Scale\")";
  const rotProp   = layerVar + ".property(\"Transform\").property(\"Rotation\")";

  const t0v   = prefix + "_t0";
  const t1v   = prefix + "_t1";
  const kf0v  = prefix + "_kf0";
  const kf1v  = prefix + "_kf1";
  const restv = prefix + "_rest";

  let body = "";
  body += "var " + t0v + " = " + t0Expr + ";\n";
  body += "var " + t1v + " = " + t1Expr + ";\n";

  if (preset === "fade") {
    body += opacProp + ".setValueAtTime(" + t0v + ", 100);\n";
    body += "var " + kf0v + " = " + opacProp + ".nearestKeyIndex(" + t0v + ");\n";
    body += opacProp + ".setValueAtTime(" + t1v + ", 0);\n";
    body += "var " + kf1v + " = " + opacProp + ".nearestKeyIndex(" + t1v + ");\n";
    body += buildExitEasing(opacProp, kf0v, kf1v, easing, false, prefix + "o");

  } else if (preset === "slide-up") {
    body += "var " + restv + " = " + posProp + ".valueAtTime(0, false);\n";
    body += posProp + ".setValueAtTime(" + t0v + ", [" + restv + "[0], " + restv + "[1]]);\n";
    body += "var " + kf0v + " = " + posProp + ".nearestKeyIndex(" + t0v + ");\n";
    body += posProp + ".setValueAtTime(" + t1v + ", [" + restv + "[0], " + restv + "[1] - 200]);\n";
    body += "var " + kf1v + " = " + posProp + ".nearestKeyIndex(" + t1v + ");\n";
    body += buildExitEasing(posProp, kf0v, kf1v, easing, true, prefix + "p");
    body += opacProp + ".setValueAtTime(" + t0v + ", 100);\n";
    body += "var " + prefix + "_okf0 = " + opacProp + ".nearestKeyIndex(" + t0v + ");\n";
    body += opacProp + ".setValueAtTime(" + t1v + ", 0);\n";
    body += "var " + prefix + "_okf1 = " + opacProp + ".nearestKeyIndex(" + t1v + ");\n";
    body += buildExitEasing(opacProp, prefix + "_okf0", prefix + "_okf1", easing, false, prefix + "o");

  } else if (preset === "slide-down") {
    body += "var " + restv + " = " + posProp + ".valueAtTime(0, false);\n";
    body += posProp + ".setValueAtTime(" + t0v + ", [" + restv + "[0], " + restv + "[1]]);\n";
    body += "var " + kf0v + " = " + posProp + ".nearestKeyIndex(" + t0v + ");\n";
    body += posProp + ".setValueAtTime(" + t1v + ", [" + restv + "[0], " + restv + "[1] + 200]);\n";
    body += "var " + kf1v + " = " + posProp + ".nearestKeyIndex(" + t1v + ");\n";
    body += buildExitEasing(posProp, kf0v, kf1v, easing, true, prefix + "p");
    body += opacProp + ".setValueAtTime(" + t0v + ", 100);\n";
    body += "var " + prefix + "_okf0 = " + opacProp + ".nearestKeyIndex(" + t0v + ");\n";
    body += opacProp + ".setValueAtTime(" + t1v + ", 0);\n";
    body += "var " + prefix + "_okf1 = " + opacProp + ".nearestKeyIndex(" + t1v + ");\n";
    body += buildExitEasing(opacProp, prefix + "_okf0", prefix + "_okf1", easing, false, prefix + "o");

  } else if (preset === "slide-left") {
    body += "var " + restv + " = " + posProp + ".valueAtTime(0, false);\n";
    body += posProp + ".setValueAtTime(" + t0v + ", [" + restv + "[0], " + restv + "[1]]);\n";
    body += "var " + kf0v + " = " + posProp + ".nearestKeyIndex(" + t0v + ");\n";
    body += posProp + ".setValueAtTime(" + t1v + ", [" + restv + "[0] - 200, " + restv + "[1]]);\n";
    body += "var " + kf1v + " = " + posProp + ".nearestKeyIndex(" + t1v + ");\n";
    body += buildExitEasing(posProp, kf0v, kf1v, easing, true, prefix + "p");
    body += opacProp + ".setValueAtTime(" + t0v + ", 100);\n";
    body += "var " + prefix + "_okf0 = " + opacProp + ".nearestKeyIndex(" + t0v + ");\n";
    body += opacProp + ".setValueAtTime(" + t1v + ", 0);\n";
    body += "var " + prefix + "_okf1 = " + opacProp + ".nearestKeyIndex(" + t1v + ");\n";
    body += buildExitEasing(opacProp, prefix + "_okf0", prefix + "_okf1", easing, false, prefix + "o");

  } else if (preset === "slide-right") {
    body += "var " + restv + " = " + posProp + ".valueAtTime(0, false);\n";
    body += posProp + ".setValueAtTime(" + t0v + ", [" + restv + "[0], " + restv + "[1]]);\n";
    body += "var " + kf0v + " = " + posProp + ".nearestKeyIndex(" + t0v + ");\n";
    body += posProp + ".setValueAtTime(" + t1v + ", [" + restv + "[0] + 200, " + restv + "[1]]);\n";
    body += "var " + kf1v + " = " + posProp + ".nearestKeyIndex(" + t1v + ");\n";
    body += buildExitEasing(posProp, kf0v, kf1v, easing, true, prefix + "p");
    body += opacProp + ".setValueAtTime(" + t0v + ", 100);\n";
    body += "var " + prefix + "_okf0 = " + opacProp + ".nearestKeyIndex(" + t0v + ");\n";
    body += opacProp + ".setValueAtTime(" + t1v + ", 0);\n";
    body += "var " + prefix + "_okf1 = " + opacProp + ".nearestKeyIndex(" + t1v + ");\n";
    body += buildExitEasing(opacProp, prefix + "_okf0", prefix + "_okf1", easing, false, prefix + "o");

  } else if (preset === "scale") {
    body += scaleProp + ".setValueAtTime(" + t0v + ", [100, 100]);\n";
    body += "var " + kf0v + " = " + scaleProp + ".nearestKeyIndex(" + t0v + ");\n";
    body += scaleProp + ".setValueAtTime(" + t1v + ", [0, 0]);\n";
    body += "var " + kf1v + " = " + scaleProp + ".nearestKeyIndex(" + t1v + ");\n";
    body += buildExitEasing(scaleProp, kf0v, kf1v, easing, true, prefix + "s");

  } else if (preset === "scale-rotate") {
    body += scaleProp + ".setValueAtTime(" + t0v + ", [100, 100]);\n";
    body += "var " + prefix + "_skf0 = " + scaleProp + ".nearestKeyIndex(" + t0v + ");\n";
    body += scaleProp + ".setValueAtTime(" + t1v + ", [0, 0]);\n";
    body += "var " + prefix + "_skf1 = " + scaleProp + ".nearestKeyIndex(" + t1v + ");\n";
    body += buildExitEasing(scaleProp, prefix + "_skf0", prefix + "_skf1", easing, true, prefix + "s");
    body += rotProp + ".setValueAtTime(" + t0v + ", 0);\n";
    body += "var " + prefix + "_rkf0 = " + rotProp + ".nearestKeyIndex(" + t0v + ");\n";
    body += rotProp + ".setValueAtTime(" + t1v + ", 15);\n";
    body += "var " + prefix + "_rkf1 = " + rotProp + ".nearestKeyIndex(" + t1v + ");\n";
    body += buildExitEasing(rotProp, prefix + "_rkf0", prefix + "_rkf1", easing, false, prefix + "r");

  } else if (preset === "shrink") {
    body += scaleProp + ".setValueAtTime(" + t0v + ", [100, 100]);\n";
    body += "var " + kf0v + " = " + scaleProp + ".nearestKeyIndex(" + t0v + ");\n";
    body += scaleProp + ".setValueAtTime(" + t1v + ", [0, 0]);\n";
    body += "var " + kf1v + " = " + scaleProp + ".nearestKeyIndex(" + t1v + ");\n";
    body += buildExitEasing(scaleProp, kf0v, kf1v, "snappy", true, prefix + "s");

  } else if (preset === "drop-out") {
    body += "var " + restv + " = " + posProp + ".valueAtTime(0, false);\n";
    body += posProp + ".setValueAtTime(" + t0v + ", [" + restv + "[0], " + restv + "[1]]);\n";
    body += "var " + kf0v + " = " + posProp + ".nearestKeyIndex(" + t0v + ");\n";
    body += posProp + ".setValueAtTime(" + t1v + ", [" + restv + "[0], " + restv + "[1] + 500]);\n";
    body += "var " + kf1v + " = " + posProp + ".nearestKeyIndex(" + t1v + ");\n";
    body += buildExitEasing(posProp, kf0v, kf1v, "heavy", true, prefix + "p");
  }

  return body;
}

// ---------------------------------------------------------------------------
// registerCompoundTools
// ---------------------------------------------------------------------------

export function registerCompoundTools(server: McpServer): void {

  // ─── position_layer_semantic ─────────────────────────────────────────────
  server.tool(
    "position_layer_semantic",
    "Position a layer using human-readable location names instead of pixel coordinates. " +
    "Reads the composition's actual dimensions at runtime and maps semantic positions to pixel values. " +
    "Positions: 'center', 'top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', " +
    "'bottom-right', 'left-center', 'right-center', 'lower-third', 'upper-third', 'title-safe-center'. " +
    "margin controls the inset distance from the edges (default 48px).",
    {
      compId:     z.number().int().positive().describe("Numeric ID of the composition"),
      layerIndex: z.number().int().positive().describe("1-based layer index"),
      position:   z.enum([
        "center", "top-left", "top-center", "top-right",
        "bottom-left", "bottom-center", "bottom-right",
        "left-center", "right-center",
        "lower-third", "upper-third", "title-safe-center",
      ]).describe("Semantic position name"),
      margin: z.number().optional().describe("Inset margin in pixels (default 48)"),
    },
    async ({ compId, layerIndex, position, margin }) => {
      const m = margin ?? 48;

      // Build the position calculation as ES3 if/else inside ExtendScript
      // This embeds all the math in one shot so we don't need a two-pass approach.
      let posCalc = "";
      posCalc += "var _w = comp.width;\n";
      posCalc += "var _h = comp.height;\n";
      posCalc += "var _m = " + m + ";\n";
      posCalc += "var _px = 0; var _py = 0;\n";

      if (position === "center") {
        posCalc += "_px = _w / 2; _py = _h / 2;\n";
      } else if (position === "top-left") {
        posCalc += "_px = _m; _py = _m;\n";
      } else if (position === "top-center") {
        posCalc += "_px = _w / 2; _py = _m;\n";
      } else if (position === "top-right") {
        posCalc += "_px = _w - _m; _py = _m;\n";
      } else if (position === "bottom-left") {
        posCalc += "_px = _m; _py = _h - _m;\n";
      } else if (position === "bottom-center") {
        posCalc += "_px = _w / 2; _py = _h - _m;\n";
      } else if (position === "bottom-right") {
        posCalc += "_px = _w - _m; _py = _h - _m;\n";
      } else if (position === "left-center") {
        posCalc += "_px = _m; _py = _h / 2;\n";
      } else if (position === "right-center") {
        posCalc += "_px = _w - _m; _py = _h / 2;\n";
      } else if (position === "lower-third") {
        posCalc += "_px = _m + 200; _py = _h * 0.78;\n";
      } else if (position === "upper-third") {
        posCalc += "_px = _m + 200; _py = _h * 0.22;\n";
      } else if (position === "title-safe-center") {
        posCalc += "_px = _w / 2; _py = _h * 0.45;\n";
      }

      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        posCalc +
        "layer.transform.position.setValue([_px, _py]);\n" +
        "return { success: true, data: { position: \"" + escapeString(position) + "\", x: _px, y: _py, margin: _m } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "position_layer_semantic"));
      try {
        return runScript(script, "position_layer_semantic");
      } catch (err) {
        return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
      }
    }
  );

  // ─── apply_text_style ────────────────────────────────────────────────────
  server.tool(
    "apply_text_style",
    "Apply professional typography settings to a text layer. " +
    "Chooses font size, tracking, and weight from a preset vocabulary of roles and styles. " +
    "Roles: 'title', 'subtitle', 'body', 'caption', 'label', 'accent'. " +
    "Styles: 'corporate' (clean/business), 'cinematic' (filmic/dramatic), " +
    "'minimal' (clean/understated), 'bold' (high-impact), 'editorial' (magazine-feel). " +
    "Optionally override color (RGB 0-1 array) and font family.",
    {
      compId:       z.number().int().positive().describe("Numeric ID of the composition"),
      layerIndex:   z.number().int().positive().describe("1-based layer index"),
      role:         z.enum(["title", "subtitle", "body", "caption", "label", "accent"]).describe("Typographic role"),
      style:        z.enum(["corporate", "cinematic", "minimal", "bold", "editorial"]).optional().describe("Visual style preset (default: corporate)"),
      color:        z.array(z.number()).optional().describe("RGB color array 0-1 (e.g. [1, 1, 1])"),
      fontOverride: z.string().optional().describe("Override the font family name"),
    },
    async ({ compId, layerIndex, role, style, color, fontOverride }) => {
      const styleKey = style ?? "corporate";
      const styleMap = TEXT_STYLES[styleKey];
      if (!styleMap) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: { message: "Unknown style: " + styleKey, code: "INVALID_PARAMS" } }) }] };
      }
      const def = styleMap[role];
      if (!def) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: { message: "Unknown role: " + role, code: "INVALID_PARAMS" } }) }] };
      }

      const font     = fontOverride ?? def.font;
      const size     = def.size;
      const tracking = def.tracking;
      const fillColor = color ?? STYLE_COLORS[styleKey] ?? [1, 1, 1];

      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        "var _textProp = layer.property(\"ADBE Text Properties\").property(\"ADBE Text Document\");\n" +
        "if (!_textProp) {\n" +
        "  return { success: false, error: { message: \"Layer " + layerIndex + " is not a text layer.\", code: \"LAYER_TYPE_ERROR\" } };\n" +
        "}\n" +
        "var _td = _textProp.value;\n" +
        "_td.fontSize = " + size + ";\n" +
        "_td.font = \"" + escapeString(font) + "\";\n" +
        "_td.tracking = " + tracking + ";\n" +
        "_td.fillColor = " + colorLiteral(fillColor) + ";\n" +
        "_textProp.setValue(_td);\n" +
        "return { success: true, data: { role: \"" + escapeString(role) + "\", style: \"" + escapeString(styleKey) + "\", font: \"" + escapeString(font) + "\", size: " + size + ", tracking: " + tracking + " } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "apply_text_style"));
      try {
        return runScript(script, "apply_text_style");
      } catch (err) {
        return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
      }
    }
  );

  // ─── apply_overshoot ─────────────────────────────────────────────────────
  server.tool(
    "apply_overshoot",
    "Add an elastic/bounce/spring overshoot expression to an animated layer property. " +
    "The expression produces organic inertial motion after the last keyframe, " +
    "simulating the natural overshoot of physical objects. " +
    "Works best on properties that already have keyframes. " +
    "Types: 'elastic' (standard inertial, recommended), 'bounce' (higher freq, snappier), 'spring' (lower freq, floaty). " +
    "intensity 0-1: 0 = subtle, 0.5 = moderate, 1 = wild.",
    {
      compId:     z.number().int().positive().describe("Numeric ID of the composition"),
      layerIndex: z.number().int().positive().describe("1-based layer index"),
      property:   z.string().describe("Transform property name: 'Position', 'Scale', 'Rotation', 'Opacity'"),
      type:       z.enum(["elastic", "bounce", "spring"]).optional().describe("Overshoot type (default: elastic)"),
      intensity:  z.number().min(0).max(1).optional().describe("Intensity 0-1 (default: 0.5)"),
    },
    async ({ compId, layerIndex, property, type, intensity }) => {
      const overshootType = type ?? "elastic";
      const overshootIntensity = intensity ?? 0.5;

      const expression = buildOvershootExpression(overshootType, overshootIntensity);
      const propExpr = transformProp("layer", property);

      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        "var _oProp = " + propExpr + ";\n" +
        "if (!_oProp) {\n" +
        "  return { success: false, error: { message: \"Property not found: " + escapeString(property) + "\", code: \"PROP_NOT_FOUND\" } };\n" +
        "}\n" +
        "_oProp.expression = \"" + escapeString(expression) + "\";\n" +
        "return { success: true, data: { property: \"" + escapeString(property) + "\", type: \"" + escapeString(overshootType) + "\", intensity: " + overshootIntensity + ", expressionSet: true } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "apply_overshoot"));
      try {
        return runScript(script, "apply_overshoot");
      } catch (err) {
        return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
      }
    }
  );

  // ─── animate_entrance ────────────────────────────────────────────────────
  server.tool(
    "animate_entrance",
    "Animate a layer entering the scene with professional easing and timing. " +
    "Presets: 'fade' (opacity), 'slide-up/down/left/right' (position + opacity), " +
    "'scale' (scale from 0), 'scale-rotate' (scale + rotation), " +
    "'pop' (scale with overshoot), 'drop' (drop from above with gravity), " +
    "'typewriter' (character-by-character text reveal). " +
    "Duration defaults are sourced from style-aware timing tables. " +
    "Easing: 'smooth', 'snappy', 'heavy', 'elastic'. " +
    "overshoot adds inertial bounce expression (on by default for pop/drop).",
    {
      compId:     z.number().int().positive().describe("Numeric ID of the composition"),
      layerIndex: z.number().int().positive().describe("1-based layer index"),
      preset:     z.enum([
        "fade", "slide-up", "slide-down", "slide-left", "slide-right",
        "scale", "scale-rotate", "pop", "drop", "typewriter",
      ]).describe("Animation preset"),
      startTime: z.number().optional().describe("Start time in seconds (default: layer in-point)"),
      duration:  z.number().optional().describe("Animation duration in seconds"),
      overshoot: z.boolean().optional().describe("Apply overshoot expression (default: true for pop/drop/scale)"),
      easing:    z.enum(["smooth", "snappy", "heavy", "elastic"]).optional().describe("Easing style (default: smooth)"),
      style:     z.string().optional().describe("Visual style name for timing defaults (corporate, cinematic, minimal, energetic)"),
    },
    async ({ compId, layerIndex, preset, startTime, duration, overshoot, easing, style }) => {
      const easingKey = (easing ?? "smooth") as keyof typeof EASING_PRESETS;
      const dur = resolveDuration(preset, style, duration, 0.5);

      // Determine default overshoot per preset
      const defaultOvershoot = (preset === "pop" || preset === "drop" || preset === "scale");
      const applyOvershoot = overshoot !== undefined ? overshoot : defaultOvershoot;

      const t0Expr = startTime !== undefined ? String(startTime) : "layer.inPoint";

      const layerVar = "layer";
      const animBody = buildEntranceBody(layerVar, preset, t0Expr, dur, easingKey, applyOvershoot, "_ae");

      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        animBody +
        "return { success: true, data: { preset: \"" + escapeString(preset) + "\", duration: " + dur + ", overshoot: " + (applyOvershoot ? "true" : "false") + ", easing: \"" + escapeString(easingKey) + "\" } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "animate_entrance"));
      try {
        return runScript(script, "animate_entrance");
      } catch (err) {
        return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
      }
    }
  );

  // ─── animate_exit ────────────────────────────────────────────────────────
  server.tool(
    "animate_exit",
    "Animate a layer leaving the scene with professional easing and timing. " +
    "Mirror of animate_entrance but in reverse — from visible state to invisible/off-screen. " +
    "Presets: 'fade' (opacity out), 'slide-up/down/left/right' (move off-screen + fade), " +
    "'scale' (scale to 0), 'scale-rotate' (scale + rotation exit), " +
    "'shrink' (fast scale-to-0), 'drop-out' (fall off bottom). " +
    "endTime defaults to 0.5s before the layer's out-point.",
    {
      compId:     z.number().int().positive().describe("Numeric ID of the composition"),
      layerIndex: z.number().int().positive().describe("1-based layer index"),
      preset:     z.enum([
        "fade", "slide-up", "slide-down", "slide-left", "slide-right",
        "scale", "scale-rotate", "shrink", "drop-out",
      ]).describe("Exit animation preset"),
      endTime:  z.number().optional().describe("End time in seconds (default: layer out-point)"),
      duration: z.number().optional().describe("Animation duration in seconds"),
      easing:   z.enum(["smooth", "snappy", "heavy", "elastic"]).optional().describe("Easing style (default: smooth)"),
      style:    z.string().optional().describe("Visual style name for timing defaults"),
    },
    async ({ compId, layerIndex, preset, endTime, duration, easing, style }) => {
      const easingKey = (easing ?? "smooth") as keyof typeof EASING_PRESETS;
      const dur = resolveDuration(preset, style, duration, 0.5);

      // t1 = end of exit, t0 = start (t1 - duration)
      const t1Expr = endTime !== undefined ? String(endTime) : "layer.outPoint";
      const t0Expr = endTime !== undefined ? String(endTime - dur) : "(layer.outPoint - " + dur + ")";

      const layerVar = "layer";
      const animBody = buildExitBody(layerVar, preset, t0Expr, t1Expr, easingKey, "_axe");

      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        animBody +
        "return { success: true, data: { preset: \"" + escapeString(preset) + "\", duration: " + dur + ", easing: \"" + escapeString(easingKey) + "\" } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "animate_exit"));
      try {
        return runScript(script, "animate_exit");
      } catch (err) {
        return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
      }
    }
  );

  // ─── stagger_animation ───────────────────────────────────────────────────
  server.tool(
    "stagger_animation",
    "Apply an entrance animation to multiple layers with staggered timing in a single call. " +
    "Each layer receives the same preset but starts slightly later than the previous one, " +
    "creating a cascade/wave effect. " +
    "direction: 'forward' = first to last, 'reverse' = last to first, " +
    "'center-out' = middle layers first expanding outward, 'random' = shuffled order. " +
    "staggerDelay is the time offset between each layer's animation start (default 0.08s).",
    {
      compId:        z.number().int().positive().describe("Numeric ID of the composition"),
      layerIndices:  z.array(z.number().int().positive()).min(1).describe("Ordered list of 1-based layer indices"),
      preset:        z.enum([
        "fade", "slide-up", "slide-down", "slide-left", "slide-right",
        "scale", "scale-rotate", "pop", "drop", "typewriter",
      ]).describe("Animation preset (same as animate_entrance)"),
      staggerDelay: z.number().optional().describe("Time offset between each layer in seconds (default 0.08)"),
      duration:     z.number().optional().describe("Animation duration per layer in seconds"),
      easing:       z.enum(["smooth", "snappy", "heavy", "elastic"]).optional().describe("Easing style"),
      style:        z.string().optional().describe("Visual style name for timing defaults"),
      direction:    z.enum(["forward", "reverse", "center-out", "random"]).optional().describe("Stagger order (default: forward)"),
    },
    async ({ compId, layerIndices, preset, staggerDelay, duration, easing, style, direction }) => {
      const delay = staggerDelay ?? 0.08;
      const easingKey = (easing ?? "smooth") as keyof typeof EASING_PRESETS;
      const dur = resolveDuration(preset, style, duration, 0.5);
      const dir = direction ?? "forward";

      // Reorder indices based on direction (TypeScript side)
      let orderedIndices = [...layerIndices];

      if (dir === "reverse") {
        orderedIndices = orderedIndices.slice().reverse();
      } else if (dir === "center-out") {
        // Reorder: center layers first, expand outward
        const mid = Math.floor(orderedIndices.length / 2);
        const reordered: number[] = [];
        for (let i = 0; i <= mid; i++) {
          if (mid - i >= 0 && !reordered.includes(orderedIndices[mid - i])) {
            reordered.push(orderedIndices[mid - i]);
          }
          if (mid + i < orderedIndices.length && mid + i !== mid - i && !reordered.includes(orderedIndices[mid + i])) {
            reordered.push(orderedIndices[mid + i]);
          }
        }
        orderedIndices = reordered;
      } else if (dir === "random") {
        // Deterministic Fisher-Yates using a simple seed based on sum of indices
        const seed = orderedIndices.reduce((a, b) => a + b, 0);
        let rng = seed;
        function nextRand(): number {
          rng = (rng * 1664525 + 1013904223) & 0xffffffff;
          return (rng >>> 0) / 0x100000000;
        }
        for (let i = orderedIndices.length - 1; i > 0; i--) {
          const j = Math.floor(nextRand() * (i + 1));
          const tmp = orderedIndices[i];
          orderedIndices[i] = orderedIndices[j];
          orderedIndices[j] = tmp;
        }
      }

      // Default overshoot flag (same logic as animate_entrance)
      const defaultOvershoot = (preset === "pop" || preset === "drop" || preset === "scale");

      // Build one big ExtendScript block covering all layers
      let allLayerBlocks = "";
      for (let i = 0; i < orderedIndices.length; i++) {
        const idx = orderedIndices[i];
        const prefix = "_sg" + i;
        const layerVar = prefix + "_layer";
        const t0Expr = layerVar + ".inPoint + " + (i * delay);

        allLayerBlocks +=
          // Validate index inline (soft — skip if out of range)
          "if (" + idx + " >= 1 && " + idx + " <= comp.numLayers) {\n" +
          "  var " + layerVar + " = comp.layer(" + idx + ");\n" +
          buildEntranceBody(layerVar, preset, t0Expr, dur, easingKey, defaultOvershoot, prefix + "a")
            .split("\n").map(l => "  " + l).join("\n") + "\n" +
          "}\n";
      }

      const body =
        findCompById("comp", compId) +
        allLayerBlocks +
        "return { success: true, data: { preset: \"" + escapeString(preset) + "\", layerCount: " + orderedIndices.length + ", staggerDelay: " + delay + ", duration: " + dur + ", direction: \"" + escapeString(dir) + "\" } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "stagger_animation"));
      try {
        return runScript(script, "stagger_animation");
      } catch (err) {
        return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
      }
    }
  );
}
