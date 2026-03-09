/**
 * tools/animation.ts
 *
 * Keyframe and easing tools for After Effects.
 *
 * Registers:
 *   - add_keyframes_batch        Set multiple keyframes in one call
 *   - set_all_keyframes_easing   Apply the same easing to every keyframe on a property
 *
 * Helpers (exported for compound tools):
 *   - addKeyframeHelper
 *   - setKeyframeEasingHelper
 *   - removeKeyframesHelper
 *   - setTimeRemapHelper
 *   - setSpatialInterpolationHelper
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
import { validateTransformValue, valueShapeError } from "../value-validator.js";

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
    "Property value — shape must match the property exactly: " +
    "Opacity = single number (0-100); " +
    "Rotation = single number (degrees); " +
    "Position = [x, y] or [x, y, z] array; " +
    "Anchor Point = [x, y] or [x, y, z] array; " +
    "Scale = [x, y] or [x, y, z] array."
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
// Exported helper functions (demoted from server.tool registrations)
// ---------------------------------------------------------------------------

export async function addKeyframeHelper(params: {
  compId: number;
  layerIndex: number;
  property: "Position" | "Scale" | "Rotation" | "Opacity" | "Anchor Point";
  time: number;
  value: number | number[];
}) {
  const { compId, layerIndex, property, time, value } = params;

  // Validate value dimensions match property
  const valErr = validateTransformValue(params.property, params.value);
  if (valErr) return valueShapeError(valErr);

  const propExpr = transformProp("layer", property);
  const valLit = valueLiteral(value);

  const body =
    findCompById("comp", compId) +
    findLayerByIndex("layer", "comp", layerIndex) +
    setKeyframe(propExpr, time, valLit) +
    // Note: addKeyframeHelper does NOT auto-apply easing to keep it composable.
    // Call setKeyframeEasingHelper or set_all_keyframes_easing after this helper.
    "return { success: true, data: { property: " + JSON.stringify(property) + ", time: " + time + ", keyframeCount: " + propExpr + ".numKeys } };\n";

  const script = wrapWithReturn(wrapInUndoGroup(body, "add_keyframe"));

  try {
    return runScript(script, "add_keyframe");
  } catch (err) {
    return { content: [{ type: "text", text: "Error: " + String(err) }], isError: true };
  }
}

export async function setKeyframeEasingHelper(params: {
  compId: number;
  layerIndex: number;
  property: "Position" | "Scale" | "Rotation" | "Opacity" | "Anchor Point";
  keyframeIndex: number;
  easingType: "linear" | "ease_in" | "ease_out" | "ease_in_out" | "hold";
}) {
  const { compId, layerIndex, property, keyframeIndex, easingType } = params;
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

export async function removeKeyframesHelper(params: {
  compId: number;
  layerIndex: number;
  property: "Position" | "Scale" | "Rotation" | "Opacity" | "Anchor Point";
}) {
  const { compId, layerIndex, property } = params;
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

export async function setTimeRemapHelper(params: {
  compId: number;
  layerIndex: number;
  enabled: boolean;
  keyframes?: Array<{ time: number; mapToTime: number }> | undefined;
}) {
  const { compId, layerIndex, enabled, keyframes } = params;
  const boolVal = enabled ? "true" : "false";

  let kfLines = "";
  if (keyframes && keyframes.length > 0 && enabled) {
    for (const kf of keyframes) {
      kfLines +=
        'layer.property("Time Remap").setValueAtTime(' +
        kf.time + ", " + kf.mapToTime + ");\n";
    }
  }

  const body =
    findCompById("comp", compId) +
    findLayerByIndex("layer", "comp", layerIndex) +
    "if (!(layer instanceof AVLayer)) {\n" +
    '  return { success: false, error: { message: "Layer " + ' + layerIndex + ' + " is not an AV layer — time remap only works on footage, solids, and pre-comp layers.", code: "INVALID_PARAMS" } };\n' +
    "}\n" +
    "layer.timeRemapEnabled = " + boolVal + ";\n" +
    kfLines +
    "var _trData = { layerIndex: " + layerIndex + ", layerName: layer.name, timeRemapEnabled: layer.timeRemapEnabled };\n" +
    "if (layer.timeRemapEnabled) {\n" +
    '  _trData.numKeyframes = layer.property("Time Remap").numKeys;\n' +
    "}\n" +
    "return { success: true, data: _trData };\n";

  const script = wrapWithReturn(wrapInUndoGroup(body, "set_time_remap"));

  try {
    return runScript(script, "set_time_remap");
  } catch (err) {
    return { content: [{ type: "text", text: "Error: " + String(err) }], isError: true };
  }
}

export async function setSpatialInterpolationHelper(params: {
  compId: number;
  layerIndex: number;
  property: "Position" | "Anchor Point";
  interpolationType: "linear" | "bezier";
  keyframeIndex?: number | undefined;
}) {
  const { compId, layerIndex, property, interpolationType, keyframeIndex } = params;
  const propExpr = transformProp("layer", property);

  let loopBody: string;

  if (keyframeIndex !== undefined) {
    // Single keyframe
    loopBody =
      "if (" + keyframeIndex + " > " + propExpr + ".numKeys || " + keyframeIndex + " < 1) {\n" +
      '  return { success: false, error: { message: "Keyframe index ' + keyframeIndex + ' out of range — property has " + ' + propExpr + '.numKeys + " keyframes.", code: "INVALID_PARAMS" } };\n' +
      "}\n" +
      propExpr + ".setSpatialTangentsAtKey(" + keyframeIndex + ", [0,0], [0,0]);\n" +
      "var _curIn = " + propExpr + ".keyInInterpolationType(" + keyframeIndex + ");\n" +
      "var _curOut = " + propExpr + ".keyOutInterpolationType(" + keyframeIndex + ");\n" +
      propExpr + ".setSpatialContinuousAtKey(" + keyframeIndex + ", " + (interpolationType === "bezier" ? "true" : "false") + ");\n" +
      "if (" + JSON.stringify(interpolationType) + " === 'linear') {\n" +
      "  " + propExpr + ".setSpatialTangentsAtKey(" + keyframeIndex + ", [0,0], [0,0]);\n" +
      "}\n";
  } else {
    // All keyframes
    loopBody =
      "var _numKeys = " + propExpr + ".numKeys;\n" +
      "if (_numKeys === 0) {\n" +
      '  return { success: false, error: { message: "Property ' + escapeString(property) + ' has no keyframes.", code: "INVALID_PARAMS" } };\n' +
      "}\n" +
      "for (var _ski = 1; _ski <= _numKeys; _ski++) {\n" +
      "  " + propExpr + ".setSpatialContinuousAtKey(_ski, " + (interpolationType === "bezier" ? "true" : "false") + ");\n" +
      "  if (" + JSON.stringify(interpolationType) + " === 'linear') {\n" +
      "    " + propExpr + ".setSpatialTangentsAtKey(_ski, [0,0], [0,0]);\n" +
      "  }\n" +
      "}\n";
  }

  const body =
    findCompById("comp", compId) +
    findLayerByIndex("layer", "comp", layerIndex) +
    loopBody +
    "return { success: true, data: { property: " + JSON.stringify(property) + ", interpolationType: " + JSON.stringify(interpolationType) + ", keyframesUpdated: " + (keyframeIndex !== undefined ? "1" : propExpr + ".numKeys") + " } };\n";

  const script = wrapWithReturn(wrapInUndoGroup(body, "set_spatial_interpolation"));

  try {
    return runScript(script, "set_spatial_interpolation");
  } catch (err) {
    return { content: [{ type: "text", text: "Error: " + String(err) }], isError: true };
  }
}

// ---------------------------------------------------------------------------
// registerAnimationTools
// ---------------------------------------------------------------------------

export function registerAnimationTools(server: McpServer): void {
  // ─── add_keyframes_batch ──────────────────────────────────────────────────
  server.tool(
    "add_keyframes_batch",
    "Set multiple keyframes on a single transform property in one call. " +
    "Value shape must match the property exactly: " +
    "Position/Anchor Point = [x, y] or [x, y, z]; " +
    "Scale = [x, y] or [x, y, z]; " +
    "Rotation/Opacity = single number only. " +
    "More efficient than calling add_keyframe repeatedly. " +
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
        .describe("Array of { time, value } keyframes. Value shape must match property: Position/Anchor Point = [x, y] or [x, y, z]; Scale = [x, y] or [x, y, z]; Rotation/Opacity = single number."),
    },
    async ({ compId, layerIndex, property, keyframes }) => {
      // Validate value dimensions match property
      for (let i = 0; i < keyframes.length; i++) {
        const valErr = validateTransformValue(property, keyframes[i].value);
        if (valErr) return valueShapeError(valErr + " (at keyframe index " + i + ")");
      }

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
}
