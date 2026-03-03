/**
 * tools/layer.ts
 *
 * MCP tool registrations for After Effects layer management.
 *
 * Tools:
 *   - add_solid_layer        : solid color layer
 *   - add_text_layer         : text layer with font/size/color/style
 *   - add_shape_layer        : vector shape layer (rect/ellipse/polygon/star)
 *   - add_null_layer         : null object layer
 *   - add_adjustment_layer   : adjustment layer
 *   - list_layers            : all layers in a comp with type and timing
 *   - get_layer_info         : full layer details (transforms, effects, parent)
 *   - set_layer_properties   : update transform/time/name/enabled
 *   - delete_layer           : remove a layer permanently
 *   - duplicate_layer        : copy a layer within the same comp
 *   - set_layer_parent       : assign or remove a layer parent
 *   - reorder_layer          : move a layer in the stacking order
 *
 * All ExtendScript is ES3-compatible (var only, no arrow functions,
 * no template literals, string concatenation only).
 * Layer indices are 1-based throughout (layer 1 = top of the timeline).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { bridge } from "../bridge.js";
import {
  escapeString,
  wrapWithReturn,
  findCompById,
  colorLiteral,
} from "../script-builder.js";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function textResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data) }],
  };
}

async function run(script: string, toolName: string) {
  const result = await bridge.executeScript(script, toolName);
  return textResult(result);
}

/**
 * ES3 snippet: validates layerIndex is in range, assigns layer to `layerVar`.
 * Assumes `compVar` is already declared in scope.
 */
function getLayer(
  compVar: string,
  indexExpr: string,
  layerVar = "layer"
): string {
  return (
    "if (" +
    indexExpr +
    " < 1 || " +
    indexExpr +
    " > " +
    compVar +
    ".numLayers) {\n" +
    '  throw new Error("Layer index " + ' +
    indexExpr +
    ' + " is out of range (1-based, comp has " + ' +
    compVar +
    '.numLayers + " layers)");\n' +
    "}\n" +
    "var " +
    layerVar +
    " = " +
    compVar +
    ".layer(" +
    indexExpr +
    ");\n"
  );
}

/**
 * ES3 object-literal string: common layer properties.
 * `v` is the variable name holding the layer.
 */
function layerBase(v: string): string {
  return (
    "{\n" +
    "  index: " + v + ".index,\n" +
    "  name: " + v + ".name,\n" +
    "  enabled: " + v + ".enabled,\n" +
    "  solo: " + v + ".solo,\n" +
    "  shy: " + v + ".shy,\n" +
    "  locked: " + v + ".locked,\n" +
    "  label: " + v + ".label,\n" +
    "  inPoint: " + v + ".inPoint,\n" +
    "  outPoint: " + v + ".outPoint,\n" +
    "  startTime: " + v + ".startTime,\n" +
    "  stretch: " + v + ".stretch,\n" +
    "  hasVideo: " + v + ".hasVideo,\n" +
    "  hasAudio: " + v + ".hasAudio\n" +
    "}"
  );
}

// ---------------------------------------------------------------------------
// registerLayerTools
// ---------------------------------------------------------------------------

export function registerLayerTools(server: McpServer): void {

  // ── add_solid_layer ───────────────────────────────────────────────────────

  server.tool(
    "add_solid_layer",
    "Adds a solid color layer to a composition. " +
      "New layers are always placed at the top of the stack (index 1). " +
      "Useful as backgrounds, color mattes, or effect targets. " +
      "Color is [R, G, B] in the 0-1 range (NOT 0-255). " +
      "Width and height default to the composition dimensions. " +
      "Returns the new layer's index and name.",
    {
      compId: z
        .number()
        .int()
        .positive()
        .describe("Numeric id of the target composition."),
      name: z
        .string()
        .default("Solid")
        .describe('Layer name. Default: "Solid".'),
      color: z
        .array(z.number().min(0).max(1))
        .length(3)
        .default([1, 1, 1])
        .describe(
          "Solid fill color [R, G, B] in the 0-1 range (NOT 0-255). " +
            "Default is white [1, 1, 1]."
        ),
      width: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Width in pixels. Defaults to comp width."),
      height: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Height in pixels. Defaults to comp height."),
      opacity: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe("Opacity 0-100. Default is 100 (fully opaque)."),
      startTime: z
        .number()
        .optional()
        .describe("Layer start time in seconds. Default is 0."),
      duration: z
        .number()
        .positive()
        .optional()
        .describe("Layer duration in seconds. Defaults to comp duration."),
    },
    async ({ compId, name, color, width, height, opacity, startTime, duration }) => {
      const wExpr = width !== undefined ? String(width) : "comp.width";
      const hExpr = height !== undefined ? String(height) : "comp.height";

      let extras = "";
      if (opacity !== undefined) {
        extras +=
          '  solid.property("Transform").property("Opacity").setValue(' +
          opacity +
          ");\n";
      }
      if (startTime !== undefined) {
        extras += "  solid.startTime = " + startTime + ";\n";
      }
      if (duration !== undefined) {
        extras +=
          "  solid.outPoint = solid.startTime + " + duration + ";\n";
      }

      const script = wrapWithReturn(
        'app.beginUndoGroup("add_solid_layer");\n' +
          "var __r;\n" +
          "try {\n" +
          "  " +
          findCompById(String(compId), "comp").split("\n").join("\n  ") +
          "  var solid = comp.layers.addSolid(" +
          colorLiteral(color) +
          ', "' +
          escapeString(name) +
          '", ' +
          wExpr +
          ", " +
          hExpr +
          ", 1.0);\n" +
          extras +
          "  __r = { success: true, data: " +
          layerBase("solid") +
          " };\n" +
          "} finally {\n" +
          "  app.endUndoGroup();\n" +
          "}\n" +
          "return __r;\n"
      );
      return run(script, "add_solid_layer");
    }
  );

  // ── add_text_layer ────────────────────────────────────────────────────────

  server.tool(
    "add_text_layer",
    "Adds a text layer to a composition. " +
      "Supports font (PostScript name), size, fill color (0-1 range), " +
      "bold, italic, paragraph justification, and position. " +
      "Position is [x, y] pixels from the composition top-left corner; " +
      "omit for the composition center. " +
      "Returns the new layer's index and name.",
    {
      compId: z
        .number()
        .int()
        .positive()
        .describe("Numeric id of the target composition."),
      text: z.string().describe("The text string to display."),
      fontSize: z
        .number()
        .positive()
        .optional()
        .describe("Font size in pixels. Default is 72."),
      font: z
        .string()
        .optional()
        .describe(
          'PostScript font name (e.g. "Arial-BoldMT", "Helvetica", ' +
            '"TimesNewRomanPS-BoldMT"). Default is "ArialMT".'
        ),
      color: z
        .array(z.number().min(0).max(1))
        .length(3)
        .optional()
        .describe(
          "Text fill color [R, G, B] in the 0-1 range. Default is white [1, 1, 1]."
        ),
      position: z
        .array(z.number())
        .length(2)
        .optional()
        .describe(
          "Position [x, y] in pixels from the top-left corner. " +
            "Omit to place at the comp center."
        ),
      bold: z.boolean().optional().describe("Apply bold styling. Default is false."),
      italic: z.boolean().optional().describe("Apply italic styling. Default is false."),
      justification: z
        .enum(["LEFT", "RIGHT", "CENTER", "FULL_JUSTIFY_LASTLINE_LEFT"])
        .optional()
        .describe(
          "Paragraph justification: LEFT, RIGHT, CENTER, or " +
            "FULL_JUSTIFY_LASTLINE_LEFT. Default is LEFT."
        ),
    },
    async ({
      compId,
      text,
      fontSize,
      font,
      color,
      position,
      bold,
      italic,
      justification,
    }) => {
      let fontStyle = "Regular";
      if (bold && italic) {
        fontStyle = "BoldItalic";
      } else if (bold) {
        fontStyle = "Bold";
      } else if (italic) {
        fontStyle = "Italic";
      }

      const fillColor = color ? colorLiteral(color) : "[1, 1, 1]";
      const fontName = font ? escapeString(font) : "ArialMT";
      const fSize = fontSize !== undefined ? fontSize : 72;

      const justMap: Record<string, string> = {
        LEFT: "ParagraphJustification.LEFT_JUSTIFY",
        RIGHT: "ParagraphJustification.RIGHT_JUSTIFY",
        CENTER: "ParagraphJustification.CENTER_JUSTIFY",
        FULL_JUSTIFY_LASTLINE_LEFT:
          "ParagraphJustification.FULL_JUSTIFY_LASTLINE_LEFT",
      };
      const justLine =
        justification !== undefined
          ? "  textDoc.justification = " + justMap[justification] + ";\n"
          : "";

      const positionLine =
        position !== undefined
          ? '  textLayer.property("Transform").property("Position").setValue([' +
            position[0] +
            ", " +
            position[1] +
            "]);\n"
          : "";

      const script = wrapWithReturn(
        'app.beginUndoGroup("add_text_layer");\n' +
          "var __r;\n" +
          "try {\n" +
          "  " +
          findCompById(String(compId), "comp").split("\n").join("\n  ") +
          '  var textLayer = comp.layers.addText("' +
          escapeString(text) +
          '");\n' +
          '  var textDoc = textLayer.property("Source Text").value;\n' +
          '  textDoc.text = "' +
          escapeString(text) +
          '";\n' +
          "  textDoc.fontSize = " +
          fSize +
          ";\n" +
          '  textDoc.font = "' +
          fontName +
          '";\n' +
          "  textDoc.applyFill = true;\n" +
          "  textDoc.fillColor = " +
          fillColor +
          ";\n" +
          '  textDoc.fontStyle = "' +
          fontStyle +
          '";\n' +
          justLine +
          '  textLayer.property("Source Text").setValue(textDoc);\n' +
          positionLine +
          "  __r = { success: true, data: " +
          layerBase("textLayer") +
          " };\n" +
          "} finally {\n" +
          "  app.endUndoGroup();\n" +
          "}\n" +
          "return __r;\n"
      );
      return run(script, "add_text_layer");
    }
  );

  // ── add_shape_layer ───────────────────────────────────────────────────────

  server.tool(
    "add_shape_layer",
    "Adds a vector shape layer to a composition. " +
      "Shapes are resolution-independent. " +
      "shapeType: " +
      '"rectangle" — axis-aligned rect; ' +
      '"ellipse" — oval or circle; ' +
      '"polygon" — regular polygon (6 sides default); ' +
      '"star" — five-pointed star. ' +
      "size for rectangle/ellipse: [width, height] pixels. " +
      "size for polygon/star: [outerRadius] or [outerRadius, innerRadius]. " +
      "Colors are [R, G, B] in 0-1 range. " +
      "position is [x, y] pixels; default is comp center. " +
      "Returns the new layer's index and name.",
    {
      compId: z
        .number()
        .int()
        .positive()
        .describe("Numeric id of the target composition."),
      name: z
        .string()
        .default("Shape Layer")
        .describe('Layer name. Default: "Shape Layer".'),
      shapeType: z
        .enum(["rectangle", "ellipse", "polygon", "star"])
        .describe(
          "Shape geometry type: rectangle, ellipse, polygon, or star."
        ),
      size: z
        .array(z.number().positive())
        .min(1)
        .max(2)
        .optional()
        .describe(
          "rectangle/ellipse: [width, height] px. " +
            "polygon/star: [outerRadius] or [outerRadius, innerRadius]. " +
            "Default: [200, 200]."
        ),
      position: z
        .array(z.number())
        .length(2)
        .optional()
        .describe(
          "Center position [x, y] in pixels from the comp top-left. " +
            "Default is comp center."
        ),
      fillColor: z
        .array(z.number().min(0).max(1))
        .length(3)
        .optional()
        .describe(
          "Fill color [R, G, B] in 0-1 range. Default: red [1, 0, 0]."
        ),
      strokeColor: z
        .array(z.number().min(0).max(1))
        .length(3)
        .optional()
        .describe(
          "Stroke color [R, G, B] in 0-1 range. " +
            "Omit to create a shape with no stroke."
        ),
      strokeWidth: z
        .number()
        .positive()
        .optional()
        .describe(
          "Stroke width in pixels. Used only when strokeColor is provided. Default: 2."
        ),
    },
    async ({
      compId,
      name,
      shapeType,
      size,
      position,
      fillColor,
      strokeColor,
      strokeWidth,
    }) => {
      const w = size ? size[0] : 200;
      const h = size ? (size[1] !== undefined ? size[1] : size[0]) : 200;
      const outerR = size ? size[0] : 100;
      const innerR =
        size && size[1] !== undefined ? size[1] : outerR * 0.5;

      const fill = colorLiteral(fillColor !== undefined ? fillColor : [1, 0, 0]);
      const posExpr =
        position !== undefined
          ? "[" + position[0] + ", " + position[1] + "]"
          : "[comp.width / 2, comp.height / 2]";

      let geomLines = "";
      if (shapeType === "rectangle") {
        geomLines =
          '  var geom = shapeGroup.property("Contents").addProperty("ADBE Vector Shape - Rect");\n' +
          "  geom.property(\"Size\").setValue([" + w + ", " + h + "]);\n" +
          '  geom.property("Position").setValue([0, 0]);\n';
      } else if (shapeType === "ellipse") {
        geomLines =
          '  var geom = shapeGroup.property("Contents").addProperty("ADBE Vector Shape - Ellipse");\n' +
          "  geom.property(\"Size\").setValue([" + w + ", " + h + "]);\n" +
          '  geom.property("Position").setValue([0, 0]);\n';
      } else if (shapeType === "polygon") {
        geomLines =
          '  var geom = shapeGroup.property("Contents").addProperty("ADBE Vector Shape - Star");\n' +
          '  geom.property("Type").setValue(2);\n' +
          '  geom.property("Points").setValue(6);\n' +
          '  geom.property("Position").setValue([0, 0]);\n' +
          "  geom.property(\"Outer Radius\").setValue(" + outerR + ");\n";
      } else {
        geomLines =
          '  var geom = shapeGroup.property("Contents").addProperty("ADBE Vector Shape - Star");\n' +
          '  geom.property("Type").setValue(1);\n' +
          '  geom.property("Points").setValue(5);\n' +
          '  geom.property("Position").setValue([0, 0]);\n' +
          "  geom.property(\"Outer Radius\").setValue(" + outerR + ");\n" +
          "  geom.property(\"Inner Radius\").setValue(" + innerR + ");\n";
      }

      const fillLines =
        '  var shapeFill = shapeGroup.property("Contents").addProperty("ADBE Vector Graphic - Fill");\n' +
        "  shapeFill.property(\"Color\").setValue(" + fill + ");\n";

      let strokeLines = "";
      if (strokeColor !== undefined) {
        const sw = strokeWidth !== undefined ? strokeWidth : 2;
        strokeLines =
          '  var shapeStroke = shapeGroup.property("Contents").addProperty("ADBE Vector Graphic - Stroke");\n' +
          "  shapeStroke.property(\"Color\").setValue(" +
          colorLiteral(strokeColor) +
          ");\n" +
          "  shapeStroke.property(\"Stroke Width\").setValue(" + sw + ");\n";
      }

      const script = wrapWithReturn(
        'app.beginUndoGroup("add_shape_layer");\n' +
          "var __r;\n" +
          "try {\n" +
          "  " +
          findCompById(String(compId), "comp").split("\n").join("\n  ") +
          "  var shapeLayer = comp.layers.addShape();\n" +
          '  shapeLayer.name = "' +
          escapeString(name) +
          '";\n' +
          '  var shapeGroup = shapeLayer.property("Contents").addProperty("ADBE Vector Group");\n' +
          geomLines +
          fillLines +
          strokeLines +
          '  shapeLayer.property("Transform").property("Position").setValue(' +
          posExpr +
          ");\n" +
          "  __r = { success: true, data: " +
          layerBase("shapeLayer") +
          " };\n" +
          "} finally {\n" +
          "  app.endUndoGroup();\n" +
          "}\n" +
          "return __r;\n"
      );
      return run(script, "add_shape_layer");
    }
  );

  // ── add_null_layer ────────────────────────────────────────────────────────

  server.tool(
    "add_null_layer",
    "Adds a null object layer to a composition. " +
      "Null layers are invisible but have full transform properties. " +
      "They are used as parent controllers, rig anchors, or expression " +
      "targets. Any other layer can be parented to a null. " +
      "Returns the new layer's index and name.",
    {
      compId: z
        .number()
        .int()
        .positive()
        .describe("Numeric id of the target composition."),
      name: z
        .string()
        .optional()
        .describe(
          'Layer name. If omitted AE auto-names it (e.g. "Null 1").'
        ),
    },
    async ({ compId, name }) => {
      const renameBlock =
        name !== undefined
          ? '  nullLayer.name = "' + escapeString(name) + '";\n'
          : "";

      const script = wrapWithReturn(
        'app.beginUndoGroup("add_null_layer");\n' +
          "var __r;\n" +
          "try {\n" +
          "  " +
          findCompById(String(compId), "comp").split("\n").join("\n  ") +
          "  var nullLayer = comp.layers.addNull();\n" +
          renameBlock +
          "  __r = { success: true, data: " +
          layerBase("nullLayer") +
          " };\n" +
          "} finally {\n" +
          "  app.endUndoGroup();\n" +
          "}\n" +
          "return __r;\n"
      );
      return run(script, "add_null_layer");
    }
  );

  // ── add_adjustment_layer ──────────────────────────────────────────────────

  server.tool(
    "add_adjustment_layer",
    "Adds an adjustment layer to a composition. " +
      "Effects applied to an adjustment layer affect all layers below it " +
      "in the stacking order — useful for global color grades, blurs, etc. " +
      "Returns the new layer's index and name.",
    {
      compId: z
        .number()
        .int()
        .positive()
        .describe("Numeric id of the target composition."),
      name: z
        .string()
        .optional()
        .describe('Layer name. Default: "Adjustment Layer".'),
    },
    async ({ compId, name }) => {
      const layerName =
        name !== undefined ? escapeString(name) : "Adjustment Layer";

      const script = wrapWithReturn(
        'app.beginUndoGroup("add_adjustment_layer");\n' +
          "var __r;\n" +
          "try {\n" +
          "  " +
          findCompById(String(compId), "comp").split("\n").join("\n  ") +
          '  var adjLayer = comp.layers.addSolid([1, 1, 1], "' +
          layerName +
          '", comp.width, comp.height, 1.0);\n' +
          "  adjLayer.adjustmentLayer = true;\n" +
          "  __r = { success: true, data: " +
          layerBase("adjLayer") +
          " };\n" +
          "} finally {\n" +
          "  app.endUndoGroup();\n" +
          "}\n" +
          "return __r;\n"
      );
      return run(script, "add_adjustment_layer");
    }
  );

  // ── list_layers ───────────────────────────────────────────────────────────

  server.tool(
    "list_layers",
    "Lists all layers in a composition in stacking order. " +
      "Layer index 1 is the topmost (rendered on top). " +
      "For each layer returns: index (1-based), name, type, inPoint, " +
      "outPoint, startTime, enabled, solo, shy, locked, hasVideo, hasAudio. " +
      "Use the returned index values with set_layer_properties, " +
      "get_layer_info, delete_layer, etc.",
    {
      compId: z
        .number()
        .int()
        .positive()
        .describe("Numeric id of the composition."),
    },
    async ({ compId }) => {
      const script = wrapWithReturn(
        findCompById(String(compId), "comp") +
          "var layers = [];\n" +
          "for (var i = 1; i <= comp.numLayers; i++) {\n" +
          "  var lyr = comp.layer(i);\n" +
          '  var typeLabel = "AV";\n' +
          '  if (lyr instanceof TextLayer) { typeLabel = "Text"; }\n' +
          '  else if (lyr instanceof ShapeLayer) { typeLabel = "Shape"; }\n' +
          '  else if (lyr instanceof CameraLayer) { typeLabel = "Camera"; }\n' +
          '  else if (lyr instanceof LightLayer) { typeLabel = "Light"; }\n' +
          "  else if (lyr instanceof AVLayer) {\n" +
          '    if (lyr.nullLayer) { typeLabel = "Null"; }\n' +
          '    else if (lyr.adjustmentLayer) { typeLabel = "Adjustment"; }\n' +
          "  }\n" +
          "  layers.push({\n" +
          "    index: lyr.index,\n" +
          "    name: lyr.name,\n" +
          "    type: typeLabel,\n" +
          "    inPoint: lyr.inPoint,\n" +
          "    outPoint: lyr.outPoint,\n" +
          "    startTime: lyr.startTime,\n" +
          "    enabled: lyr.enabled,\n" +
          "    solo: lyr.solo,\n" +
          "    shy: lyr.shy,\n" +
          "    locked: lyr.locked,\n" +
          "    hasVideo: lyr.hasVideo,\n" +
          "    hasAudio: lyr.hasAudio\n" +
          "  });\n" +
          "}\n" +
          "return { success: true, data: { layers: layers } };\n"
      );
      return run(script, "list_layers");
    }
  );

  // ── get_layer_info ────────────────────────────────────────────────────────

  server.tool(
    "get_layer_info",
    "Returns detailed information about a single layer including: " +
      "all current transform property values (position, scale, rotation, " +
      "opacity, anchor point), time properties, layer type, parent layer, " +
      "and a list of effects applied to the layer. " +
      "Layer indices are 1-based. Use list_layers to discover them.",
    {
      compId: z
        .number()
        .int()
        .positive()
        .describe("Numeric id of the composition."),
      layerIndex: z
        .number()
        .int()
        .positive()
        .describe(
          "1-based index of the layer. Layer 1 is the topmost in the timeline."
        ),
    },
    async ({ compId, layerIndex }) => {
      const script = wrapWithReturn(
        findCompById(String(compId), "comp") +
          getLayer("comp", String(layerIndex), "layer") +
          'var typeLabel = "AV";\n' +
          'if (layer instanceof TextLayer) { typeLabel = "Text"; }\n' +
          'else if (layer instanceof ShapeLayer) { typeLabel = "Shape"; }\n' +
          'else if (layer instanceof CameraLayer) { typeLabel = "Camera"; }\n' +
          'else if (layer instanceof LightLayer) { typeLabel = "Light"; }\n' +
          "else if (layer instanceof AVLayer) {\n" +
          '  if (layer.nullLayer) { typeLabel = "Null"; }\n' +
          '  else if (layer.adjustmentLayer) { typeLabel = "Adjustment"; }\n' +
          "}\n" +
          "var position = null;\n" +
          "var scale = null;\n" +
          "var rotation = null;\n" +
          "var opacity = null;\n" +
          "var anchorPoint = null;\n" +
          "try {\n" +
          '  var xf = layer.property("Transform");\n' +
          '  position = xf.property("Position").value;\n' +
          '  scale = xf.property("Scale").value;\n' +
          '  rotation = xf.property("Rotation").value;\n' +
          '  opacity = xf.property("Opacity").value;\n' +
          '  anchorPoint = xf.property("Anchor Point").value;\n' +
          "} catch (xfErr) {}\n" +
          "var effectsList = [];\n" +
          "try {\n" +
          '  var fx = layer.property("Effects");\n' +
          "  for (var ei = 1; ei <= fx.numProperties; ei++) {\n" +
          "    var eff = fx.property(ei);\n" +
          "    effectsList.push({ name: eff.name, matchName: eff.matchName, enabled: eff.enabled });\n" +
          "  }\n" +
          "} catch (fxErr) {}\n" +
          "var parentIndex = null;\n" +
          "var parentName = null;\n" +
          "try {\n" +
          "  if (layer.parent) {\n" +
          "    parentIndex = layer.parent.index;\n" +
          "    parentName = layer.parent.name;\n" +
          "  }\n" +
          "} catch (pErr) {}\n" +
          "return {\n" +
          "  success: true,\n" +
          "  data: {\n" +
          "    index: layer.index,\n" +
          "    name: layer.name,\n" +
          "    type: typeLabel,\n" +
          "    enabled: layer.enabled,\n" +
          "    solo: layer.solo,\n" +
          "    shy: layer.shy,\n" +
          "    locked: layer.locked,\n" +
          "    inPoint: layer.inPoint,\n" +
          "    outPoint: layer.outPoint,\n" +
          "    startTime: layer.startTime,\n" +
          "    stretch: layer.stretch,\n" +
          "    hasVideo: layer.hasVideo,\n" +
          "    hasAudio: layer.hasAudio,\n" +
          "    position: position,\n" +
          "    scale: scale,\n" +
          "    rotation: rotation,\n" +
          "    opacity: opacity,\n" +
          "    anchorPoint: anchorPoint,\n" +
          "    effects: effectsList,\n" +
          "    parentIndex: parentIndex,\n" +
          "    parentName: parentName\n" +
          "  }\n" +
          "};\n"
      );
      return run(script, "get_layer_info");
    }
  );

  // ── set_layer_properties ──────────────────────────────────────────────────

  server.tool(
    "set_layer_properties",
    "Updates one or more properties of an existing layer. " +
      "All parameters except compId and layerIndex are optional; " +
      "only the fields you provide will be changed. " +
      "Transform values: position [x,y], scale [x,y] (percent), " +
      "rotation (degrees), opacity (0-100), anchorPoint [x,y]. " +
      "Time values: inPoint and outPoint in seconds. " +
      "Returns the updated layer state.",
    {
      compId: z
        .number()
        .int()
        .positive()
        .describe("Numeric id of the composition."),
      layerIndex: z
        .number()
        .int()
        .positive()
        .describe("1-based index of the layer to update."),
      name: z.string().optional().describe("New layer name."),
      enabled: z
        .boolean()
        .optional()
        .describe("Toggle layer visibility (true = visible)."),
      solo: z.boolean().optional().describe("Toggle solo state."),
      shy: z.boolean().optional().describe("Toggle shy flag."),
      locked: z.boolean().optional().describe("Toggle lock state."),
      position: z
        .array(z.number())
        .length(2)
        .optional()
        .describe("New position [x, y] in pixels."),
      scale: z
        .array(z.number())
        .length(2)
        .optional()
        .describe("New scale [x, y] in percent (100 = original size)."),
      rotation: z
        .number()
        .optional()
        .describe("New rotation in degrees."),
      opacity: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe("New opacity 0-100."),
      anchorPoint: z
        .array(z.number())
        .length(2)
        .optional()
        .describe("New anchor point [x, y] in pixels."),
      inPoint: z
        .number()
        .optional()
        .describe("New in-point in seconds."),
      outPoint: z
        .number()
        .optional()
        .describe("New out-point in seconds."),
      startTime: z
        .number()
        .optional()
        .describe("New start time in seconds."),
    },
    async ({
      compId,
      layerIndex,
      name,
      enabled,
      solo,
      shy,
      locked,
      position,
      scale,
      rotation,
      opacity,
      anchorPoint,
      inPoint,
      outPoint,
      startTime,
    }) => {
      let setLines = "";
      if (name !== undefined)
        setLines += '  layer.name = "' + escapeString(name) + '";\n';
      if (enabled !== undefined)
        setLines += "  layer.enabled = " + enabled + ";\n";
      if (solo !== undefined) setLines += "  layer.solo = " + solo + ";\n";
      if (shy !== undefined) setLines += "  layer.shy = " + shy + ";\n";
      if (locked !== undefined)
        setLines += "  layer.locked = " + locked + ";\n";
      if (position !== undefined)
        setLines +=
          '  layer.property("Transform").property("Position").setValue([' +
          position[0] +
          ", " +
          position[1] +
          "]);\n";
      if (scale !== undefined)
        setLines +=
          '  layer.property("Transform").property("Scale").setValue([' +
          scale[0] +
          ", " +
          scale[1] +
          "]);\n";
      if (rotation !== undefined)
        setLines +=
          '  layer.property("Transform").property("Rotation").setValue(' +
          rotation +
          ");\n";
      if (opacity !== undefined)
        setLines +=
          '  layer.property("Transform").property("Opacity").setValue(' +
          opacity +
          ");\n";
      if (anchorPoint !== undefined)
        setLines +=
          '  layer.property("Transform").property("Anchor Point").setValue([' +
          anchorPoint[0] +
          ", " +
          anchorPoint[1] +
          "]);\n";
      if (inPoint !== undefined)
        setLines += "  layer.inPoint = " + inPoint + ";\n";
      if (outPoint !== undefined)
        setLines += "  layer.outPoint = " + outPoint + ";\n";
      if (startTime !== undefined)
        setLines += "  layer.startTime = " + startTime + ";\n";

      const script = wrapWithReturn(
        'app.beginUndoGroup("set_layer_properties");\n' +
          "var __r;\n" +
          "try {\n" +
          "  " +
          findCompById(String(compId), "comp").split("\n").join("\n  ") +
          "  " +
          getLayer("comp", String(layerIndex)).split("\n").join("\n  ") +
          setLines +
          "  __r = { success: true, data: " +
          layerBase("layer") +
          " };\n" +
          "} finally {\n" +
          "  app.endUndoGroup();\n" +
          "}\n" +
          "return __r;\n"
      );
      return run(script, "set_layer_properties");
    }
  );

  // ── delete_layer ──────────────────────────────────────────────────────────

  server.tool(
    "delete_layer",
    "Permanently removes a layer from a composition. " +
      "This action cannot be undone programmatically (it is wrapped in an " +
      "undo group so the user can Ctrl/Cmd+Z inside AE). " +
      "Layer indices shift after deletion — re-query list_layers if needed. " +
      "Returns { success: true, deletedIndex, deletedName }.",
    {
      compId: z
        .number()
        .int()
        .positive()
        .describe("Numeric id of the composition."),
      layerIndex: z
        .number()
        .int()
        .positive()
        .describe("1-based index of the layer to remove."),
    },
    async ({ compId, layerIndex }) => {
      const script = wrapWithReturn(
        'app.beginUndoGroup("delete_layer");\n' +
          "var __r;\n" +
          "try {\n" +
          "  " +
          findCompById(String(compId), "comp").split("\n").join("\n  ") +
          "  " +
          getLayer("comp", String(layerIndex)).split("\n").join("\n  ") +
          "  var deletedIndex = layer.index;\n" +
          "  var deletedName = layer.name;\n" +
          "  layer.remove();\n" +
          "  __r = { success: true, data: { deletedIndex: deletedIndex, deletedName: deletedName } };\n" +
          "} finally {\n" +
          "  app.endUndoGroup();\n" +
          "}\n" +
          "return __r;\n"
      );
      return run(script, "delete_layer");
    }
  );

  // ── duplicate_layer ───────────────────────────────────────────────────────

  server.tool(
    "duplicate_layer",
    "Creates a copy of a layer within the same composition. " +
      "The duplicate is placed directly above the original (index - 1). " +
      "All properties, effects, and keyframes are copied. " +
      "Returns the new (duplicate) layer's index and name.",
    {
      compId: z
        .number()
        .int()
        .positive()
        .describe("Numeric id of the composition."),
      layerIndex: z
        .number()
        .int()
        .positive()
        .describe("1-based index of the layer to duplicate."),
      newName: z
        .string()
        .optional()
        .describe(
          "Optional name for the duplicate. " +
            'Defaults to the original name with " copy" appended (AE behavior).'
        ),
    },
    async ({ compId, layerIndex, newName }) => {
      const renameBlock =
        newName !== undefined
          ? '  dupeLayer.name = "' + escapeString(newName) + '";\n'
          : "";

      const script = wrapWithReturn(
        'app.beginUndoGroup("duplicate_layer");\n' +
          "var __r;\n" +
          "try {\n" +
          "  " +
          findCompById(String(compId), "comp").split("\n").join("\n  ") +
          "  " +
          getLayer("comp", String(layerIndex)).split("\n").join("\n  ") +
          "  var dupeLayer = layer.duplicate();\n" +
          renameBlock +
          "  __r = { success: true, data: " +
          layerBase("dupeLayer") +
          " };\n" +
          "} finally {\n" +
          "  app.endUndoGroup();\n" +
          "}\n" +
          "return __r;\n"
      );
      return run(script, "duplicate_layer");
    }
  );

  // ── set_layer_parent ──────────────────────────────────────────────────────

  server.tool(
    "set_layer_parent",
    "Assigns a parent layer to a child layer, or removes the parent " +
      "by passing parentIndex = 0. " +
      "When a layer has a parent, its transforms become relative to the " +
      "parent — moving/rotating/scaling the parent affects all children. " +
      "Null layers are commonly used as parent controllers. " +
      "Returns the updated child layer info.",
    {
      compId: z
        .number()
        .int()
        .positive()
        .describe("Numeric id of the composition."),
      layerIndex: z
        .number()
        .int()
        .positive()
        .describe("1-based index of the CHILD layer."),
      parentIndex: z
        .number()
        .int()
        .min(0)
        .describe(
          "1-based index of the PARENT layer, or 0 to remove the parent."
        ),
    },
    async ({ compId, layerIndex, parentIndex }) => {
      const parentBlock =
        parentIndex === 0
          ? "  layer.parent = null;\n"
          : "  " +
            getLayer("comp", String(parentIndex), "parentLayer").split("\n").join("\n  ") +
            "  layer.parent = parentLayer;\n";

      const script = wrapWithReturn(
        'app.beginUndoGroup("set_layer_parent");\n' +
          "var __r;\n" +
          "try {\n" +
          "  " +
          findCompById(String(compId), "comp").split("\n").join("\n  ") +
          "  " +
          getLayer("comp", String(layerIndex)).split("\n").join("\n  ") +
          parentBlock +
          "  __r = { success: true, data: " +
          layerBase("layer") +
          " };\n" +
          "} finally {\n" +
          "  app.endUndoGroup();\n" +
          "}\n" +
          "return __r;\n"
      );
      return run(script, "set_layer_parent");
    }
  );

  // ── reorder_layer ─────────────────────────────────────────────────────────

  server.tool(
    "reorder_layer",
    "Moves a layer to a different position in the stacking order. " +
      "newIndex is the 1-based target position (1 = top of stack). " +
      "Other layers shift to accommodate. " +
      "Returns the layer's new index after the move.",
    {
      compId: z
        .number()
        .int()
        .positive()
        .describe("Numeric id of the composition."),
      layerIndex: z
        .number()
        .int()
        .positive()
        .describe("Current 1-based index of the layer to move."),
      newIndex: z
        .number()
        .int()
        .positive()
        .describe("Target 1-based index for the layer."),
    },
    async ({ compId, layerIndex, newIndex }) => {
      const script = wrapWithReturn(
        'app.beginUndoGroup("reorder_layer");\n' +
          "var __r;\n" +
          "try {\n" +
          "  " +
          findCompById(String(compId), "comp").split("\n").join("\n  ") +
          "  " +
          getLayer("comp", String(layerIndex)).split("\n").join("\n  ") +
          "  layer.moveToIndex(" + newIndex + ");\n" +
          "  __r = { success: true, data: { newIndex: layer.index, name: layer.name } };\n" +
          "} finally {\n" +
          "  app.endUndoGroup();\n" +
          "}\n" +
          "return __r;\n"
      );
      return run(script, "reorder_layer");
    }
  );
}
