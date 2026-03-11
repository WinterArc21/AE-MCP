/**
 * script-builder.ts — ExtendScript string builder utilities.
 * All output is ES3-compatible for After Effects ExtendScript engine.
 */

export function escapeString(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\0/g, "\\0");
}

export function quoted(s: string): string {
  return '"' + escapeString(s) + '"';
}

export function returnSuccess(dataExpr: string): string {
  return "return { success: true, data: " + dataExpr + " };\n";
}

export function returnError(message: string, code = "SCRIPT_ERROR"): string {
  return (
    'return { success: false, error: { message: "' +
    escapeString(message) +
    '", code: "' +
    escapeString(code) +
    '" } };\n'
  );
}

export function wrapInUndoGroup(script: string, groupName: string): string {
  return (
    'app.beginUndoGroup("' + escapeString(groupName) + '");\n' +
    "try {\n" +
    script +
    "\n} finally {\n" +
    "  app.endUndoGroup();\n" +
    "}\n" +
    ""
  );
}

export function wrapWithReturn(script: string): string {
  const indented = script
    .split("\n")
    .map((line) => "    " + line)
    .join("\n");
  return (
    "(function() {\n" +
    "  try {\n" +
    indented + "\n" +
    "  } catch(e) {\n" +
    '    return { success: false, error: { message: e.toString(), code: "EXECUTION_ERROR", line: e.line !== undefined ? e.line : -1 } };\n' +
    "  }\n" +
    "})();"
  );
}

export function findCompById(varName: string, compId: number | string): string {
  return (
    "var " + varName + " = app.project.itemByID(" + compId + ");\n" +
    "if (!" + varName + " || !(" + varName + " instanceof CompItem)) {\n" +
    '  return { success: false, error: { message: "Composition not found with id: " + ' + compId + ', code: "COMP_NOT_FOUND" } };\n' +
    "}\n"
  );
}

export function findLayerByIndex(varName: string, compVar: string, layerIndex: number): string {
  return (
    "if (" + layerIndex + " < 1 || " + layerIndex + " > " + compVar + ".numLayers) {\n" +
    '  return { success: false, error: { message: "Layer index out of range: " + ' + layerIndex + ', code: "LAYER_NOT_FOUND" } };\n' +
    "}\n" +
    "var " + varName + " = " + compVar + ".layer(" + layerIndex + ");\n"
  );
}

export function findLayerByName(varName: string, compVar: string, name: string): string {
  const escaped = escapeString(name);
  return (
    "var " + varName + " = null;\n" +
    "for (var _li = 1; _li <= " + compVar + ".numLayers; _li++) {\n" +
    '  if (' + compVar + '.layer(_li).name === "' + escaped + '") {\n' +
    "    " + varName + " = " + compVar + ".layer(_li);\n" +
    "    break;\n" +
    "  }\n" +
    "}\n" +
    "if (!" + varName + ") {\n" +
    '  return { success: false, error: { message: "Layer not found: ' + escaped + '", code: "LAYER_NOT_FOUND" } };\n' +
    "}\n"
  );
}

export function colorToAE(color: number[]): string {
  if (color.length < 3) {
    throw new TypeError("colorToAE expects at least 3 elements, got " + color.length);
  }
  const clamped = color.map((v) => Math.max(0, Math.min(1, v)));
  return "[" + clamped.join(",") + "]";
}

/** Alias for colorToAE — accepts [r,g,b] normalized 0-1. */
export function colorLiteral(color: number[]): string {
  return colorToAE(color);
}

export function arrayToAE(arr: number[]): string {
  return "[" + arr.join(",") + "]";
}

export function boolToAE(value: boolean): string {
  return value ? "true" : "false";
}

export function propertyPath(layerVar: string, matchNames: string[]): string {
  let expr = layerVar;
  for (const name of matchNames) {
    expr = expr + '.property("' + escapeString(name) + '")';
  }
  return expr;
}

export function transformProp(layerVar: string, propName: string): string {
  return layerVar + '.property("Transform").property("' + escapeString(propName) + '")';
}

export function setKeyframe(propExpr: string, time: number, value: string): string {
  return propExpr + ".setValueAtTime(" + time + ", " + value + ");\n";
}

export function easyEaseKeyframe(propExpr: string, keyIndex: number, influence = 33.33): string {
  const ki = "_ke" + keyIndex;
  const suffix = "_ee" + keyIndex;
  return (
    "var " + ki + " = new KeyframeEase(0, " + influence + ");\n" +
    propExpr + ".setInterpolationTypeAtKey(" + keyIndex + ", KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);\n" +
    "var _dims" + suffix + " = 1;\n" +
    "try {\n" +
    "  var _kv" + suffix + " = " + propExpr + ".keyValue(" + keyIndex + ");\n" +
    "  if (_kv" + suffix + " instanceof Array) { _dims" + suffix + " = _kv" + suffix + ".length; }\n" +
    "} catch(e) {}\n" +
    "var _eArr" + suffix + " = [];\n" +
    "for (var _di" + suffix + " = 0; _di" + suffix + " < _dims" + suffix + "; _di" + suffix + "++) {\n" +
    "  _eArr" + suffix + ".push(" + ki + ");\n" +
    "}\n" +
    propExpr + ".setTemporalEaseAtKey(" + keyIndex + ", _eArr" + suffix + ", _eArr" + suffix + ");\n"
  );
}

export function ensureProject(): string {
  return "if (!app.project) {\n  app.newProject();\n}\n";
}

export function compInfoObject(compVar: string): string {
  return (
    "{\n" +
    "  id: " + compVar + ".id,\n" +
    "  name: " + compVar + ".name,\n" +
    "  width: " + compVar + ".width,\n" +
    "  height: " + compVar + ".height,\n" +
    "  duration: " + compVar + ".duration,\n" +
    "  frameRate: " + compVar + ".frameRate,\n" +
    "  numLayers: " + compVar + ".numLayers\n" +
    "}"
  );
}

export function layerInfoObject(layerVar: string): string {
  return (
    "{\n" +
    "  index: " + layerVar + ".index,\n" +
    "  name: " + layerVar + ".name,\n" +
    "  enabled: " + layerVar + ".enabled,\n" +
    "  solo: " + layerVar + ".solo,\n" +
    "  locked: " + layerVar + ".locked,\n" +
    "  inPoint: " + layerVar + ".inPoint,\n" +
    "  outPoint: " + layerVar + ".outPoint,\n" +
    "  startTime: " + layerVar + ".startTime\n" +
    "}"
  );
}
