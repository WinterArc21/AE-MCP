/**
 * tools/project.ts
 *
 * MCP tool registrations for After Effects project management.
 *
 * Tools:
 *   - get_project_info   : returns project name, path, numItems, bitDepth
 *   - create_project     : creates a new empty project
 *   - save_project       : saves current project (optionally to a new path)
 *   - open_project       : opens an .aep / .aepx file from disk
 *   - import_file        : imports footage and optionally adds it to a comp
 *
 * All ExtendScript generated here is ES3-compatible (var only, no arrow
 * functions, no template literals, string concatenation only).
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

// ---------------------------------------------------------------------------
// registerProjectTools
// ---------------------------------------------------------------------------

export function registerProjectTools(server: McpServer): void {

  // ── get_project_info ────────────────────────────────────────────────

  server.tool(
    "get_project_info",
    "Returns metadata about the currently open After Effects project: " +
      "name, absolute file path (null if unsaved), total number of project " +
      "items (comps + footage + folders), and the bit depth (8, 16, or 32 bpc). " +
      "Throws if no project is open.",
    {},
    async () => {
      const script = wrapWithReturn(
        "if (!app.project) {\n" +
        '  throw new Error("No project is currently open.");\n' +
        "}\n" +
        "var proj = app.project;\n" +
        "var filePath = (proj.file ? proj.file.fsName : null);\n" +
        'var projName = (proj.file ? proj.file.name : "(Untitled)");\n' +
        "return {\n" +
        "  success: true,\n" +
        "  data: {\n" +
        "    name: projName,\n" +
        "    path: filePath,\n" +
        "    numItems: proj.numItems,\n" +
        "    bitDepth: proj.bitsPerChannel\n" +
        "  }\n" +
        "};\n"
      );
      return run(script, "get_project_info");
    }
  );

  // ── create_project ──────────────────────────────────────────────────

  server.tool(
    "create_project",
    "Creates a new, empty After Effects project. " +
      "Any currently open unsaved changes will be discarded — " +
      "call save_project first if you need to preserve them. " +
      "Returns a confirmation message.",
    {},
    async () => {
      const script = wrapWithReturn(
        "app.newProject();\n" +
        'return { success: true, data: { message: "New project created." } };\n'
      );
      return run(script, "create_project");
    }
  );

  // ── save_project ────────────────────────────────────────────────────

  server.tool(
    "save_project",
    "Saves the current After Effects project. " +
      "Omit 'path' to save in-place (equivalent to Cmd/Ctrl+S). " +
      "Provide an absolute 'path' ending in .aep or .aepx to perform a " +
      "Save As to a new location. " +
      "Returns the file path the project was saved to.",
    {
      path: z
        .string()
        .optional()
        .describe(
          "Optional absolute path for Save As (e.g. /Users/alice/MyProject.aep). " +
            "Omit to save in-place."
        ),
    },
    async ({ path }) => {
      let script: string;
      if (path !== undefined) {
        const safePath = escapeString(path);
        script = wrapWithReturn(
          "if (!app.project) {\n" +
          '  throw new Error("No project is open.");\n' +
          "}\n" +
          'var saveFile = new File("' + safePath + '");\n' +
          "app.project.save(saveFile);\n" +
          "return {\n" +
          "  success: true,\n" +
          '  data: { message: "Project saved.", path: "' + safePath + '" }\n' +
          "};\n"
        );
      } else {
        script = wrapWithReturn(
          "if (!app.project) {\n" +
          '  throw new Error("No project is open.");\n' +
          "}\n" +
          "app.project.save();\n" +
          "var savedPath = (app.project.file ? app.project.file.fsName : null);\n" +
          "return {\n" +
          "  success: true,\n" +
          '  data: { message: "Project saved.", path: savedPath }\n' +
          "};\n"
        );
      }
      return run(script, "save_project");
    }
  );

  // ── open_project ────────────────────────────────────────────────────

  server.tool(
    "open_project",
    "Opens an After Effects project file (.aep or .aepx) from the local " +
      "file system. Provide an absolute path to an existing file. " +
      "Any currently open unsaved changes will be discarded. " +
      "Returns the name and path of the opened project.",
    {
      path: z
        .string()
        .describe(
          "Absolute path to the .aep or .aepx file " +
            "(e.g. /Users/alice/MyProject.aep)."
        ),
    },
    async ({ path }) => {
      const safePath = escapeString(path);
      const script = wrapWithReturn(
        'var projectFile = new File("' + safePath + '");\n' +
        "if (!projectFile.exists) {\n" +
        '  throw new Error("File not found: ' + safePath + '");\n' +
        "}\n" +
        "app.open(projectFile);\n" +
        "return {\n" +
        "  success: true,\n" +
        "  data: {\n" +
        '    message: "Project opened.",\n' +
        '    name: (app.project.file ? app.project.file.name : "(Untitled)"),\n' +
        "    path: (app.project.file ? app.project.file.fsName : null)\n" +
        "  }\n" +
        "};\n"
      );
      return run(script, "open_project");
    }
  );

  // ── import_file ───────────────────────────────────────────────────────

  server.tool(
    "import_file",
    "Imports a file into the current After Effects project. " +
      "Supported formats include video (.mp4, .mov, .avi), images, audio " +
      "(.wav, .mp3), Photoshop (.psd), Illustrator (.ai), and other " +
      "AE-compatible media formats. " +
      "If 'compId' is provided the imported item is added as a new layer at " +
      "the top of that composition. " +
      "Returns the imported item id, name, and type.",
    {
      path: z
        .string()
        .describe(
          "Absolute file-system path to the file to import " +
            "(e.g. /Users/alice/footage.mp4)."
        ),
      compId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe(
          "Optional. Numeric id of a composition to add the imported footage " +
            "to as a new layer. Obtain ids via list_compositions."
        ),
    },
    async ({ path, compId }) => {
      const safePath = escapeString(path);

      const importBlock =
        'var importFile = new File("' + safePath + '");\n' +
        "if (!importFile.exists) {\n" +
        '  throw new Error("File not found: ' + safePath + '");\n' +
        "}\n" +
        "var importOpts = new ImportOptions(importFile);\n" +
        "var item = app.project.importFile(importOpts);\n";

      const addToCompBlock =
        compId !== undefined
          ? findCompById("targetComp", compId) +
            "targetComp.layers.add(item);\n"
          : "";

      const returnBlock =
        "return {\n" +
        "  success: true,\n" +
        "  data: {\n" +
        "    id: item.id,\n" +
        "    name: item.name,\n" +
        "    typeName: item.typeName,\n" +
        "    addedToComp: " +
        (compId !== undefined ? "true" : "false") +
        "\n" +
        "  }\n" +
        "};\n";

      const script = wrapWithReturn(importBlock + addToCompBlock + returnBlock);
      return run(script, "import_file");
    }
  );
}
