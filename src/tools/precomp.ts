/**
 * tools/precomp.ts
 *
 * Pre-composition (nesting) tools for After Effects.
 *
 * Registers:
 *   - precompose_layers   Pre-compose one or more layers into a new sub-composition
 *   - nest_composition    Add an existing composition as a layer inside another composition
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
// registerPrecompTools
// ---------------------------------------------------------------------------

export function registerPrecompTools(server: McpServer): void {

  // ─── precompose_layers ────────────────────────────────────────────────────
  server.tool(
    "precompose_layers",
    "Pre-compose one or more layers into a new sub-composition. " +
      "This is the equivalent of selecting layers in AE and going to Layer > Pre-compose. " +
      "The selected layers are moved into a new composition, and that new comp appears as " +
      "a single layer in the original composition at the same position. " +
      "layerIndices: array of 1-based layer indices to include in the pre-comp. " +
      "  The order of indices doesn't matter — AE preserves the stacking order. " +
      "newCompName: name for the new composition. " +
      "moveAttributes (default true): if true, all layer attributes (masks, effects, keyframes) " +
      "  move into the new comp along with the layers. If false, attributes stay in the original comp " +
      "  applied to the resulting pre-comp layer. " +
      "Returns the new composition's ID and the index of the pre-comp layer in the original composition. " +
      "Use this to group related layers, reduce timeline complexity, or apply effects to a group.",
    {
      compId: z
        .number()
        .int()
        .positive()
        .describe("Numeric ID of the composition containing the layers to pre-compose"),
      layerIndices: z
        .array(z.number().int().positive())
        .min(1)
        .describe("Array of 1-based layer indices to include in the pre-comp (e.g. [1, 2, 3])"),
      newCompName: z
        .string()
        .min(1)
        .describe("Name for the new pre-composition"),
      moveAttributes: z
        .boolean()
        .optional()
        .describe("If true (default), move all layer attributes into the new comp. If false, keep attributes on the pre-comp layer in the parent comp"),
    },
    async ({ compId, layerIndices, newCompName, moveAttributes }) => {
      const moveAttr = moveAttributes !== false; // default true
      const compNameEsc = escapeString(newCompName);

      // Build ES3 array literal for layer indices
      const indicesLiteral = "[" + layerIndices.join(",") + "]";

      const body =
        findCompById("comp", compId) +
        // Validate all indices
        "var _indices = " + indicesLiteral + ";\n" +
        "for (var _vi = 0; _vi < _indices.length; _vi++) {\n" +
        "  if (_indices[_vi] < 1 || _indices[_vi] > comp.numLayers) {\n" +
        "    return { success: false, error: { message: \"Layer index \" + _indices[_vi] + \" is out of range (comp has \" + comp.numLayers + \" layers).\", code: \"INVALID_PARAMS\" } };\n" +
        "  }\n" +
        "}\n" +
        // precompose returns the new precomp layer
        "var _newLayer = comp.layers.precompose(_indices, \"" + compNameEsc + "\", " + (moveAttr ? "true" : "false") + ");\n" +
        "var _newComp = _newLayer.source;\n" +
        "return { success: true, data: { precompLayerIndex: _newLayer.index, precompLayerName: _newLayer.name, newCompId: _newComp.id, newCompName: _newComp.name } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "precompose_layers"));

      try {
        return runScript(script, "precompose_layers");
      } catch (err) {
        return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
      }
    }
  );

  // ─── nest_composition ─────────────────────────────────────────────────────
  server.tool(
    "nest_composition",
    "Add an existing composition as a layer inside another composition. " +
      "This is the equivalent of dragging a comp from the Project panel into another comp's timeline. " +
      "The source composition appears as a single layer in the target composition " +
      "with the source comp's duration determining the layer length. " +
      "targetCompId: the composition you want to add the nested comp INTO. " +
      "sourceCompId: the composition to nest (it must already exist in the project). " +
      "The nested layer is placed at the top of the timeline (index 1) at time 0. " +
      "Use set_layer_properties afterwards to reposition the layer or change its start time. " +
      "Returns the new layer's index in the target composition.",
    {
      targetCompId: z
        .number()
        .int()
        .positive()
        .describe("Numeric ID of the composition to add the nested comp INTO"),
      sourceCompId: z
        .number()
        .int()
        .positive()
        .describe("Numeric ID of the composition to nest as a layer (the source comp to be nested)"),
    },
    async ({ targetCompId, sourceCompId }) => {
      const body =
        // Find target comp
        "var _targetComp = app.project.itemByID(" + targetCompId + ");\n" +
        "if (!_targetComp || !(_targetComp instanceof CompItem)) {\n" +
        "  return { success: false, error: { message: \"Target composition not found with id: " + targetCompId + "\", code: \"COMP_NOT_FOUND\" } };\n" +
        "}\n" +
        // Find source comp
        "var _sourceComp = app.project.itemByID(" + sourceCompId + ");\n" +
        "if (!_sourceComp || !(_sourceComp instanceof CompItem)) {\n" +
        "  return { success: false, error: { message: \"Source composition not found with id: " + sourceCompId + "\", code: \"COMP_NOT_FOUND\" } };\n" +
        "}\n" +
        // Prevent nesting a comp into itself
        "if (_targetComp.id === _sourceComp.id) {\n" +
        "  return { success: false, error: { message: \"Cannot nest a composition into itself.\", code: \"INVALID_PARAMS\" } };\n" +
        "}\n" +
        "var _newLayer = _targetComp.layers.add(_sourceComp);\n" +
        "return { success: true, data: { layerIndex: _newLayer.index, layerName: _newLayer.name, sourceCompName: _sourceComp.name, targetCompName: _targetComp.name } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "nest_composition"));

      try {
        return runScript(script, "nest_composition");
      } catch (err) {
        return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
      }
    }
  );
}
