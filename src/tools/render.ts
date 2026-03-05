/**
 * tools/render.ts
 *
 * Render queue tools for After Effects.
 *
 * Registers:
 *   - add_to_render_queue   Add a composition to the render queue with output settings
 *   - get_render_status     Return the state of all items in the render queue
 *   - start_render          Render all QUEUED items (blocking until complete)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { bridge } from "../bridge.js";
import {
  escapeString,
  wrapWithReturn,
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
        return runScript(script, "start_render");
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
    "The frame is rendered directly (not via the render queue) so it is fast — " +
    "typically 1-5 seconds. After capturing, use view_file on the returned " +
    "outputPath to see the frame. " +
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
        // Capture the frame
        "_cfComp.saveFrameToPng(_cfTime, _cfFile);\n" +
        // Verify the file was created
        "if (!_cfFile.exists) {\n" +
        '  return { success: false, error: { message: "PNG file was not created. The frame capture may have failed.", code: "CAPTURE_FAILED" } };\n' +
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
        return runScript(script, "capture_frame");
      } catch (err) {
        return {
          content: [{ type: "text", text: "Error: " + String(err) }],
          isError: true,
        };
      }
    }
  );
}
