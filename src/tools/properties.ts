/**
 * tools/properties.ts
 *
 * Generic property access tools for After Effects.
 *
 * Registers:
 *   - list_property_tree      Discover the property tree of a layer
 *   - get_property            Read the current value of any layer property
 *   - set_property            Set the value of any layer property
 *
 * Helpers (exported for compound tools):
 *   - setPropertyKeyframesHelper
 *   - getKeyframesHelper
 *
 * All ExtendScript is ES3-compatible (var only, no arrow functions,
 * no template literals, string concatenation only).
 * Layer indices are 1-based throughout.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { bridge } from "../bridge.js";
import {
  wrapWithReturn,
  wrapInUndoGroup,
  findCompById,
  findLayerByIndex,
} from "../script-builder.js";
import { validateTransformValue, valueShapeError } from "../value-validator.js";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function textResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}

async function runScript(script: string, toolName: string) {
  const result = await bridge.executeScript(script, toolName);
  return textResult(result);
}

// ---------------------------------------------------------------------------
// Zod schemas shared across tools
// ---------------------------------------------------------------------------

const PropertyPathSegment = z.object({
  name: z.string().optional().describe("Display name of the property"),
  matchName: z.string().optional().describe("Internal AE match name (preferred, more reliable)"),
  index: z.number().int().positive().optional().describe("1-based property index"),
}).describe("Property path segment. Provide at least one of name, matchName, or index.");

const PropertyPath = z.array(PropertyPathSegment).min(1).describe(
  "Path to the property. Each segment identifies a level in the property hierarchy. " +
  "Use list_property_tree to discover available paths. " +
  "Example: [{matchName: 'ADBE Transform Group'}, {matchName: 'ADBE Position'}] for Position."
);

// ---------------------------------------------------------------------------
// ExtendScript _resolvePath helper (ES3, string constant)
// ---------------------------------------------------------------------------

const RESOLVE_PATH_FN =
  "function _resolvePath(root, segments) {\n" +
  "  var node = root;\n" +
  "  for (var i = 0; i < segments.length; i++) {\n" +
  "    var seg = segments[i];\n" +
  "    var child = null;\n" +
  "    if (seg.matchName) {\n" +
  "      try { child = node.property(seg.matchName); } catch(e) {}\n" +
  "    }\n" +
  "    if (!child && seg.name) {\n" +
  "      try { child = node.property(seg.name); } catch(e) {}\n" +
  "    }\n" +
  "    if (!child && seg.index) {\n" +
  "      try { child = node.property(seg.index); } catch(e) {}\n" +
  "    }\n" +
  "    if (!child) {\n" +
  "      return null;\n" +
  "    }\n" +
  "    node = child;\n" +
  "  }\n" +
  "  return node;\n" +
  "}\n";

// ---------------------------------------------------------------------------
// Exported helper functions (demoted from server.tool registrations)
// ---------------------------------------------------------------------------

export async function setPropertyKeyframesHelper(params: {
  compId: number;
  layerIndex: number;
  propertyPath: Array<{ name?: string | undefined; matchName?: string | undefined; index?: number | undefined }>;
  keyframes: Array<{
    time: number;
    value: number | number[];
    interpolation?: "linear" | "hold" | "bezier" | undefined;
  }>;
  clearExisting?: boolean | undefined;
}) {
  const { compId, layerIndex, propertyPath, keyframes } = params;
  const clearEx = params.clearExisting === true;

  // Build keyframe data array as ES3 literal
  let kfArrayLiteral = "[";
  for (let i = 0; i < keyframes.length; i++) {
    const kf = keyframes[i];
    const valLit = Array.isArray(kf.value) ? "[" + kf.value.join(",") + "]" : String(kf.value);
    const interpLit = kf.interpolation ? '"' + kf.interpolation + '"' : "null";
    if (i > 0) kfArrayLiteral += ",";
    kfArrayLiteral += "{time:" + kf.time + ",value:" + valLit + ",interpolation:" + interpLit + "}";
  }
  kfArrayLiteral += "]";

  const inner =
    findCompById("comp", compId) +
    findLayerByIndex("layer", "comp", layerIndex) +
    RESOLVE_PATH_FN +
    "var _segments = " + JSON.stringify(propertyPath) + ";\n" +
    "var _prop = _resolvePath(layer, _segments);\n" +
    "if (!_prop) {\n" +
    '  return { success: false, error: { message: "Property path not found.", code: "PROPERTY_NOT_FOUND" } };\n' +
    "}\n" +
    "if (_prop.propertyType !== PropertyType.PROPERTY) {\n" +
    '  return { success: false, error: { message: "Path resolves to a group, not a property.", code: "NOT_A_PROPERTY" } };\n' +
    "}\n" +
    "if (!_prop.canVaryOverTime) {\n" +
    '  return { success: false, error: { message: "Property cannot be animated.", code: "NOT_ANIMATABLE" } };\n' +
    "}\n" +
    (clearEx
      ? "for (var _rk = _prop.numKeys; _rk >= 1; _rk--) {\n" +
        "  _prop.removeKey(_rk);\n" +
        "}\n"
      : "") +
    "var _kfs = " + kfArrayLiteral + ";\n" +
    "for (var _ki = 0; _ki < _kfs.length; _ki++) {\n" +
    "  var _kf = _kfs[_ki];\n" +
    "  _prop.setValueAtTime(_kf.time, _kf.value);\n" +
    "  if (_kf.interpolation) {\n" +
    "    var _nki = _prop.nearestKeyIndex(_kf.time);\n" +
    "    if (_kf.interpolation === 'linear') {\n" +
    "      _prop.setInterpolationTypeAtKey(_nki, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);\n" +
    "    } else if (_kf.interpolation === 'hold') {\n" +
    "      _prop.setInterpolationTypeAtKey(_nki, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);\n" +
    "    } else if (_kf.interpolation === 'bezier') {\n" +
    "      _prop.setInterpolationTypeAtKey(_nki, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);\n" +
    "    }\n" +
    "  }\n" +
    "}\n" +
    "return {\n" +
    "  success: true,\n" +
    "  data: {\n" +
    "    propertyName: _prop.name,\n" +
    "    keyframesAdded: _kfs.length,\n" +
    "    totalKeys: _prop.numKeys\n" +
    "  }\n" +
    "};\n";

  const script = wrapWithReturn(wrapInUndoGroup(inner, "set_property_keyframes"));
  return runScript(script, "set_property_keyframes");
}

export async function getKeyframesHelper(params: {
  compId: number;
  layerIndex: number;
  propertyPath: Array<{ name?: string | undefined; matchName?: string | undefined; index?: number | undefined }>;
}) {
  const { compId, layerIndex, propertyPath } = params;

  const inner =
    findCompById("comp", compId) +
    findLayerByIndex("layer", "comp", layerIndex) +
    RESOLVE_PATH_FN +
    "var _segments = " + JSON.stringify(propertyPath) + ";\n" +
    "var _prop = _resolvePath(layer, _segments);\n" +
    "if (!_prop) {\n" +
    '  return { success: false, error: { message: "Property path not found.", code: "PROPERTY_NOT_FOUND" } };\n' +
    "}\n" +
    "if (_prop.propertyType !== PropertyType.PROPERTY) {\n" +
    '  return { success: false, error: { message: "Path resolves to a group, not a property.", code: "NOT_A_PROPERTY" } };\n' +
    "}\n" +
    "function _interpStr(t) {\n" +
    "  if (t === KeyframeInterpolationType.LINEAR) return 'LINEAR';\n" +
    "  if (t === KeyframeInterpolationType.BEZIER) return 'BEZIER';\n" +
    "  if (t === KeyframeInterpolationType.HOLD) return 'HOLD';\n" +
    "  return 'UNKNOWN';\n" +
    "}\n" +
    "var _keyframes = [];\n" +
    "for (var _ki = 1; _ki <= _prop.numKeys; _ki++) {\n" +
    "  var _kv = _prop.keyValue(_ki);\n" +
    "  if (_kv instanceof Array) {\n" +
    "    var _arr = [];\n" +
    "    for (var _ai = 0; _ai < _kv.length; _ai++) _arr.push(_kv[_ai]);\n" +
    "    _kv = _arr;\n" +
    "  }\n" +
    "  _keyframes.push({\n" +
    "    index: _ki,\n" +
    "    time: _prop.keyTime(_ki),\n" +
    "    value: _kv,\n" +
    "    inInterpolation: _interpStr(_prop.keyInInterpolationType(_ki)),\n" +
    "    outInterpolation: _interpStr(_prop.keyOutInterpolationType(_ki))\n" +
    "  });\n" +
    "}\n" +
    "return {\n" +
    "  success: true,\n" +
    "  data: {\n" +
    "    propertyName: _prop.name,\n" +
    "    numKeys: _prop.numKeys,\n" +
    "    keyframes: _keyframes\n" +
    "  }\n" +
    "};\n";

  const script = wrapWithReturn(inner);
  return runScript(script, "get_keyframes");
}

// ---------------------------------------------------------------------------
// registerPropertyTools
// ---------------------------------------------------------------------------

export function registerPropertyTools(server: McpServer): void {

  // ── list_property_tree ──────────────────────────────────────────────────────

  server.tool(
    "list_property_tree",
    "Discover the property tree of a layer. Returns property names, match names, types, " +
      "and optionally current values. Use this to find property paths for get_property, " +
      "set_property, and set_property_keyframes. Start with no propertyPath to see " +
      "top-level groups, then drill deeper.",
    {
      compId: z
        .number()
        .int()
        .positive()
        .describe("Numeric ID of the target composition."),
      layerIndex: z
        .number()
        .int()
        .positive()
        .describe("1-based index of the layer."),
      propertyPath: z.array(PropertyPathSegment).optional().describe(
        "Optional path to a property group to start from. " +
        "If omitted, starts from the layer root."
      ),
      maxDepth: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe("Maximum depth to recurse into property groups. Default 2."),
      includeValues: z
        .boolean()
        .optional()
        .describe("If true, include current values for leaf properties. Default false."),
    },
    async ({ compId, layerIndex, propertyPath, maxDepth, includeValues }) => {
      const depth = maxDepth !== undefined ? maxDepth : 2;
      const inclVals = includeValues === true;
      const hasPath = propertyPath && propertyPath.length > 0;

      const inner =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        RESOLVE_PATH_FN +
        "function _typeStr(pt) {\n" +
        "  if (pt === PropertyType.PROPERTY) return 'PROPERTY';\n" +
        "  if (pt === PropertyType.INDEXED_GROUP) return 'INDEXED_GROUP';\n" +
        "  if (pt === PropertyType.NAMED_GROUP) return 'NAMED_GROUP';\n" +
        "  return 'UNKNOWN';\n" +
        "}\n" +
        "function _serializeValue(prop) {\n" +
        "  try {\n" +
        "    var v = prop.value;\n" +
        "    if (v instanceof TextDocument) return v.text;\n" +
        "    if (v instanceof Shape) return 'Shape object';\n" +
        "    if (v instanceof Array) {\n" +
        "      var arr = [];\n" +
        "      for (var ai = 0; ai < v.length; ai++) arr.push(v[ai]);\n" +
        "      return arr;\n" +
        "    }\n" +
        "    return v;\n" +
        "  } catch(e) { return null; }\n" +
        "}\n" +
        "function _walk(node, depth, maxD, inclV) {\n" +
        "  var info = {\n" +
        "    name: node.name,\n" +
        "    matchName: node.matchName,\n" +
        "    propertyIndex: node.propertyIndex,\n" +
        "    propertyType: _typeStr(node.propertyType)\n" +
        "  };\n" +
        "  if (node.propertyType !== PropertyType.PROPERTY) {\n" +
        "    info.numProperties = node.numProperties;\n" +
        "    if (depth < maxD) {\n" +
        "      var children = [];\n" +
        "      for (var ci = 1; ci <= node.numProperties; ci++) {\n" +
        "        try {\n" +
        "          children.push(_walk(node.property(ci), depth + 1, maxD, inclV));\n" +
        "        } catch(e) {}\n" +
        "      }\n" +
        "      info.children = children;\n" +
        "    }\n" +
        "  } else {\n" +
        "    try { info.canVaryOverTime = node.canVaryOverTime; } catch(e) {}\n" +
        "    try { info.canSetExpression = node.canSetExpression; } catch(e) {}\n" +
        "    try { info.numKeys = node.numKeys; } catch(e) {}\n" +
        "    if (inclV) {\n" +
        "      info.value = _serializeValue(node);\n" +
        "    }\n" +
        "  }\n" +
        "  return info;\n" +
        "}\n" +
        (hasPath
          ? "var _segments = " + JSON.stringify(propertyPath) + ";\n" +
            "var _root = _resolvePath(layer, _segments);\n" +
            "if (!_root) {\n" +
            '  return { success: false, error: { message: "Property path not found.", code: "PROPERTY_NOT_FOUND" } };\n' +
            "}\n"
          : "var _root = layer;\n") +
        "var _tree = _walk(_root, 0, " + depth + ", " + (inclVals ? "true" : "false") + ");\n" +
        "return { success: true, data: { layerName: layer.name, tree: _tree } };\n";

      const script = wrapWithReturn(inner);
      return runScript(script, "list_property_tree");
    }
  );

  // ── get_property ────────────────────────────────────────────────────────────

  server.tool(
    "get_property",
    "Read the current value of any layer property by path. Use list_property_tree to " +
      "discover property paths. Supports reading at a specific time.",
    {
      compId: z
        .number()
        .int()
        .positive()
        .describe("Numeric ID of the target composition."),
      layerIndex: z
        .number()
        .int()
        .positive()
        .describe("1-based index of the layer."),
      propertyPath: PropertyPath,
      time: z
        .number()
        .optional()
        .describe("Time in seconds to read the value at. If omitted, reads the current value."),
      preExpression: z
        .boolean()
        .optional()
        .describe("If true and time is provided, read the pre-expression value. Default false."),
    },
    async ({ compId, layerIndex, propertyPath, time, preExpression }) => {
      const preExpr = preExpression === true;

      const inner =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        RESOLVE_PATH_FN +
        "var _segments = " + JSON.stringify(propertyPath) + ";\n" +
        "var _prop = _resolvePath(layer, _segments);\n" +
        "if (!_prop) {\n" +
        '  return { success: false, error: { message: "Property path not found.", code: "PROPERTY_NOT_FOUND" } };\n' +
        "}\n" +
        "function _serVal(prop, atTime, preExpr) {\n" +
        "  var v;\n" +
        "  if (atTime !== null && prop.canVaryOverTime) {\n" +
        "    v = prop.valueAtTime(atTime, preExpr);\n" +
        "  } else {\n" +
        "    v = prop.value;\n" +
        "  }\n" +
        "  if (v instanceof TextDocument) {\n" +
        "    return {\n" +
        "      text: v.text,\n" +
        "      font: v.font,\n" +
        "      fontSize: v.fontSize,\n" +
        "      fillColor: v.fillColor,\n" +
        "      strokeColor: v.strokeColor,\n" +
        "      justification: String(v.justification)\n" +
        "    };\n" +
        "  }\n" +
        "  if (v instanceof Shape) {\n" +
        "    return {\n" +
        "      vertices: v.vertices,\n" +
        "      inTangents: v.inTangents,\n" +
        "      outTangents: v.outTangents,\n" +
        "      closed: v.closed\n" +
        "    };\n" +
        "  }\n" +
        "  if (v instanceof Array) {\n" +
        "    var arr = [];\n" +
        "    for (var ai = 0; ai < v.length; ai++) arr.push(v[ai]);\n" +
        "    return arr;\n" +
        "  }\n" +
        "  return v;\n" +
        "}\n" +
        "var _result = {\n" +
        "  name: _prop.name,\n" +
        "  matchName: _prop.matchName,\n" +
        "  propertyType: (function() {\n" +
        "    if (_prop.propertyType === PropertyType.PROPERTY) return 'PROPERTY';\n" +
        "    if (_prop.propertyType === PropertyType.INDEXED_GROUP) return 'INDEXED_GROUP';\n" +
        "    if (_prop.propertyType === PropertyType.NAMED_GROUP) return 'NAMED_GROUP';\n" +
        "    return 'UNKNOWN';\n" +
        "  })()\n" +
        "};\n" +
        "if (_prop.propertyType === PropertyType.PROPERTY) {\n" +
        "  _result.value = _serVal(_prop, " + (time !== undefined ? String(time) : "null") + ", " + (preExpr ? "true" : "false") + ");\n" +
        "  try { _result.numKeys = _prop.numKeys; } catch(e) {}\n" +
        "  if (_prop.canSetExpression) {\n" +
        "    try { _result.expression = _prop.expression; } catch(e) {}\n" +
        "    try { _result.expressionEnabled = _prop.expressionEnabled; } catch(e) {}\n" +
        "  }\n" +
        "}\n" +
        "return { success: true, data: _result };\n";

      const script = wrapWithReturn(inner);
      return runScript(script, "get_property");
    }
  );

  // ── set_property ────────────────────────────────────────────────────────────

  server.tool(
    "set_property",
    "Set the value of any layer property. Use list_property_tree to discover property paths. " +
      "For transform properties, value shape must match exactly: " +
      "Position/Anchor Point = [x, y] or [x, y, z]; " +
      "Scale = [x, y] or [x, y, z]; " +
      "Rotation/Opacity = single number only. " +
      "If the property has keyframes, set clearKeyframes=true to remove them first, " +
      "or use set_property_keyframes instead.",
    {
      compId: z
        .number()
        .int()
        .positive()
        .describe("Numeric ID of the target composition."),
      layerIndex: z
        .number()
        .int()
        .positive()
        .describe("1-based index of the layer."),
      propertyPath: PropertyPath,
      value: z
        .union([z.number(), z.array(z.number()), z.boolean(), z.string()])
        .describe(
          "Value to set. For transform properties: " +
          "Position/Anchor Point = [x, y] or [x, y, z]; " +
          "Scale = [x, y] or [x, y, z]; " +
          "Rotation/Opacity = single number only. " +
          "Boolean for on/off properties, string for text properties."
        ),
      clearKeyframes: z
        .boolean()
        .optional()
        .describe("If true, remove all existing keyframes before setting the value. Default false."),
    },
    async ({ compId, layerIndex, propertyPath, value, clearKeyframes }) => {
      const clearKf = clearKeyframes === true;
      // Validate value shape for known transform properties
      const lastSeg = propertyPath[propertyPath.length - 1];
      const propHint = lastSeg.name || lastSeg.matchName || "";
      // Map common match names to friendly names for validation
      const matchNameMap: Record<string, string> = {
        "ADBE Position": "Position",
        "ADBE Scale": "Scale",
        "ADBE Rotate Z": "Rotation",
        "ADBE Opacity": "Opacity",
        "ADBE Anchor Point": "Anchor Point",
        "ADBE Position_0": "Position",
        "ADBE Position_1": "Position",
        "ADBE Position_2": "Position",
      };
      const knownProp = matchNameMap[propHint] || (["Position", "Scale", "Rotation", "Opacity", "Anchor Point"].includes(propHint) ? propHint : null);
      if (knownProp) {
        const valErr = validateTransformValue(knownProp, value);
        if (valErr) return valueShapeError(valErr);
      }
      const isStringValue = typeof value === "string";

      // Serialize the value to ES3 literal
      let valueLiteral: string;
      if (typeof value === "boolean") {
        valueLiteral = value ? "1" : "0";
      } else if (typeof value === "number") {
        valueLiteral = String(value);
      } else if (typeof value === "string") {
        valueLiteral = '"' + value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r") + '"';
      } else if (Array.isArray(value)) {
        valueLiteral = "[" + value.join(",") + "]";
      } else {
        valueLiteral = String(value);
      }

      const inner =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        RESOLVE_PATH_FN +
        "var _segments = " + JSON.stringify(propertyPath) + ";\n" +
        "var _prop = _resolvePath(layer, _segments);\n" +
        "if (!_prop) {\n" +
        '  return { success: false, error: { message: "Property path not found.", code: "PROPERTY_NOT_FOUND" } };\n' +
        "}\n" +
        "if (_prop.propertyType !== PropertyType.PROPERTY) {\n" +
        '  return { success: false, error: { message: "Path resolves to a group, not a settable property.", code: "NOT_A_PROPERTY" } };\n' +
        "}\n" +
        "if (_prop.numKeys > 0) {\n" +
        (clearKf
          ? "  for (var _rk = _prop.numKeys; _rk >= 1; _rk--) {\n" +
            "    _prop.removeKey(_rk);\n" +
            "  }\n"
          : '  return { success: false, error: { message: "Property has " + _prop.numKeys + " keyframes. Set clearKeyframes=true to remove them first, or use set_property_keyframes.", code: "HAS_KEYFRAMES" } };\n') +
        "}\n" +
        (isStringValue
          ? "var _existingValue = null;\n" +
            "try { _existingValue = _prop.value; } catch(_e) {}\n" +
            "if (_existingValue instanceof TextDocument) {\n" +
            "  _existingValue.text = " + valueLiteral + ";\n" +
            "  _prop.setValue(_existingValue);\n" +
            "} else {\n" +
            "  _prop.setValue(" + valueLiteral + ");\n" +
            "}\n"
          : "_prop.setValue(" + valueLiteral + ");\n") +
        "return {\n" +
        "  success: true,\n" +
        "  data: {\n" +
        "    name: _prop.name,\n" +
        "    matchName: _prop.matchName,\n" +
        "    newValue: _prop.value\n" +
        "  }\n" +
        "};\n";

      const script = wrapWithReturn(wrapInUndoGroup(inner, "set_property"));
      return runScript(script, "set_property");
    }
  );
}
