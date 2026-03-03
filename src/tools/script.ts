/**
 * tools/script.ts
 *
 * Escape-hatch tool for executing arbitrary ExtendScript inside After Effects.
 *
 * Registers:
 *   - run_extendscript   Execute any ES3 ExtendScript in AE and return the result
 *
 * This is the power tool for advanced users and edge cases where the structured
 * tools don't cover the needed AE API surface.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { bridge } from "../bridge.js";

// ---------------------------------------------------------------------------
// registerScriptTools
// ---------------------------------------------------------------------------

export function registerScriptTools(server: McpServer): void {
  // ─── run_extendscript ───────────────────────────────────────────────────
  server.tool(
    "run_extendscript",
    "Execute arbitrary ExtendScript code directly inside After Effects. " +
      "Use this tool when the structured tools don't cover your use case — " +
      "for accessing masks, text animators, shape group contents, advanced effect parameters, " +
      "project-level operations, or any AE API not covered by other tools. " +
      "\n\n" +
      "WHEN TO USE THIS TOOL:\n" +
      "- Query AE state (list all layers, get comp settings, inspect property values)\n" +
      "- Access AE features not in structured tools (masks, markers, guides, text animators)\n" +
      "- Multi-step operations that compose many API calls in one round-trip\n" +
      "- Debugging: inspect the AE project structure\n" +
      "- Advanced effects: apply match-name effects, set complex property values\n" +
      "\n\n" +
      "EXTENDSCRIPT RULES (ES3 — strictly enforced by the AE engine):\n" +
      "  - Use 'var' only — NO let, const\n" +
      "  - NO arrow functions — use function(x) { return x; } instead\n" +
      "  - NO template literals — use 'Hello ' + name instead of `Hello ${name}`\n" +
      "  - NO destructuring, NO spread operator\n" +
      "  - NO Promises, async, await — the engine is synchronous\n" +
      "  - AE collections use 1-BASED indexing: comp.layer(1) = first layer\n" +
      "\n\n" +
      "REQUIRED: The script MUST include a 'return' statement.\n" +
      "Return { success: true, data: ... } for structured results, or any serialisable value.\n" +
      "\n\n" +
      "COMMON AE DOM PATTERNS:\n" +
      "  Find comp:       var comp = app.project.itemByID(123);\n" +
      "  Get layer:       var layer = comp.layer(1);  // 1-based!\n" +
      "  Transform prop:  layer.property('Transform').property('Position')\n" +
      "  Add effect:      layer.property('Effects').addProperty('ADBE Gaussian Blur 2')\n" +
      "  Add mask:        layer.property('Mask').addProperty('Mask');\n" +
      "  Source text:     layer.property('Source Text').value\n" +
      "  Shape contents:  layer.property('Contents')\n" +
      "  Active item:     app.activeItem  (the currently selected/open item)\n" +
      "  List layers:     for (var i = 1; i <= comp.numLayers; i++) { comp.layer(i).name }\n",
    {
      script: z
        .string()
        .min(1)
        .describe(
          "ES3-compatible ExtendScript code to run in After Effects. " +
            "Must use 'var' (not let/const), no arrow functions, no template literals. " +
            "Must include a 'return' statement. " +
            "Has full access to the AE DOM via the global 'app' object. " +
            "Examples:\n" +
            "  'var comp = app.project.itemByID(1); return { name: comp.name, layers: comp.numLayers };'\n" +
            "  'var names = []; for (var i = 1; i <= app.activeItem.numLayers; i++) { names.push(app.activeItem.layer(i).name); } return names;'"
        ),
    },
    async ({ script }) => {
      // Wrap the user's script in a protective IIFE with try/catch.
      // The inner IIFE ensures 'return' works correctly in the user's code.
      // Any thrown error is returned as structured data.
      const wrappedScript =
        "(function() {\n" +
        "  try {\n" +
        "    var __userResult = (function() {\n" +
        script
          .split("\n")
          .map(function (line) { return "      " + line; })
          .join("\n") +
        "\n    })();\n" +
        "    if (__userResult === undefined || __userResult === null) {\n" +
        "      return { success: true, data: null };\n" +
        "    }\n" +
        "    if (typeof __userResult === 'object' && __userResult.hasOwnProperty('success')) {\n" +
        "      return __userResult;\n" +
        "    }\n" +
        "    return { success: true, data: __userResult };\n" +
        "  } catch (e) {\n" +
        "    return {\n" +
        "      success: false,\n" +
        "      error: {\n" +
        "        message: e.toString(),\n" +
        "        line: e.line !== undefined ? e.line : -1,\n" +
        "        code: 'SCRIPT_ERROR'\n" +
        "      }\n" +
        "    };\n" +
        "  }\n" +
        "})();";

      try {
        const result = await bridge.executeScript(wrappedScript, "run_extendscript");
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: "Error: " + String(err) }],
          isError: true,
        };
      }
    }
  );
}
