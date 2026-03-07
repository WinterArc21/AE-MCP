/**
 * tools/shape-operations.ts
 *
 * Shape layer operation tools for After Effects.
 *
 * Registers:
 *   - add_trim_paths     Add Trim Paths to a shape layer for draw-on/draw-off effects
 *   - add_repeater       Add a Repeater to clone and offset shape contents
 *   - add_wiggle_paths   Add Wiggle Paths for organic/rough shape edges
 *   - add_merge_paths    Add Merge Paths to combine multiple shapes with boolean operations
 *
 * All ExtendScript is ES3-compatible (var only, no arrow functions,
 * no template literals, string concatenation only).
 * Layer indices are 1-based throughout.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { bridge } from "../bridge.js";
import {
  wrapWithReturn,
  wrapInUndoGroup,
  findCompById,
  findLayerByIndex,
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
// registerShapeOperationTools
// ---------------------------------------------------------------------------

export function registerShapeOperationTools(server: McpServer): void {

  // ─── add_trim_paths ────────────────────────────────────────────────────────────
  server.tool(
    "add_trim_paths",
    "Add a Trim Paths modifier to a shape layer. " +
    "Trim Paths progressively reveals or hides the stroke path of shape contents, " +
    "enabling classic 'draw-on' and 'draw-off' line animation effects. " +
    "start (0-100): where the trim begins along the path (0% = path start). " +
    "end (0-100): where the trim ends along the path (100% = path end). " +
    "To animate a line drawing on: keyframe End from 0% to 100%. " +
    "To animate a line drawing off: keyframe Start from 0% to 100%. " +
    "offset shifts the entire trim region along the path in degrees, " +
    "useful for animating dashes around a loop. " +
    "The layer must be a shape layer (created with add_shape_layer). " +
    "Trim Paths applies to ALL paths in the layer's Contents group by default. " +
    "Returns the index of the added Trim Paths property for use with add_keyframe.",
    {
      compId: z
        .number()
        .int()
        .positive()
        .describe("Numeric ID of the composition"),
      layerIndex: z
        .number()
        .int()
        .positive()
        .describe("1-based index of the shape layer"),
      start: z
        .number()
        .min(0)
        .max(100)
        .describe("Trim start position as percentage 0-100 (0 = path beginning)"),
      end: z
        .number()
        .min(0)
        .max(100)
        .describe("Trim end position as percentage 0-100 (100 = path end)"),
      offset: z
        .number()
        .optional()
        .describe("Shift the entire trim by this many degrees along the path (default 0, useful for looping animations)"),
    },
    async ({ compId, layerIndex, start, end, offset }) => {
      const offsetVal = offset !== undefined ? offset : 0;

      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        "if (!(layer instanceof ShapeLayer)) {\n" +
        "  return { success: false, error: { message: \"Layer \" + " + layerIndex + " + \" is not a shape layer.\", code: \"INVALID_PARAMS\" } };\n" +
        "}\n" +
        "var _contents = layer.property(\"Contents\");\n" +
        "var _trim = _contents.addProperty(\"ADBE Vector Filter - Trim\");\n" +
        "_trim.property(\"ADBE Vector Trim Start\").setValue(" + start + ");\n" +
        "_trim.property(\"ADBE Vector Trim End\").setValue(" + end + ");\n" +
        "_trim.property(\"ADBE Vector Trim Offset\").setValue(" + offsetVal + ");\n" +
        "return { success: true, data: { propertyIndex: _contents.numProperties, propertyName: _trim.name, start: " + start + ", end: " + end + ", offset: " + offsetVal + " } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "add_trim_paths"));

      try {
        return runScript(script, "add_trim_paths");
      } catch (err) {
        return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
      }
    }
  );

  // ─── add_repeater ─────────────────────────────────────────────────────────────
  server.tool(
    "add_repeater",
    "Add a Repeater modifier to a shape layer. " +
    "The Repeater clones all shape contents (paths, fills, strokes) a specified number of times, " +
    "applying a cumulative transform offset between each copy. " +
    "copies: how many total instances to show (including the original). " +
    "offset: shifts which copy is treated as the 'first' (useful for animating the pattern). " +
    "position [x, y]: each copy is offset by this many pixels from the previous. " +
    "scale [x, y]: each copy is scaled by this percent relative to the previous (100 = no scale change, 90 = each copy is 90% of previous). " +
    "rotation: each copy is rotated by this many additional degrees. " +
    "Example: copies=5, position=[60, 0] creates a row of 5 identical shapes spaced 60px apart. " +
    "Animate offset from 0 to -copies to smoothly cycle copies into/out of view (seamless loop).",
    {
      compId: z
        .number()
        .int()
        .positive()
        .describe("Numeric ID of the composition"),
      layerIndex: z
        .number()
        .int()
        .positive()
        .describe("1-based index of the shape layer"),
      copies: z
        .number()
        .int()
        .min(1)
        .describe("Number of copies to create (including the original)"),
      offset: z
        .number()
        .optional()
        .describe("Copy offset — shifts which copy is 'first' (animate this for looping patterns, default 0)"),
      position: z
        .array(z.number())
        .length(2)
        .optional()
        .describe("Position offset [x, y] in pixels between each copy (default [0, 0])"),
      scale: z
        .array(z.number())
        .length(2)
        .optional()
        .describe("Scale multiplier [x, y] as percentage per copy (100 = same size, 90 = 10% smaller each copy)"),
      rotation: z
        .number()
        .optional()
        .describe("Rotation added per copy in degrees (default 0)"),
    },
    async ({ compId, layerIndex, copies, offset, position, scale, rotation }) => {
      const offsetVal = offset !== undefined ? offset : 0;
      const posVal = position !== undefined ? "[" + position.join(",") + "]" : "[0,0]";
      const scaleVal = scale !== undefined ? "[" + scale.join(",") + "]" : "[100,100]";
      const rotationVal = rotation !== undefined ? rotation : 0;

      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        "if (!(layer instanceof ShapeLayer)) {\n" +
        "  return { success: false, error: { message: \"Layer \" + " + layerIndex + " + \" is not a shape layer.\", code: \"INVALID_PARAMS\" } };\n" +
        "}\n" +
        "var _contents = layer.property(\"Contents\");\n" +
        "var _rep = _contents.addProperty(\"ADBE Vector Filter - Repeater\");\n" +
        "_rep.property(\"ADBE Vector Repeater Copies\").setValue(" + copies + ");\n" +
        "_rep.property(\"ADBE Vector Repeater Offset\").setValue(" + offsetVal + ");\n" +
        "var _transform = _rep.property(\"ADBE Vector Repeater Transform\");\n" +
        "_transform.property(\"ADBE Vector Repeater Position\").setValue(" + posVal + ");\n" +
        "_transform.property(\"ADBE Vector Repeater Scale\").setValue(" + scaleVal + ");\n" +
        "_transform.property(\"ADBE Vector Repeater Rotation\").setValue(" + rotationVal + ");\n" +
        "return { success: true, data: { propertyIndex: _contents.numProperties, propertyName: _rep.name, copies: " + copies + " } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "add_repeater"));

      try {
        return runScript(script, "add_repeater");
      } catch (err) {
        return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
      }
    }
  );
}

// ---------------------------------------------------------------------------
// Demoted helpers (formerly server.tool registrations)
// ---------------------------------------------------------------------------

export async function addWigglePathsHelper(params: {
  compId: number;
  layerIndex: number;
  size: number;
  detail: number;
  points?: "Smooth" | "Corner";
}) {
  const { compId, layerIndex, size, detail, points } = params;
  // AE Wiggle Paths "Points" property: 1 = Corner, 2 = Smooth
  const pointsVal = (points === "Corner") ? 1 : 2;

  const body =
    findCompById("comp", compId) +
    findLayerByIndex("layer", "comp", layerIndex) +
    "if (!(layer instanceof ShapeLayer)) {\n" +
    "  return { success: false, error: { message: \"Layer \" + " + layerIndex + " + \" is not a shape layer.\", code: \"INVALID_PARAMS\" } };\n" +
    "}\n" +
    "var _contents = layer.property(\"Contents\");\n" +
    "var _wig = _contents.addProperty(\"ADBE Vector Filter - Roughen\");\n" +
    "_wig.property(\"ADBE Vector Roughen Size\").setValue(" + size + ");\n" +
    "_wig.property(\"ADBE Vector Roughen Detail\").setValue(" + detail + ");\n" +
    "_wig.property(\"ADBE Vector Roughen Points\").setValue(" + pointsVal + ");\n" +
    "return { success: true, data: { propertyIndex: _contents.numProperties, propertyName: _wig.name, size: " + size + ", detail: " + detail + " } };\n";

  const script = wrapWithReturn(wrapInUndoGroup(body, "add_wiggle_paths"));

  try {
    return runScript(script, "add_wiggle_paths");
  } catch (err) {
    return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
  }
}

export async function addMergePathsHelper(params: {
  compId: number;
  layerIndex: number;
  mode: "Add" | "Subtract" | "Intersect" | "ExcludeIntersections";
}) {
  const { compId, layerIndex, mode } = params;
  // AE Merge Paths mode values: 1=Add, 2=Subtract, 3=Intersect, 4=ExcludeIntersections
  const modeMap: Record<string, number> = {
    Add: 1,
    Subtract: 2,
    Intersect: 3,
    ExcludeIntersections: 4,
  };
  const modeVal = modeMap[mode] ?? 1;

  const body =
    findCompById("comp", compId) +
    findLayerByIndex("layer", "comp", layerIndex) +
    "if (!(layer instanceof ShapeLayer)) {\n" +
    "  return { success: false, error: { message: \"Layer \" + " + layerIndex + " + \" is not a shape layer.\", code: \"INVALID_PARAMS\" } };\n" +
    "}\n" +
    "var _contents = layer.property(\"Contents\");\n" +
    "var _merge = _contents.addProperty(\"ADBE Vector Filter - Merge\");\n" +
    "_merge.property(\"ADBE Vector Merge Type\").setValue(" + modeVal + ");\n" +
    "return { success: true, data: { propertyIndex: _contents.numProperties, propertyName: _merge.name, mode: \"" + mode + "\" } };\n";

  const script = wrapWithReturn(wrapInUndoGroup(body, "add_merge_paths"));

  try {
    return runScript(script, "add_merge_paths");
  } catch (err) {
    return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
  }
}

export async function addOffsetPathsHelper(params: {
  compId: number;
  layerIndex: number;
  amount: number;
  lineJoin?: "Miter" | "Round" | "Bevel";
  miterLimit?: number;
}) {
  const { compId, layerIndex, amount, lineJoin, miterLimit } = params;
  // AE Line Join values: 1=Miter, 2=Round, 3=Bevel
  const joinMap: Record<string, number> = { Miter: 1, Round: 2, Bevel: 3 };
  const joinVal = lineJoin ? joinMap[lineJoin] : 1;
  const miterVal = miterLimit !== undefined ? miterLimit : 4;

  const body =
    findCompById("comp", compId) +
    findLayerByIndex("layer", "comp", layerIndex) +
    "if (!(layer instanceof ShapeLayer)) {\n" +
    "  return { success: false, error: { message: \"Layer \" + " + layerIndex + " + \" is not a shape layer.\", code: \"INVALID_PARAMS\" } };\n" +
    "}\n" +
    "var _contents = layer.property(\"Contents\");\n" +
    "var _off = _contents.addProperty(\"ADBE Vector Filter - Offset\");\n" +
    "_off.property(\"ADBE Vector Offset Amount\").setValue(" + amount + ");\n" +
    "_off.property(\"ADBE Vector Offset Line Join\").setValue(" + joinVal + ");\n" +
    "_off.property(\"ADBE Vector Offset Miter Limit\").setValue(" + miterVal + ");\n" +
    "return { success: true, data: { propertyIndex: _contents.numProperties, propertyName: _off.name, amount: " + amount + " } };\n";

  const script = wrapWithReturn(wrapInUndoGroup(body, "add_offset_paths"));

  try {
    return runScript(script, "add_offset_paths");
  } catch (err) {
    return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
  }
}

export async function addPuckerBloatHelper(params: {
  compId: number;
  layerIndex: number;
  amount: number;
}) {
  const { compId, layerIndex, amount } = params;
  const body =
    findCompById("comp", compId) +
    findLayerByIndex("layer", "comp", layerIndex) +
    "if (!(layer instanceof ShapeLayer)) {\n" +
    "  return { success: false, error: { message: \"Layer \" + " + layerIndex + " + \" is not a shape layer.\", code: \"INVALID_PARAMS\" } };\n" +
    "}\n" +
    "var _contents = layer.property(\"Contents\");\n" +
    "var _pb = _contents.addProperty(\"ADBE Vector Filter - PB\");\n" +
    "_pb.property(\"ADBE Vector PuckerBloat Amount\").setValue(" + amount + ");\n" +
    "return { success: true, data: { propertyIndex: _contents.numProperties, propertyName: _pb.name, amount: " + amount + " } };\n";

  const script = wrapWithReturn(wrapInUndoGroup(body, "add_pucker_bloat"));

  try {
    return runScript(script, "add_pucker_bloat");
  } catch (err) {
    return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
  }
}

export async function addZigZagHelper(params: {
  compId: number;
  layerIndex: number;
  size: number;
  ridgesPerSegment: number;
  points?: "Smooth" | "Corner";
}) {
  const { compId, layerIndex, size, ridgesPerSegment, points } = params;
  // AE Zig Zag "Points" property: 1 = Corner, 2 = Smooth
  const pointsVal = (points === "Corner") ? 1 : 2;

  const body =
    findCompById("comp", compId) +
    findLayerByIndex("layer", "comp", layerIndex) +
    "if (!(layer instanceof ShapeLayer)) {\n" +
    "  return { success: false, error: { message: \"Layer \" + " + layerIndex + " + \" is not a shape layer.\", code: \"INVALID_PARAMS\" } };\n" +
    "}\n" +
    "var _contents = layer.property(\"Contents\");\n" +
    "var _zz = _contents.addProperty(\"ADBE Vector Filter - Zigzag\");\n" +
    "_zz.property(\"ADBE Vector Zigzag Size\").setValue(" + size + ");\n" +
    "_zz.property(\"ADBE Vector Zigzag Detail\").setValue(" + ridgesPerSegment + ");\n" +
    "_zz.property(\"ADBE Vector Zigzag Points\").setValue(" + pointsVal + ");\n" +
    "return { success: true, data: { propertyIndex: _contents.numProperties, propertyName: _zz.name, size: " + size + ", ridgesPerSegment: " + ridgesPerSegment + " } };\n";

  const script = wrapWithReturn(wrapInUndoGroup(body, "add_zig_zag"));

  try {
    return runScript(script, "add_zig_zag");
  } catch (err) {
    return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
  }
}
