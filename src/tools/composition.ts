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

  // ── create_composition ────────────────────────────────────────────────────

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

  // ── get_composition ───────────────────────────────────────────────────────

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

  // ── list_compositions ─────────────────────────────────────────────────────

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

  // ── duplicate_composition ─────────────────────────────────────────────────

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

  // ── set_composition_settings ──────────────────────────────────────────────

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
}
