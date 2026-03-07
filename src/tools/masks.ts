/**
 * tools/masks.ts
 *
 * Mask and track matte tools for After Effects layers.
 *
 * Registers:
 *   - add_mask              Add a rectangular or elliptical mask to a layer
 *   - list_masks            List all masks on a layer with their properties
 *   - set_mask_properties   Update feather, opacity, expansion, mode, or inverted on a mask
 *   - set_track_matte       Set a layer's track matte type (Alpha, Luma, etc.)
 *   - set_mask_path         Set custom Bézier path vertices on an existing mask
 *   - delete_mask           Delete a mask from a layer by index
 *
 * All ExtendScript is ES3-compatible (var only, no arrow functions,
 * no template literals, string concatenation only).
 * Layer indices are 1-based throughout.
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

/** Map friendly mask mode name to AE MaskMode enum. */
function maskModeToAE(mode: string): string {
  const map: Record<string, string> = {
    None:      "NONE",
    Add:       "ADD",
    Subtract:  "SUBTRACT",
    Intersect: "INTERSECT",
    Lighten:   "LIGHTEN",
    Darken:    "DARKEN",
    Difference:"DIFFERENCE",
  };
  return "MaskMode." + (map[mode] ?? "ADD");
}

/** Map friendly track matte name to AE TrackMatteType enum. */
function trackMatteToAE(type: string): string {
  const map: Record<string, string> = {
    None:          "NO_TRACK_MATTE",
    Alpha:         "ALPHA",
    AlphaInverted: "ALPHA_INVERTED",
    Luma:          "LUMA",
    LumaInverted:  "LUMA_INVERTED",
  };
  return "TrackMatteType." + (map[type] ?? "NO_TRACK_MATTE");
}

// ---------------------------------------------------------------------------
// registerMaskTools
// ---------------------------------------------------------------------------

export function registerMaskTools(server: McpServer): void {

  // ─── add_mask ─────────────────────────────────────────────────────────────────
  server.tool(
    "add_mask",
    "Add a rectangular or elliptical mask to a layer. " +
      "Masks hide or reveal portions of a layer by defining a shape boundary. " +
      "All coordinates are in composition pixels (top-left origin). " +
      "Provide top/left/width/height to define the mask rectangle or ellipse bounds. " +
      "Set inverted=true to show only what is OUTSIDE the mask shape. " +
      "feather softens the mask edges in pixels (0 = hard edge, 20-50 = soft). " +
      "opacity controls how strongly the mask is applied (100 = full, 50 = semi-transparent cutout). " +
      "expansion shrinks (negative) or expands (positive) the mask boundary in pixels. " +
      "Multiple masks on a layer combine using their mask modes (Add, Subtract, Intersect, etc.). " +
      "The returned maskIndex can be used with set_mask_properties to adjust later.",
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
        .describe("1-based index of the layer to mask"),
      shape: z
        .enum(["rectangle", "ellipse"])
        .describe("'rectangle' for a straight-edged rectangular mask; 'ellipse' for an oval/circular mask"),
      top: z.number().describe("Y coordinate of the top edge of the mask bounds, in pixels from the top of the layer"),
      left: z.number().describe("X coordinate of the left edge of the mask bounds, in pixels from the left of the layer"),
      width: z.number().positive().describe("Width of the mask bounds in pixels"),
      height: z.number().positive().describe("Height of the mask bounds in pixels"),
      inverted: z
        .boolean()
        .optional()
        .describe("If true, the mask shows the area OUTSIDE the shape (default false)"),
      feather: z
        .number()
        .min(0)
        .optional()
        .describe("Mask edge softness in pixels (0 = hard, typical soft values: 10-50)"),
      opacity: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe("Mask opacity 0-100 (100 = fully applied, default 100)"),
      expansion: z
        .number()
        .optional()
        .describe("Expand (positive) or contract (negative) the mask boundary in pixels"),
      mode: z
        .enum(["None", "Add", "Subtract", "Intersect", "Lighten", "Darken", "Difference"])
        .optional()
        .describe("How this mask combines with other masks on the layer (default Add)"),
    },
    async ({ compId, layerIndex, shape, top, left, width, height, inverted, feather, opacity, expansion, mode }) => {
      const aeMode = maskModeToAE(mode ?? "Add");

      // Build the shape vertices. AE mask shapes are defined by vertex arrays.
      // For rectangle: 4 corner vertices + closed = true
      // For ellipse: AE has a simpler path via Shape object with vertices representing the bezier ellipse.
      // We use setMaskAtTime with a Shape object approach for both.
      const right = left + width;
      const bottom = top + height;
      const cx = left + width / 2;
      const cy = top + height / 2;
      const rx = width / 2;
      const ry = height / 2;
      // Bezier control point factor for approximating a circle/ellipse with 4 cubic bezier segments
      const K = 0.5522847498;

      let shapeScript: string;

      if (shape === "rectangle") {
        shapeScript =
          "var _shape = new Shape();\n" +
          "_shape.vertices = [[" + left + "," + top + "],[" + right + "," + top + "],[" + right + "," + bottom + "],[" + left + "," + bottom + "]];\n" +
          "_shape.inTangents = [[0,0],[0,0],[0,0],[0,0]];\n" +
          "_shape.outTangents = [[0,0],[0,0],[0,0],[0,0]];\n" +
          "_shape.closed = true;\n";
      } else {
        // Ellipse approximated with 4-point bezier (standard AE approach)
        const kx = rx * K;
        const ky = ry * K;
        shapeScript =
          "var _shape = new Shape();\n" +
          "_shape.vertices = [[" + cx + "," + (cy - ry) + "],[" + (cx + rx) + "," + cy + "],[" + cx + "," + (cy + ry) + "],[" + (cx - rx) + "," + cy + "]];\n" +
          "_shape.inTangents = [[-" + kx + ",0],[0,-" + ky + "],[" + kx + ",0],[0," + ky + "]];\n" +
          "_shape.outTangents = [[" + kx + ",0],[0," + ky + "],[-" + kx + ",0],[0,-" + ky + "]];\n" +
          "_shape.closed = true;\n";
      }

      const featherVal  = feather   !== undefined ? feather  : 0;
      const opacityVal  = opacity   !== undefined ? opacity  : 100;
      const expandVal   = expansion !== undefined ? expansion : 0;
      const invertedVal = inverted  === true ? "true" : "false";

      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        "var _masks = layer.property(\"Masks\");\n" +
        "var _mask = _masks.addProperty(\"Mask\");\n" +
        shapeScript +
        "_mask.property(\"Mask Path\").setValue(_shape);\n" +
        "_mask.maskMode = " + aeMode + ";\n" +
        "_mask.inverted = " + invertedVal + ";\n" +
        "_mask.property(\"Mask Feather\").setValue([" + featherVal + "," + featherVal + "]);\n" +
        "_mask.property(\"Mask Opacity\").setValue(" + opacityVal + ");\n" +
        "_mask.property(\"Mask Expansion\").setValue(" + expandVal + ");\n" +
        "return { success: true, data: { maskIndex: _masks.numProperties, maskName: _mask.name, shape: \"" + shape + "\", mode: \"" + escapeString(mode ?? "Add") + "\" } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "add_mask"));

      try {
        return runScript(script, "add_mask");
      } catch (err) {
        return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
      }
    }
  );


  // ─── set_mask_properties ────────────────────────────────────────────────────────
  server.tool(
    "set_mask_properties",
    "Update one or more properties on an existing mask. " +
      "All parameters are optional — only the ones you pass will be changed. " +
      "Use list_masks first to find the correct maskIndex (1-based). " +
      "feather: softens the mask edge in pixels. " +
      "opacity: how strongly the mask applies (100 = full). " +
      "expansion: positive = grow the mask, negative = shrink. " +
      "mode: how this mask combines with other masks on the same layer. " +
      "inverted: flip the mask to show outside instead of inside.",
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
        .describe("1-based index of the layer"),
      maskIndex: z
        .number()
        .int()
        .positive()
        .describe("1-based index of the mask (use list_masks to find it)"),
      feather: z
        .number()
        .min(0)
        .optional()
        .describe("Mask feather in pixels (0 = hard edge)"),
      opacity: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe("Mask opacity 0-100"),
      expansion: z
        .number()
        .optional()
        .describe("Expand (positive) or shrink (negative) the mask in pixels"),
      mode: z
        .enum(["None", "Add", "Subtract", "Intersect", "Lighten", "Darken", "Difference"])
        .optional()
        .describe("Mask combination mode"),
      inverted: z
        .boolean()
        .optional()
        .describe("Set to true to invert the mask (show outside the shape)"),
    },
    async ({ compId, layerIndex, maskIndex, feather, opacity, expansion, mode, inverted }) => {
      let setLines = "";
      if (feather   !== undefined) setLines += "_mask.property(\"Mask Feather\").setValue([" + feather + "," + feather + "]);\n";
      if (opacity   !== undefined) setLines += "_mask.property(\"Mask Opacity\").setValue(" + opacity + ");\n";
      if (expansion !== undefined) setLines += "_mask.property(\"Mask Expansion\").setValue(" + expansion + ");\n";
      if (mode      !== undefined) setLines += "_mask.maskMode = " + maskModeToAE(mode) + ";\n";
      if (inverted  !== undefined) setLines += "_mask.inverted = " + (inverted ? "true" : "false") + ";\n";

      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        "var _masks = layer.property(\"Masks\");\n" +
        "if (" + maskIndex + " < 1 || " + maskIndex + " > _masks.numProperties) {\n" +
        "  return { success: false, error: { message: \"Mask index " + maskIndex + " out of range — layer has \" + _masks.numProperties + \" masks.\", code: \"INVALID_PARAMS\" } };\n" +
        "}\n" +
        "var _mask = _masks.property(" + maskIndex + ");\n" +
        setLines +
        "return { success: true, data: { maskIndex: " + maskIndex + ", maskName: _mask.name } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "set_mask_properties"));

      try {
        return runScript(script, "set_mask_properties");
      } catch (err) {
        return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
      }
    }
  );


  // ─── set_mask_path ─────────────────────────────────────────────────────────────
  server.tool(
    "set_mask_path",
    "Set custom Bézier path vertices on an existing mask. " +
      "Vertices define path points, tangents control curves (relative to vertex). " +
      "Use for custom reveal shapes, wipes, and animated mask paths. " +
      "If time is provided, sets a keyframe at that time.",
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
        .describe("1-based index of the layer"),
      maskIndex: z
        .number()
        .int()
        .positive()
        .describe("1-based index of the mask (use list_masks to find it)"),
      vertices: z
        .array(z.array(z.number()).length(2))
        .min(2)
        .describe("Array of [x, y] vertex positions defining the path points"),
      inTangents: z
        .array(z.array(z.number()).length(2))
        .optional()
        .describe("Array of [x, y] incoming tangent handles relative to each vertex (default [0,0] for each)"),
      outTangents: z
        .array(z.array(z.number()).length(2))
        .optional()
        .describe("Array of [x, y] outgoing tangent handles relative to each vertex (default [0,0] for each)"),
      closed: z
        .boolean()
        .optional()
        .describe("Whether the path is closed (default true)"),
      time: z
        .number()
        .optional()
        .describe("If provided, sets a keyframe at this time in seconds instead of a static value"),
    },
    async ({ compId, layerIndex, maskIndex, vertices, inTangents, outTangents, closed, time }) => {
      if (inTangents && inTangents.length !== vertices.length) {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              success: false,
              error: {
                message: "inTangents length must match vertices length.",
                code: "INVALID_PARAMS",
              },
            }),
          }],
          isError: true,
        };
      }
      if (outTangents && outTangents.length !== vertices.length) {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              success: false,
              error: {
                message: "outTangents length must match vertices length.",
                code: "INVALID_PARAMS",
              },
            }),
          }],
          isError: true,
        };
      }

      const closedVal = closed !== false ? "true" : "false";

      // Build default tangent arrays if not provided
      let inTangentsStr: string;
      if (inTangents) {
        inTangentsStr = "[" + inTangents.map(function (t) { return "[" + t.join(",") + "]"; }).join(",") + "]";
      } else {
        const zeros = [];
        for (let i = 0; i < vertices.length; i++) { zeros.push("[0,0]"); }
        inTangentsStr = "[" + zeros.join(",") + "]";
      }

      let outTangentsStr: string;
      if (outTangents) {
        outTangentsStr = "[" + outTangents.map(function (t) { return "[" + t.join(",") + "]"; }).join(",") + "]";
      } else {
        const zeros = [];
        for (let i = 0; i < vertices.length; i++) { zeros.push("[0,0]"); }
        outTangentsStr = "[" + zeros.join(",") + "]";
      }

      const verticesStr = "[" + vertices.map(function (v) { return "[" + v.join(",") + "]"; }).join(",") + "]";

      let setLine: string;
      if (time !== undefined) {
        setLine = "_mask.property(\"Mask Path\").setValueAtTime(" + time + ", _shape);\n";
      } else {
        setLine = "_mask.property(\"Mask Path\").setValue(_shape);\n";
      }

      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        "var _masks = layer.property(\"Masks\");\n" +
        "if (" + maskIndex + " < 1 || " + maskIndex + " > _masks.numProperties) {\n" +
        "  return { success: false, error: { message: \"Mask index " + maskIndex + " out of range — layer has \" + _masks.numProperties + \" masks.\", code: \"INVALID_PARAMS\" } };\n" +
        "}\n" +
        "var _mask = _masks.property(" + maskIndex + ");\n" +
        "var _shape = new Shape();\n" +
        "_shape.vertices = " + verticesStr + ";\n" +
        "_shape.inTangents = " + inTangentsStr + ";\n" +
        "_shape.outTangents = " + outTangentsStr + ";\n" +
        "_shape.closed = " + closedVal + ";\n" +
        setLine +
        "return { success: true, data: { maskIndex: " + maskIndex + ", maskName: _mask.name, vertexCount: " + vertices.length + " } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "set_mask_path"));

      try {
        return runScript(script, "set_mask_path");
      } catch (err) {
        return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
      }
    }
  );

}

// ---------------------------------------------------------------------------
// Demoted helpers (no longer registered as MCP tools)
// ---------------------------------------------------------------------------

export async function listMasksHelper(params: { compId: number; layerIndex: number }) {
  const { compId, layerIndex } = params;
  const body =
    findCompById("comp", compId) +
    findLayerByIndex("layer", "comp", layerIndex) +
    "var _masks = layer.property(\"Masks\");\n" +
    "var _result = [];\n" +
    "for (var _mi = 1; _mi <= _masks.numProperties; _mi++) {\n" +
    "  var _m = _masks.property(_mi);\n" +
    "  var _modeStr = \"Unknown\";\n" +
    "  if (_m.maskMode === MaskMode.NONE)       { _modeStr = \"None\"; }\n" +
    "  if (_m.maskMode === MaskMode.ADD)        { _modeStr = \"Add\"; }\n" +
    "  if (_m.maskMode === MaskMode.SUBTRACT)   { _modeStr = \"Subtract\"; }\n" +
    "  if (_m.maskMode === MaskMode.INTERSECT)  { _modeStr = \"Intersect\"; }\n" +
    "  if (_m.maskMode === MaskMode.LIGHTEN)    { _modeStr = \"Lighten\"; }\n" +
    "  if (_m.maskMode === MaskMode.DARKEN)     { _modeStr = \"Darken\"; }\n" +
    "  if (_m.maskMode === MaskMode.DIFFERENCE) { _modeStr = \"Difference\"; }\n" +
    "  var _fth = _m.property(\"Mask Feather\").value;\n" +
    "  _result.push({\n" +
    "    index: _mi,\n" +
    "    name: _m.name,\n" +
    "    mode: _modeStr,\n" +
    "    inverted: _m.inverted,\n" +
    "    featherX: _fth[0],\n" +
    "    featherY: _fth[1],\n" +
    "    opacity: _m.property(\"Mask Opacity\").value,\n" +
    "    expansion: _m.property(\"Mask Expansion\").value\n" +
    "  });\n" +
    "}\n" +
    "return { success: true, data: { masks: _result, count: _result.length } };\n";

  const script = wrapWithReturn(body);

  try {
    return runScript(script, "list_masks");
  } catch (err) {
    return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
  }
}

export async function setTrackMatteHelper(params: { compId: number; layerIndex: number; trackMatteType: "None" | "Alpha" | "AlphaInverted" | "Luma" | "LumaInverted" }) {
  const { compId, layerIndex, trackMatteType } = params;
  const aeType = trackMatteToAE(trackMatteType);

  const body =
    findCompById("comp", compId) +
    findLayerByIndex("layer", "comp", layerIndex) +
    "layer.trackMatteType = " + aeType + ";\n" +
    "return { success: true, data: { layerIndex: " + layerIndex + ", layerName: layer.name, trackMatteType: \"" + escapeString(trackMatteType) + "\" } };\n";

  const script = wrapWithReturn(wrapInUndoGroup(body, "set_track_matte"));

  try {
    return runScript(script, "set_track_matte");
  } catch (err) {
    return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
  }
}

export async function deleteMaskHelper(params: { compId: number; layerIndex: number; maskIndex: number }) {
  const { compId, layerIndex, maskIndex } = params;
  const body =
    findCompById("comp", compId) +
    findLayerByIndex("layer", "comp", layerIndex) +
    "var _masks = layer.property(\"Masks\");\n" +
    "if (" + maskIndex + " < 1 || " + maskIndex + " > _masks.numProperties) {\n" +
    "  return { success: false, error: { message: \"Mask index " + maskIndex + " out of range — layer has \" + _masks.numProperties + \" masks.\", code: \"INVALID_PARAMS\" } };\n" +
    "}\n" +
    "var _mask = _masks.property(" + maskIndex + ");\n" +
    "var _maskName = _mask.name;\n" +
    "_mask.remove();\n" +
    "return { success: true, data: { deletedMaskIndex: " + maskIndex + ", deletedMaskName: _maskName } };\n";

  const script = wrapWithReturn(wrapInUndoGroup(body, "delete_mask"));

  try {
    return runScript(script, "delete_mask");
  } catch (err) {
    return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
  }
}
