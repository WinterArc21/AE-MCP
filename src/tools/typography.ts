/**
 * tools/typography.ts
 *
 * Text document read/write tools for After Effects text layers.
 *
 * Registers:
 *   - get_text_document   Read text content and typography settings from a text layer
 *   - set_text_document   Set text content and typography properties on a text layer
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
// Shared ExtendScript serialization function (ES3-compatible)
// ---------------------------------------------------------------------------

const SERIALIZE_TEXT_DOC_FN =
  "function _serializeTextDoc(td) {\n" +
  "  var justStr = \"left\";\n" +
  "  try {\n" +
  "    if (td.justification === ParagraphJustification.CENTER_JUSTIFY) justStr = \"center\";\n" +
  "    else if (td.justification === ParagraphJustification.RIGHT_JUSTIFY) justStr = \"right\";\n" +
  "    else if (td.justification === ParagraphJustification.FULL_JUSTIFY_LASTLINE_LEFT) justStr = \"full\";\n" +
  "  } catch(e) {}\n" +
  "  var result = {\n" +
  "    text: td.text,\n" +
  "    font: td.font,\n" +
  "    fontSize: td.fontSize,\n" +
  "    justification: justStr,\n" +
  "    tracking: td.tracking\n" +
  "  };\n" +
  "  try { result.leading = td.leading; } catch(e) {}\n" +
  "  try { result.applyFill = td.applyFill; } catch(e) {}\n" +
  "  try { if (td.applyFill) result.fillColor = [td.fillColor[0], td.fillColor[1], td.fillColor[2]]; } catch(e) {}\n" +
  "  try { result.applyStroke = td.applyStroke; } catch(e) {}\n" +
  "  try { if (td.applyStroke) result.strokeColor = [td.strokeColor[0], td.strokeColor[1], td.strokeColor[2]]; } catch(e) {}\n" +
  "  try { result.strokeWidth = td.strokeWidth; } catch(e) {}\n" +
  "  try { result.fauxBold = td.fauxBold; } catch(e) {}\n" +
  "  try { result.fauxItalic = td.fauxItalic; } catch(e) {}\n" +
  "  return result;\n" +
  "}\n";

// ---------------------------------------------------------------------------
// registerTypographyTools
// ---------------------------------------------------------------------------

export function registerTypographyTools(server: McpServer): void {

  // ─── get_text_document ──────────────────────────────────────────────────────
  server.tool(
    "get_text_document",
    "Read the text content and typography settings of a text layer. " +
      "Returns font, size, color, tracking, leading, justification, and other text properties. " +
      "The layer must be a text layer.",
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
        .describe("1-based index of the text layer in the composition"),
      time: z
        .number()
        .optional()
        .describe("Time in seconds at which to read the text document. If omitted, reads the current value"),
    },
    async ({ compId, layerIndex, time }) => {
      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        "if (!(layer instanceof TextLayer)) {\n" +
        "  return { success: false, error: { message: \"Layer \" + " + layerIndex + " + \" is not a text layer\", code: \"NOT_TEXT_LAYER\" } };\n" +
        "}\n" +
        SERIALIZE_TEXT_DOC_FN +
        "var _srcText = layer.property(\"Source Text\");\n" +
        (time !== undefined
          ? "var _td = _srcText.valueAtTime(" + time + ", false);\n"
          : "var _td = _srcText.value;\n") +
        "return { success: true, data: _serializeTextDoc(_td) };\n";

      const script = wrapWithReturn(body);

      try {
        return runScript(script, "get_text_document");
      } catch (err) {
        return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
      }
    }
  );

  // ─── set_text_document ──────────────────────────────────────────────────────
  server.tool(
    "set_text_document",
    "Set text content and typography properties on a text layer. " +
      "All parameters except compId and layerIndex are optional — only provided values are changed. " +
      "Use list_fonts to verify font PostScript names before setting.",
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
        .describe("1-based index of the text layer"),
      text: z
        .string()
        .optional()
        .describe("New text content for the layer"),
      font: z
        .string()
        .optional()
        .describe("PostScript name of the font (e.g. 'ArialMT', 'Helvetica-Bold')"),
      fontSize: z
        .number()
        .optional()
        .describe("Font size in pixels"),
      justification: z
        .enum(["left", "center", "right", "full"])
        .optional()
        .describe("Paragraph justification: left, center, right, or full"),
      tracking: z
        .number()
        .optional()
        .describe("Tracking value (letter spacing)"),
      leading: z
        .number()
        .optional()
        .describe("Leading value (line spacing) in pixels"),
      applyFill: z
        .boolean()
        .optional()
        .describe("Whether to apply fill color"),
      fillColor: z
        .array(z.number())
        .length(3)
        .optional()
        .describe("Fill color as [r, g, b] normalized 0-1"),
      applyStroke: z
        .boolean()
        .optional()
        .describe("Whether to apply stroke"),
      strokeColor: z
        .array(z.number())
        .length(3)
        .optional()
        .describe("Stroke color as [r, g, b] normalized 0-1"),
      strokeWidth: z
        .number()
        .optional()
        .describe("Stroke width in pixels"),
      fauxBold: z
        .boolean()
        .optional()
        .describe("Enable/disable faux bold"),
      fauxItalic: z
        .boolean()
        .optional()
        .describe("Enable/disable faux italic"),
    },
    async ({ compId, layerIndex, text, font, fontSize, justification, tracking, leading, applyFill, fillColor, applyStroke, strokeColor, strokeWidth, fauxBold, fauxItalic }) => {
      let mutations = "";

      if (text !== undefined) {
        mutations += "_td.text = \"" + escapeString(text) + "\";\n";
      }
      if (font !== undefined) {
        mutations += "_td.font = \"" + escapeString(font) + "\";\n";
      }
      if (fontSize !== undefined) {
        mutations += "_td.fontSize = " + fontSize + ";\n";
      }
      if (justification !== undefined) {
        const justMap: Record<string, string> = {
          left: "ParagraphJustification.LEFT_JUSTIFY",
          center: "ParagraphJustification.CENTER_JUSTIFY",
          right: "ParagraphJustification.RIGHT_JUSTIFY",
          full: "ParagraphJustification.FULL_JUSTIFY_LASTLINE_LEFT",
        };
        mutations += "_td.justification = " + justMap[justification] + ";\n";
      }
      if (tracking !== undefined) {
        mutations += "_td.tracking = " + tracking + ";\n";
      }
      if (leading !== undefined) {
        mutations += "try { _td.leading = " + leading + "; } catch(e) {}\n";
      }
      if (applyFill !== undefined) {
        mutations += "_td.applyFill = " + (applyFill ? "true" : "false") + ";\n";
      }
      if (fillColor !== undefined) {
        mutations += "_td.fillColor = [" + fillColor.join(",") + "];\n";
      }
      if (applyStroke !== undefined) {
        mutations += "_td.applyStroke = " + (applyStroke ? "true" : "false") + ";\n";
      }
      if (strokeColor !== undefined) {
        mutations += "_td.strokeColor = [" + strokeColor.join(",") + "];\n";
      }
      if (strokeWidth !== undefined) {
        mutations += "_td.strokeWidth = " + strokeWidth + ";\n";
      }
      if (fauxBold !== undefined) {
        mutations += "_td.fauxBold = " + (fauxBold ? "true" : "false") + ";\n";
      }
      if (fauxItalic !== undefined) {
        mutations += "_td.fauxItalic = " + (fauxItalic ? "true" : "false") + ";\n";
      }

      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        "if (!(layer instanceof TextLayer)) {\n" +
        "  return { success: false, error: { message: \"Layer \" + " + layerIndex + " + \" is not a text layer\", code: \"NOT_TEXT_LAYER\" } };\n" +
        "}\n" +
        SERIALIZE_TEXT_DOC_FN +
        "var _srcText = layer.property(\"Source Text\");\n" +
        "var _td = _srcText.value;\n" +
        mutations +
        "_srcText.setValue(_td);\n" +
        "var _updated = _srcText.value;\n" +
        "return { success: true, data: _serializeTextDoc(_updated) };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "set_text_document"));

      try {
        return runScript(script, "set_text_document");
      } catch (err) {
        return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
      }
    }
  );
}
