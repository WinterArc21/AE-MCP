/**
 * tools/layer-settings.ts
 *
 * Layer settings and quality tools for After Effects.
 *
 * Registers:
 *   - set_motion_blur     Enable/disable motion blur on a layer and/or comp-level switch
 *   - set_layer_timing    Set layer in/out points, start time, and time stretch
 *   - set_layer_flags     Set boolean layer flags (shy, solo, locked, guide, collapse, frame blend)
 *   - set_layer_quality   Set layer render quality and sampling (Best/Draft/Wireframe, Bilinear/Bicubic)
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
// registerLayerSettingsTools
// ---------------------------------------------------------------------------

export function registerLayerSettingsTools(server: McpServer): void {
  // ─── set_layer_timing ────────────────────────────────────────────────────────
  server.tool(
    "set_layer_timing",
    "Set the timing properties of a layer: in-point, out-point, start time, and/or time stretch. " +
      "All parameters are optional — only the ones provided will be changed. " +
      "inPoint: when the layer becomes visible in the comp timeline (seconds from comp start). " +
      "outPoint: when the layer disappears from the timeline (must be > inPoint). " +
      "startTime: offsets when the layer's own content starts — positive = delays the content, " +
      "  negative = starts the content before the layer's in-point (useful for video trims). " +
      "stretch: time stretch percentage 1-1000; 100 = normal speed, 200 = half speed (slow motion), " +
      "  50 = double speed (fast motion). Stretch affects duration and the speed of all keyframes. " +
      "Example: to trim a layer to only seconds 2-5 of a 10-second comp, " +
      "  set inPoint=2, outPoint=5.",
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
      inPoint: z
        .number()
        .optional()
        .describe("Layer in-point in seconds (when the layer starts in the timeline)"),
      outPoint: z
        .number()
        .optional()
        .describe("Layer out-point in seconds (when the layer ends in the timeline)"),
      startTime: z
        .number()
        .optional()
        .describe("Layer start time offset in seconds (offsets the content clock, useful for footage trims)"),
      stretch: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .describe("Time stretch percentage: 100 = normal, 200 = half speed, 50 = double speed"),
    },
    async ({ compId, layerIndex, inPoint, outPoint, startTime, stretch }) => {
      let setLines = "";
      // Note: stretch must be set BEFORE inPoint/outPoint in AE or the in/out points rescale
      if (stretch   !== undefined) setLines += "layer.stretch = " + stretch + ";\n";
      if (inPoint   !== undefined) setLines += "layer.inPoint = " + inPoint + ";\n";
      if (outPoint  !== undefined) setLines += "layer.outPoint = " + outPoint + ";\n";
      if (startTime !== undefined) setLines += "layer.startTime = " + startTime + ";\n";

      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        setLines +
        "return { success: true, data: { layerIndex: " + layerIndex + ", layerName: layer.name, inPoint: layer.inPoint, outPoint: layer.outPoint, startTime: layer.startTime, stretch: layer.stretch } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "set_layer_timing"));

      try {
        return runScript(script, "set_layer_timing");
      } catch (err) {
        return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
      }
    }
  );

  // ─── set_layer_quality ────────────────────────────────────────────────────────
  server.tool(
    "set_layer_quality",
    "Set the render quality and sampling method for a layer. " +
      "quality controls the overall render quality for this layer: " +
      "'Best' = full quality with anti-aliasing (default, used for final renders); " +
      "'Draft' = faster preview quality, no anti-aliasing (good for complex scenes during work-in-progress); " +
      "'Wireframe' = renders only layer outlines, fastest possible (useful for very complex 3D scenes). " +
      "samplingQuality controls how AE resizes and scales the layer: " +
      "'Bilinear' = standard interpolation (good for most cases, default); " +
      "'Bicubic' = higher quality scaling with better edge preservation " +
      "  (better for footage scaled down significantly, or for text layers scaled up). " +
      "Setting all layers to Draft during animation work significantly speeds up previews. " +
      "Always switch back to Best before final render.",
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
      quality: z
        .enum(["Best", "Draft", "Wireframe"])
        .optional()
        .describe("Render quality: Best (final quality), Draft (faster preview), Wireframe (outlines only, fastest)"),
      samplingQuality: z
        .enum(["Bilinear", "Bicubic"])
        .optional()
        .describe("Scaling interpolation: Bilinear (standard), Bicubic (higher quality for scaled footage — AE CC 2014+)"),
    },
    async ({ compId, layerIndex, quality, samplingQuality }) => {
      let setLines = "";

      if (quality !== undefined) {
        const qualityMap: Record<string, string> = {
          Best:      "LayerQuality.BEST",
          Draft:     "LayerQuality.DRAFT",
          Wireframe: "LayerQuality.WIREFRAME",
        };
        setLines += "layer.quality = " + qualityMap[quality] + ";\n";
      }

      if (samplingQuality !== undefined) {
        const samplingMap: Record<string, string> = {
          Bilinear: "LayerSamplingQuality.BILINEAR",
          Bicubic:  "LayerSamplingQuality.BICUBIC",
        };
        setLines += "layer.samplingQuality = " + samplingMap[samplingQuality] + ";\n";
      }

      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        setLines +
        "var _qName = \"Unknown\";\n" +
        "if (layer.quality === LayerQuality.BEST)      { _qName = \"Best\"; }\n" +
        "if (layer.quality === LayerQuality.DRAFT)     { _qName = \"Draft\"; }\n" +
        "if (layer.quality === LayerQuality.WIREFRAME) { _qName = \"Wireframe\"; }\n" +
        "return { success: true, data: { layerIndex: " + layerIndex + ", layerName: layer.name, quality: _qName } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "set_layer_quality"));

      try {
        return runScript(script, "set_layer_quality");
      } catch (err) {
        return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
      }
    }
  );
}

// ---------------------------------------------------------------------------
// Demoted helpers (formerly server.tool registrations)
// ---------------------------------------------------------------------------

export async function setMotionBlurHelper(params: {
  compId: number;
  enabled: boolean;
  layerIndex?: number;
}) {
  const { compId, enabled, layerIndex } = params;
  const boolVal = enabled ? "true" : "false";

  let body: string;

  if (layerIndex !== undefined) {
    body =
      findCompById("comp", compId) +
      findLayerByIndex("layer", "comp", layerIndex) +
      "comp.motionBlur = " + boolVal + ";\n" +
      "layer.motionBlur = " + boolVal + ";\n" +
      "return { success: true, data: { compMotionBlur: " + boolVal + ", layerIndex: " + layerIndex + ", layerName: layer.name, layerMotionBlur: " + boolVal + " } };\n";
  } else {
    body =
      findCompById("comp", compId) +
      "comp.motionBlur = " + boolVal + ";\n" +
      "return { success: true, data: { compMotionBlur: " + boolVal + " } };\n";
  }

  const script = wrapWithReturn(wrapInUndoGroup(body, "set_motion_blur"));

  try {
    return runScript(script, "set_motion_blur");
  } catch (err) {
    return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
  }
}

export async function setLayerFlagsHelper(params: {
  compId: number;
  layerIndex: number;
  shy?: boolean;
  solo?: boolean;
  locked?: boolean;
  guide?: boolean;
  collapseTransformation?: boolean;
  frameBlending?: boolean;
}) {
  const { compId, layerIndex, shy, solo, locked, guide, collapseTransformation, frameBlending } = params;
  let setLines = "";
  if (shy                     !== undefined) setLines += "layer.shy = " + (shy ? "true" : "false") + ";\n";
  if (solo                    !== undefined) setLines += "layer.solo = " + (solo ? "true" : "false") + ";\n";
  if (locked                  !== undefined) setLines += "layer.locked = " + (locked ? "true" : "false") + ";\n";
  if (guide                   !== undefined) setLines += "layer.guideLayer = " + (guide ? "true" : "false") + ";\n";
  if (collapseTransformation  !== undefined) setLines += "layer.collapseTransformation = " + (collapseTransformation ? "true" : "false") + ";\n";
  if (frameBlending           !== undefined) {
    // frameBlendingType: FRAME_MIX or PIXEL_MOTION; setting enabled just sets it to FRAME_MIX by default
    if (frameBlending) {
      setLines += "layer.frameBlendingType = FrameBlendingType.FRAME_MIX;\n";
    } else {
      setLines += "layer.frameBlendingType = FrameBlendingType.NO_FRAME_BLEND;\n";
    }
  }

  const body =
    findCompById("comp", compId) +
    findLayerByIndex("layer", "comp", layerIndex) +
    setLines +
    "return { success: true, data: { layerIndex: " + layerIndex + ", layerName: layer.name, shy: layer.shy, solo: layer.solo, locked: layer.locked } };\n";

  const script = wrapWithReturn(wrapInUndoGroup(body, "set_layer_flags"));

  try {
    return runScript(script, "set_layer_flags");
  } catch (err) {
    return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
  }
}
