/**
 * tools/expression.ts
 *
 * Expression tools for After Effects.
 *
 * Registers:
 *   - set_expression      Apply an arbitrary expression string to a property
 *   - remove_expression   Clear the expression from a property
 *
 * Helpers (exported for compound tools):
 *   - addWiggleHelper
 *   - addLoopHelper
 *   - linkPropertiesHelper
 *
 * Note: AE expressions use modern JS (expression engine), not ExtendScript.
 * The ExtendScript that SETS them must still be ES3.
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
  transformProp,
  propertyPath,
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
 * Build ES3 snippet to resolve a property by name, trying the Transform group first,
 * then falling back to a direct layer property lookup.
 * Assigns to variable `_prop`.
 */
function resolveProp(layerVar: string, propertyName: string): string {
  const esc = escapeString(propertyName);
  return (
    'var _transformGroup = ' + layerVar + '.property("Transform");\n' +
    'var _prop = _transformGroup ? _transformGroup.property("' + esc + '") : null;\n' +
    "if (!_prop) {\n" +
    '  _prop = ' + layerVar + '.property("' + esc + '");\n' +
    "}\n" +
    "if (!_prop) {\n" +
    '  return { success: false, error: { message: "Property not found: ' + esc + '", code: "PROP_NOT_FOUND" } };\n' +
    "}\n"
  );
}

// ---------------------------------------------------------------------------
// Exported helper functions (demoted from server.tool registrations)
// ---------------------------------------------------------------------------

export async function addWiggleHelper(params: {
  compId: number;
  layerIndex: number;
  property: string;
  frequency?: number | undefined;
  amplitude?: number | undefined;
}) {
  const { compId, layerIndex, property } = params;
  const frequency = params.frequency ?? 3;
  const amplitude = params.amplitude ?? 50;
  const expr = "wiggle(" + frequency + ", " + amplitude + ")";

  const body =
    findCompById("comp", compId) +
    findLayerByIndex("layer", "comp", layerIndex) +
    resolveProp("layer", property) +
    '_prop.expression = "' + escapeString(expr) + '";\n' +
    "return { success: true, data: { property: " + JSON.stringify(property) + ", expression: " + JSON.stringify(expr) + " } };\n";

  const script = wrapWithReturn(wrapInUndoGroup(body, "add_wiggle"));

  try {
    return runScript(script, "add_wiggle");
  } catch (err) {
    return { content: [{ type: "text", text: "Error: " + String(err) }], isError: true };
  }
}

export async function addLoopHelper(params: {
  compId: number;
  layerIndex: number;
  property: string;
  loopType: "cycle" | "pingpong" | "offset" | "continue";
  numKeyframes?: number | undefined;
}) {
  const { compId, layerIndex, property, loopType, numKeyframes } = params;
  const expr =
    numKeyframes !== undefined
      ? 'loopOut("' + loopType + '", ' + numKeyframes + ")"
      : 'loopOut("' + loopType + '")';

  const body =
    findCompById("comp", compId) +
    findLayerByIndex("layer", "comp", layerIndex) +
    resolveProp("layer", property) +
    "if (_prop.numKeys < 2) {\n" +
    '  return { success: false, error: { message: "loopOut requires at least 2 keyframes. Property \\"' + escapeString(property) + '\\" has " + _prop.numKeys + " keyframe(s).", code: "INVALID_PARAMS" } };\n' +
    "}\n" +
    '_prop.expression = "' + escapeString(expr) + '";\n' +
    "return { success: true, data: { property: " + JSON.stringify(property) + ", expression: " + JSON.stringify(expr) + " } };\n";

  const script = wrapWithReturn(wrapInUndoGroup(body, "add_loop"));

  try {
    return runScript(script, "add_loop");
  } catch (err) {
    return { content: [{ type: "text", text: "Error: " + String(err) }], isError: true };
  }
}

export async function linkPropertiesHelper(params: {
  compId: number;
  sourceLayerIndex: number;
  sourceProperty: "Position" | "Scale" | "Rotation" | "Opacity" | "Anchor Point";
  targetLayerIndex: number;
  targetProperty: string;
}) {
  const { compId, sourceLayerIndex, sourceProperty, targetLayerIndex, targetProperty } = params;
  // Map display property name to AE expression object accessor (camelCase)
  const propAccessorMap: Record<string, string> = {
    Position:       "position",
    Scale:          "scale",
    Rotation:       "rotation",
    Opacity:        "opacity",
    "Anchor Point": "anchorPoint",
  };
  const accessor = propAccessorMap[sourceProperty] ?? "position";

  // Expression referencing the source layer's transform property
  const expr = "thisComp.layer(" + sourceLayerIndex + ").transform." + accessor;

  const body =
    findCompById("comp", compId) +
    // Validate source layer exists
    findLayerByIndex("_srcLayer", "comp", sourceLayerIndex) +
    // Validate target layer exists
    findLayerByIndex("layer", "comp", targetLayerIndex) +
    // Resolve target property
    resolveProp("layer", targetProperty) +
    '_prop.expression = "' + escapeString(expr) + '";\n' +
    "return { success: true, data: {\n" +
    "  sourceLayer: " + sourceLayerIndex + ",\n" +
    "  sourceProperty: " + JSON.stringify(sourceProperty) + ",\n" +
    "  targetLayer: " + targetLayerIndex + ",\n" +
    "  targetProperty: " + JSON.stringify(targetProperty) + ",\n" +
    "  expression: " + JSON.stringify(expr) + "\n" +
    "} };\n";

  const script = wrapWithReturn(wrapInUndoGroup(body, "link_properties"));

  try {
    return runScript(script, "link_properties");
  } catch (err) {
    return { content: [{ type: "text", text: "Error: " + String(err) }], isError: true };
  }
}

// ---------------------------------------------------------------------------
// registerExpressionTools
// ---------------------------------------------------------------------------

export function registerExpressionTools(server: McpServer): void {
  // ─── set_expression ────────────────────────────────────────────────────────
  server.tool(
    "set_expression",
    "Apply an expression string to a layer property. " +
      "Expressions use the After Effects expression language (JavaScript) and run every frame, " +
      "overriding keyframe values when enabled. " +
      "Supports Transform properties (Position, Scale, Rotation, Opacity, Anchor Point) " +
      "and other layer properties (Source Text, Effects parameters, etc.). " +
      "Pass the raw JS expression code — do NOT escape it yourself. " +
      "Common examples: " +
      "'wiggle(3, 50)' = random motion; " +
      "'loopOut(\"cycle\")' = looping animation; " +
      "'value + [Math.sin(time * 2) * 50, 0]' = horizontal oscillation; " +
      "'thisComp.layer(2).transform.position' = mirror another layer's position. " +
      "Setting an expression disables keyframe values on that property.",
    {
      compId: z.number().int().positive().describe("Numeric ID of the composition"),
      layerIndex: z.number().int().positive().describe("1-based layer index"),
      property: z
        .string()
        .min(1)
        .describe(
          "Property name: 'Position', 'Opacity', 'Scale', 'Rotation', 'Anchor Point', " +
            "'Source Text', or any other AE property display name."
        ),
      expression: z
        .string()
        .describe(
          "The expression code (After Effects JS expression language). " +
            "Examples: 'wiggle(2, 30)', 'value * 1.1', 'loopOut(\"pingpong\")', " +
            "'[thisComp.width / 2, thisComp.height / 2]', 'time * 360 % 360'"
        ),
    },
    async ({ compId, layerIndex, property, expression }) => {
      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        resolveProp("layer", property) +
        '_prop.expression = "' + escapeString(expression) + '";\n' +
        "return { success: true, data: { property: " + JSON.stringify(property) + ", expressionSet: true, expressionEnabled: _prop.expressionEnabled } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "set_expression"));

      try {
        return runScript(script, "set_expression");
      } catch (err) {
        return { content: [{ type: "text", text: "Error: " + String(err) }], isError: true };
      }
    }
  );

  // ─── remove_expression ────────────────────────────────────────────────────
  server.tool(
    "remove_expression",
    "Remove (clear) the expression from a layer property. " +
      "After removal, the property reverts to its keyframe values " +
      "(or static value if no keyframes exist). " +
      "Setting expression to an empty string is the standard AE way to remove an expression.",
    {
      compId: z.number().int().positive().describe("Numeric ID of the composition"),
      layerIndex: z.number().int().positive().describe("1-based layer index"),
      property: z
        .string()
        .min(1)
        .describe("Property name whose expression should be removed"),
    },
    async ({ compId, layerIndex, property }) => {
      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        resolveProp("layer", property) +
        '_prop.expression = "";\n' +
        "return { success: true, data: { property: " + JSON.stringify(property) + ", expressionCleared: true } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "remove_expression"));

      try {
        return runScript(script, "remove_expression");
      } catch (err) {
        return { content: [{ type: "text", text: "Error: " + String(err) }], isError: true };
      }
    }
  );
}

// Suppress unused import warning — propertyPath is re-exported for callers who need it
export { propertyPath };
