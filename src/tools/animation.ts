/**
 * tools/animation.ts
 *
 * Keyframe and easing tools for After Effects.
 *
 * Registers:
 *   - add_keyframe               Set a single keyframe on a transform property
 *   - add_keyframes_batch        Set multiple keyframes in one call
 *   - set_keyframe_easing        Set easing on a specific (1-based) keyframe
 *   - set_all_keyframes_easing   Apply the same easing to every keyframe on a property
 *   - remove_keyframes           Remove all keyframes from a property
 *
 * All ExtendScript output is ES3 (var only, no arrow fns, no template literals,
 * 1-based indexing for all AE collections).
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
  setKeyframe,
  arrayToAE,
} from "../script-builder.js";

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

function textResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}

async function runScript(script: string, toolName: string) {
  const result = await bridge.executeScript(script, toolName);
  return textResult(result);
}

/** Serialise a TS keyframe value (number | number[]) to an AE ExtendScript literal. */
function valueLiteral(value: number | number[]): string {
  return Array.isArray(value) ? arrayToAE(value) : String(value);
}

/**
 * Build ES3 easing snippet for a specific keyframe index expression.
 * Uses unique variable names per suffix to prevent collisions inside loops.
 */
function buildEasingAtIndex(
  propExpr: string,
  kfIdxExpr: string,
  easingType: string,
  suffix: string
): string {
  switch (easingType) {
    case "linear":
      return (
        propExpr + ".setInterpolationTypeAtKey(" + kfIdxExpr +
        ", KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);\n"
      );

    case "hold":
      return (
        propExpr + ".setInterpolationTypeAtKey(" + kfIdxExpr +
        ", KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);\n"
      );

    case "ease_in":
      return (
        propExpr + ".setInterpolationTypeAtKey(" + kfIdxExpr +
        ", KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.LINEAR);\n" +
        "var _eiIn" + suffix + " = new KeyframeEase(0, 33);\n" +
        propExpr + ".setTemporalEaseAtKey(" + kfIdxExpr +
        ", [_eiIn" + suffix + "], [_eiIn" + suffix + "]);\n"
      );

    case "ease_out":
      return (
        propExpr + ".setInterpolationTypeAtKey(" + kfIdxExpr +
        ", KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.BEZIER);\n" +
        "var _eoOut" + suffix + " = new KeyframeEase(0, 33);\n" +
        propExpr + ".setTemporalEaseAtKey(" + kfIdxExpr +
        ", [_eoOut" + suffix + "], [_eoOut" + suffix + "]);\n"
      );

    case "ease_in_out":
    default:
      return (
        propExpr + ".setInterpolationTypeAtKey(" + kfIdxExpr +
        ", KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);\n" +
        "var _eio" + suffix + " = new KeyframeEase(0, 33);\n" +
        propExpr + ".setTemporalEaseAtKey(" + kfIdxExpr +
        ", [_eio" + suffix + "], [_eio" + suffix + "]);\n"
      );
  }
}

// ---------------------------------------------------------------------------
// Zod schemas shared across tools
// ---------------------------------------------------------------------------

const transformPropertySchema = z
  .enum(["Position", "Scale", "Rotation", "Opacity", "Anchor Point"])
  .describe("Transform property name");

const propertyValueSchema = z
  .union([z.number(), z.array(z.number())])
  .describe(
    "Property value: a number for scalar properties (Opacity 0-100, Rotation in degrees), " +
      "or an [x, y] array for vector properties (Position in pixels, Scale in %, Anchor Point in pixels)."
  );

const easingTypeSchema = z
  .enum(["linear", "ease_in", "ease_out", "ease_in_out", "hold"])
  .describe(
    "'linear' = constant velocity; " +
      "'ease_in' = accelerates into the keyframe; " +
      "'ease_out' = decelerates out; " +
      "'ease_in_out' = smooth S-curve (recommended for polished motion design); " +
      "'hold' = instant snap, no interpolation (good for visibility toggles)."
  );

// ---------------------------------------------------------------------------
// registerAnimationTools
// ---------------------------------------------------------------------------

export function registerAnimationTools(server: McpServer): void {
  // ─── add_keyframe ─────────────────────────────────────────────────────────
  server.tool(
    "add_keyframe",
    "Set a single keyframe on a layer transform property at a given time. " +
      "This is THE core animation tool — call it at least twice on a property to create motion. " +
      "Properties: Position ([x,y] pixels, comp center = [width/2, height/2]), " +
      "Scale ([x,y] as percentages, 100 = original size), " +
      "Rotation (degrees, positive = clockwise), " +
      "Opacity (0-100, 0 = transparent), " +
      "Anchor Point ([x,y] in layer-local pixels, default = layer center). " +
      "After setting keyframes, optionally call set_keyframe_easing or set_all_keyframes_easing " +
      "to control the motion feel.",
    {
      compId: z
        .number()
        .int()
        .positive()
        .describe("Numeric ID of the composition (from create_composition or list_compositions)"),
      layerIndex: z
        .number()
        .int()
        .positive()
        .describe("1-based index of the layer within the composition"),
      property: transformPropertySchema,
      time: z
        .number()
        .min(0)
        .describe("Time in seconds at which to place the keyframe (e.g. 0, 1.5, 2.0)"),
      value: propertyValueSchema,
    },
    async ({ compId, layerIndex, property, time, value }) => {
      const propExpr = transformProp("layer", property);
      const valLit = valueLiteral(value);

      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        setKeyframe(propExpr, time, valLit) +
        // Note: add_keyframe does NOT auto-apply easing to keep it composable.
        // Call set_keyframe_easing or set_all_keyframes_easing after this tool.
        "return { success: true, data: { property: " + JSON.stringify(property) + ", time: " + time + ", keyframeCount: " + propExpr + ".numKeys } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "add_keyframe"));

      try {
        return runScript(script, "add_keyframe");
      } catch (err) {
        return { content: [{ type: "text", text: "Error: " + String(err) }], isError: true };
      }
    }
  );

  // ─── add_keyframes_batch ──────────────────────────────────────────────────
  server.tool(
    "add_keyframes_batch",
    "Set multiple keyframes on a single layer property in one call. " +
      "More efficient than calling add_keyframe repeatedly when all values are known upfront. " +
      "All keyframes must be for the same property. " +
      "After Effects automatically sorts keyframes by time — order in the array doesn't matter. " +
      "Easing is NOT applied automatically — follow up with set_all_keyframes_easing if needed.",
    {
      compId: z.number().int().positive().describe("Numeric ID of the composition"),
      layerIndex: z.number().int().positive().describe("1-based layer index"),
      property: transformPropertySchema,
      keyframes: z
        .array(
          z.object({
            time: z.number().min(0).describe("Time in seconds"),
            value: propertyValueSchema,
          })
        )
        .min(1)
        .describe("Array of { time, value } keyframes to set"),
    },
    async ({ compId, layerIndex, property, keyframes }) => {
      const propExpr = transformProp("layer", property);

      let kfLines = "";
      for (const kf of keyframes) {
        kfLines += setKeyframe(propExpr, kf.time, valueLiteral(kf.value));
      }

      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        kfLines +
        "return { success: true, data: { property: " + JSON.stringify(property) + ", keyframesAdded: " + keyframes.length + ", totalKeyframes: " + propExpr + ".numKeys } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "add_keyframes_batch"));

      try {
        return runScript(script, "add_keyframes_batch");
      } catch (err) {
        return { content: [{ type: "text", text: "Error: " + String(err) }], isError: true };
      }
    }
  );

  // ─── set_keyframe_easing ──────────────────────────────────────────────────
  server.tool(
    "set_keyframe_easing",
    "Set the interpolation/easing type on a specific keyframe identified by its 1-based index. " +
      "Call this after add_keyframe to control the motion feel. " +
      "'ease_in_out' (Easy Ease) creates the most polished, natural motion and is recommended for most cases. " +
      "'linear' creates mechanical, robotic motion. " +
      "'hold' creates instant value snaps (good for on/off visibility). " +
      "Keyframe 1 is the earliest keyframe on the property chronologically.",
    {
      compId: z.number().int().positive().describe("Numeric ID of the composition"),
      layerIndex: z.number().int().positive().describe("1-based layer index"),
      property: transformPropertySchema,
      keyframeIndex: z
        .number()
        .int()
        .positive()
        .describe("1-based index of the keyframe (1 = earliest keyframe on this property)"),
      easingType: easingTypeSchema,
    },
    async ({ compId, layerIndex, property, keyframeIndex, easingType }) => {
      const propExpr = transformProp("layer", property);

      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        "if (" + keyframeIndex + " > " + propExpr + ".numKeys) {\n" +
        '  return { success: false, error: { message: "Keyframe index ' + keyframeIndex + ' out of range — property has " + ' + propExpr + '.numKeys + " keyframes.", code: "INVALID_PARAMS" } };\n' +
        "}\n" +
        buildEasingAtIndex(propExpr, String(keyframeIndex), easingType, "s") +
        "return { success: true, data: { property: " + JSON.stringify(property) + ", keyframeIndex: " + keyframeIndex + ", easingType: " + JSON.stringify(easingType) + " } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "set_keyframe_easing"));

      try {
        return runScript(script, "set_keyframe_easing");
      } catch (err) {
        return { content: [{ type: "text", text: "Error: " + String(err) }], isError: true };
      }
    }
  );

  // ─── set_all_keyframes_easing ───────────────────────────────────────────────
  server.tool(
    "set_all_keyframes_easing",
    "Apply the same easing type to ALL keyframes on a property in one call. " +
      "Equivalent to selecting all keyframes in the timeline and pressing F9 (Easy Ease). " +
      "Use this as a convenient shortcut after add_keyframes_batch. " +
      "'ease_in_out' is the standard choice for polished motion design.",
    {
      compId: z.number().int().positive().describe("Numeric ID of the composition"),
      layerIndex: z.number().int().positive().describe("1-based layer index"),
      property: transformPropertySchema,
      easingType: easingTypeSchema,
    },
    async ({ compId, layerIndex, property, easingType }) => {
      const propExpr = transformProp("layer", property);

      // Build inner loop body — each iteration uses "ki" as keyframe index
      const loopBody = buildEasingAtIndex(propExpr, "ki", easingType, "lp");

      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        "var _numKeys = " + propExpr + ".numKeys;\n" +
        "if (_numKeys === 0) {\n" +
        '  return { success: false, error: { message: "Property ' + escapeString(property) + ' has no keyframes.", code: "INVALID_PARAMS" } };\n' +
        "}\n" +
        "for (var ki = 1; ki <= _numKeys; ki++) {\n" +
        loopBody.split("\n").map(l => "  " + l).join("\n") + "\n" +
        "}\n" +
        "return { success: true, data: { property: " + JSON.stringify(property) + ", keyframesUpdated: _numKeys, easingType: " + JSON.stringify(easingType) + " } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "set_all_keyframes_easing"));

      try {
        return runScript(script, "set_all_keyframes_easing");
      } catch (err) {
        return { content: [{ type: "text", text: "Error: " + String(err) }], isError: true };
      }
    }
  );

  // ─── remove_keyframes ───────────────────────────────────────────────────────
  server.tool(
    "remove_keyframes",
    "Remove ALL keyframes from a layer transform property, leaving a static value. " +
      "After removal, the property holds the value it had at the current time indicator. " +
      "Useful for resetting an animated property or starting fresh.",
    {
      compId: z.number().int().positive().describe("Numeric ID of the composition"),
      layerIndex: z.number().int().positive().describe("1-based layer index"),
      property: transformPropertySchema,
    },
    async ({ compId, layerIndex, property }) => {
      const propExpr = transformProp("layer", property);

      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        "var _removedCount = " + propExpr + ".numKeys;\n" +
        "for (var _rki = " + propExpr + ".numKeys; _rki >= 1; _rki--) {\n" +
        "  " + propExpr + ".removeKey(_rki);\n" +
        "}\n" +
        "return { success: true, data: { property: " + JSON.stringify(property) + ", keyframesRemoved: _removedCount } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "remove_keyframes"));

      try {
        return runScript(script, "remove_keyframes");
      } catch (err) {
        return { content: [{ type: "text", text: "Error: " + String(err) }], isError: true };
      }
    }
  );
}
