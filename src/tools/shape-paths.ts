/**
 * tools/shape-paths.ts
 *
 * Shape group creation, path editing, and styling tools for After Effects.
 *
 * Registers:
 *   - add_shape_group   Add a new shape group to an existing shape layer
 *   - set_shape_path    Set a custom Bézier path on a shape group
 *   - set_shape_style   Set fill and stroke styling on a shape group
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

// ---------------------------------------------------------------------------
// registerShapePathTools
// ---------------------------------------------------------------------------

export function registerShapePathTools(server: McpServer): void {

  // ─── add_shape_group ──────────────────────────────────────────────────────────
  server.tool(
    "add_shape_group",
    "Add a new shape group to an existing shape layer. " +
      "Shape groups contain paths, fills, strokes, and modifiers. " +
      "Use the returned groupIndex with set_shape_path and set_shape_style. " +
      "The layer must be a shape layer (created with add_shape_layer).",
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
      name: z
        .string()
        .optional()
        .describe("Name for the shape group (default \"Shape Group\")"),
    },
    async ({ compId, layerIndex, name }) => {
      let nameLine = "";
      if (name !== undefined) {
        nameLine = "_group.name = \"" + escapeString(name) + "\";\n";
      }

      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        "if (!(layer instanceof ShapeLayer)) {\n" +
        "  return { success: false, error: { message: \"Layer \" + " + layerIndex + " + \" is not a shape layer.\", code: \"INVALID_PARAMS\" } };\n" +
        "}\n" +
        "var _contents = layer.property(\"Contents\");\n" +
        "var _group = _contents.addProperty(\"ADBE Vector Group\");\n" +
        nameLine +
        "return { success: true, data: { groupIndex: _contents.numProperties, groupName: _group.name } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "add_shape_group"));

      try {
        return runScript(script, "add_shape_group");
      } catch (err) {
        return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
      }
    }
  );

  // ─── set_shape_path ───────────────────────────────────────────────────────────
  server.tool(
    "set_shape_path",
    "Set a custom Bézier path on a shape group. " +
      "Vertices define the path points, inTangents and outTangents define the curve handles " +
      "(relative to each vertex). If tangents are omitted, straight lines are used. " +
      "The shape group should already exist (use add_shape_group). " +
      "Any existing path primitive in the group will be replaced.",
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
      groupIndex: z
        .number()
        .int()
        .positive()
        .describe("1-based index of the top-level shape group within the layer's Contents"),
      vertices: z
        .array(z.array(z.number()).length(2))
        .min(2)
        .describe("Array of [x, y] vertex positions defining the path points"),
      inTangents: z
        .array(z.array(z.number()).length(2))
        .optional()
        .describe("Array of [x, y] incoming tangent handles relative to each vertex (omit for straight lines)"),
      outTangents: z
        .array(z.array(z.number()).length(2))
        .optional()
        .describe("Array of [x, y] outgoing tangent handles relative to each vertex (omit for straight lines)"),
      closed: z
        .boolean()
        .optional()
        .describe("Whether the path is closed (default true)"),
    },
    async ({ compId, layerIndex, groupIndex, vertices, inTangents, outTangents, closed }) => {
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

      const closedVal = closed !== undefined ? closed : true;

      // Build vertices array literal
      const vertsLiteral = "[" + vertices.map(function (v) { return "[" + v[0] + "," + v[1] + "]"; }).join(",") + "]";

      // Build tangents: use provided or generate zeros
      let inLiteral: string;
      if (inTangents) {
        inLiteral = "[" + inTangents.map(function (v) { return "[" + v[0] + "," + v[1] + "]"; }).join(",") + "]";
      } else {
        const zeros = vertices.map(function () { return "[0,0]"; });
        inLiteral = "[" + zeros.join(",") + "]";
      }

      let outLiteral: string;
      if (outTangents) {
        outLiteral = "[" + outTangents.map(function (v) { return "[" + v[0] + "," + v[1] + "]"; }).join(",") + "]";
      } else {
        const zeros = vertices.map(function () { return "[0,0]"; });
        outLiteral = "[" + zeros.join(",") + "]";
      }

      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        "if (!(layer instanceof ShapeLayer)) {\n" +
        "  return { success: false, error: { message: \"Layer \" + " + layerIndex + " + \" is not a shape layer.\", code: \"INVALID_PARAMS\" } };\n" +
        "}\n" +
        "var _contents = layer.property(\"Contents\");\n" +
        "if (" + groupIndex + " < 1 || " + groupIndex + " > _contents.numProperties) {\n" +
        "  return { success: false, error: { message: \"Group index \" + " + groupIndex + " + \" out of range — layer has \" + _contents.numProperties + \" groups.\", code: \"INVALID_PARAMS\" } };\n" +
        "}\n" +
        "var _group = _contents.property(" + groupIndex + ");\n" +
        "if (!_group || _group.matchName !== \"ADBE Vector Group\") {\n" +
        "  return { success: false, error: { message: \"Group index \" + " + groupIndex + " + \" does not refer to a shape group.\", code: \"INVALID_PARAMS\" } };\n" +
        "}\n" +
        "var _groupContents = _group.property(\"Contents\");\n" +
        "if (!_groupContents) {\n" +
        "  return { success: false, error: { message: \"Shape group contents not found.\", code: \"INVALID_STATE\" } };\n" +
        "}\n" +
        // Remove existing path primitives in descending order
        "var _pathMatchNames = [\"ADBE Vector Shape - Group\", \"ADBE Vector Shape - Rect\", \"ADBE Vector Shape - Ellipse\", \"ADBE Vector Shape - Star\"];\n" +
        "for (var _ri = _groupContents.numProperties; _ri >= 1; _ri--) {\n" +
        "  var _prop = _groupContents.property(_ri);\n" +
        "  for (var _mi = 0; _mi < _pathMatchNames.length; _mi++) {\n" +
        "    if (_prop.matchName === _pathMatchNames[_mi]) {\n" +
        "      _prop.remove();\n" +
        "      break;\n" +
        "    }\n" +
        "  }\n" +
        "}\n" +
        // Add new path
        "var _pathGroup = _groupContents.addProperty(\"ADBE Vector Shape - Group\");\n" +
        "var _shape = new Shape();\n" +
        "_shape.vertices = " + vertsLiteral + ";\n" +
        "_shape.inTangents = " + inLiteral + ";\n" +
        "_shape.outTangents = " + outLiteral + ";\n" +
        "_shape.closed = " + (closedVal ? "true" : "false") + ";\n" +
        "_pathGroup.property(\"Path\").setValue(_shape);\n" +
        "return { success: true, data: { groupIndex: " + groupIndex + ", groupName: _group.name, vertexCount: " + vertices.length + " } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "set_shape_path"));

      try {
        return runScript(script, "set_shape_path");
      } catch (err) {
        return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
      }
    }
  );

  // ─── set_shape_style ──────────────────────────────────────────────────────────
  server.tool(
    "set_shape_style",
    "Set fill and stroke styling on a shape group. " +
      "Providing fillColor will add a fill if none exists. " +
      "Providing strokeColor will add a stroke if none exists. " +
      "Use removeFill/removeStroke to remove existing fill/stroke.",
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
      groupIndex: z
        .number()
        .int()
        .positive()
        .describe("1-based index of the top-level shape group within the layer's Contents"),
      fillColor: z
        .array(z.number().min(0).max(1))
        .length(3)
        .optional()
        .describe("Fill color as [r, g, b] normalized 0-1"),
      fillOpacity: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe("Fill opacity 0-100"),
      strokeColor: z
        .array(z.number().min(0).max(1))
        .length(3)
        .optional()
        .describe("Stroke color as [r, g, b] normalized 0-1"),
      strokeOpacity: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe("Stroke opacity 0-100"),
      strokeWidth: z
        .number()
        .optional()
        .describe("Stroke width in pixels"),
      lineJoin: z
        .enum(["miter", "round", "bevel"])
        .optional()
        .describe("Stroke line join style"),
      lineCap: z
        .enum(["butt", "round", "projecting"])
        .optional()
        .describe("Stroke line cap style"),
      removeFill: z
        .boolean()
        .optional()
        .describe("If true, remove existing fill from the group"),
      removeStroke: z
        .boolean()
        .optional()
        .describe("If true, remove existing stroke from the group"),
    },
    async ({ compId, layerIndex, groupIndex, fillColor, fillOpacity, strokeColor, strokeOpacity, strokeWidth, lineJoin, lineCap, removeFill, removeStroke }) => {
      // Map lineJoin / lineCap to AE enum values
      const lineJoinMap: Record<string, number> = { miter: 1, round: 2, bevel: 3 };
      const lineCapMap: Record<string, number> = { butt: 1, round: 2, projecting: 3 };

      // Build fill operations
      let fillScript = "";
      fillScript +=
        "var _fill = null;\n" +
        "for (var _fi = 1; _fi <= _groupContents.numProperties; _fi++) {\n" +
        "  if (_groupContents.property(_fi).matchName === \"ADBE Vector Graphic - Fill\") {\n" +
        "    _fill = _groupContents.property(_fi);\n" +
        "    break;\n" +
        "  }\n" +
        "}\n";

      if (removeFill) {
        fillScript +=
          "if (_fill !== null) {\n" +
          "  _fill.remove();\n" +
          "  _fill = null;\n" +
          "}\n";
      } else {
        if (fillColor !== undefined || fillOpacity !== undefined) {
          fillScript +=
            "if (_fill === null) {\n" +
            "  _fill = _groupContents.addProperty(\"ADBE Vector Graphic - Fill\");\n" +
            "}\n";
        }
        if (fillColor !== undefined) {
          fillScript += "_fill.property(\"Color\").setValue([" + fillColor[0] + "," + fillColor[1] + "," + fillColor[2] + "]);\n";
        }
        if (fillOpacity !== undefined) {
          fillScript += "_fill.property(\"Opacity\").setValue(" + fillOpacity + ");\n";
        }
      }

      // Build stroke operations
      let strokeScript = "";
      strokeScript +=
        "var _stroke = null;\n" +
        "for (var _si = 1; _si <= _groupContents.numProperties; _si++) {\n" +
        "  if (_groupContents.property(_si).matchName === \"ADBE Vector Graphic - Stroke\") {\n" +
        "    _stroke = _groupContents.property(_si);\n" +
        "    break;\n" +
        "  }\n" +
        "}\n";

      if (removeStroke) {
        strokeScript +=
          "if (_stroke !== null) {\n" +
          "  _stroke.remove();\n" +
          "  _stroke = null;\n" +
          "}\n";
      } else {
        if (strokeColor !== undefined || strokeOpacity !== undefined || strokeWidth !== undefined || lineJoin !== undefined || lineCap !== undefined) {
          strokeScript +=
            "if (_stroke === null) {\n" +
            "  _stroke = _groupContents.addProperty(\"ADBE Vector Graphic - Stroke\");\n" +
            "}\n";
        }
        if (strokeColor !== undefined) {
          strokeScript += "_stroke.property(\"Color\").setValue([" + strokeColor[0] + "," + strokeColor[1] + "," + strokeColor[2] + "]);\n";
        }
        if (strokeOpacity !== undefined) {
          strokeScript += "_stroke.property(\"Opacity\").setValue(" + strokeOpacity + ");\n";
        }
        if (strokeWidth !== undefined) {
          strokeScript += "_stroke.property(\"Stroke Width\").setValue(" + strokeWidth + ");\n";
        }
        if (lineJoin !== undefined) {
          strokeScript += "_stroke.property(\"Line Join\").setValue(" + lineJoinMap[lineJoin] + ");\n";
        }
        if (lineCap !== undefined) {
          strokeScript += "_stroke.property(\"Line Cap\").setValue(" + lineCapMap[lineCap] + ");\n";
        }
      }

      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        "if (!(layer instanceof ShapeLayer)) {\n" +
        "  return { success: false, error: { message: \"Layer \" + " + layerIndex + " + \" is not a shape layer.\", code: \"INVALID_PARAMS\" } };\n" +
        "}\n" +
        "var _contents = layer.property(\"Contents\");\n" +
        "if (" + groupIndex + " < 1 || " + groupIndex + " > _contents.numProperties) {\n" +
        "  return { success: false, error: { message: \"Group index \" + " + groupIndex + " + \" out of range — layer has \" + _contents.numProperties + \" groups.\", code: \"INVALID_PARAMS\" } };\n" +
        "}\n" +
        "var _group = _contents.property(" + groupIndex + ");\n" +
        "if (!_group || _group.matchName !== \"ADBE Vector Group\") {\n" +
        "  return { success: false, error: { message: \"Group index \" + " + groupIndex + " + \" does not refer to a shape group.\", code: \"INVALID_PARAMS\" } };\n" +
        "}\n" +
        "var _groupContents = _group.property(\"Contents\");\n" +
        "if (!_groupContents) {\n" +
        "  return { success: false, error: { message: \"Shape group contents not found.\", code: \"INVALID_STATE\" } };\n" +
        "}\n" +
        fillScript +
        strokeScript +
        "return { success: true, data: { groupIndex: " + groupIndex + ", groupName: _group.name, hasFill: _fill !== null, hasStroke: _stroke !== null } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "set_shape_style"));

      try {
        return runScript(script, "set_shape_style");
      } catch (err) {
        return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
      }
    }
  );
}
