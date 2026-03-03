/**
 * tools/expression.ts
 *
 * Expression tools for After Effects.
 *
 * Registers:
 *   - set_expression      Apply an arbitrary expression string to a property
 *   - remove_expression   Clear the expression from a property
 *   - add_wiggle          Apply wiggle(freq, amp) to a property
 *   - add_loop            Apply loopOut() to a property (requires ≥2 keyframes)
 *   - link_properties     Link a target property to a source layer's transform via expression
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
// registerExpressionTools
// ---------------------------------------------------------------------------

export function registerExpressionTools(server: McpServer): void {
  // ─── set_expression ───────────────────────────────────────────────────────
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

  // ─── add_wiggle ───────────────────────────────────────────────────────────
  server.tool(
    "add_wiggle",
    "Apply a wiggle expression to a layer property to create organic random motion. " +
      "Frequency controls oscillations per second (higher = more jitter). " +
      "Amplitude controls the maximum deviation (units match the property: pixels for Position, " +
      "degrees for Rotation, 0-100 for Opacity). " +
      "Examples: wiggle(1, 30) = slow, large drift; wiggle(10, 5) = fast, subtle vibration. " +
      "Best on: Position (floating/shaking), Rotation (wobble), Opacity (flicker), Scale (breathing).",
    {
      compId: z.number().int().positive().describe("Numeric ID of the composition"),
      layerIndex: z.number().int().positive().describe("1-based layer index"),
      property: z
        .string()
        .min(1)
        .describe("Property to apply wiggle to (e.g. 'Position', 'Rotation', 'Opacity', 'Scale')"),
      frequency: z
        .number()
        .positive()
        .default(3)
        .describe(
          "Oscillations per second (default 3). Range: 0.5 (very slow) to 15 (very fast vibration)."
        ),
      amplitude: z
        .number()
        .positive()
        .default(50)
        .describe(
          "Maximum deviation from base value (default 50). " +
            "Units match the property: pixels for Position, degrees for Rotation, percent for Opacity."
        ),
    },
    async ({ compId, layerIndex, property, frequency, amplitude }) => {
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
  );

  // ─── add_loop ─────────────────────────────────────────────────────────────
  server.tool(
    "add_loop",
    "Apply a loopOut() expression to a property so it repeats after the last keyframe. " +
      "The property MUST have at least 2 keyframes set before calling this tool. " +
      "Loop types: " +
      "'cycle' = repeats the segment forward (spinning logo, bouncing ball); " +
      "'pingpong' = alternates forward/backward (breathing scale, pendulum swing); " +
      "'offset' = repeats but adds cumulative delta each cycle (endless scroll, counter); " +
      "'continue' = extrapolates the last velocity infinitely (object flying off screen). " +
      "numKeyframes optionally limits the loop to the last N keyframes.",
    {
      compId: z.number().int().positive().describe("Numeric ID of the composition"),
      layerIndex: z.number().int().positive().describe("1-based layer index"),
      property: z
        .string()
        .min(1)
        .describe("Property to loop — must already have at least 2 keyframes"),
      loopType: z
        .enum(["cycle", "pingpong", "offset", "continue"])
        .describe(
          "'cycle' = forward repeat; 'pingpong' = forward+backward; " +
            "'offset' = additive repeat; 'continue' = extrapolate velocity"
        ),
      numKeyframes: z
        .number()
        .int()
        .positive()
        .optional()
        .describe(
          "Number of trailing keyframes to include in the loop segment (optional). " +
            "Omit to loop all keyframes."
        ),
    },
    async ({ compId, layerIndex, property, loopType, numKeyframes }) => {
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
  );

  // ─── link_properties ──────────────────────────────────────────────────────
  server.tool(
    "link_properties",
    "Link a target layer property to a source layer's transform property via an expression. " +
      "The target property will mirror the source value at all times. " +
      "The expression is set on the TARGET layer/property — the source layer is unchanged. " +
      "Use cases: sync positions between layers without parenting, " +
      "drive multiple layers from a single controller null, " +
      "create secondary animation that follows a primary. " +
      "Source must be a Transform property. " +
      "For non-Transform sources, use set_expression with a custom expression string.",
    {
      compId: z.number().int().positive().describe("Numeric ID of the composition"),
      sourceLayerIndex: z
        .number()
        .int()
        .positive()
        .describe("1-based index of the source (driver) layer whose value will be READ"),
      sourceProperty: z
        .enum(["Position", "Scale", "Rotation", "Opacity", "Anchor Point"])
        .describe("Transform property on the source layer to read"),
      targetLayerIndex: z
        .number()
        .int()
        .positive()
        .describe("1-based index of the target (follower) layer that will receive the expression"),
      targetProperty: z
        .string()
        .min(1)
        .describe("Property name on the target layer that will be driven"),
    },
    async ({ compId, sourceLayerIndex, sourceProperty, targetLayerIndex, targetProperty }) => {
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
  );
}

// Suppress unused import warning — propertyPath is re-exported for callers who need it
export { propertyPath };
