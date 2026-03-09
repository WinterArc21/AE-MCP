/**
 * tools/text-animators.ts
 *
 * Text animator tools for After Effects text layers.
 *
 * Registers:
 *   - add_text_animator         Add a text animator with range selector to a text layer
 *   - set_text_animator_values  Set property values on an existing text animator
 *   - list_text_animators       List all text animators on a text layer
 *   - set_text_selector         Set range selector properties on a text animator
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
import { validateTransformValue, valueShapeError } from "../value-validator.js";

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
    "Position":        "ADBE Text Position 3D",
    "Scale":           "ADBE Text Scale 3D",
    "Rotation":        "ADBE Text Rotation",
    "Opacity":         "ADBE Text Opacity",
    "Fill Color":      "ADBE Text Fill Color",
    "Stroke Color":    "ADBE Text Stroke Color",
    "Tracking":        "ADBE Text Tracking Amount",
    "Tracking Amount": "ADBE Text Tracking Amount",
    "Skew":            "ADBE Text Skew",
    "Skew Axis":       "ADBE Text Skew Axis",
    "Blur":            "ADBE Text Blur",
    "Line Anchor":     "ADBE Text Line Anchor",
    "Line Spacing":    "ADBE Text Line Spacing",
    "Character Offset":"ADBE Text Character Offset",
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
          "var _animProp" + i + " = _animProps.addProperty(\"" + escapeString(matchName) + "\");\n";
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
        "var _animProps = _animator.property(\"ADBE Text Animator Properties\");\n" +
        "if (!_animProps) {\n" +
        "  return { success: false, error: { message: \"Animator properties group not found.\", code: \"INVALID_STATE\" } };\n" +
        "}\n" +
        addPropLines +
        // Reuse the default selector when present; otherwise create one.
        "var _selectors = _animator.property(\"ADBE Text Selectors\");\n" +
        "if (!_selectors) {\n" +
        "  return { success: false, error: { message: \"Animator selectors group not found.\", code: \"INVALID_STATE\" } };\n" +
        "}\n" +
        "var _selector = _selectors.numProperties >= 1 ? _selectors.property(1) : _selectors.addProperty(\"ADBE Text Selector\");\n" +
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
      "Value shape must match the property exactly: " +
      "Opacity = single number (0-100); " +
      "Rotation = single number (degrees); " +
      "Tracking/Tracking Amount = single number; " +
      "Position = [x, y] or [x, y, z]; " +
      "Scale = [x, y] or [x, y, z]; " +
      "Fill Color/Stroke Color = [r, g, b] (0-1 range). " +
      "To animate the range selector itself, " +
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
        .enum(["Position", "Scale", "Rotation", "Opacity", "Fill Color", "Stroke Color", "Tracking", "Tracking Amount", "Skew", "Skew Axis", "Blur", "Line Anchor", "Line Spacing", "Character Offset"])
        .describe(
          "Property to set within the animator. " +
          "Opacity (single number 0-100), Rotation (single number, degrees), " +
          "Position ([x, y] or [x, y, z] pixels), Scale ([x, y] or [x, y, z] percent), " +
          "Tracking/Tracking Amount (single number), Fill Color/Stroke Color ([r, g, b] 0-1)"
        ),
      value: z
        .union([z.number(), z.array(z.number())])
        .describe(
          "Value to set. Shape must match property: " +
          "Opacity/Rotation/Tracking = single number; " +
          "Position = [x, y] or [x, y, z]; " +
          "Scale = [x, y] or [x, y, z]; " +
          "Fill Color/Stroke Color = [r, g, b]."
        ),
    },
    async ({ compId, layerIndex, animatorIndex, property, value }) => {
      // Validate value dimensions match property
      const valErr = validateTransformValue(property, value);
      if (valErr) return valueShapeError(valErr);

      const valLiteral = Array.isArray(value)
        ? "[" + value.join(",") + "]"
        : String(value);
      const propertyMatchName = animatorPropToAE(property);

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
        "var _animProps = _animator.property(\"ADBE Text Animator Properties\");\n" +
        "if (!_animProps) {\n" +
        "  return { success: false, error: { message: \"Animator properties group not found.\", code: \"INVALID_STATE\" } };\n" +
        "}\n" +
        "var _prop = _animProps.property(\"" + escapeString(property) + "\");\n" +
        "if (!_prop) {\n" +
        "  _prop = _animProps.property(\"" + escapeString(propertyMatchName) + "\");\n" +
        "}\n" +
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

// ---------------------------------------------------------------------------
// Demoted helpers (formerly server.tool registrations)
// ---------------------------------------------------------------------------

export async function listTextAnimatorsHelper(params: {
  compId: number;
  layerIndex: number;
}) {
  const { compId, layerIndex } = params;
  const body =
    findCompById("comp", compId) +
    findLayerByIndex("layer", "comp", layerIndex) +
    "if (!(layer instanceof TextLayer)) {\n" +
    "  return { success: false, error: { message: \"Layer \" + " + layerIndex + " + \" is not a text layer.\", code: \"INVALID_PARAMS\" } };\n" +
    "}\n" +
    "var _animators = layer.property(\"Text\").property(\"Animators\");\n" +
    "var _result = [];\n" +
    "for (var _ai = 1; _ai <= _animators.numProperties; _ai++) {\n" +
    "  var _anim = _animators.property(_ai);\n" +
    "  var _props = [];\n" +
    "  var _propGroup = _anim.property(\"ADBE Text Animator Properties\");\n" +
    "  if (_propGroup) {\n" +
    "    for (var _pi = 1; _pi <= _propGroup.numProperties; _pi++) {\n" +
    "      var _p = _propGroup.property(_pi);\n" +
    "      _props.push({ name: _p.name, matchName: _p.matchName });\n" +
    "    }\n" +
    "    }\n" +
    "  var _selectors = [];\n" +
    "  var _selGroup = _anim.property(\"ADBE Text Selectors\");\n" +
    "  if (_selGroup) {\n" +
    "    for (var _si = 1; _si <= _selGroup.numProperties; _si++) {\n" +
    "      var _sel = _selGroup.property(_si);\n" +
    "      var _selInfo = { name: _sel.name, index: _si };\n" +
    "      try { _selInfo.start = _sel.property(\"Start\").value; } catch (_e) {}\n" +
    "      try { _selInfo.end = _sel.property(\"End\").value; } catch (_e) {}\n" +
    "      try { _selInfo.offset = _sel.property(\"Offset\").value; } catch (_e) {}\n" +
    "      try {\n" +
    "        var _bo = _sel.property(\"Based On\").value;\n" +
    "        var _boMap = { 1: \"Characters\", 2: \"CharactersExcludingSpaces\", 3: \"Words\", 4: \"Lines\" };\n" +
    "        _selInfo.basedOn = _boMap[_bo] || String(_bo);\n" +
    "      } catch (_e) {}\n" +
    "      _selectors.push(_selInfo);\n" +
    "    }\n" +
    "  }\n" +
    "  _result.push({ index: _ai, name: _anim.name, properties: _props, selectors: _selectors });\n" +
    "}\n" +
    "return { success: true, data: { animators: _result, count: _result.length } };\n";

  const script = wrapWithReturn(body);

  try {
    return runScript(script, "list_text_animators");
  } catch (err) {
    return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
  }
}

export async function setTextSelectorHelper(params: {
  compId: number;
  layerIndex: number;
  animatorIndex: number;
  selectorIndex?: number;
  start?: number;
  end?: number;
  offset?: number;
  amount?: number;
  basedOn?: "Characters" | "CharactersExcludingSpaces" | "Words" | "Lines";
}) {
  const { compId, layerIndex, animatorIndex, selectorIndex, start, end, offset, amount, basedOn } = params;
  const selIdx = selectorIndex ?? 1;

  let setLines = "";
  if (start !== undefined) {
    setLines += "_selector.property(\"Start\").setValue(" + start + ");\n";
  }
  if (end !== undefined) {
    setLines += "_selector.property(\"End\").setValue(" + end + ");\n";
  }
  if (offset !== undefined) {
    setLines += "_selector.property(\"Offset\").setValue(" + offset + ");\n";
  }
  if (amount !== undefined) {
    setLines += "try { _selector.property(\"Amount\").setValue(" + amount + "); } catch (_e) {}\n";
  }
  if (basedOn !== undefined) {
    const basedOnMap: Record<string, number> = {
      "Characters": 1,
      "CharactersExcludingSpaces": 2,
      "Words": 3,
      "Lines": 4,
    };
    setLines += "_selector.property(\"Based On\").setValue(" + basedOnMap[basedOn] + ");\n";
  }

  const body =
    findCompById("comp", compId) +
    findLayerByIndex("layer", "comp", layerIndex) +
    "if (!(layer instanceof TextLayer)) {\n" +
    "  return { success: false, error: { message: \"Layer \" + " + layerIndex + " + \" is not a text layer.\", code: \"INVALID_PARAMS\" } };\n" +
    "}\n" +
    "var _animators = layer.property(\"Text\").property(\"Animators\");\n" +
    "if (" + animatorIndex + " < 1 || " + animatorIndex + " > _animators.numProperties) {\n" +
    "  return { success: false, error: { message: \"Animator index " + animatorIndex + " out of range — layer has \" + _animators.numProperties + \" animators.\", code: \"INVALID_PARAMS\" } };\n" +
    "}\n" +
    "var _animator = _animators.property(" + animatorIndex + ");\n" +
    "var _selGroup = _animator.property(\"ADBE Text Selectors\");\n" +
    "if (!_selGroup) {\n" +
    "  return { success: false, error: { message: \"Animator selectors group not found.\", code: \"INVALID_STATE\" } };\n" +
    "}\n" +
    "if (" + selIdx + " < 1 || " + selIdx + " > _selGroup.numProperties) {\n" +
    "  return { success: false, error: { message: \"Selector index " + selIdx + " out of range — animator has \" + _selGroup.numProperties + \" selectors.\", code: \"INVALID_PARAMS\" } };\n" +
    "}\n" +
    "var _selector = _selGroup.property(" + selIdx + ");\n" +
    setLines +
    "var _curStart = 0; try { _curStart = _selector.property(\"Start\").value; } catch (_e) {}\n" +
    "var _curEnd = 100; try { _curEnd = _selector.property(\"End\").value; } catch (_e) {}\n" +
    "var _curOffset = 0; try { _curOffset = _selector.property(\"Offset\").value; } catch (_e) {}\n" +
    "return { success: true, data: { animatorIndex: " + animatorIndex + ", selectorIndex: " + selIdx + ", start: _curStart, end: _curEnd, offset: _curOffset } };\n";

  const script = wrapWithReturn(wrapInUndoGroup(body, "set_text_selector"));

  try {
    return runScript(script, "set_text_selector");
  } catch (err) {
    return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
  }
}
