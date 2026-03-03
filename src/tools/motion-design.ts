/**
 * tools/motion-design.ts
 *
 * Higher-level motion design tools that compose multiple AE operations into
 * single, intention-driven calls.
 *
 * Registers:
 *   - apply_fade_in        Opacity 0→100 with ease_in_out
 *   - apply_fade_out       Opacity 100→0 with ease_in_out
 *   - apply_slide_in       Slide from off-screen to current position
 *   - apply_scale_in       Scale from N% to 100%
 *   - apply_bounce_in      Bouncy spring-scale entrance (5 keyframes)
 *   - apply_typewriter     Character-by-character text reveal via expression
 *   - apply_color_theme    Create a Color Theme null with 5 Color expression controls
 *   - create_scene         Batch-create multiple layers in one call
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
} from "../script-builder.js";

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

// ---------------------------------------------------------------------------
// registerMotionDesignTools
// ---------------------------------------------------------------------------

export function registerMotionDesignTools(server: McpServer): void {
  // ─── apply_fade_in ───────────────────────────────────────────────────────────
  server.tool(
    "apply_fade_in",
    "Animate a layer's opacity from 0% to 100% (fade in). " +
      "Adds two Opacity keyframes with ease_in_out: " +
      "0% at startTime, 100% at startTime + duration. " +
      "If startTime is omitted, the fade begins at the layer's in-point. " +
      "Combine with apply_slide_in or apply_scale_in for richer entrances. " +
      "Typical durations: 0.3s (quick), 0.5s (standard), 1.0s (cinematic).",
    {
      compId: z.number().int().positive().describe("Numeric ID of the composition"),
      layerIndex: z.number().int().positive().describe("1-based layer index"),
      duration: z
        .number()
        .positive()
        .default(0.5)
        .describe("Duration of the fade in seconds (default 0.5s)"),
      startTime: z
        .number()
        .min(0)
        .optional()
        .describe("Time in seconds where the fade begins (default: layer's inPoint)"),
    },
    async ({ compId, layerIndex, duration, startTime }) => {
      const t0Expr = startTime !== undefined ? String(startTime) : "layer.inPoint";
      const opacPropExpr = transformProp("layer", "Opacity");

      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        "var _fi_t0 = " + t0Expr + ";\n" +
        "var _fi_t1 = _fi_t0 + " + duration + ";\n" +
        opacPropExpr + ".setValueAtTime(_fi_t0, 0);\n" +
        "var _fiKf0 = " + opacPropExpr + ".nearestKeyIndex(_fi_t0);\n" +
        "var _fiEase0 = new KeyframeEase(0, 33);\n" +
        opacPropExpr + ".setInterpolationTypeAtKey(_fiKf0, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);\n" +
        opacPropExpr + ".setTemporalEaseAtKey(_fiKf0, [_fiEase0], [_fiEase0]);\n" +
        opacPropExpr + ".setValueAtTime(_fi_t1, 100);\n" +
        "var _fiKf1 = " + opacPropExpr + ".nearestKeyIndex(_fi_t1);\n" +
        "var _fiEase1 = new KeyframeEase(0, 33);\n" +
        opacPropExpr + ".setInterpolationTypeAtKey(_fiKf1, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);\n" +
        opacPropExpr + ".setTemporalEaseAtKey(_fiKf1, [_fiEase1], [_fiEase1]);\n" +
        "return { success: true, data: { effect: \"fade_in\", duration: " + duration + " } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "apply_fade_in"));
      try {
        return runScript(script, "apply_fade_in");
      } catch (err) {
        return { content: [{ type: "text", text: "Error: " + String(err) }], isError: true };
      }
    }
  );

  // ─── apply_fade_out ───────────────────────────────────────────────────────────
  server.tool(
    "apply_fade_out",
    "Animate a layer's opacity from 100% to 0% (fade out). " +
      "Adds two Opacity keyframes: 100% at endTime - duration, 0% at endTime. " +
      "If endTime is omitted, the fade ends at the layer's out-point. " +
      "Pair with apply_fade_in on the same layer for a complete fade-in-then-out lifecycle.",
    {
      compId: z.number().int().positive().describe("Numeric ID of the composition"),
      layerIndex: z.number().int().positive().describe("1-based layer index"),
      duration: z
        .number()
        .positive()
        .default(0.5)
        .describe("Duration of the fade out in seconds (default 0.5s)"),
      endTime: z
        .number()
        .min(0)
        .optional()
        .describe("Time in seconds where opacity reaches 0 (default: layer's outPoint)"),
    },
    async ({ compId, layerIndex, duration, endTime }) => {
      const t1Expr = endTime !== undefined ? String(endTime) : "layer.outPoint";
      const opacPropExpr = transformProp("layer", "Opacity");

      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        "var _fo_t1 = " + t1Expr + ";\n" +
        "var _fo_t0 = _fo_t1 - " + duration + ";\n" +
        opacPropExpr + ".setValueAtTime(_fo_t0, 100);\n" +
        "var _foKf0 = " + opacPropExpr + ".nearestKeyIndex(_fo_t0);\n" +
        "var _foEase0 = new KeyframeEase(0, 33);\n" +
        opacPropExpr + ".setInterpolationTypeAtKey(_foKf0, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);\n" +
        opacPropExpr + ".setTemporalEaseAtKey(_foKf0, [_foEase0], [_foEase0]);\n" +
        opacPropExpr + ".setValueAtTime(_fo_t1, 0);\n" +
        "var _foKf1 = " + opacPropExpr + ".nearestKeyIndex(_fo_t1);\n" +
        "var _foEase1 = new KeyframeEase(0, 33);\n" +
        opacPropExpr + ".setInterpolationTypeAtKey(_foKf1, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);\n" +
        opacPropExpr + ".setTemporalEaseAtKey(_foKf1, [_foEase1], [_foEase1]);\n" +
        "return { success: true, data: { effect: \"fade_out\", duration: " + duration + " } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "apply_fade_out"));
      try {
        return runScript(script, "apply_fade_out");
      } catch (err) {
        return { content: [{ type: "text", text: "Error: " + String(err) }], isError: true };
      }
    }
  );

  // ─── apply_slide_in ───────────────────────────────────────────────────────────
  server.tool(
    "apply_slide_in",
    "Animate a layer sliding in from off-screen to its current position. " +
      "Reads the layer's current Position, offsets it by `distance` pixels in the given direction, " +
      "then animates from the offset back to the original position with ease_in_out. " +
      "Direction describes where the layer ENTERS FROM: " +
      "'left' = enters from the left (starts further left); " +
      "'right' = enters from the right; 'top' = enters from above; 'bottom' = enters from below. " +
      "Combine with apply_fade_in for a classic reveal effect.",
    {
      compId: z.number().int().positive().describe("Numeric ID of the composition"),
      layerIndex: z.number().int().positive().describe("1-based layer index"),
      direction: z
        .enum(["left", "right", "top", "bottom"])
        .describe("Direction the layer enters from"),
      distance: z
        .number()
        .positive()
        .default(200)
        .describe("Pixels from resting position the layer starts (default 200px)"),
      duration: z
        .number()
        .positive()
        .default(0.5)
        .describe("Duration of the slide animation in seconds (default 0.5s)"),
      startTime: z
        .number()
        .min(0)
        .optional()
        .describe("Time in seconds where the slide begins (default: layer's inPoint)"),
    },
    async ({ compId, layerIndex, direction, distance, duration, startTime }) => {
      const offsetX =
        direction === "left" ? -distance : direction === "right" ? distance : 0;
      const offsetY =
        direction === "top" ? -distance : direction === "bottom" ? distance : 0;
      const t0Expr = startTime !== undefined ? String(startTime) : "layer.inPoint";
      const posPropExpr = transformProp("layer", "Position");

      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        // Capture resting position at time 0
        "var _slRest = " + posPropExpr + ".valueAtTime(0, false);\n" +
        "var _sl_t0 = " + t0Expr + ";\n" +
        "var _sl_t1 = _sl_t0 + " + duration + ";\n" +
        "var _slStartX = _slRest[0] + (" + offsetX + ");\n" +
        "var _slStartY = _slRest[1] + (" + offsetY + ");\n" +
        // Keyframe 0: off-screen start
        posPropExpr + ".setValueAtTime(_sl_t0, [_slStartX, _slStartY]);\n" +
        "var _slKf0 = " + posPropExpr + ".nearestKeyIndex(_sl_t0);\n" +
        "var _slEase0 = new KeyframeEase(0, 33);\n" +
        posPropExpr + ".setInterpolationTypeAtKey(_slKf0, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);\n" +
        posPropExpr + ".setTemporalEaseAtKey(_slKf0, [_slEase0], [_slEase0]);\n" +
        // Keyframe 1: resting position
        posPropExpr + ".setValueAtTime(_sl_t1, [_slRest[0], _slRest[1]]);\n" +
        "var _slKf1 = " + posPropExpr + ".nearestKeyIndex(_sl_t1);\n" +
        "var _slEase1 = new KeyframeEase(0, 33);\n" +
        posPropExpr + ".setInterpolationTypeAtKey(_slKf1, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);\n" +
        posPropExpr + ".setTemporalEaseAtKey(_slKf1, [_slEase1], [_slEase1]);\n" +
        "return { success: true, data: { effect: \"slide_in\", direction: " + JSON.stringify(direction) + ", distance: " + distance + ", duration: " + duration + " } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "apply_slide_in"));
      try {
        return runScript(script, "apply_slide_in");
      } catch (err) {
        return { content: [{ type: "text", text: "Error: " + String(err) }], isError: true };
      }
    }
  );

  // ─── apply_scale_in ───────────────────────────────────────────────────────────
  server.tool(
    "apply_scale_in",
    "Animate a layer's scale from a starting percentage to 100% (normal size). " +
      "fromScale 0 → grows from invisible to full size (pop-in). " +
      "fromScale 50 → grows from half size (subtle expand). " +
      "fromScale 120 → shrinks from oversized to normal (slam-down). " +
      "Both keyframes use ease_in_out. Combine with apply_fade_in for a polished entrance.",
    {
      compId: z.number().int().positive().describe("Numeric ID of the composition"),
      layerIndex: z.number().int().positive().describe("1-based layer index"),
      fromScale: z
        .number()
        .min(0)
        .default(0)
        .describe("Starting scale as a percentage (default 0). 0 = grows from nothing."),
      duration: z
        .number()
        .positive()
        .default(0.5)
        .describe("Duration in seconds (default 0.5s)"),
      startTime: z
        .number()
        .min(0)
        .optional()
        .describe("Time in seconds where the animation begins (default: layer's inPoint)"),
    },
    async ({ compId, layerIndex, fromScale, duration, startTime }) => {
      const t0Expr = startTime !== undefined ? String(startTime) : "layer.inPoint";
      const scalePropExpr = transformProp("layer", "Scale");

      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        "var _sci_t0 = " + t0Expr + ";\n" +
        "var _sci_t1 = _sci_t0 + " + duration + ";\n" +
        scalePropExpr + ".setValueAtTime(_sci_t0, [" + fromScale + ", " + fromScale + "]);\n" +
        "var _sciKf0 = " + scalePropExpr + ".nearestKeyIndex(_sci_t0);\n" +
        "var _sciEase0 = new KeyframeEase(0, 33);\n" +
        scalePropExpr + ".setInterpolationTypeAtKey(_sciKf0, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);\n" +
        scalePropExpr + ".setTemporalEaseAtKey(_sciKf0, [_sciEase0], [_sciEase0]);\n" +
        scalePropExpr + ".setValueAtTime(_sci_t1, [100, 100]);\n" +
        "var _sciKf1 = " + scalePropExpr + ".nearestKeyIndex(_sci_t1);\n" +
        "var _sciEase1 = new KeyframeEase(0, 33);\n" +
        scalePropExpr + ".setInterpolationTypeAtKey(_sciKf1, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);\n" +
        scalePropExpr + ".setTemporalEaseAtKey(_sciKf1, [_sciEase1], [_sciEase1]);\n" +
        "return { success: true, data: { effect: \"scale_in\", fromScale: " + fromScale + ", duration: " + duration + " } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "apply_scale_in"));
      try {
        return runScript(script, "apply_scale_in");
      } catch (err) {
        return { content: [{ type: "text", text: "Error: " + String(err) }], isError: true };
      }
    }
  );

  // ─── apply_bounce_in ──────────────────────────────────────────────────────────
  server.tool(
    "apply_bounce_in",
    "Apply a spring-physics bouncy scale entrance to a layer. " +
      "Uses 5 scale keyframes distributed across the duration: " +
      "0% → 120% → 95% → 105% → 100%, all with ease_in_out. " +
      "This mimics spring physics and creates an organic, playful feel " +
      "seen in mobile UI animations and logo reveals. Purely keyframe-driven.",
    {
      compId: z.number().int().positive().describe("Numeric ID of the composition"),
      layerIndex: z.number().int().positive().describe("1-based layer index"),
      duration: z
        .number()
        .positive()
        .default(0.8)
        .describe("Total duration in seconds (default 0.8s). Shorter = snappier, longer = bouncier."),
      startTime: z
        .number()
        .min(0)
        .optional()
        .describe("Time in seconds where the bounce begins (default: layer's inPoint)"),
    },
    async ({ compId, layerIndex, duration, startTime }) => {
      const t0Expr = startTime !== undefined ? String(startTime) : "layer.inPoint";
      const scalePropExpr = transformProp("layer", "Scale");

      // Spring keyframe data: [fraction of duration, scale value]
      const kfData: Array<[number, number]> = [
        [0.00, 0],
        [0.40, 120],
        [0.65, 95],
        [0.82, 105],
        [1.00, 100],
      ];

      let kfLines = "";
      for (let i = 0; i < kfData.length; i++) {
        const [pct, sv] = kfData[i];
        const tExpr = "_bi_t0 + " + (pct * duration);
        const kv = "_biKf" + i;
        const ev = "_biEase" + i;
        kfLines +=
          scalePropExpr + ".setValueAtTime(" + tExpr + ", [" + sv + ", " + sv + "]);\n" +
          "var " + kv + " = " + scalePropExpr + ".nearestKeyIndex(" + tExpr + ");\n" +
          "var " + ev + " = new KeyframeEase(0, 33);\n" +
          scalePropExpr + ".setInterpolationTypeAtKey(" + kv + ", KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);\n" +
          scalePropExpr + ".setTemporalEaseAtKey(" + kv + ", [" + ev + "], [" + ev + "]);\n";
      }

      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        "var _bi_t0 = " + t0Expr + ";\n" +
        kfLines +
        "return { success: true, data: { effect: \"bounce_in\", duration: " + duration + ", keyframeCount: 5 } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "apply_bounce_in"));
      try {
        return runScript(script, "apply_bounce_in");
      } catch (err) {
        return { content: [{ type: "text", text: "Error: " + String(err) }], isError: true };
      }
    }
  );

  // ─── apply_typewriter ─────────────────────────────────────────────────────────
  server.tool(
    "apply_typewriter",
    "Apply a typewriter (character-by-character reveal) effect to a text layer. " +
      "Sets a Source Text expression that progressively reveals characters left-to-right " +
      "over the specified duration. " +
      "The layer MUST be a text layer with Source Text content already set. " +
      "startTime defaults to the layer's inPoint.",
    {
      compId: z.number().int().positive().describe("Numeric ID of the composition"),
      layerIndex: z
        .number()
        .int()
        .positive()
        .describe("1-based index of a text layer"),
      duration: z
        .number()
        .positive()
        .default(2)
        .describe("Time in seconds to reveal all characters (default 2s)"),
      startTime: z
        .number()
        .min(0)
        .optional()
        .describe("Time in seconds when first character appears (default: layer's inPoint)"),
    },
    async ({ compId, layerIndex, duration, startTime }) => {
      const startExpr =
        startTime !== undefined ? String(startTime) : "thisLayer.inPoint";

      // AE expression (modern JS — runs in expression engine, not ExtendScript)
      const expression =
        "var fullText = thisLayer.text.sourceText.toString();\n" +
        "var dur = " + duration + ";\n" +
        "var startT = " + startExpr + ";\n" +
        "var elapsed = time - startT;\n" +
        "var numChars = Math.ceil((elapsed / dur) * fullText.length);\n" +
        "numChars = Math.max(0, Math.min(numChars, fullText.length));\n" +
        "fullText.substring(0, numChars);";

      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        'var _twProp = layer.property("Source Text");\n' +
        "if (!_twProp) {\n" +
        '  return { success: false, error: { message: "Layer ' + layerIndex + ' is not a text layer (Source Text not found).", code: "LAYER_TYPE_ERROR" } };\n' +
        "}\n" +
        '_twProp.expression = "' + escapeString(expression) + '";\n' +
        "return { success: true, data: { effect: \"typewriter\", duration: " + duration + " } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "apply_typewriter"));
      try {
        return runScript(script, "apply_typewriter");
      } catch (err) {
        return { content: [{ type: "text", text: "Error: " + String(err) }], isError: true };
      }
    }
  );

  // ─── apply_color_theme ──────────────────────────────────────────────────────────
  server.tool(
    "apply_color_theme",
    "Create a 'Color Theme' null layer with 5 Color expression controls: " +
      "Primary, Secondary, Accent, Background, and Text. " +
      "Other layers can reference these colors via: " +
      "thisComp.layer(\"Color Theme\").effect(\"Primary\")(\"Color\"). " +
      "This centralises the palette — update one control to recolor the whole scene. " +
      "Colors are 0-1 float [r, g, b]: e.g. [1, 0, 0] = red, [1, 1, 1] = white.",
    {
      compId: z.number().int().positive().describe("Numeric ID of the composition"),
      colors: z
        .object({
          primary:    z.array(z.number().min(0).max(1)).length(3).describe("Primary brand color [r,g,b] 0-1"),
          secondary:  z.array(z.number().min(0).max(1)).length(3).describe("Secondary color [r,g,b]"),
          accent:     z.array(z.number().min(0).max(1)).length(3).describe("Accent/highlight color [r,g,b]"),
          background: z.array(z.number().min(0).max(1)).length(3).describe("Background color [r,g,b]"),
          text:       z.array(z.number().min(0).max(1)).length(3).describe("Text/foreground color [r,g,b]"),
        })
        .describe("Five-color palette"),
    },
    async ({ compId, colors }) => {
      const { primary, secondary, accent, background, text } = colors;

      const body =
        findCompById("comp", compId) +
        'var _ctLayer = comp.layers.addNull();\n' +
        '_ctLayer.name = "Color Theme";\n' +
        '_ctLayer.label = 3;\n' +
        'var _ctPrimary = _ctLayer.property("Effects").addProperty("ADBE Color Control");\n' +
        '_ctPrimary.name = "Primary";\n' +
        '_ctPrimary.property("Color").setValue(' + colorLiteral(primary) + ');\n' +
        'var _ctSecondary = _ctLayer.property("Effects").addProperty("ADBE Color Control");\n' +
        '_ctSecondary.name = "Secondary";\n' +
        '_ctSecondary.property("Color").setValue(' + colorLiteral(secondary) + ');\n' +
        'var _ctAccent = _ctLayer.property("Effects").addProperty("ADBE Color Control");\n' +
        '_ctAccent.name = "Accent";\n' +
        '_ctAccent.property("Color").setValue(' + colorLiteral(accent) + ');\n' +
        'var _ctBg = _ctLayer.property("Effects").addProperty("ADBE Color Control");\n' +
        '_ctBg.name = "Background";\n' +
        '_ctBg.property("Color").setValue(' + colorLiteral(background) + ');\n' +
        'var _ctText = _ctLayer.property("Effects").addProperty("ADBE Color Control");\n' +
        '_ctText.name = "Text";\n' +
        '_ctText.property("Color").setValue(' + colorLiteral(text) + ');\n' +
        "return { success: true, data: {\n" +
        "  layerIndex: _ctLayer.index,\n" +
        '  layerName: "Color Theme",\n' +
        '  expressionSample: "thisComp.layer(\\"Color Theme\\").effect(\\"Primary\\")(\\"Color\\")"\n' +
        "} };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "apply_color_theme"));
      try {
        return runScript(script, "apply_color_theme");
      } catch (err) {
        return { content: [{ type: "text", text: "Error: " + String(err) }], isError: true };
      }
    }
  );

  // ─── create_scene ───────────────────────────────────────────────────────────────
  server.tool(
    "create_scene",
    "Batch-create multiple layers in a composition in a single call. " +
      "More efficient than creating layers individually when building a complete scene. " +
      "Each element specifies its type ('text', 'solid', 'shape') and properties. " +
      "Returns the layer indices of all created layers in the order they were defined. " +
      "text properties: text (string, required), fontSize (number, default 72), " +
      "color ([r,g,b] 0-1, default white), name (string). " +
      "solid properties: color ([r,g,b] 0-1, default grey), name (string), " +
      "width (pixels, default comp width), height (pixels, default comp height). " +
      "shape properties: name (string), width (pixels, default 200), " +
      "height (pixels, default 200), color ([r,g,b] 0-1, default white).",
    {
      compId: z.number().int().positive().describe("Numeric ID of the composition"),
      sceneName: z
        .string()
        .optional()
        .describe("Descriptive label for this batch (included in result, not applied to layers)"),
      elements: z
        .array(
          z.object({
            type: z.enum(["text", "solid", "shape"]).describe("Layer type"),
            properties: z.record(z.unknown()).describe("Type-specific properties"),
          })
        )
        .min(1)
        .describe("Array of layer definitions to create"),
    },
    async ({ compId, sceneName, elements }) => {
      let layerBlocks = "";

      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        const props = el.properties as Record<string, unknown>;

        if (el.type === "text") {
          const textStr  = typeof props["text"] === "string" ? props["text"] : "Text";
          const fontSize = typeof props["fontSize"] === "number" ? props["fontSize"] : 72;
          const color    = Array.isArray(props["color"]) ? (props["color"] as number[]) : [1, 1, 1];
          const name     = typeof props["name"] === "string" ? props["name"] : "Text Layer " + (i + 1);

          layerBlocks +=
            "var _tl" + i + ' = comp.layers.addText("' + escapeString(textStr) + '");\n' +
            '_tl' + i + '.name = "' + escapeString(name) + '";\n' +
            "var _td" + i + ' = _tl' + i + '.property("Source Text").value;\n' +
            "_td" + i + ".fontSize = " + fontSize + ";\n" +
            "_td" + i + ".fillColor = " + colorLiteral(color) + ";\n" +
            '_tl' + i + '.property("Source Text").setValue(_td' + i + ");\n" +
            "_createdLayers.push(_tl" + i + ".index);\n";

        } else if (el.type === "solid") {
          const color = Array.isArray(props["color"]) ? (props["color"] as number[]) : [0.5, 0.5, 0.5];
          const name  = typeof props["name"] === "string" ? props["name"] : "Solid " + (i + 1);
          const w     = typeof props["width"] === "number" ? String(props["width"]) : "comp.width";
          const h     = typeof props["height"] === "number" ? String(props["height"]) : "comp.height";

          layerBlocks +=
            "var _sl" + i + " = comp.layers.addSolid(" +
            colorLiteral(color) + ', "' + escapeString(name) + '", ' + w + ", " + h + ", 1.0);\n" +
            "_createdLayers.push(_sl" + i + ".index);\n";

        } else if (el.type === "shape") {
          const name  = typeof props["name"] === "string" ? props["name"] : "Shape " + (i + 1);
          const w     = typeof props["width"] === "number" ? props["width"] : 200;
          const h     = typeof props["height"] === "number" ? props["height"] : 200;
          const color = Array.isArray(props["color"]) ? (props["color"] as number[]) : [1, 1, 1];

          layerBlocks +=
            "var _shp" + i + " = comp.layers.addShape();\n" +
            '_shp' + i + '.name = "' + escapeString(name) + '";\n' +
            "var _grp" + i + ' = _shp' + i + '.property("Contents").addProperty("ADBE Vector Group");\n' +
            "var _rect" + i + ' = _grp' + i + '.property("Contents").addProperty("ADBE Vector Shape - Rect");\n' +
            "_rect" + i + '.property("Size").setValue([' + w + ", " + h + "]);\n" +
            "var _fill" + i + ' = _grp' + i + '.property("Contents").addProperty("ADBE Vector Graphic - Fill");\n' +
            "_fill" + i + ".property(\"Color\").setValue(" + colorLiteral(color) + ");\n" +
            "_createdLayers.push(_shp" + i + ".index);\n";
        }
      }

      const body =
        findCompById("comp", compId) +
        "var _createdLayers = [];\n" +
        layerBlocks +
        "return { success: true, data: { sceneName: " + JSON.stringify(sceneName ?? "scene") + ", layerCount: " + elements.length + ", layerIndices: _createdLayers } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "create_scene"));
      try {
        return runScript(script, "create_scene");
      } catch (err) {
        return { content: [{ type: "text", text: "Error: " + String(err) }], isError: true };
      }
    }
  );
}
