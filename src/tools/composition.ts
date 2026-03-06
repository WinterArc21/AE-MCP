/**
 * tools/composition.ts
 *
 * MCP tool registrations for After Effects composition management.
 *
 * Tools:
 *   - create_composition       : creates a new comp with given settings
 *   - get_composition          : returns detailed comp info by id
 *   - list_compositions        : lists all comps in the project
 *   - duplicate_composition    : duplicates a comp, optionally renames it
 *   - set_composition_settings : updates width/height/duration/fps/bgColor/name
 *   - list_fonts              : query installed fonts by family/PostScript name
 *   - set_work_area           : set work area start and duration
 *   - set_comp_renderer       : set the rendering plugin for a composition
 *   - set_motion_blur_settings: configure motion blur settings
 *
 * All ExtendScript is ES3-compatible (var only, no arrow functions,
 * no template literals, string concatenation only).
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
 * ES3 object-literal string that serialises a CompItem variable `v`.
 */
function compData(v: string): string {
  return (
    "{\n" +
    "  id: " + v + ".id,\n" +
    "  name: " + v + ".name,\n" +
    "  width: " + v + ".width,\n" +
    "  height: " + v + ".height,\n" +
    "  duration: " + v + ".duration,\n" +
    "  frameRate: " + v + ".frameRate,\n" +
    "  numLayers: " + v + ".numLayers,\n" +
    "  bgColor: [" + v + ".bgColor[0], " + v + ".bgColor[1], " + v + ".bgColor[2]],\n" +
    "  pixelAspect: " + v + ".pixelAspect,\n" +
    "  workAreaStart: " + v + ".workAreaStart,\n" +
    "  workAreaDuration: " + v + ".workAreaDuration\n" +
    "}"
  );
}

// ---------------------------------------------------------------------------
// registerCompositionTools
// ---------------------------------------------------------------------------

export function registerCompositionTools(server: McpServer): void {

  // ── create_composition ────────────────────────────────────────────────

  server.tool(
    "create_composition",
    "Creates a new composition in the current After Effects project. " +
      "Returns the new composition id — use this id in all subsequent " +
      "layer and composition tools. " +
      "A project must already be open (use create_project or open_project).",
    {
      name: z
        .string()
        .describe('Name of the new composition (e.g. "Main Comp").'),
      width: z
        .number()
        .int()
        .positive()
        .describe("Width in pixels (e.g. 1920)."),
      height: z
        .number()
        .int()
        .positive()
        .describe("Height in pixels (e.g. 1080)."),
      duration: z
        .number()
        .positive()
        .describe("Duration in seconds (e.g. 10.0)."),
      frameRate: z
        .number()
        .positive()
        .describe(
          "Frames per second. Common values: 23.976, 24, 25, 29.97, 30, 60."
        ),
      bgColor: z
        .array(z.number().min(0).max(1))
        .length(3)
        .optional()
        .describe(
          "Background color [R, G, B] with each channel in the 0-1 range " +
            "(NOT 0-255). Default is black [0, 0, 0]."
        ),
    },
    async ({ name, width, height, duration, frameRate, bgColor }) => {
      const safeName = escapeString(name);
      const bgLiteral = bgColor ? colorLiteral(bgColor) : "[0, 0, 0]";

      const script = wrapWithReturn(
        "if (!app.project) {\n" +
        '  throw new Error("No project is open.");\n' +
        "}\n" +
        'app.beginUndoGroup("create_composition");\n' +
        "var __r;\n" +
        "try {\n" +
        '  var comp = app.project.items.addComp("' + safeName + '", ' +
              width + ", " + height + ", 1.0, " + duration + ", " + frameRate + ");\n" +
        "  comp.bgColor = " + bgLiteral + ";\n" +
        "  __r = { success: true, data: " + compData("comp") + " };\n" +
        "} finally {\n" +
        "  app.endUndoGroup();\n" +
        "}\n" +
        "return __r;\n"
      );
      return run(script, "create_composition");
    }
  );

  // ── get_composition ─────────────────────────────────────────────────

  server.tool(
    "get_composition",
    "Returns detailed information about one composition: dimensions, " +
      "duration, frame rate, background color (0-1 range per channel), " +
      "pixel aspect ratio, work area boundaries, and layer count. " +
      "Use list_compositions to discover composition ids.",
    {
      compId: z
        .number()
        .int()
        .positive()
        .describe(
          "Numeric id of the composition. " +
            "Obtained from create_composition or list_compositions."
        ),
    },
    async ({ compId }) => {
      const script = wrapWithReturn(
        findCompById("comp", compId) +
          "return { success: true, data: " + compData("comp") + " };\n"
      );
      return run(script, "get_composition");
    }
  );

  // ── list_compositions ─────────────────────────────────────────────────

  server.tool(
    "list_compositions",
    "Lists every composition in the current project in project-panel order. " +
      "Returns an array with each comp's id, name, width, height, duration " +
      "in seconds, frame rate, and layer count. " +
      "The id is the stable numeric identifier to pass to other tools.",
    {},
    async () => {
      const script = wrapWithReturn(
        "if (!app.project) {\n" +
        '  throw new Error("No project is open.");\n' +
        "}\n" +
        "var comps = [];\n" +
        "for (var i = 1; i <= app.project.numItems; i++) {\n" +
        "  var item = app.project.item(i);\n" +
        "  if (item instanceof CompItem) {\n" +
        "    comps.push({\n" +
        "      id: item.id,\n" +
        "      name: item.name,\n" +
        "      width: item.width,\n" +
        "      height: item.height,\n" +
        "      duration: item.duration,\n" +
        "      frameRate: item.frameRate,\n" +
        "      numLayers: item.numLayers\n" +
        "    });\n" +
        "  }\n" +
        "}\n" +
        "return { success: true, data: { compositions: comps } };\n"
      );
      return run(script, "list_compositions");
    }
  );

  // ── duplicate_composition ───────────────────────────────────────────────

  server.tool(
    "duplicate_composition",
    "Duplicates an existing composition including all its layers. " +
      "The duplicate is placed in the project panel. " +
      "Optionally provide 'newName' to rename the duplicate. " +
      "Returns the duplicate's id and full settings.",
    {
      compId: z
        .number()
        .int()
        .positive()
        .describe("Numeric id of the composition to duplicate."),
      newName: z
        .string()
        .optional()
        .describe(
          'New name for the duplicate. If omitted AE auto-names it (e.g. "My Comp 2").'
        ),
    },
    async ({ compId, newName }) => {
      const renameBlock =
        newName !== undefined
          ? '  dup.name = "' + escapeString(newName) + '";\n'
          : "";

      const script = wrapWithReturn(
        'app.beginUndoGroup("duplicate_composition");\n' +
        "var __r;\n" +
        "try {\n" +
        "  " + findCompById("comp", compId).split("\n").join("\n  ") +
        "  var dup = comp.duplicate();\n" +
        renameBlock +
        "  __r = { success: true, data: " + compData("dup") + " };\n" +
        "} finally {\n" +
        "  app.endUndoGroup();\n" +
        "}\n" +
        "return __r;\n"
      );
      return run(script, "duplicate_composition");
    }
  );

  // ── set_composition_settings ─────────────────────────────────────────────

  server.tool(
    "set_composition_settings",
    "Updates one or more settings on an existing composition in-place. " +
      "All parameters except compId are optional — only provided fields " +
      "are changed. " +
      "Returns the full updated composition settings after the change.",
    {
      compId: z
        .number()
        .int()
        .positive()
        .describe("Numeric id of the composition to modify."),
      name: z
        .string()
        .optional()
        .describe("New name for the composition."),
      width: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("New width in pixels."),
      height: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("New height in pixels."),
      duration: z
        .number()
        .positive()
        .optional()
        .describe("New duration in seconds."),
      frameRate: z
        .number()
        .positive()
        .optional()
        .describe("New frame rate in frames per second."),
      bgColor: z
        .array(z.number().min(0).max(1))
        .length(3)
        .optional()
        .describe(
          "New background color [R, G, B] in the 0-1 range (NOT 0-255)."
        ),
    },
    async ({ compId, name, width, height, duration, frameRate, bgColor }) => {
      const lines: string[] = [];
      if (name !== undefined) {
        lines.push('  comp.name = "' + escapeString(name) + '";\n');
      }
      if (width !== undefined) { lines.push("  comp.width = " + width + ";\n"); }
      if (height !== undefined) { lines.push("  comp.height = " + height + ";\n"); }
      if (duration !== undefined) { lines.push("  comp.duration = " + duration + ";\n"); }
      if (frameRate !== undefined) { lines.push("  comp.frameRate = " + frameRate + ";\n"); }
      if (bgColor !== undefined) {
        lines.push("  comp.bgColor = " + colorLiteral(bgColor) + ";\n");
      }

      const script = wrapWithReturn(
        'app.beginUndoGroup("set_composition_settings");\n' +
        "var __r;\n" +
        "try {\n" +
        "  " + findCompById("comp", compId).split("\n").join("\n  ") +
        lines.join("") +
        "  __r = { success: true, data: " + compData("comp") + " };\n" +
        "} finally {\n" +
        "  app.endUndoGroup();\n" +
        "}\n" +
        "return __r;\n"
      );
      return run(script, "set_composition_settings");
    }
  );

  // ── list_fonts ──────────────────────────────────────────────────────────

  server.tool(
    "list_fonts",
    "List all fonts installed and available to After Effects. " +
      "Returns PostScript name (use this for font= parameter), family, style, and full name. " +
      "WARNING: Always provide a query to filter results — calling without a query can return " +
      "1000+ fonts and flood the context window. " +
      "Use this before setting fonts on text layers to verify the exact PostScript name. " +
      "Example: list_fonts(query='montserrat') → find all Montserrat weights.",
    {
      query: z
        .string()
        .optional()
        .describe(
          "Filter fonts by family or PostScript name (case-insensitive). " +
            "E.g. 'montserrat' returns all Montserrat weights. " +
            "STRONGLY RECOMMENDED — omitting returns all installed fonts."
        ),
      limit: z
        .number()
        .int()
        .positive()
        .default(50)
        .describe(
          "Maximum number of fonts to return (default: 50). " +
            "Acts as a safety net against flooding the context window."
        ),
    },
    async ({ query, limit }) => {
      const filterExpr = query
        ? 'var _lfQuery = "' + escapeString(query.toLowerCase()) + '";\n'
        : 'var _lfQuery = "";\n';

      const script = wrapWithReturn(
        "var _lfFonts = app.fonts;\n" +
          "var _lfResults = [];\n" +
          "var _lfTotal = 0;\n" +
          filterExpr +
          "for (var _lfi = 0; _lfi < _lfFonts.length; _lfi++) {\n" +
          "  var _lfF = _lfFonts[_lfi];\n" +
          "  var _lfPsName = _lfF.postScriptName;\n" +
          "  var _lfFamily = _lfF.family;\n" +
          "  var _lfStyle = _lfF.style;\n" +
          "  var _lfFullName = _lfF.fullName;\n" +
          '  if (_lfQuery !== "") {\n' +
          "    var _lfLower = (_lfPsName + \" \" + _lfFamily + \" \" + _lfFullName).toLowerCase();\n" +
          "    if (_lfLower.indexOf(_lfQuery) === -1) { continue; }\n" +
          "  }\n" +
          "  _lfTotal++;\n" +
          "  if (_lfResults.length < " + limit + ") {\n" +
          "    _lfResults.push({\n" +
          "      postScriptName: _lfPsName,\n" +
          "      family: _lfFamily,\n" +
          "      style: _lfStyle,\n" +
          "      fullName: _lfFullName\n" +
          "    });\n" +
          "  }\n" +
          "}\n" +
          "return { success: true, data: {\n" +
          "  fonts: _lfResults,\n" +
          "  total: _lfTotal,\n" +
          "  truncated: (_lfTotal > " + limit + ")\n" +
          "} };\n"
      );
      return run(script, "list_fonts");
    }
  );

  // ── set_work_area ───────────────────────────────────────────────────────

  server.tool(
    "set_work_area",
    "Set the work area start and duration on a composition. " +
      "The work area determines the region that is rendered and previewed.",
    {
      compId: z
        .number()
        .int()
        .positive()
        .describe("Numeric id of the composition."),
      start: z
        .number()
        .describe("Work area start time in seconds."),
      duration: z
        .number()
        .positive()
        .describe("Work area duration in seconds."),
    },
    async ({ compId, start, duration }) => {
      const script = wrapWithReturn(
        'app.beginUndoGroup("set_work_area");\n' +
        "var __r;\n" +
        "try {\n" +
        "  " + findCompById("comp", compId).split("\n").join("\n  ") +
        "  if (" + start + " < 0 || " + start + " > comp.duration) {\n" +
        '    __r = { success: false, error: { message: "Work area start must be between 0 and the composition duration.", code: "INVALID_PARAMS" } };\n' +
        "  } else if (" + duration + " <= 0 || (" + start + " + " + duration + ") > comp.duration) {\n" +
        '    __r = { success: false, error: { message: "Work area must fit within the composition duration.", code: "INVALID_PARAMS" } };\n' +
        "  } else {\n" +
        "    comp.workAreaStart = " + start + ";\n" +
        "    comp.workAreaDuration = " + duration + ";\n" +
        "    __r = { success: true, data: { compId: comp.id, compName: comp.name, workAreaStart: comp.workAreaStart, workAreaDuration: comp.workAreaDuration } };\n" +
        "  }\n" +
        "} finally {\n" +
        "  app.endUndoGroup();\n" +
        "}\n" +
        "return __r;\n"
      );
      return run(script, "set_work_area");
    }
  );

  // ── set_comp_renderer ──────────────────────────────────────────────────

  server.tool(
    "set_comp_renderer",
    "Set the rendering plugin for a composition (e.g., 'ADBE Advanced 3d' for Cinema 4D renderer, " +
      "'ADBE Ernst' for Classic 3D). Use get_project_item_info to see available renderers.",
    {
      compId: z
        .number()
        .int()
        .positive()
        .describe("Numeric id of the composition."),
      renderer: z
        .string()
        .describe("Renderer plugin match name (e.g. 'ADBE Advanced 3d', 'ADBE Ernst')."),
    },
    async ({ compId, renderer }) => {
      const safeRenderer = escapeString(renderer);

      const script = wrapWithReturn(
        'app.beginUndoGroup("set_comp_renderer");\n' +
        "var __r;\n" +
        "try {\n" +
        "  " + findCompById("comp", compId).split("\n").join("\n  ") +
        "  var _renderers = comp.renderers;\n" +
        "  var _found = false;\n" +
        "  for (var _ri = 0; _ri < _renderers.length; _ri++) {\n" +
        "    if (_renderers[_ri] === \"" + safeRenderer + "\") { _found = true; break; }\n" +
        "  }\n" +
        "  if (!_found) {\n" +
        "    var _rList = [];\n" +
        "    for (var _rj = 0; _rj < _renderers.length; _rj++) { _rList.push(_renderers[_rj]); }\n" +
        "    __r = { success: false, error: { message: \"Renderer \\\"" + safeRenderer + "\\\" not available. Available: \" + _rList.join(\", \"), code: \"INVALID_PARAMS\" } };\n" +
        "  } else {\n" +
        "    comp.renderer = \"" + safeRenderer + "\";\n" +
        "    var _availArr = [];\n" +
        "    for (var _rk = 0; _rk < comp.renderers.length; _rk++) { _availArr.push(comp.renderers[_rk]); }\n" +
        "    __r = { success: true, data: { compId: comp.id, compName: comp.name, renderer: comp.renderer, availableRenderers: _availArr } };\n" +
        "  }\n" +
        "} finally {\n" +
        "  app.endUndoGroup();\n" +
        "}\n" +
        "return __r;\n"
      );
      return run(script, "set_comp_renderer");
    }
  );

  // ── set_motion_blur_settings ────────────────────────────────────────────

  server.tool(
    "set_motion_blur_settings",
    "Configure motion blur settings on a composition. " +
      "Enable motion blur and set shutter angle/phase for realistic motion blur on animated layers.",
    {
      compId: z
        .number()
        .int()
        .positive()
        .describe("Numeric id of the composition."),
      enabled: z
        .boolean()
        .optional()
        .describe("Enable or disable motion blur on the composition."),
      shutterAngle: z
        .number()
        .min(0)
        .max(720)
        .optional()
        .describe("Shutter angle in degrees (0-720). 180 is standard film motion blur."),
      shutterPhase: z
        .number()
        .min(-360)
        .max(360)
        .optional()
        .describe("Shutter phase in degrees (-360 to 360). Controls when the shutter opens relative to a frame."),
      samplesPerFrame: z
        .number()
        .optional()
        .describe("Number of motion blur samples per frame."),
      adaptiveSampleLimit: z
        .number()
        .optional()
        .describe("Maximum number of adaptive samples per frame."),
    },
    async ({ compId, enabled, shutterAngle, shutterPhase, samplesPerFrame, adaptiveSampleLimit }) => {
      let setLines = "";
      if (enabled !== undefined) {
        setLines += "  comp.motionBlur = " + (enabled ? "true" : "false") + ";\n";
      }
      if (shutterAngle !== undefined) {
        setLines += "  comp.shutterAngle = " + shutterAngle + ";\n";
      }
      if (shutterPhase !== undefined) {
        setLines += "  comp.shutterPhase = " + shutterPhase + ";\n";
      }
      if (samplesPerFrame !== undefined) {
        setLines += "  comp.motionBlurSamplesPerFrame = " + samplesPerFrame + ";\n";
      }
      if (adaptiveSampleLimit !== undefined) {
        setLines += "  comp.motionBlurAdaptiveSampleLimit = " + adaptiveSampleLimit + ";\n";
      }

      const script = wrapWithReturn(
        'app.beginUndoGroup("set_motion_blur_settings");\n' +
        "var __r;\n" +
        "try {\n" +
        "  " + findCompById("comp", compId).split("\n").join("\n  ") +
        setLines +
        "  __r = { success: true, data: {\n" +
        "    compId: comp.id,\n" +
        "    compName: comp.name,\n" +
        "    motionBlur: comp.motionBlur,\n" +
        "    shutterAngle: comp.shutterAngle,\n" +
        "    shutterPhase: comp.shutterPhase,\n" +
        "    motionBlurSamplesPerFrame: comp.motionBlurSamplesPerFrame,\n" +
        "    motionBlurAdaptiveSampleLimit: comp.motionBlurAdaptiveSampleLimit\n" +
        "  } };\n" +
        "} finally {\n" +
        "  app.endUndoGroup();\n" +
        "}\n" +
        "return __r;\n"
      );
      return run(script, "set_motion_blur_settings");
    }
  );
}
