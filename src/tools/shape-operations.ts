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
      const offsetVal   = offset   !== undefined ? offset   : 0;
      const posVal      = position !== undefined ? "[" + position.join(",") + "]" : "[0,0]";
      const scaleVal    = scale    !== undefined ? "[" + scale.join(",") + "]"    : "[100,100]";
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

  // ─── add_wiggle_paths ──────────────────────────────────────────────────────────
  server.tool(
    "add_wiggle_paths",
    "Add Wiggle Paths (also called Roughen Edges for paths) to a shape layer. " +
      "Wiggle Paths displaces the vertices of shape paths randomly to create organic, hand-drawn, " +
      "or rough edges. Great for nature-themed graphics, sketchy styles, or wobbly text outlines. " +
      "size controls the amplitude of the displacement in pixels (larger = rougher edges). " +
      "detail controls how many wiggles per unit of path length (higher = more jagged). " +
      "points: 'Smooth' creates flowing curves; 'Corner' creates sharp angular bumps. " +
      "The wiggle animates over time automatically — to freeze it, set the Wiggles/Second to 0 " +
      "using set_text_animator_values on the resulting property.",
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
      size: z
        .number()
        .min(0)
        .describe("Wiggle amplitude in pixels — how far vertices are displaced (e.g. 5 = subtle, 30 = very rough)"),
      detail: z
        .number()
        .min(0)
        .describe("Detail level — wiggles per unit path length (e.g. 0.5 = smooth bumps, 5 = very jagged)"),
      points: z
        .enum(["Smooth", "Corner"])
        .optional()
        .describe("'Smooth' = flowing organic curves (default); 'Corner' = sharp angular wiggles"),
    },
    async ({ compId, layerIndex, size, detail, points }) => {
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
  );

  // ─── add_merge_paths ───────────────────────────────────────────────────────────
  server.tool(
    "add_merge_paths",
    "Add a Merge Paths modifier to a shape layer to combine multiple sub-paths. " +
      "Merge Paths performs boolean operations on the paths within the Contents group: " +
      "'Add' = union of all paths (fills all areas, combines into one shape); " +
      "'Subtract' = second path cuts a hole in the first path; " +
      "'Intersect' = shows only the overlapping area of all paths; " +
      "'ExcludeIntersections' = XOR — shows non-overlapping areas only. " +
      "The shape layer must have at least two path shapes in its Contents for Merge Paths to have effect. " +
      "Example: create a circle and a star in the same Contents group, then add Merge Paths with " +
      "'Subtract' to punch the star out of the circle.",
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
      mode: z
        .enum(["Add", "Subtract", "Intersect", "ExcludeIntersections"])
        .describe(
          "Boolean operation: " +
          "Add = union; " +
          "Subtract = second shape cuts from first; " +
          "Intersect = only overlapping area; " +
          "ExcludeIntersections = XOR (non-overlapping areas only)"
        ),
    },
    async ({ compId, layerIndex, mode }) => {
      // AE Merge Paths mode values: 1=Add, 2=Subtract, 3=Intersect, 4=ExcludeIntersections
      const modeMap: Record<string, number> = {
        Add:                 1,
        Subtract:            2,
        Intersect:           3,
        ExcludeIntersections:4,
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
  );
}
