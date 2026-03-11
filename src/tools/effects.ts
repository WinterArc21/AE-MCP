/**
 * tools/effects.ts
 *
 * MCP tool registrations for After Effects effect management.
 *
 * Tools:
 *   - apply_effect            Apply any AE effect to a layer by match name
 *   - remove_effect           Remove an effect by index or name
 *   - get_effect_properties   Inspect all properties of an applied effect
 *   - set_effect_property     Set a single property on an applied effect
 *   - list_layer_effects      List all effects on a layer
 *   - get_effect_docs         Read documentation for an effect from docs/ folder
 *   - list_available_effects  Return a comprehensive catalog of AE effects by category
 *
 * All ExtendScript is ES3-compatible (var only, no arrow functions,
 * no template literals, string concatenation only).
 * Layer and effect indices are 1-based throughout.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { bridge } from "../bridge.js";
import {
  escapeString,
  wrapWithReturn,
  wrapInUndoGroup,
  findCompById,
  findLayerByIndex,
} from "../script-builder.js";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function textResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}

async function runScript(script: string, toolName: string) {
  const result = await bridge.executeScript(script, toolName);
  return textResult(result);
}

// Resolve the docs directory relative to this file (works on Windows too)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DOCS_EFFECTS_DIR = path.resolve(__dirname, "../../docs/effects");

// ---------------------------------------------------------------------------
// ES3 runtime helper: normalize array values against prop.value shape
// ---------------------------------------------------------------------------

const NORMALIZE_EFFECT_VALUE_FN =
  "function _normalizeEffectValue(prop, rawValue) {\n" +
  "  var currentValue = null;\n" +
  "  try { currentValue = prop.value; } catch(e) {}\n" +
  "  var rawIsArray = (rawValue instanceof Array);\n" +
  "  var currentIsArray = (currentValue instanceof Array);\n" +
  "  if (currentIsArray) {\n" +
  "    if (!rawIsArray) {\n" +
  "      return { __error: 'Property expects an array value (length ' + currentValue.length + '), got a scalar.' };\n" +
  "    }\n" +
  "    var expectedLen = currentValue.length;\n" +
  "    var out = [];\n" +
  "    for (var i = 0; i < rawValue.length; i++) out.push(rawValue[i]);\n" +
  "    if (expectedLen === 4 && out.length === 3) {\n" +
  "      out.push(1);\n" +
  "    }\n" +
  "    if (out.length !== expectedLen) {\n" +
  "      return { __error: 'Property expects array length ' + expectedLen + ', got ' + out.length + '.' };\n" +
  "    }\n" +
  "    return out;\n" +
  "  }\n" +
  "  return rawValue;\n" +
  "}\n";

// ---------------------------------------------------------------------------
// registerEffectTools
// ---------------------------------------------------------------------------

export function registerEffectTools(server: McpServer): void {

  // ── apply_effect ───────────────────────────────────────────────────────────

  server.tool(
    "apply_effect",
    "Applies an After Effects effect to a layer using the effect's internal match name. " +
      "Returns the effect index, name, and how many properties were set. " +
      "Use list_layer_effects to see effects already on a layer. " +
      "\n\nCommon effect match names (use these for effectMatchName):\n" +
      "  Blur & Sharpen:\n" +
      '    "ADBE Gaussian Blur 2"         — Gaussian Blur\n' +
      '    "ADBE Motion Blur"             — Directional Blur\n' +
      '    "ADBE Radial Blur"             — CC Radial Blur\n' +
      '    "ADBE Sharpen"                 — Sharpen\n' +
      "  Color Correction:\n" +
      '    "ADBE Levels2"                 — Levels\n' +
      '    "ADBE CurvesCustom"            — Curves\n' +
      '    "ADBE HUE SATURATION"          — Hue/Saturation\n' +
      '    "ADBE Tint"                    — Tint\n' +
      '    "ADBE Tritone"                 — Tritone\n' +
      '    "ADBE Pro Levels2"             — Levels (Individual Controls)\n' +
      "  Distort:\n" +
      '    "ADBE Turbulent Displace"      — Turbulent Displace\n' +
      '    "ADBE Displacement Map"        — Displacement Map\n' +
      '    "ADBE Corner Pin"              — Corner Pin\n' +
      '    "ADBE Geometry2"               — Transform\n' +
      '    "ADBE Magnify"                 — Magnify\n' +
      "  Generate:\n" +
      '    "ADBE Fill"                    — Fill\n' +
      '    "ADBE Ramp"                    — Gradient Ramp\n' +
      '    "ADBE Noise2"                  — Fractal Noise\n' +
      "  Stylize:\n" +
      '    "ADBE Glo2"                    — Glow\n' +
      '    "ADBE Drop Shadow"             — Drop Shadow\n' +
      "\nTip: Use get_effect_properties after applying to discover settable property names.",
    {
      compId: z
        .number()
        .int()
        .positive()
        .describe("Numeric ID of the target composition."),
      layerIndex: z
        .number()
        .int()
        .positive()
        .describe("1-based index of the layer to apply the effect to."),
      effectMatchName: z
        .string()
        .describe(
          'AE internal match name, e.g. "ADBE Gaussian Blur 2". ' +
            "See the tool description for a list of common match names."
        ),
      effectDisplayName: z
        .string()
        .optional()
        .describe(
          "Optional friendly name to assign to the effect instance. " +
            "If omitted the AE default name is used."
        ),
      properties: z
        .record(z.unknown())
        .optional()
        .describe(
          "Optional key-value pairs of effect property names to initial values. " +
            "Property names must match the AE property name (e.g. \"Blurriness\", \"Opacity\"). " +
            "Numbers and arrays are set directly; booleans are converted to 1/0."
        ),
    },
    async ({ compId, layerIndex, effectMatchName, effectDisplayName, properties }) => {
      // Build the properties-setting block (ES3, with per-property try/catch)
      const hasProps = properties && Object.keys(properties).length > 0;

      // Serialize each property to an ES3 value literal
      function valueToES3(val: unknown): string {
        if (typeof val === "boolean") {
          return val ? "1" : "0";
        }
        if (typeof val === "number") {
          return String(val);
        }
        if (Array.isArray(val)) {
          const items = (val as unknown[]).map((v) =>
            typeof v === "number" ? String(v) : "0"
          );
          return "[" + items.join(", ") + "]";
        }
        if (typeof val === "string") {
          return '"' + escapeString(val) + '"';
        }
        return "null";
      }

      let propsBlock = "";
      if (hasProps) {
        const entries = Object.entries(properties!);
        for (const [propName, propVal] of entries) {
          const safeVarSuffix = escapeString(propName).replace(/[^a-zA-Z0-9]/g, "");
          propsBlock +=
            "  try {\n" +
            '    var _p_' + safeVarSuffix + ' = effect.property("' + escapeString(propName) + '");\n' +
            '    var _v_' + safeVarSuffix + ' = _normalizeEffectValue(_p_' + safeVarSuffix + ', ' +
            valueToES3(propVal) + ");\n" +
            '    if (_v_' + safeVarSuffix + ' && _v_' + safeVarSuffix + '.__error) {\n' +
            '      propErrors.push("' + escapeString(propName) + ': " + _v_' + safeVarSuffix + '.__error);\n' +
            "    } else {\n" +
            '      _p_' + safeVarSuffix + '.setValue(_v_' + safeVarSuffix + ');\n' +
            "      propsSet++;\n" +
            "    }\n" +
            "  } catch (propErr_" + safeVarSuffix + ") {\n" +
            '    propErrors.push("' + escapeString(propName) + ': " + propErr_' +
            safeVarSuffix + '.toString());\n' +
            "  }\n";
        }
      }

      const displayNameLine =
        effectDisplayName !== undefined
          ? '  effect.name = "' + escapeString(effectDisplayName) + '";\n'
          : "";

      const inner =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        (hasProps ? NORMALIZE_EFFECT_VALUE_FN : "") +
        'var effect = layer.property("Effects").addProperty("' +
        escapeString(effectMatchName) +
        '");\n' +
        "if (!effect) {\n" +
        '  return { success: false, error: { message: "Effect not found or could not be applied: ' +
        escapeString(effectMatchName) +
        '", code: "EFFECT_NOT_FOUND" } };\n' +
        "}\n" +
        displayNameLine +
        "var propsSet = 0;\n" +
        "var propErrors = [];\n" +
        propsBlock +
        "return {\n" +
        "  success: true,\n" +
        "  data: {\n" +
        "    effectIndex: effect.propertyIndex,\n" +
        "    name: effect.name,\n" +
        "    matchName: effect.matchName,\n" +
        "    numProperties: effect.numProperties,\n" +
        "    propertiesSet: propsSet,\n" +
        "    propertyErrors: propErrors\n" +
        "  }\n" +
        "};\n";

      const script = wrapWithReturn(
        wrapInUndoGroup(inner, "apply_effect")
      );

      return runScript(script, "apply_effect");
    }
  );

  // ── remove_effect ──────────────────────────────────────────────────────────

  server.tool(
    "remove_effect",
    "Removes an effect from a layer. " +
      "Provide either effectIndex (1-based position in the Effects group) " +
      "or effectName (the displayed name of the effect). " +
      "Use list_layer_effects to discover indices and names. " +
      "Returns the name of the removed effect.",
    {
      compId: z
        .number()
        .int()
        .positive()
        .describe("Numeric ID of the target composition."),
      layerIndex: z
        .number()
        .int()
        .positive()
        .describe("1-based index of the layer."),
      effectIndex: z
        .number()
        .int()
        .positive()
        .optional()
        .describe(
          "1-based index of the effect within the layer's Effects group. " +
            "Use list_layer_effects to find it."
        ),
      effectName: z
        .string()
        .optional()
        .describe(
          "Displayed name of the effect to remove (case-sensitive). " +
            "If multiple effects share the same name, the first match is removed."
        ),
    },
    async ({ compId, layerIndex, effectIndex, effectName }) => {
      if (effectIndex === undefined && effectName === undefined) {
        return textResult({
          success: false,
          error: {
            message: "Must provide either effectIndex or effectName.",
            code: "INVALID_PARAMS",
          },
        });
      }

      let findBlock: string;
      if (effectIndex !== undefined) {
        findBlock =
          'var fxGroup = layer.property("Effects");\n' +
          "if (" + effectIndex + " < 1 || " + effectIndex + " > fxGroup.numProperties) {\n" +
          '  return { success: false, error: { message: "Effect index ' +
          effectIndex +
          ' is out of range.", code: "EFFECT_NOT_FOUND" } };\n' +
          "}\n" +
          "var targetEffect = fxGroup.property(" + effectIndex + ");\n";
      } else {
        findBlock =
          'var fxGroup = layer.property("Effects");\n' +
          "var targetEffect = null;\n" +
          "for (var _ei = 1; _ei <= fxGroup.numProperties; _ei++) {\n" +
          '  if (fxGroup.property(_ei).name === "' + escapeString(effectName!) + '") {\n' +
          "    targetEffect = fxGroup.property(_ei);\n" +
          "    break;\n" +
          "  }\n" +
          "}\n" +
          "if (!targetEffect) {\n" +
          '  return { success: false, error: { message: "Effect not found: ' +
          escapeString(effectName!) +
          '", code: "EFFECT_NOT_FOUND" } };\n' +
          "}\n";
      }

      const inner =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        findBlock +
        "var removedName = targetEffect.name;\n" +
        "var removedMatchName = targetEffect.matchName;\n" +
        "targetEffect.remove();\n" +
        "return {\n" +
        "  success: true,\n" +
        "  data: { removed: removedName, matchName: removedMatchName }\n" +
        "};\n";

      const script = wrapWithReturn(
        wrapInUndoGroup(inner, "remove_effect")
      );

      return runScript(script, "remove_effect");
    }
  );

  // ── get_effect_properties ──────────────────────────────────────────────────

  server.tool(
    "get_effect_properties",
    "Inspects an applied effect and returns all its properties: " +
      "name, matchName, property type, current value, and whether the property " +
      "has keyframes. Group properties (sub-groups) are flagged but not recursed. " +
      "Use list_layer_effects to find the effectIndex for a given effect. " +
      "Use this before set_effect_property to discover the exact property names " +
      "you need.",
    {
      compId: z
        .number()
        .int()
        .positive()
        .describe("Numeric ID of the target composition."),
      layerIndex: z
        .number()
        .int()
        .positive()
        .describe("1-based index of the layer."),
      effectIndex: z
        .number()
        .int()
        .positive()
        .describe(
          "1-based index of the effect within the layer's Effects group. " +
            "Use list_layer_effects to find it."
        ),
    },
    async ({ compId, layerIndex, effectIndex }) => {
      const inner =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        'var fxGroup = layer.property("Effects");\n' +
        "if (" + effectIndex + " < 1 || " + effectIndex + " > fxGroup.numProperties) {\n" +
        '  return { success: false, error: { message: "Effect index ' +
        effectIndex +
        ' out of range.", code: "EFFECT_NOT_FOUND" } };\n' +
        "}\n" +
        "var effect = fxGroup.property(" + effectIndex + ");\n" +
        "var props = [];\n" +
        "for (var pi = 1; pi <= effect.numProperties; pi++) {\n" +
        "  var p = effect.property(pi);\n" +
        "  var pInfo = {\n" +
        "    index: pi,\n" +
        "    name: p.name,\n" +
        "    matchName: p.matchName,\n" +
        "    propertyType: null,\n" +
        "    value: null,\n" +
        "    hasKeyframes: false,\n" +
        "    isGroup: false,\n" +
        "    canSetValue: false\n" +
        "  };\n" +
        "  try {\n" +
        "    pInfo.isGroup = (p.propertyType === PropertyType.INDEXED_GROUP ||\n" +
        "                     p.propertyType === PropertyType.NAMED_GROUP);\n" +
        "    pInfo.propertyType = p.propertyType.toString();\n" +
        "  } catch (ptErr) {}\n" +
        "  try {\n" +
        "    if (!pInfo.isGroup) {\n" +
        "      pInfo.value = p.value;\n" +
        "      pInfo.canSetValue = true;\n" +
        "    }\n" +
        "  } catch (pvErr) {\n" +
        "    pInfo.value = null;\n" +
        "  }\n" +
        "  try {\n" +
        "    pInfo.hasKeyframes = (p.numKeys > 0);\n" +
        "  } catch (pkErr) {}\n" +
        "  props.push(pInfo);\n" +
        "}\n" +
        "return {\n" +
        "  success: true,\n" +
        "  data: {\n" +
        "    effectName: effect.name,\n" +
        "    effectMatchName: effect.matchName,\n" +
        "    effectEnabled: effect.enabled,\n" +
        "    numProperties: effect.numProperties,\n" +
        "    properties: props\n" +
        "  }\n" +
        "};\n";

      const script = wrapWithReturn(inner);

      return runScript(script, "get_effect_properties");
    }
  );

  // ── set_effect_property ────────────────────────────────────────────────────

  server.tool(
    "set_effect_property",
    "Sets a single property on an already-applied effect. " +
      "Use get_effect_properties first to find the exact property name. " +
      "If time is provided, a keyframe is set at that time (in seconds). " +
      "Otherwise the value is set directly (no keyframes). " +
      "Booleans are accepted and converted to 1/0 as required by AE.",
    {
      compId: z
        .number()
        .int()
        .positive()
        .describe("Numeric ID of the target composition."),
      layerIndex: z
        .number()
        .int()
        .positive()
        .describe("1-based index of the layer."),
      effectIndex: z
        .number()
        .int()
        .positive()
        .describe("1-based index of the effect within the Effects group."),
      propertyName: z
        .string()
        .describe(
          "Exact name of the effect property to set (e.g. \"Blurriness\", \"Opacity\"). " +
            "Use get_effect_properties to discover valid names."
        ),
      value: z
        .union([
          z.number(),
          z.array(z.number()),
          z.boolean(),
          z.string(),
        ])
        .describe(
          "Value to set. Numbers and number arrays are passed directly. " +
            "Booleans become 1 (true) or 0 (false). Strings are for drop-down/enum properties."
        ),
      time: z
        .number()
        .optional()
        .describe(
          "If provided, sets the value as a keyframe at this time (seconds from comp start). " +
            "If omitted, sets the value without adding a keyframe."
        ),
    },
    async ({ compId, layerIndex, effectIndex, propertyName, value, time }) => {
      // Serialize value to ES3 literal
      let valueLit: string;
      if (typeof value === "boolean") {
        valueLit = value ? "1" : "0";
      } else if (typeof value === "number") {
        valueLit = String(value);
      } else if (Array.isArray(value)) {
        valueLit = "[" + (value as number[]).join(", ") + "]";
      } else {
        // string
        valueLit = '"' + escapeString(String(value)) + '"';
      }

      const setLine =
        time !== undefined
          ? "  prop.setValueAtTime(" + time + ", _val);\n"
          : "  prop.setValue(_val);\n";

      const inner =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        'var fxGroup = layer.property("Effects");\n' +
        "if (" + effectIndex + " < 1 || " + effectIndex + " > fxGroup.numProperties) {\n" +
        '  return { success: false, error: { message: "Effect index ' +
        effectIndex +
        ' out of range.", code: "EFFECT_NOT_FOUND" } };\n' +
        "}\n" +
        "var effect = fxGroup.property(" + effectIndex + ");\n" +
        'var prop = effect.property("' + escapeString(propertyName) + '");\n' +
        "if (!prop) {\n" +
        '  return { success: false, error: { message: "Property not found: ' +
        escapeString(propertyName) +
        '", code: "PROPERTY_NOT_FOUND" } };\n' +
        "}\n" +
        NORMALIZE_EFFECT_VALUE_FN +
        "var _val = _normalizeEffectValue(prop, " + valueLit + ");\n" +
        "if (_val && _val.__error) {\n" +
        '  return { success: false, error: { message: _val.__error, code: "INVALID_VALUE" } };\n' +
        "}\n" +
        setLine +
        "return {\n" +
        "  success: true,\n" +
        "  data: {\n" +
        "    effectName: effect.name,\n" +
        "    propertyName: prop.name,\n" +
        "    newValue: prop.value,\n" +
        "    hasKeyframes: (prop.numKeys > 0)\n" +
        "  }\n" +
        "};\n";

      const script = wrapWithReturn(
        wrapInUndoGroup(inner, "set_effect_property")
      );

      return runScript(script, "set_effect_property");
    }
  );

}

// ---------------------------------------------------------------------------
// Demoted helpers (no longer registered as MCP tools)
// ---------------------------------------------------------------------------

export async function listLayerEffectsHelper(params: { compId: number; layerIndex: number }) {
  const { compId, layerIndex } = params;
  const inner =
    findCompById("comp", compId) +
    findLayerByIndex("layer", "comp", layerIndex) +
    'var fxGroup = layer.property("Effects");\n' +
    "var effects = [];\n" +
    "for (var ei = 1; ei <= fxGroup.numProperties; ei++) {\n" +
    "  var eff = fxGroup.property(ei);\n" +
    "  effects.push({\n" +
    "    index: ei,\n" +
    "    name: eff.name,\n" +
    "    matchName: eff.matchName,\n" +
    "    enabled: eff.enabled,\n" +
    "    numProperties: eff.numProperties\n" +
    "  });\n" +
    "}\n" +
    "return {\n" +
    "  success: true,\n" +
    "  data: {\n" +
    "    layerName: layer.name,\n" +
    "    numEffects: fxGroup.numProperties,\n" +
    "    effects: effects\n" +
    "  }\n" +
    "};\n";

  const script = wrapWithReturn(inner);

  return runScript(script, "list_layer_effects");
}

export async function getEffectDocsHelper(params: { effectName: string }) {
  const { effectName } = params;
  // Convert friendly name to filename: lowercase, spaces → hyphens
  const fileName =
    effectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".md";

  const filePath = path.join(DOCS_EFFECTS_DIR, fileName);

  // Try to read the exact file
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      return textResult({
        success: true,
        data: {
          effectName,
          fileName,
          content,
        },
      });
    } catch (readErr) {
      return textResult({
        success: false,
        error: {
          message: "Error reading docs file: " + String(readErr),
          code: "READ_ERROR",
        },
      });
    }
  }

  // File not found — list available docs
  let availableDocs: string[] = [];
  try {
    if (fs.existsSync(DOCS_EFFECTS_DIR)) {
      availableDocs = fs
        .readdirSync(DOCS_EFFECTS_DIR)
        .filter((f) => f.endsWith(".md"))
        .map((f) => f.replace(/\.md$/, "").replace(/-/g, " "));
    }
  } catch (_listErr) {
    // ignore
  }

  return textResult({
    success: false,
    error: {
      message:
        'No documentation found for "' +
        effectName +
        '" (looked for: ' +
        fileName +
        ").",
      code: "DOC_NOT_FOUND",
    },
    data: {
      availableDocs,
      docsDir: DOCS_EFFECTS_DIR,
    },
  });
}

export async function listAvailableEffectsHelper(_params: Record<string, never> = {}) {
  const catalog = {
    "Blur & Sharpen": [
      { name: "Gaussian Blur",      matchName: "ADBE Gaussian Blur 2" },
      { name: "Directional Blur",   matchName: "ADBE Motion Blur" },
      { name: "Radial Blur",        matchName: "ADBE Radial Blur" },
      { name: "Fast Box Blur",      matchName: "ADBE Box Blur2" },
      { name: "Camera Lens Blur",   matchName: "ADBE Camera Lens Blur" },
      { name: "Sharpen",            matchName: "ADBE Sharpen" },
      { name: "Unsharp Mask",       matchName: "ADBE Unsharp Mask" },
    ],
    "Color Correction": [
      { name: "Levels",                       matchName: "ADBE Levels2" },
      { name: "Curves",                       matchName: "ADBE CurvesCustom" },
      { name: "Hue/Saturation",               matchName: "ADBE HUE SATURATION" },
      { name: "Tint",                         matchName: "ADBE Tint" },
      { name: "Tritone",                      matchName: "ADBE Tritone" },
      { name: "Color Balance",                matchName: "ADBE Color Balance" },
      { name: "Exposure",                     matchName: "ADBE Exposure2" },
      { name: "Vibrance",                     matchName: "ADBE Vibrance" },
    ],
    "Distort": [
      { name: "Turbulent Displace",  matchName: "ADBE Turbulent Displace" },
      { name: "Displacement Map",    matchName: "ADBE Displacement Map" },
      { name: "Bezier Warp",         matchName: "ADBE Bezier Warp" },
      { name: "Bulge",               matchName: "ADBE Bulge" },
      { name: "Magnify",             matchName: "ADBE Magnify" },
      { name: "Mesh Warp",           matchName: "ADBE Mesh Warp" },
      { name: "Corner Pin",          matchName: "ADBE Corner Pin" },
      { name: "Optics Compensation", matchName: "ADBE Optics Compensation" },
    ],
    "Generate": [
      { name: "Fill",             matchName: "ADBE Fill" },
      { name: "Gradient Ramp",    matchName: "ADBE Ramp" },
      { name: "Fractal Noise",    matchName: "ADBE Noise2" },
      { name: "Checkerboard",     matchName: "ADBE Checkerboard" },
      { name: "Circle",           matchName: "ADBE Circle" },
      { name: "Ellipse",          matchName: "ADBE Ellipse" },
      { name: "Stroke",           matchName: "ADBE Stroke" },
    ],
    "Stylize": [
      { name: "Glow",         matchName: "ADBE Glo2" },
      { name: "Drop Shadow",  matchName: "ADBE Drop Shadow" },
      { name: "Emboss",       matchName: "ADBE Emboss" },
      { name: "Find Edges",   matchName: "ADBE Find Edges" },
      { name: "Mosaic",       matchName: "ADBE Mosaic" },
      { name: "Motion Tile",  matchName: "ADBE Motion Tile" },
      { name: "Posterize",    matchName: "ADBE Posterize" },
    ],
    "Transition": [
      { name: "Linear Wipe",      matchName: "ADBE Linear Wipe" },
      { name: "Radial Wipe",      matchName: "ADBE Radial Wipe" },
      { name: "Block Dissolve",   matchName: "ADBE Block Dissolve" },
      { name: "Card Wipe",        matchName: "ADBE Card Wipe" },
      { name: "Venetian Blinds",  matchName: "ADBE Venetian Blinds" },
    ],
    "Perspective": [
      { name: "3D Glasses",    matchName: "ADBE 3D Glasses" },
      { name: "Bevel Alpha",   matchName: "ADBE Bevel Alpha" },
      { name: "Bevel Edges",   matchName: "ADBE Bevel Edges" },
      { name: "Drop Shadow",   matchName: "ADBE Drop Shadow" },
    ],
    "Matte": [
      { name: "Simple Choker",      matchName: "ADBE Simple Choker" },
      { name: "Matte Choker",       matchName: "ADBE Matte Choker" },
      { name: "Refine Hard Matte",  matchName: "ADBE Refine Hard Matte" },
      { name: "Refine Soft Matte",  matchName: "ADBE Refine Soft Matte" },
    ],
    "Channel": [
      { name: "Set Channels",        matchName: "ADBE Set Channels" },
      { name: "Shift Channels",      matchName: "ADBE Shift Channels" },
      { name: "Minimax",             matchName: "ADBE Minimax" },
      { name: "Remove Color Matting", matchName: "ADBE Remove Color Matting" },
    ],
  };

  return textResult({
    success: true,
    data: {
      catalog,
      tip: 'Use the matchName with apply_effect\'s effectMatchName parameter. ' +
           'Use get_effect_docs to read detailed documentation for a specific effect.',
    },
  });
}
