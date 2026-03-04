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

  // ─── set_time_remap ────────────────────────────────────────────────────────
  server.tool(
    "set_time_remap",
    "Enable or disable time remapping on a layer, and optionally set time remap keyframes. " +
    "Time remapping lets you retime footage or pre-comp content for slow motion, fast forward, " +
    "freeze frames, or reverse playback. " +
    "When enabled, AE creates two default keyframes: one at the layer's in-point and one at its out-point. " +
    "You can then override these with custom keyframes via the 'keyframes' parameter. " +
    "Each keyframe maps a comp time to a source time: { time: 2, mapToTime: 0 } means " +
    "'at 2 seconds in the comp timeline, show the frame from 0 seconds of the source'. " +
    "Freeze frame: set two keyframes with the same mapToTime. " +
    "Reverse: set first keyframe mapToTime to the end, last keyframe mapToTime to 0. " +
    "Slow motion: spread the source time over a longer comp time range. " +
    "Only works on AVLayer (footage, solids, pre-comp layers) — not on cameras, lights, text, or shape layers.",
    {
      compId: z.number().int().positive().describe("Numeric ID of the composition"),
      layerIndex: z.number().int().positive().describe("1-based layer index"),
      enabled: z
        .boolean()
        .describe("true = enable time remapping, false = disable"),
      keyframes: z
        .array(
          z.object({
            time: z.number().min(0).describe("Comp time in seconds (when in the timeline)"),
            mapToTime: z.number().min(0).describe("Source time in seconds (which frame of the source to show)"),
          })
        )
        .optional()
        .describe("Optional array of time remap keyframes. Each maps a comp time to a source time"),
    },
    async ({ compId, layerIndex, enabled, keyframes }) => {
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
  );

  // ─── set_spatial_interpolation ─────────────────────────────────────────────
  server.tool(
    "set_spatial_interpolation",
    "Set the spatial interpolation type for Position keyframes on a layer. " +
    "Spatial interpolation controls the SHAPE of the motion path — whether the layer travels " +
    "in straight lines or smooth curves between keyframes. " +
    "'linear' = straight-line motion between keyframes (sharp direction changes at each keyframe). " +
    "'bezier' = smooth curved motion through keyframes (AE auto-calculates tangent handles). " +
    "This is different from temporal easing (set via set_keyframe_easing), which controls " +
    "the SPEED along the path, not the path shape. " +
    "For polished motion design, combine Bézier spatial interpolation (curved paths) with " +
    "ease_in_out temporal easing (smooth acceleration). " +
    "keyframeIndex: set a specific keyframe (1-based), or omit to apply to ALL keyframes. " +
    "Only works on Position or Anchor Point properties (properties with spatial dimensions).",
    {
      compId: z.number().int().positive().describe("Numeric ID of the composition"),
      layerIndex: z.number().int().positive().describe("1-based layer index"),
      property: z
        .enum(["Position", "Anchor Point"])
        .describe("Spatial property to modify (Position or Anchor Point)"),
      interpolationType: z
        .enum(["linear", "bezier"])
        .describe("'linear' = straight-line motion paths; 'bezier' = smooth curved motion paths"),
      keyframeIndex: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("1-based keyframe index. If omitted, applies to ALL keyframes on the property"),
    },
    async ({ compId, layerIndex, property, interpolationType, keyframeIndex }) => {
      const propExpr = transformProp("layer", property);
      const spatialType = interpolationType === "linear"
        ? "KeyframeInterpolationType.LINEAR"
        : "KeyframeInterpolationType.BEZIER";

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
  );
}
