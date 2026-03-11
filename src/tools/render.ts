/**
 * tools/render.ts
 *
 * Render queue tools for After Effects.
 *
 * Registers:
 *   - add_to_render_queue       Add a composition to the render queue with output settings
 *   - get_render_status         Return the state of all items in the render queue
 *   - start_render              Render all QUEUED items (blocking until complete)
 *   - capture_frame             Capture a single PNG frame from a comp
 *   - capture_frame_sequence    Capture N evenly-spaced frames as a filmstrip
 *   - list_render_templates     List available render settings and output module templates
 *   - set_render_item_settings  Apply render settings template and time span
 *   - set_output_module_settings Apply output module template and set output path
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { bridge, RENDER_TIMEOUT } from "../bridge.js";
import {
  escapeString,
  wrapWithReturn,
  wrapInUndoGroup,
  findCompById,
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

async function runScriptWithTimeout(script: string, toolName: string, timeoutMs: number) {
  const result = await bridge.executeScriptWithTimeout(script, toolName, timeoutMs);
  return textResult(result);
}

// ---------------------------------------------------------------------------
// registerRenderTools
// ---------------------------------------------------------------------------

export function registerRenderTools(server: McpServer): void {
  // ─── add_to_render_queue ────────────────────────────────────────────────
  server.tool(
    "add_to_render_queue",
    "Add a composition to the After Effects render queue. " +
    "Specify the absolute output file path and desired format. " +
    "outputPath must be a full path on the machine running After Effects " +
    "(e.g. '/Users/username/Desktop/output.mp4' on macOS or " +
    "'C:\\\\Users\\\\username\\\\Desktop\\\\output.avi' on Windows). " +
    "The output directory must already exist. Include the file extension in the path. " +
    "Format options: " +
    "'mp4' = H.264 (best for sharing/web, smaller file); " +
    "'mov' = QuickTime/ProRes (better quality, larger file, preferred for editing); " +
    "'avi' = AVI lossless (highest quality, largest file, Windows-native). " +
    "After adding, call start_render to begin rendering.",
    {
      compId: z
        .number()
        .int()
        .positive()
        .describe("Numeric ID of the composition to render"),
      outputPath: z
        .string()
        .min(1)
        .describe(
          "Absolute output path including filename and extension " +
          "(e.g. '/Users/me/Desktop/final.mp4'). The directory must already exist."
        ),
      format: z
        .enum(["mp4", "mov", "avi"])
        .default("mp4")
        .describe(
          "'mp4' = H.264 (web/sharing); 'mov' = QuickTime/ProRes (editing); 'avi' = lossless"
        ),
    },
    async ({ compId, outputPath, format }) => {
      const templateMap: Record<string, string> = {
        mp4: "H.264 - Match Render Settings - 15 Mbps",
        mov: "Apple ProRes 422",
        avi: "Lossless",
      };
      const template = templateMap[format] ?? "Lossless";

      const body =
        findCompById("comp", compId) +
        "var _rqItem = app.project.renderQueue.items.add(comp);\n" +
        "var _om = _rqItem.outputModule(1);\n" +
        "try {\n" +
        '  _om.applyTemplate("' + escapeString(template) + '");\n' +
        "} catch (_tmplErr) {\n" +
        "  // Template unavailable — use default output module settings\n" +
        "}\n" +
        '_om.file = new File("' + escapeString(outputPath) + '");\n' +
        "return { success: true, data: {\n" +
        "  renderItemIndex: _rqItem.index,\n" +
        "  compName: comp.name,\n" +
        "  compId: comp.id,\n" +
        "  outputPath: " + JSON.stringify(outputPath) + ",\n" +
        "  format: " + JSON.stringify(format) + ",\n" +
        '  status: "queued"\n' +
        "} };\n";

      const script = wrapWithReturn(body);
      try {
        return runScript(script, "add_to_render_queue");
      } catch (err) {
        return { content: [{ type: "text", text: "Error: " + String(err) }], isError: true };
      }
    }
  );

  // ─── get_render_status ─────────────────────────────────────────────────
  server.tool(
    "get_render_status",
    "Get the current status of all items in the After Effects render queue. " +
    "Returns an array with each item's composition name, status, output path, and elapsed time. " +
    "Status values: 'QUEUED' = waiting; 'RENDERING' = active; 'DONE' = complete; " +
    "'ERR_STOPPED' = failed; 'USER_STOPPED' = cancelled; 'UNQUEUED' = skipped. " +
    "Call this after start_render to confirm results.",
    {},
    async () => {
      const body =
        "var _rq = app.project.renderQueue;\n" +
        "var _rqItems = [];\n" +
        "for (var _rqi = 1; _rqi <= _rq.numItems; _rqi++) {\n" +
        "  var _rqItem = _rq.item(_rqi);\n" +
        "  var _rqStatus = \"UNKNOWN\";\n" +
        "  if (_rqItem.status === RQItemStatus.QUEUED)        { _rqStatus = \"QUEUED\"; }\n" +
        "  else if (_rqItem.status === RQItemStatus.RENDERING)    { _rqStatus = \"RENDERING\"; }\n" +
        "  else if (_rqItem.status === RQItemStatus.DONE)         { _rqStatus = \"DONE\"; }\n" +
        "  else if (_rqItem.status === RQItemStatus.ERR_STOPPED)  { _rqStatus = \"ERR_STOPPED\"; }\n" +
        "  else if (_rqItem.status === RQItemStatus.USER_STOPPED) { _rqStatus = \"USER_STOPPED\"; }\n" +
        "  else if (_rqItem.status === RQItemStatus.UNQUEUED)     { _rqStatus = \"UNQUEUED\"; }\n" +
        "  var _rqOutputPath = \"\";\n" +
        "  try {\n" +
        "    _rqOutputPath = _rqItem.outputModule(1).file ? _rqItem.outputModule(1).file.fsName : \"\";\n" +
        "  } catch (_e) {}\n" +
        "  _rqItems.push({\n" +
        "    index: _rqItem.index,\n" +
        "    compName: _rqItem.comp ? _rqItem.comp.name : \"Unknown\",\n" +
        "    status: _rqStatus,\n" +
        "    outputPath: _rqOutputPath,\n" +
        "    elapsedSeconds: _rqItem.elapsedSeconds\n" +
        "  });\n" +
        "}\n" +
        "return { success: true, data: { numItems: _rq.numItems, rendering: _rq.rendering, items: _rqItems } };\n";

      const script = wrapWithReturn(body);
      try {
        return runScript(script, "get_render_status");
      } catch (err) {
        return { content: [{ type: "text", text: "Error: " + String(err) }], isError: true };
      }
    }
  );

  // ─── start_render ───────────────────────────────────────────────────────
  server.tool(
    "start_render",
    "Start rendering all QUEUED items in the After Effects render queue. " +
    "This call is BLOCKING — After Effects will be unresponsive during rendering. " +
    "Call add_to_render_queue first to queue at least one composition. " +
    "Returns a summary with items completed and any errors. " +
    "For error details, check the Render Queue panel in After Effects.",
    {},
    async () => {
      const body =
        "var _srRq = app.project.renderQueue;\n" +
        "var _srQueued = 0;\n" +
        "for (var _sri = 1; _sri <= _srRq.numItems; _sri++) {\n" +
        "  if (_srRq.item(_sri).status === RQItemStatus.QUEUED) { _srQueued++; }\n" +
        "}\n" +
        "if (_srQueued === 0) {\n" +
        '  return { success: false, error: { message: "No QUEUED items in the render queue. Use add_to_render_queue first.", code: "NO_QUEUE_ITEMS" } };\n' +
        "}\n" +
        "_srRq.render();\n" +
        "var _srDone = 0;\n" +
        "var _srErrors = 0;\n" +
        "for (var _srj = 1; _srj <= _srRq.numItems; _srj++) {\n" +
        "  var _srS = _srRq.item(_srj).status;\n" +
        "  if (_srS === RQItemStatus.DONE) { _srDone++; }\n" +
        "  else if (_srS === RQItemStatus.ERR_STOPPED || _srS === RQItemStatus.USER_STOPPED) { _srErrors++; }\n" +
        "}\n" +
        "return { success: true, data: {\n" +
        '  message: "Render complete",\n' +
        "  queuedAtStart: _srQueued,\n" +
        "  completed: _srDone,\n" +
        "  errors: _srErrors\n" +
        "} };\n";

      const script = wrapWithReturn(body);
      try {
        return runScriptWithTimeout(script, "start_render", RENDER_TIMEOUT);
      } catch (err) {
        return { content: [{ type: "text", text: "Error: " + String(err) }], isError: true };
      }
    }
  );

  // ─── capture_frame ──────────────────────────────────────────────────────
  server.tool(
    "capture_frame",
    "Capture a single PNG frame from a composition at a given time. " +
    "Returns the file path of the saved PNG image. Use this to visually verify " +
    "layouts, effects, colors, and animations during iterative scene building. " +
    "The comp is automatically opened in AE's viewer before capture — no manual " +
    "setup needed. The frame is rendered directly (not via the render queue) so " +
    "it is fast — typically 1-5 seconds. After capturing, use view_file on the " +
    "returned outputPath to see the frame. " +
    "Tip: capture at key moments (0s for first frame, midpoint for animations, " +
    "last frame for end state) to verify your work visually.",
    {
      compId: z
        .number()
        .int()
        .positive()
        .describe("Numeric ID of the composition to capture a frame from"),
      time: z
        .number()
        .min(0)
        .optional()
        .default(0)
        .describe(
          "Time in seconds at which to capture the frame (default: 0). " +
          "Clamped to [0, comp.duration]."
        ),
      outputPath: z
        .string()
        .min(1)
        .optional()
        .describe(
          "Absolute path for the output PNG file (e.g. 'C:\\\\Users\\\\me\\\\Desktop\\\\preview.png'). " +
          "If omitted, saves to the system temp directory with an auto-generated filename."
        ),
    },
    async ({ compId, time, outputPath }) => {
      // Build the output path: use provided path or auto-generate in temp dir
      let resolvedPath: string;
      if (outputPath) {
        resolvedPath = outputPath;
      } else {
        // Auto-generate in system temp directory
        const os = await import("os");
        const path = await import("path");
        const timestamp = Date.now();
        resolvedPath = path.join(
          os.tmpdir(),
          `ae_capture_${compId}_${time ?? 0}_${timestamp}.png`
        );
      }

      const body =
        findCompById("_cfComp", compId) +
        // Clamp time to valid range
        "var _cfTime = " + (time ?? 0) + ";\n" +
        "if (_cfTime < 0) _cfTime = 0;\n" +
        "if (_cfTime > _cfComp.duration) _cfTime = _cfComp.duration;\n" +
        // Create output file
        'var _cfFile = new File("' + escapeString(resolvedPath) + '");\n' +
        // Check if saveFrameToPng is available (AE CC 2014+)
        "if (typeof _cfComp.saveFrameToPng !== 'function') {\n" +
        '  return { success: false, error: { message: "saveFrameToPng is not available in this version of After Effects. Requires CC 2014 (v13.0) or later.", code: "UNSUPPORTED_AE_VERSION" } };\n' +
        "}\n" +
        // Open comp in viewer and set time so AE renders the correct frame
        "_cfComp.openInViewer();\n" +
        "_cfComp.time = _cfTime;\n" +
        "$.sleep(1000);\n" +
        // Retry loop: try up to 3 times with increasing delays
        "var _cfCaptured = false;\n" +
        "for (var _cfRetry = 0; _cfRetry < 3; _cfRetry++) {\n" +
        "  try {\n" +
        "    _cfComp.saveFrameToPng(_cfTime, _cfFile);\n" +
        "  } catch (_cfSaveErr) {}\n" +
        "  $.sleep(500 + _cfRetry * 500);\n" +
        "  if (_cfFile.exists) { _cfCaptured = true; break; }\n" +
        "}\n" +
        // Verify the file was created
        "if (!_cfCaptured) {\n" +
        '  return { success: false, error: { message: "PNG file was not created after 3 attempts. The frame capture may have failed. Ensure the composition is not mid-render and the viewer panel is visible.", code: "CAPTURE_FAILED" } };\n' +
        "}\n" +
        // Return result
        "return { success: true, data: {\n" +
        "  outputPath: _cfFile.fsName,\n" +
        "  compName: _cfComp.name,\n" +
        "  compId: _cfComp.id,\n" +
        "  time: _cfTime,\n" +
        "  width: _cfComp.width,\n" +
        "  height: _cfComp.height\n" +
        "} };\n";

      const script = wrapWithReturn(body);
      try {
        return runScriptWithTimeout(script, "capture_frame", RENDER_TIMEOUT);
      } catch (err) {
        return {
          content: [{ type: "text", text: "Error: " + String(err) }],
          isError: true,
        };
      }
    }
  );

  // ─── capture_frame_sequence ────────────────────────────────────────────────
  server.tool(
    "capture_frame_sequence",
    "Capture multiple PNG frames at evenly-spaced intervals across a composition " +
    "(or a time range). Returns an array of PNG file paths — like a filmstrip. " +
    "Use this to visually scrub through an animation without calling capture_frame " +
    "N times individually. The comp is automatically opened in the viewer. " +
    "Each frame takes ~1s to render; count=12 ≈ 12-15 seconds total. " +
    "After capturing, use view_file on each outputPath to review the sequence.",
    {
      compId: z
        .number()
        .int()
        .positive()
        .describe("Numeric ID of the composition to capture frames from"),
      count: z
        .number()
        .int()
        .min(2)
        .max(12)
        .describe("Number of frames to capture (2-12)"),
      startTime: z
        .number()
        .min(0)
        .optional()
        .describe("Start of the time range in seconds (default: 0)"),
      endTime: z
        .number()
        .min(0)
        .optional()
        .describe("End of the time range in seconds (default: comp.duration)"),
      outputDir: z
        .string()
        .optional()
        .describe(
          "Directory to save PNG files. If omitted, uses the system temp directory."
        ),
    },
    async ({ compId, count, startTime, endTime, outputDir }) => {
      // Resolve output directory
      let resolvedDir: string;
      if (outputDir) {
        resolvedDir = outputDir;
      } else {
        const os = await import("os");
        resolvedDir = os.tmpdir();
      }
      const timestamp = Date.now();
      const prefix = resolvedDir.replace(/\\/g, "/") + "/ae_seq_" + compId + "_" + timestamp + "_";

      const body =
        findCompById("_cfsComp", compId) +
        "_cfsComp.openInViewer();\n" +
        "$.sleep(1000);\n" +
        "var _cfsResults = [];\n" +
        "var _cfsStart = " + (startTime ?? 0) + ";\n" +
        "var _cfsEnd = " + (endTime !== undefined ? endTime : "_cfsComp.duration") + ";\n" +
        "if (_cfsEnd > _cfsComp.duration) _cfsEnd = _cfsComp.duration;\n" +
        "if (_cfsStart > _cfsEnd) _cfsStart = _cfsEnd;\n" +
        "var _cfsCount = " + count + ";\n" +
        "var _cfsInterval = (_cfsCount > 1) ? (_cfsEnd - _cfsStart) / (_cfsCount - 1) : 0;\n" +
        "for (var _cfsi = 0; _cfsi < _cfsCount; _cfsi++) {\n" +
        "  var _cfsT = _cfsStart + (_cfsInterval * _cfsi);\n" +
        "  if (_cfsT > _cfsComp.duration) _cfsT = _cfsComp.duration;\n" +
        '  var _cfsFile = new File("' + escapeString(prefix) + '" + _cfsi + ".png");\n' +
        "  var _cfsCaptured = false;\n" +
        // Set comp time so AE renders the correct frame, then retry up to 2 times
        "  _cfsComp.time = _cfsT;\n" +
        "  for (var _cfsRetry = 0; _cfsRetry < 2; _cfsRetry++) {\n" +
        "    try {\n" +
        "      _cfsComp.saveFrameToPng(_cfsT, _cfsFile);\n" +
        "    } catch (_cfsErr) {}\n" +
        "    $.sleep(800 + _cfsRetry * 400);\n" +
        "    if (_cfsFile.exists) { _cfsCaptured = true; break; }\n" +
        "  }\n" +
        "  _cfsResults.push({\n" +
        "    time: Math.round(_cfsT * 1000) / 1000,\n" +
        "    outputPath: _cfsFile.fsName,\n" +
        "    captured: _cfsCaptured\n" +
        "  });\n" +
        "}\n" +
        "return { success: true, data: {\n" +
        "  compName: _cfsComp.name,\n" +
        "  compId: _cfsComp.id,\n" +
        "  frames: _cfsResults\n" +
        "} };\n";

      const script = wrapWithReturn(body);
      try {
        return runScriptWithTimeout(script, "capture_frame_sequence", RENDER_TIMEOUT);
      } catch (err) {
        return {
          content: [{ type: "text", text: "Error: " + String(err) }],
          isError: true,
        };
      }
    }
  );
}

// ---------------------------------------------------------------------------
// Demoted helpers (formerly server.tool registrations)
// ---------------------------------------------------------------------------

export async function listRenderTemplatesHelper(_params: Record<string, never> = {}) {
  const body =
    "var _rq = app.project.renderQueue;\n" +
    "var _rqItem = null;\n" +
    "var _tempAdded = false;\n" +
    "var __result = null;\n" +
    "try {\n" +
    "  if (_rq.numItems > 0) {\n" +
    "    _rqItem = _rq.item(1);\n" +
    "  } else {\n" +
    "    var _tmpComp = null;\n" +
    "    for (var _ti = 1; _ti <= app.project.numItems; _ti++) {\n" +
    "      if (app.project.item(_ti) instanceof CompItem) {\n" +
    "        _tmpComp = app.project.item(_ti);\n" +
    "        break;\n" +
    "      }\n" +
    "    }\n" +
    "    if (!_tmpComp) {\n" +
    "      __result = { success: false, error: { message: \"No compositions in project to enumerate templates.\", code: \"NO_COMPS\" } };\n" +
    "    } else {\n" +
    "      _rqItem = _rq.items.add(_tmpComp);\n" +
    "      _tempAdded = true;\n" +
    "    }\n" +
    "  }\n" +
    "  if (!__result) {\n" +
    "    var _rsTemplates = _rqItem.templates;\n" +
    "    var _omTemplates = _rqItem.outputModule(1).templates;\n" +
    "    var _rsArr = [];\n" +
    "    for (var _rsi = 0; _rsi < _rsTemplates.length; _rsi++) {\n" +
    "      _rsArr.push(_rsTemplates[_rsi]);\n" +
    "    }\n" +
    "    var _omArr = [];\n" +
    "    for (var _omi = 0; _omi < _omTemplates.length; _omi++) {\n" +
    "      _omArr.push(_omTemplates[_omi]);\n" +
    "    }\n" +
    "    __result = { success: true, data: { renderSettingsTemplates: _rsArr, outputModuleTemplates: _omArr } };\n" +
    "  }\n" +
    "} finally {\n" +
    "  if (_tempAdded && _rqItem) {\n" +
    "    try { _rqItem.remove(); } catch (_cleanupErr) {}\n" +
    "  }\n" +
    "}\n" +
    "return __result;\n";

  const script = wrapWithReturn(body);
  try {
    return runScript(script, "list_render_templates");
  } catch (err) {
    return { content: [{ type: "text", text: "Error: " + String(err) }], isError: true };
  }
}

export async function setRenderItemSettingsHelper(params: {
  renderItemIndex: number;
  template?: string;
  timeSpanStart?: number;
  timeSpanDuration?: number;
}) {
  const { renderItemIndex, template, timeSpanStart, timeSpanDuration } = params;
  let setLines = "";
  if (template !== undefined) {
    setLines += "_rqItem.applyTemplate(\"" + escapeString(template) + "\");\n";
  }
  if (timeSpanStart !== undefined) {
    setLines += "_rqItem.timeSpanStart = " + timeSpanStart + ";\n";
  }
  if (timeSpanDuration !== undefined) {
    setLines += "_rqItem.timeSpanDuration = " + timeSpanDuration + ";\n";
  }

  const body =
    "var _rq = app.project.renderQueue;\n" +
    "if (" + renderItemIndex + " < 1 || " + renderItemIndex + " > _rq.numItems) {\n" +
    "  return { success: false, error: { message: \"Render item index " + renderItemIndex + " out of range — queue has \" + _rq.numItems + \" items.\", code: \"INVALID_PARAMS\" } };\n" +
    "}\n" +
    "var _rqItem = _rq.item(" + renderItemIndex + ");\n" +
    setLines +
    "return { success: true, data: {\n" +
    "  renderItemIndex: " + renderItemIndex + ",\n" +
    "  compName: _rqItem.comp ? _rqItem.comp.name : \"Unknown\",\n" +
    "  timeSpanStart: _rqItem.timeSpanStart,\n" +
    "  timeSpanDuration: _rqItem.timeSpanDuration\n" +
    "} };\n";

  const script = wrapWithReturn(wrapInUndoGroup(body, "set_render_item_settings"));
  try {
    return runScript(script, "set_render_item_settings");
  } catch (err) {
    return { content: [{ type: "text", text: "Error: " + String(err) }], isError: true };
  }
}

export async function setOutputModuleSettingsHelper(params: {
  renderItemIndex: number;
  outputModuleIndex?: number;
  template?: string;
  outputPath?: string;
}) {
  const { renderItemIndex, outputModuleIndex, template, outputPath } = params;
  const omIdx = outputModuleIndex ?? 1;

  let setLines = "";
  if (template !== undefined) {
    setLines += "_om.applyTemplate(\"" + escapeString(template) + "\");\n";
  }
  if (outputPath !== undefined) {
    setLines += "_om.file = new File(\"" + escapeString(outputPath) + "\");\n";
  }

  const body =
    "var _rq = app.project.renderQueue;\n" +
    "if (" + renderItemIndex + " < 1 || " + renderItemIndex + " > _rq.numItems) {\n" +
    "  return { success: false, error: { message: \"Render item index " + renderItemIndex + " out of range — queue has \" + _rq.numItems + \" items.\", code: \"INVALID_PARAMS\" } };\n" +
    "}\n" +
    "var _rqItem = _rq.item(" + renderItemIndex + ");\n" +
    "if (" + omIdx + " < 1 || " + omIdx + " > _rqItem.numOutputModules) {\n" +
    "  return { success: false, error: { message: \"Output module index " + omIdx + " out of range - render item has \" + _rqItem.numOutputModules + \" output module(s).\", code: \"INVALID_PARAMS\" } };\n" +
    "}\n" +
    "var _om = _rqItem.outputModule(" + omIdx + ");\n" +
    setLines +
    "var _omPath = \"\";\n" +
    "try { _omPath = _om.file ? _om.file.fsName : \"\"; } catch (_e) {}\n" +
    "return { success: true, data: {\n" +
    "  renderItemIndex: " + renderItemIndex + ",\n" +
    "  outputModuleIndex: " + omIdx + ",\n" +
    "  outputPath: _omPath\n" +
    "} };\n";

  const script = wrapWithReturn(wrapInUndoGroup(body, "set_output_module_settings"));
  try {
    return runScript(script, "set_output_module_settings");
  } catch (err) {
    return { content: [{ type: "text", text: "Error: " + String(err) }], isError: true };
  }
}
