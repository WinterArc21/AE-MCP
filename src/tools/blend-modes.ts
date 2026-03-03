/**
 * tools/blend-modes.ts
 *
 * Blending mode tools for After Effects layers.
 *
 * Registers:
 *   - set_blend_mode   Set a layer's blending mode (Normal, Multiply, Screen, etc.)
 *   - get_blend_mode   Get a layer's current blending mode name
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

/**
 * Map a friendly blend mode name to the ExtendScript BlendingMode enum value.
 * AE uses `BlendingMode.XXXX` constants in ExtendScript.
 */
function blendModeToAE(mode: string): string {
  const map: Record<string, string> = {
    Normal:             "NORMAL",
    Add:                "ADD",
    Multiply:           "MULTIPLY",
    Screen:             "SCREEN",
    Overlay:            "OVERLAY",
    SoftLight:          "SOFT_LIGHT",
    HardLight:          "HARD_LIGHT",
    ColorDodge:         "COLOR_DODGE",
    ColorBurn:          "COLOR_BURN",
    Darken:             "DARKEN",
    Lighten:            "LIGHTEN",
    Difference:         "DIFFERENCE",
    Exclusion:          "EXCLUSION",
    Hue:                "HUE",
    Saturation:         "SATURATION",
    Color:              "COLOR",
    Luminosity:         "LUMINOSITY",
    SilhouetteAlpha:    "SILHOUETE_ALPHA",   // AE enum spelling is "SILHOUETE"
    SilhouetteLuma:     "SILHOUETE_LUMA",
    StencilAlpha:       "STENCIL_ALPHA",
    StencilLuma:        "STENCIL_LUMA",
    AlphaAdd:           "ALPHA_ADD",
    LuminescencePremul: "LUMINESCENT_PREMUL",
  };
  return "BlendingMode." + (map[mode] ?? "NORMAL");
}

/**
 * Build an ExtendScript snippet that converts the numeric BlendingMode constant
 * on a layer back to a readable name string for get_blend_mode.
 */
function buildBlendModeNameLookup(layerVar: string): string {
  // Build a reverse-lookup via an if/else chain (ES3 — no Object.keys or Map).
  const entries: Array<[string, string]> = [
    ["BlendingMode.NORMAL",           "Normal"],
    ["BlendingMode.ADD",              "Add"],
    ["BlendingMode.MULTIPLY",         "Multiply"],
    ["BlendingMode.SCREEN",           "Screen"],
    ["BlendingMode.OVERLAY",          "Overlay"],
    ["BlendingMode.SOFT_LIGHT",       "SoftLight"],
    ["BlendingMode.HARD_LIGHT",       "HardLight"],
    ["BlendingMode.COLOR_DODGE",      "ColorDodge"],
    ["BlendingMode.COLOR_BURN",       "ColorBurn"],
    ["BlendingMode.DARKEN",           "Darken"],
    ["BlendingMode.LIGHTEN",          "Lighten"],
    ["BlendingMode.DIFFERENCE",       "Difference"],
    ["BlendingMode.EXCLUSION",        "Exclusion"],
    ["BlendingMode.HUE",              "Hue"],
    ["BlendingMode.SATURATION",       "Saturation"],
    ["BlendingMode.COLOR",            "Color"],
    ["BlendingMode.LUMINOSITY",       "Luminosity"],
    ["BlendingMode.SILHOUETE_ALPHA",  "SilhouetteAlpha"],
    ["BlendingMode.SILHOUETE_LUMA",   "SilhouetteLuma"],
    ["BlendingMode.STENCIL_ALPHA",    "StencilAlpha"],
    ["BlendingMode.STENCIL_LUMA",     "StencilLuma"],
    ["BlendingMode.ALPHA_ADD",        "AlphaAdd"],
    ["BlendingMode.LUMINESCENT_PREMUL","LuminescencePremul"],
  ];

  let code = "var _bm = " + layerVar + ".blendingMode;\n";
  code += "var _bmName = \"Unknown\";\n";
  for (const [aeConst, friendlyName] of entries) {
    code += "if (_bm === " + aeConst + ") { _bmName = \"" + friendlyName + "\"; }\n";
  }
  return code;
}

// ---------------------------------------------------------------------------
// Blend mode enum — all common AE blending modes
// ---------------------------------------------------------------------------

const blendModeEnum = z.enum([
  "Normal", "Add", "Multiply", "Screen", "Overlay",
  "SoftLight", "HardLight", "ColorDodge", "ColorBurn",
  "Darken", "Lighten", "Difference", "Exclusion",
  "Hue", "Saturation", "Color", "Luminosity",
  "SilhouetteAlpha", "SilhouetteLuma",
  "StencilAlpha", "StencilLuma",
  "AlphaAdd", "LuminescencePremul",
]);

// ---------------------------------------------------------------------------
// registerBlendModeTools
// ---------------------------------------------------------------------------

export function registerBlendModeTools(server: McpServer): void {

  // ─── set_blend_mode ───────────────────────────────────────────────────────
  server.tool(
    "set_blend_mode",
    "Set a layer's blending mode in After Effects. " +
      "Blending modes control how a layer interacts with layers beneath it — " +
      "the same as the Mode dropdown in the AE timeline. " +
      "Common choices: " +
      "'Normal' = standard compositing (default); " +
      "'Add' = brightens by adding color values, great for glows and fire; " +
      "'Multiply' = darkens, perfect for shadows and texture overlays; " +
      "'Screen' = lightens, good for light leaks and lens flares; " +
      "'Overlay' = increases contrast while preserving highlights/shadows; " +
      "'SoftLight' = gentle contrast boost; " +
      "'HardLight' = strong contrast, like a spotlight; " +
      "'Difference' = inverts colors where layers overlap, psychedelic effect; " +
      "'Luminosity' = applies luminance of layer, keeps hue/saturation of below; " +
      "'Color' = applies hue+saturation of layer, keeps luminosity of below. " +
      "Stencil/Silhouette modes cut holes in layers below them using alpha or luma. " +
      "The layer must not be locked. Changes are undoable.",
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
        .describe("1-based index of the target layer in the composition"),
      blendMode: blendModeEnum.describe(
        "Blending mode name. " +
        "Normal | Add | Multiply | Screen | Overlay | SoftLight | HardLight | " +
        "ColorDodge | ColorBurn | Darken | Lighten | Difference | Exclusion | " +
        "Hue | Saturation | Color | Luminosity | " +
        "SilhouetteAlpha | SilhouetteLuma | StencilAlpha | StencilLuma | " +
        "AlphaAdd | LuminescencePremul"
      ),
    },
    async ({ compId, layerIndex, blendMode }) => {
      const aeMode = blendModeToAE(blendMode);

      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        "layer.blendingMode = " + aeMode + ";\n" +
        "return { success: true, data: { layerIndex: " + layerIndex + ", blendMode: \"" + escapeString(blendMode) + "\", aeEnum: \"" + escapeString(aeMode) + "\" } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "set_blend_mode"));

      try {
        return runScript(script, "set_blend_mode");
      } catch (err) {
        return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
      }
    }
  );

  // ─── get_blend_mode ───────────────────────────────────────────────────────
  server.tool(
    "get_blend_mode",
    "Get the current blending mode of a layer. " +
      "Returns the friendly mode name (e.g. 'Screen', 'Multiply') that can be " +
      "passed directly back to set_blend_mode. " +
      "Useful for inspecting a comp before making changes, " +
      "or for verifying that a set_blend_mode call took effect.",
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
    },
    async ({ compId, layerIndex }) => {
      const lookup = buildBlendModeNameLookup("layer");

      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        lookup +
        "return { success: true, data: { layerIndex: " + layerIndex + ", layerName: layer.name, blendMode: _bmName } };\n";

      const script = wrapWithReturn(body);

      try {
        return runScript(script, "get_blend_mode");
      } catch (err) {
        return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
      }
    }
  );
}
