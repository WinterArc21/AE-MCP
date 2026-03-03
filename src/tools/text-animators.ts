/**
 * tools/text-animators.ts
 *
 * Text animator tools for After Effects text layers.
 *
 * Registers:
 *   - add_text_animator         Add a text animator with range selector to a text layer
 *   - set_text_animator_values  Set property values on an existing text animator
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

/**
 * Map a friendly text animator property name to its AE match name string.
 * These are the ADBE internal names used with addProperty().
 */
function animatorPropToAE(prop: string): string {
  const map: Record<string, string> = {
    "Position":     "ADBE Text Position 3D",
    "Scale":        "ADBE Text Scale 3D",
    "Rotation":     "ADBE Text Rotation",
    "Opacity":      "ADBE Text Opacity",
    "Fill Color":   "ADBE Text Fill Color",
    "Stroke Color": "ADBE Text Stroke Color",
    "Tracking":     "ADBE Text Tracking Amount",
  };
  return map[prop] ?? prop;
}

/**
 * Map range selector type to AE's selector type string.
 */
function rangeSelectorType(rangeType: string): string {
  // AE uses: "ADBE Text Selector" for range selector
  // The actual characters/words/lines is a sub-property "Based On"
  // 1 = Characters, 2 = Character Excluding Spaces, 3 = Words, 4 = Lines
  const map: Record<string, number> = {
    "Characters": 1,
    "Words":      3,
    "Lines":      4,
  };
  return String(map[rangeType] ?? 1);
}

// ---------------------------------------------------------------------------
// registerTextAnimatorTools
// ---------------------------------------------------------------------------

export function registerTextAnimatorTools(server: McpServer): void {

  // ─── add_text_animator ───────────────────────────────────────────────────
  server.tool(
    "add_text_animator",
    "Add a text animator to a text layer. " +
      "Text animators allow you to animate properties (position, opacity, rotation, etc.) " +
      "on individual characters, words, or lines — not the whole layer at once. " +
      "Each animator includes a Range Selector that controls WHICH characters are affected " +
      "and by how much (0% = none, 100% = all). " +
      "rangeType controls the unit of selection: " +
      "  'Characters' = animate per individual character (most granular, good for letter-by-letter reveals); " +
      "  'Words' = animate per word; " +
      "  'Lines' = animate per line of text. " +
      "rangeStart/rangeEnd (0-100) define the initial selection extent. " +
      "properties is an array of which properties to animate — you can combine multiple in one animator. " +
      "Example: add Opacity + Position animators for a staggered fade-up reveal. " +
      "After adding, animate the Range Selector's Start/End/Offset to create the animation. " +
      "The layer must be a text layer.",
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
        .describe("1-based index of a text layer"),
      properties: z
        .array(
          z.enum(["Position", "Scale", "Rotation", "Opacity", "Fill Color", "Stroke Color", "Tracking"])
        )
        .min(1)
        .describe(
          "Array of text properties to animate. At least one required. " +
          "Opacity is most common for reveals; Position for slide-in effects; " +
          "Tracking for letter-spacing animations; Fill Color for color transitions"
        ),
      rangeType: z
        .enum(["Characters", "Words", "Lines"])
        .describe("Unit of range selection: Characters (per-letter), Words (per-word), Lines (per-line)"),
      rangeStart: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe("Initial Range Selector Start value 0-100 (default 0)"),
      rangeEnd: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe("Initial Range Selector End value 0-100 (default 100)"),
      rangeOffset: z
        .number()
        .optional()
        .describe("Initial Range Selector Offset value in percent (default 0)"),
    },
    async ({ compId, layerIndex, properties, rangeType, rangeStart, rangeEnd, rangeOffset }) => {
      // Build property add lines
      let addPropLines = "";
      for (let i = 0; i < properties.length; i++) {
        const matchName = animatorPropToAE(properties[i]);
        addPropLines +=
          "var _animProp" + i + " = _animator.addProperty(\"" + escapeString(matchName) + "\");\n";
      }

      // Range selector "Based On" property: set after adding selector
      const basedOnVal = rangeSelectorType(rangeType);

      const startVal  = rangeStart  !== undefined ? rangeStart  : 0;
      const endVal    = rangeEnd    !== undefined ? rangeEnd    : 100;
      const offsetVal = rangeOffset !== undefined ? rangeOffset : 0;

      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        // Verify it's a text layer
        "if (!(layer instanceof TextLayer)) {\n" +
        "  return { success: false, error: { message: \"Layer \" + " + layerIndex + " + \" is not a text layer.\", code: \"INVALID_PARAMS\" } };\n" +
        "}\n" +
        "var _textProp = layer.property(\"Text\");\n" +
        "var _animators = _textProp.property(\"Animators\");\n" +
        "var _animator = _animators.addProperty(\"ADBE Text Animator\");\n" +
        addPropLines +
        // Add range selector
        "var _selectors = _animator.property(\"Selector\");\n" +
        "var _selector = _selectors.addProperty(\"ADBE Text Selector\");\n" +
        // Set Based On (Characters/Words/Lines)
        "_selector.property(\"Based On\").setValue(" + basedOnVal + ");\n" +
        "_selector.property(\"Start\").setValue(" + startVal + ");\n" +
        "_selector.property(\"End\").setValue(" + endVal + ");\n" +
        "_selector.property(\"Offset\").setValue(" + offsetVal + ");\n" +
        "return { success: true, data: { animatorIndex: _animators.numProperties, animatorName: _animator.name, properties: " + JSON.stringify(properties) + ", rangeType: \"" + escapeString(rangeType) + "\" } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "add_text_animator"));

      try {
        return runScript(script, "add_text_animator");
      } catch (err) {
        return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
      }
    }
  );

  // ─── set_text_animator_values ────────────────────────────────────────────
  server.tool(
    "set_text_animator_values",
    "Set property values on an existing text animator. " +
      "Use this after add_text_animator to define the animated values on each property. " +
      "For example: add an Opacity animator, then call this tool to set Opacity to 0 " +
      "so that characters outside the range selector appear invisible. " +
      "animatorIndex is 1-based (1 = first animator on the layer). " +
      "property is the name of the property within the animator (e.g. 'Opacity', 'Position', 'Rotation'). " +
      "value can be a number (for scalar properties like Opacity 0-100, Rotation in degrees) " +
      "or an [x, y] or [x, y, z] array (for Position, Scale). " +
      "To animate the range selector itself (for a typewriter reveal effect), " +
      "use add_keyframe on the layer's Text > Animators > [n] > Selector > Start or End property.",
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
        .describe("1-based index of a text layer"),
      animatorIndex: z
        .number()
        .int()
        .positive()
        .describe("1-based index of the text animator on this layer"),
      property: z
        .string()
        .describe(
          "Property to set within the animator. Common values: " +
          "'Opacity' (number 0-100), 'Rotation' (degrees), " +
          "'Position' ([x, y] pixels), 'Scale' ([x, y] percent), " +
          "'Tracking Amount' (number), 'Fill Color' ([r,g,b] 0-1)"
        ),
      value: z
        .union([z.number(), z.array(z.number())])
        .describe("Value to set. Number for scalar properties, array for vector properties"),
    },
    async ({ compId, layerIndex, animatorIndex, property, value }) => {
      const valLiteral = Array.isArray(value)
        ? "[" + value.join(",") + "]"
        : String(value);

      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        "if (!(layer instanceof TextLayer)) {\n" +
        "  return { success: false, error: { message: \"Layer \" + " + layerIndex + " + \" is not a text layer.\", code: \"INVALID_PARAMS\" } };\n" +
        "}\n" +
        "var _textProp = layer.property(\"Text\");\n" +
        "var _animators = _textProp.property(\"Animators\");\n" +
        "if (" + animatorIndex + " < 1 || " + animatorIndex + " > _animators.numProperties) {\n" +
        "  return { success: false, error: { message: \"Animator index " + animatorIndex + " out of range — layer has \" + _animators.numProperties + \" animators.\", code: \"INVALID_PARAMS\" } };\n" +
        "}\n" +
        "var _animator = _animators.property(" + animatorIndex + ");\n" +
        "var _prop = _animator.property(\"" + escapeString(property) + "\");\n" +
        "if (!_prop) {\n" +
        "  return { success: false, error: { message: \"Property \\\"" + escapeString(property) + "\\\" not found in animator " + animatorIndex + ".\", code: \"PROP_NOT_FOUND\" } };\n" +
        "}\n" +
        "_prop.setValue(" + valLiteral + ");\n" +
        "return { success: true, data: { animatorIndex: " + animatorIndex + ", property: \"" + escapeString(property) + "\", value: " + JSON.stringify(value) + " } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "set_text_animator_values"));

      try {
        return runScript(script, "set_text_animator_values");
      } catch (err) {
        return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
      }
    }
  );
}
