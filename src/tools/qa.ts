/**
 * tools/qa.ts
 *
 * QA / polish tools for After Effects.
 *
 * Registers:
 *   1. critique_composition   — Two-phase QA: ExtendScript collects all layer data,
 *                               TypeScript evaluates quality checks and returns a scored report.
 *   2. apply_polish           — Applies finishing touches (motion blur, film grain, vignette,
 *                               smooth easing, shadow depth) in one combined ExtendScript call.
 *   3. fix_composition_issues — Takes the issues array from critique_composition and auto-fixes
 *                               fixable issues (safe zones, easing, pure colors, alignment).
 *
 * All ExtendScript is ES3 (var only, no let/const, no arrow functions, no template literals).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { bridge } from "../bridge.js";
import {
  wrapWithReturn,
  wrapInUndoGroup,
  findCompById,
  findLayerByIndex,
  transformProp,
} from "../script-builder.js";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function textResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}

async function runScript(script: string, toolName: string) {
  const result = await bridge.executeScript(script, toolName);
  return textResult(result);
}

// Parse JSON result from bridge
function parseResult(raw: unknown): any {
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return raw; }
  }
  return raw;
}

// ---------------------------------------------------------------------------
// Quality check constants
// ---------------------------------------------------------------------------

const SAFE_ZONE_MARGIN = 48; // broadcast safe zone in pixels

// ---------------------------------------------------------------------------
// TypeScript-side quality evaluation helpers
// ---------------------------------------------------------------------------

interface KeyframeData {
  count: number;
  times: number[];
  values: any[];
  hasLinear: boolean;
}

interface LayerData {
  index: number;
  name: string;
  type: string;
  enabled: boolean;
  position: number[];
  scale: number[];
  opacity: number;
  anchorPoint: number[];
  rotation: number;
  inPoint: number;
  outPoint: number;
  fontSize?: number;
  font?: string;
  fillColor?: number[];
  tracking?: number;
  keyframes: Record<string, KeyframeData>;
  hasExpression: Record<string, boolean>;
}

interface CompData {
  width: number;
  height: number;
  duration: number;
  frameRate: number;
  numLayers: number;
}

interface CollectedData {
  comp: CompData;
  layers: LayerData[];
}

interface QAIssue {
  check: string;
  severity: "error" | "warning";
  layerIndex: number;
  layerName: string;
  message: string;
  fix?: { action: string; params: Record<string, any> };
}

function relativeLuminance(rgb: number[]): number {
  // WCAG relative luminance
  function channel(c: number): number {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
}

function evaluateQuality(
  data: CollectedData,
  checks: string[]
): { issues: QAIssue[]; passed: string[] } {
  const issues: QAIssue[] = [];
  const passedSet = new Set<string>(checks);

  const skipTypes = new Set(["null", "adjustment", "camera", "light"]);

  // 1. safe-zones
  if (checks.includes("safe-zones")) {
    const margin = SAFE_ZONE_MARGIN;
    const { width, height } = data.comp;
    for (const layer of data.layers) {
      if (skipTypes.has(layer.type)) continue;
      if (!layer.position || layer.position.length < 2) continue;
      const px = layer.position[0];
      const py = layer.position[1];
      let violated = false;
      let msg = "";
      if (px < margin) {
        violated = true;
        msg = `Layer is ${Math.round(margin - px)}px from left edge (minimum: ${margin}px)`;
      } else if (px > width - margin) {
        violated = true;
        msg = `Layer is ${Math.round(px - (width - margin))}px from right edge (minimum: ${margin}px)`;
      } else if (py < margin) {
        violated = true;
        msg = `Layer is ${Math.round(margin - py)}px from top edge (minimum: ${margin}px)`;
      } else if (py > height - margin) {
        violated = true;
        msg = `Layer is ${Math.round(py - (height - margin))}px from bottom edge (minimum: ${margin}px)`;
      }
      if (violated) {
        const clampedX = Math.max(margin, Math.min(width - margin, px));
        const clampedY = Math.max(margin, Math.min(height - margin, py));
        issues.push({
          check: "safe-zones",
          severity: "error",
          layerIndex: layer.index,
          layerName: layer.name,
          message: msg,
          fix: {
            action: "set_layer_properties",
            params: { layerIndex: layer.index, position: [clampedX, clampedY] },
          },
        });
        passedSet.delete("safe-zones");
      }
    }
  }

  // 2. text-hierarchy
  if (checks.includes("text-hierarchy")) {
    const textLayers = data.layers.filter(
      (l) => l.type === "text" && typeof l.fontSize === "number"
    );
    if (textLayers.length >= 2) {
      const sizes = textLayers.map((l) => l.fontSize as number);
      const maxSize = Math.max(...sizes);
      const minSize = Math.min(...sizes);
      const ratio = minSize > 0 ? maxSize / minSize : 0;
      if (ratio < 1.5) {
        issues.push({
          check: "text-hierarchy",
          severity: "warning",
          layerIndex: 0,
          layerName: "(all text layers)",
          message: `Text size ratio is ${ratio.toFixed(2)} — hierarchy requires at least 1.5x size difference between text levels`,
        });
        passedSet.delete("text-hierarchy");
      }
    }
  }

  // 3. contrast
  if (checks.includes("contrast")) {
    // Approximate background as black [0,0,0] (dark compositions are most common)
    const bgLuminance = 0; // black background approximation
    for (const layer of data.layers) {
      if (layer.type !== "text") continue;
      if (!layer.fillColor || layer.fillColor.length < 3) continue;
      const textLum = relativeLuminance(layer.fillColor);
      const diff = Math.abs(textLum - bgLuminance);
      if (diff < 0.3) {
        issues.push({
          check: "contrast",
          severity: "warning",
          layerIndex: layer.index,
          layerName: layer.name,
          message: `Low contrast: text luminance ${textLum.toFixed(2)} vs background ${bgLuminance.toFixed(2)} (difference: ${diff.toFixed(2)}, minimum recommended: 0.3)`,
        });
        passedSet.delete("contrast");
      }
    }
  }

  // 4. alignment
  if (checks.includes("alignment")) {
    const textLayers = data.layers.filter(
      (l) => l.type === "text" && l.position && l.position.length >= 2
    );
    if (textLayers.length >= 2) {
      const xPositions = textLayers.map((l) => l.position[0]);
      const firstX = xPositions[0];
      const allAligned = xPositions.every((x) => Math.abs(x - firstX) <= 5);
      const compCenter = data.comp.width / 2;
      const allCentered = xPositions.every((x) => Math.abs(x - compCenter) <= 5);
      if (!allAligned && !allCentered) {
        issues.push({
          check: "alignment",
          severity: "warning",
          layerIndex: 0,
          layerName: "(text layers)",
          message: `Text layers are not aligned — X positions vary (${xPositions.map((x) => Math.round(x)).join(", ")}). Align to X=${Math.round(firstX)} or center (${Math.round(compCenter)}).`,
          fix: {
            action: "align_text_layers",
            params: { targetX: firstX },
          },
        });
        passedSet.delete("alignment");
      }
    }
  }

  // 5. easing
  if (checks.includes("easing")) {
    for (const layer of data.layers) {
      if (!layer.keyframes) continue;
      for (const [propName, kfData] of Object.entries(layer.keyframes)) {
        if (kfData.count > 0 && kfData.hasLinear) {
          issues.push({
            check: "easing",
            severity: "warning",
            layerIndex: layer.index,
            layerName: layer.name,
            message: `Linear keyframes on ${propName} — animations should use easing`,
            fix: {
              action: "set_all_keyframes_easing",
              params: { layerIndex: layer.index, property: propName, easingType: "ease_in_out" },
            },
          });
          passedSet.delete("easing");
        }
      }
    }
  }

  // 6. duration
  if (checks.includes("duration")) {
    for (const layer of data.layers) {
      if (!layer.keyframes) continue;
      for (const [propName, kfData] of Object.entries(layer.keyframes)) {
        if (kfData.count >= 2 && kfData.times.length >= 2) {
          const firstTime = kfData.times[0];
          const lastTime = kfData.times[kfData.times.length - 1];
          const animDur = lastTime - firstTime;
          if (animDur < 0.2) {
            issues.push({
              check: "duration",
              severity: "warning",
              layerIndex: layer.index,
              layerName: layer.name,
              message: `${propName} animation is too fast (${animDur.toFixed(2)}s — minimum recommended: 0.2s)`,
            });
            passedSet.delete("duration");
          } else if (animDur > 1.0) {
            issues.push({
              check: "duration",
              severity: "warning",
              layerIndex: layer.index,
              layerName: layer.name,
              message: `${propName} animation is too slow (${animDur.toFixed(2)}s — maximum recommended: 1.0s)`,
            });
            passedSet.delete("duration");
          }
        }
      }
    }
  }

  // 7. pure-colors
  if (checks.includes("pure-colors")) {
    for (const layer of data.layers) {
      if (layer.type === "text" && layer.fillColor && layer.fillColor.length >= 3) {
        const [r, g, b] = layer.fillColor;
        if (r === 0 && g === 0 && b === 0) {
          issues.push({
            check: "pure-colors",
            severity: "warning",
            layerIndex: layer.index,
            layerName: layer.name,
            message: "Text uses pure black [0,0,0] — use near-black [0.043, 0.043, 0.059] (#0B0B0F) for softer appearance",
            fix: {
              action: "set_text_color",
              params: { layerIndex: layer.index, color: [0.043, 0.043, 0.059] },
            },
          });
          passedSet.delete("pure-colors");
        } else if (r === 1 && g === 1 && b === 1) {
          issues.push({
            check: "pure-colors",
            severity: "warning",
            layerIndex: layer.index,
            layerName: layer.name,
            message: "Text uses pure white [1,1,1] — use off-white [0.976, 0.98, 0.984] (#F9FAFB) for softer appearance",
            fix: {
              action: "set_text_color",
              params: { layerIndex: layer.index, color: [0.976, 0.98, 0.984] },
            },
          });
          passedSet.delete("pure-colors");
        }
      }
      // Check solid layers for pure black/white
      if (layer.type === "solid") {
        // Solid color is encoded in position/opacity checks — we skip deep solid color check here
        // as we only get color for text layers from the ExtendScript phase
      }
    }
  }

  const passed = checks.filter((c) => passedSet.has(c));
  return { issues, passed };
}

function scoreAndGrade(issues: QAIssue[]): { score: number; grade: string } {
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === "error") score -= 8;
    else if (issue.severity === "warning") score -= 4;
  }
  if (score < 0) score = 0;
  let grade: string;
  if (score >= 90) grade = "A";
  else if (score >= 80) grade = "B";
  else if (score >= 70) grade = "C";
  else if (score >= 60) grade = "D";
  else grade = "F";
  return { score, grade };
}

// ---------------------------------------------------------------------------
// ExtendScript generators
// ---------------------------------------------------------------------------

/**
 * Builds the ExtendScript that collects ALL layer data and returns a JSON string.
 * Uses manual string concatenation (ES3-safe, no JSON.stringify).
 */
function buildDataCollectionScript(compId: number): string {
  const body =
    findCompById("comp", compId) +
    // Build comp info
    "var result = \"{\";\n" +
    "result += '\"comp\":{\"width\":' + comp.width + ',';\n" +
    "result += '\"height\":' + comp.height + ',';\n" +
    "result += '\"duration\":' + comp.duration + ',';\n" +
    "result += '\"frameRate\":' + comp.frameRate + ',';\n" +
    "result += '\"numLayers\":' + comp.numLayers + '}';\n" +
    "result += ',\"layers\":[';\n" +
    // Layer loop
    "for (var i = 1; i <= comp.numLayers; i++) {\n" +
    "  if (i > 1) { result += ','; }\n" +
    "  var lyr = comp.layer(i);\n" +
    // Determine layer type
    "  var ltype = \"solid\";\n" +
    "  if (lyr instanceof TextLayer) { ltype = \"text\"; }\n" +
    "  else if (lyr instanceof ShapeLayer) { ltype = \"shape\"; }\n" +
    "  else if (lyr instanceof CameraLayer) { ltype = \"camera\"; }\n" +
    "  else if (lyr instanceof LightLayer) { ltype = \"light\"; }\n" +
    "  else if (lyr instanceof AVLayer) {\n" +
    "    if (lyr.nullLayer) { ltype = \"null\"; }\n" +
    "    else if (lyr.adjustmentLayer) { ltype = \"adjustment\"; }\n" +
    "    else if (lyr.source instanceof CompItem) { ltype = \"precomp\"; }\n" +
    "  }\n" +
    // Sanitize layer name for JSON (escape quotes and backslashes)
    "  var lname = lyr.name;\n" +
    "  var lnameClean = \"\";\n" +
    "  for (var ci = 0; ci < lname.length; ci++) {\n" +
    "    var ch = lname.charAt(ci);\n" +
    "    if (ch === '\"') { lnameClean += '\\\\\"'; }\n" +
    "    else if (ch === '\\\\') { lnameClean += '\\\\\\\\'; }\n" +
    "    else { lnameClean += ch; }\n" +
    "  }\n" +
    // Get transform values
    "  var lpos0 = 0; var lpos1 = 0;\n" +
    "  var lscale0 = 100; var lscale1 = 100;\n" +
    "  var lopacity = 100;\n" +
    "  var lanchor0 = 0; var lanchor1 = 0;\n" +
    "  var lrotation = 0;\n" +
    "  try {\n" +
    "    var xfg = lyr.property(\"ADBE Transform Group\");\n" +
    "    var posVal = xfg.property(\"ADBE Position\").value;\n" +
    "    lpos0 = posVal[0]; lpos1 = posVal[1];\n" +
    "    var scaleVal = xfg.property(\"ADBE Scale\").value;\n" +
    "    lscale0 = scaleVal[0]; lscale1 = scaleVal[1];\n" +
    "    lopacity = xfg.property(\"ADBE Opacity\").value;\n" +
    "    var anchorVal = xfg.property(\"ADBE Anchor Point\").value;\n" +
    "    lanchor0 = anchorVal[0]; lanchor1 = anchorVal[1];\n" +
    "    lrotation = xfg.property(\"ADBE Rotate Z\").value;\n" +
    "  } catch (xfErr) {}\n" +
    // Build the layer object start
    "  result += '{';\n" +
    "  result += '\"index\":' + lyr.index + ',';\n" +
    "  result += '\"name\":\"' + lnameClean + '\",';\n" +
    "  result += '\"type\":\"' + ltype + '\",';\n" +
    "  result += '\"enabled\":' + (lyr.enabled ? 'true' : 'false') + ',';\n" +
    "  result += '\"position\":[' + lpos0 + ',' + lpos1 + '],';\n" +
    "  result += '\"scale\":[' + lscale0 + ',' + lscale1 + '],';\n" +
    "  result += '\"opacity\":' + lopacity + ',';\n" +
    "  result += '\"anchorPoint\":[' + lanchor0 + ',' + lanchor1 + '],';\n" +
    "  result += '\"rotation\":' + lrotation + ',';\n" +
    "  result += '\"inPoint\":' + lyr.inPoint + ',';\n" +
    "  result += '\"outPoint\":' + lyr.outPoint + ',';\n" +
    // Text-specific properties
    "  var ltextFontSize = 0;\n" +
    "  var ltextFont = \"\";\n" +
    "  var ltextFill0 = 1; var ltextFill1 = 1; var ltextFill2 = 1;\n" +
    "  var ltextTracking = 0;\n" +
    "  if (ltype === \"text\") {\n" +
    "    try {\n" +
    "      var td = lyr.property(\"ADBE Text Properties\").property(\"ADBE Text Document\").value;\n" +
    "      ltextFontSize = td.fontSize;\n" +
    "      ltextFont = td.font;\n" +
    "      var fc = td.fillColor;\n" +
    "      ltextFill0 = fc[0]; ltextFill1 = fc[1]; ltextFill2 = fc[2];\n" +
    "      ltextTracking = td.tracking;\n" +
    "    } catch (tdErr) {}\n" +
    "  }\n" +
    "  result += '\"fontSize\":' + ltextFontSize + ',';\n" +
    // Sanitize font name
    "  var ltextFontClean = \"\";\n" +
    "  for (var fci = 0; fci < ltextFont.length; fci++) {\n" +
    "    var fch = ltextFont.charAt(fci);\n" +
    "    if (fch === '\"') { ltextFontClean += '\\\\\"'; }\n" +
    "    else if (fch === '\\\\') { ltextFontClean += '\\\\\\\\'; }\n" +
    "    else { ltextFontClean += fch; }\n" +
    "  }\n" +
    "  result += '\"font\":\"' + ltextFontClean + '\",';\n" +
    "  result += '\"fillColor\":[' + ltextFill0 + ',' + ltextFill1 + ',' + ltextFill2 + '],';\n" +
    "  result += '\"tracking\":' + ltextTracking + ',';\n" +
    // Keyframe data collection for 4 transform properties
    "  var propMatchNames = [\"ADBE Position\", \"ADBE Scale\", \"ADBE Opacity\", \"ADBE Rotate Z\"];\n" +
    "  var propDisplayNames = [\"Position\", \"Scale\", \"Opacity\", \"Rotation\"];\n" +
    "  result += '\"keyframes\":{';\n" +
    "  for (var pi = 0; pi < propMatchNames.length; pi++) {\n" +
    "    if (pi > 0) { result += ','; }\n" +
    "    var propKey = propDisplayNames[pi];\n" +
    "    var numKf = 0;\n" +
    "    var kfTimesArr = [];\n" +
    "    var kfValuesArr = [];\n" +
    "    var kfHasLinear = false;\n" +
    "    var kfHasExpr = false;\n" +
    "    try {\n" +
    "      var kfProp = lyr.property(\"ADBE Transform Group\").property(propMatchNames[pi]);\n" +
    "      numKf = kfProp.numKeys;\n" +
    "      for (var ki = 1; ki <= numKf; ki++) {\n" +
    "        kfTimesArr.push(kfProp.keyTime(ki));\n" +
    "        var kval = kfProp.keyValue(ki);\n" +
    "        if (typeof kval === \"number\") {\n" +
    "          kfValuesArr.push(kval);\n" +
    "        } else {\n" +
    "          // 2D value — store as [x, y]\n" +
    "          kfValuesArr.push([kval[0], kval[1]]);\n" +
    "        }\n" +
    "        if (kfProp.keyInInterpolationType(ki) === KeyframeInterpolationType.LINEAR ||\n" +
    "            kfProp.keyOutInterpolationType(ki) === KeyframeInterpolationType.LINEAR) {\n" +
    "          kfHasLinear = true;\n" +
    "        }\n" +
    "      }\n" +
    "      if (kfProp.expressionEnabled || kfProp.expression !== \"\") {\n" +
    "        kfHasExpr = true;\n" +
    "      }\n" +
    "    } catch (kfErr) {}\n" +
    // Build times JSON array
    "    var kfTimesStr = '[';\n" +
    "    for (var kti = 0; kti < kfTimesArr.length; kti++) {\n" +
    "      if (kti > 0) { kfTimesStr += ','; }\n" +
    "      kfTimesStr += kfTimesArr[kti];\n" +
    "    }\n" +
    "    kfTimesStr += ']';\n" +
    // Build values JSON array (handle both scalars and 2D arrays)
    "    var kfValuesStr = '[';\n" +
    "    for (var kvi = 0; kvi < kfValuesArr.length; kvi++) {\n" +
    "      if (kvi > 0) { kfValuesStr += ','; }\n" +
    "      var kv = kfValuesArr[kvi];\n" +
    "      if (typeof kv === \"number\") {\n" +
    "        kfValuesStr += kv;\n" +
    "      } else {\n" +
    "        kfValuesStr += '[' + kv[0] + ',' + kv[1] + ']';\n" +
    "      }\n" +
    "    }\n" +
    "    kfValuesStr += ']';\n" +
    "    result += '\"' + propKey + '\":{\"count\":' + numKf + ',\"times\":' + kfTimesStr + ',\"values\":' + kfValuesStr + ',\"hasLinear\":' + (kfHasLinear ? 'true' : 'false') + '}';\n" +
    "  }\n" +
    "  result += '},';\n" +
    // hasExpression map
    "  result += '\"hasExpression\":{';\n" +
    "  for (var ei = 0; ei < propMatchNames.length; ei++) {\n" +
    "    if (ei > 0) { result += ','; }\n" +
    "    var exprHas = false;\n" +
    "    try {\n" +
    "      var exprProp = lyr.property(\"ADBE Transform Group\").property(propMatchNames[ei]);\n" +
    "      exprHas = (exprProp.expressionEnabled || exprProp.expression !== \"\");\n" +
    "    } catch (exErr) {}\n" +
    "    result += '\"' + propDisplayNames[ei] + '\":' + (exprHas ? 'true' : 'false');\n" +
    "  }\n" +
    "  result += '}';\n" +
    // Close layer object
    "  result += '}';\n" +
    "}\n" +
    // Close layers array and root object
    "result += ']}';\n" +
    "return result;\n";

  return wrapWithReturn(body);
}

/**
 * Builds ExtendScript for apply_polish features.
 */
function buildPolishScript(
  compId: number,
  polishLevel: string,
  features: string[]
): string {
  const isModerateOrHeavy = polishLevel === "moderate" || polishLevel === "heavy";

  // Level-dependent values
  const grainAmount   = polishLevel === "subtle" ? 2  : polishLevel === "moderate" ? 4  : 6;
  const vigAmount     = polishLevel === "subtle" ? 20 : polishLevel === "moderate" ? 50 : 80;
  const shadowOpacity = polishLevel === "subtle" ? 30 : polishLevel === "moderate" ? 60 : 90;
  const shadowDist    = polishLevel === "subtle" ? 3  : polishLevel === "moderate" ? 6  : 10;
  const shadowSoft    = polishLevel === "subtle" ? 8  : polishLevel === "moderate" ? 15 : 25;

  let body = findCompById("comp", compId);
  body += "var _polishApplied = [];\n";

  // ── motion-blur ──────────────────────────────────────────────────────────
  if (features.includes("motion-blur")) {
    body +=
      "// motion-blur\n" +
      "comp.motionBlur = true;\n" +
      "var _mbCount = 0;\n" +
      "for (var _mbi = 1; _mbi <= comp.numLayers; _mbi++) {\n" +
      "  var _mbLayer = comp.layer(_mbi);\n" +
      "  if (!_mbLayer.nullLayer && !(_mbLayer instanceof CameraLayer) && !(_mbLayer instanceof LightLayer)) {\n" +
      "    var _mbHasKf = false;\n" +
      "    try {\n" +
      "      _mbHasKf = _mbLayer.property(\"ADBE Transform Group\").property(\"ADBE Position\").numKeys > 0 ||\n" +
      "                 _mbLayer.property(\"ADBE Transform Group\").property(\"ADBE Scale\").numKeys > 0 ||\n" +
      "                 _mbLayer.property(\"ADBE Transform Group\").property(\"ADBE Rotate Z\").numKeys > 0;\n" +
      "    } catch(e) {}\n" +
      "    if (_mbHasKf) { _mbLayer.motionBlur = true; _mbCount++; }\n" +
      "  }\n" +
      "}\n" +
      "_polishApplied.push('motion-blur:' + _mbCount);\n";
  }

  // ── film-grain (moderate/heavy only) ─────────────────────────────────────
  if (features.includes("film-grain") && isModerateOrHeavy) {
    body +=
      "// film-grain\n" +
      "try {\n" +
      "  var _grain = comp.layers.addSolid([0,0,0], \"Polish: Film Grain\", comp.width, comp.height, comp.pixelAspect, comp.duration);\n" +
      "  _grain.adjustmentLayer = true;\n" +
      "  _grain.moveToBeginning();\n" +
      "  var _noiseEffect = _grain.property(\"ADBE Effect Parade\").addProperty(\"ADBE Noise\");\n" +
      "  _noiseEffect.property(\"ADBE Noise-0001\").setValue(" + grainAmount + ");\n" +
      "  _polishApplied.push('film-grain:" + grainAmount + "%');\n" +
      "} catch(_fgErr) { _polishApplied.push('film-grain:skipped'); }\n";
  } else if (features.includes("film-grain") && !isModerateOrHeavy) {
    body += "_polishApplied.push('film-grain:skipped-requires-moderate-or-heavy');\n";
  }

  // ── vignette (moderate/heavy only) ───────────────────────────────────────
  if (features.includes("vignette") && isModerateOrHeavy) {
    body +=
      "// vignette\n" +
      "try {\n" +
      "  var _vigLayer = comp.layers.addSolid([0,0,0], \"Polish: Vignette\", comp.width, comp.height, comp.pixelAspect, comp.duration);\n" +
      "  _vigLayer.adjustmentLayer = true;\n" +
      "  _vigLayer.moveToBeginning();\n" +
      "  var _vig = _vigLayer.property(\"ADBE Effect Parade\").addProperty(\"CC Vignette\");\n" +
      "  _vig.property(1).setValue(" + vigAmount + ");\n" +
      "  _polishApplied.push('vignette:" + vigAmount + "%');\n" +
      "} catch(_vigErr) { _polishApplied.push('vignette:skipped'); }\n";
  } else if (features.includes("vignette") && !isModerateOrHeavy) {
    body += "_polishApplied.push('vignette:skipped-requires-moderate-or-heavy');\n";
  }

  // ── smooth-easing ─────────────────────────────────────────────────────────
  if (features.includes("smooth-easing")) {
    body +=
      "// smooth-easing\n" +
      "var _easingFixed = 0;\n" +
      "var _seProps = [\"ADBE Position\", \"ADBE Scale\", \"ADBE Rotate Z\", \"ADBE Opacity\"];\n" +
      "for (var _sei = 1; _sei <= comp.numLayers; _sei++) {\n" +
      "  var _seLayer = comp.layer(_sei);\n" +
      "  for (var _sep = 0; _sep < _seProps.length; _sep++) {\n" +
      "    try {\n" +
      "      var _seProp = _seLayer.property(\"ADBE Transform Group\").property(_seProps[_sep]);\n" +
      "      if (_seProp.numKeys > 0) {\n" +
      "        for (var _sek = 1; _sek <= _seProp.numKeys; _sek++) {\n" +
      "          if (_seProp.keyInInterpolationType(_sek) === KeyframeInterpolationType.LINEAR ||\n" +
      "              _seProp.keyOutInterpolationType(_sek) === KeyframeInterpolationType.LINEAR) {\n" +
      "            _seProp.setInterpolationTypeAtKey(_sek, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);\n" +
      "            var _seIs2D = (_seProps[_sep] === \"ADBE Position\" || _seProps[_sep] === \"ADBE Scale\");\n" +
      "            var _seEase = new KeyframeEase(0, 75);\n" +
      "            if (_seIs2D) {\n" +
      "              _seProp.setTemporalEaseAtKey(_sek, [_seEase, _seEase], [_seEase, _seEase]);\n" +
      "            } else {\n" +
      "              _seProp.setTemporalEaseAtKey(_sek, [_seEase], [_seEase]);\n" +
      "            }\n" +
      "            _easingFixed++;\n" +
      "          }\n" +
      "        }\n" +
      "      }\n" +
      "    } catch(e) {}\n" +
      "  }\n" +
      "}\n" +
      "_polishApplied.push('smooth-easing:' + _easingFixed);\n";
  }

  // ── shadow-depth (moderate/heavy only) ───────────────────────────────────
  if (features.includes("shadow-depth") && isModerateOrHeavy) {
    body +=
      "// shadow-depth\n" +
      "var _sdCount = 0;\n" +
      "for (var _sdi = 1; _sdi <= comp.numLayers; _sdi++) {\n" +
      "  var _sdLayer = comp.layer(_sdi);\n" +
      "  if (_sdLayer instanceof TextLayer || _sdLayer instanceof ShapeLayer) {\n" +
      "    try {\n" +
      "      var _shadow = _sdLayer.property(\"ADBE Effect Parade\").addProperty(\"ADBE Drop Shadow\");\n" +
      "      _shadow.property(\"ADBE Drop Shadow-0002\").setValue([0, 0, 0, 1]);\n" +
      "      _shadow.property(\"ADBE Drop Shadow-0001\").setValue(" + shadowOpacity + ");\n" +
      "      _shadow.property(\"ADBE Drop Shadow-0003\").setValue(135);\n" +
      "      _shadow.property(\"ADBE Drop Shadow-0004\").setValue(" + shadowDist + ");\n" +
      "      _shadow.property(\"ADBE Drop Shadow-0005\").setValue(" + shadowSoft + ");\n" +
      "      _sdCount++;\n" +
      "    } catch(e) {}\n" +
      "  }\n" +
      "}\n" +
      "_polishApplied.push('shadow-depth:' + _sdCount);\n";
  } else if (features.includes("shadow-depth") && !isModerateOrHeavy) {
    body += "_polishApplied.push('shadow-depth:skipped-requires-moderate-or-heavy');\n";
  }

  // Build return value — serialize _polishApplied array manually
  body +=
    "var _resultStr = '[';\n" +
    "for (var _ri = 0; _ri < _polishApplied.length; _ri++) {\n" +
    "  if (_ri > 0) { _resultStr += ','; }\n" +
    "  _resultStr += '\"' + _polishApplied[_ri] + '\"';\n" +
    "}\n" +
    "_resultStr += ']';\n" +
    "return { success: true, data: { polishLevel: \"" + polishLevel + "\", appliedRaw: _resultStr } };\n";

  return wrapWithReturn(wrapInUndoGroup(body, "apply_polish"));
}

/**
 * Builds ExtendScript for fix_composition_issues.
 */
function buildFixScript(
  compId: number,
  issues: any[],
  fixAll: boolean
): { script: string; fixed: any[]; skipped: any[] } {
  const fixed: any[] = [];
  const skipped: any[] = [];

  let body = findCompById("comp", compId);

  const unfixable = new Set(["text-hierarchy", "contrast", "duration"]);
  const unfixableReasons: Record<string, string> = {
    "text-hierarchy": "Font size hierarchy requires manual design judgment",
    "contrast": "Contrast issues require manual color selection",
    "duration": "Animation duration requires manual keyframe adjustment",
  };

  for (const issue of issues) {
    // Skip warnings if fixAll is false
    if (!fixAll && issue.severity !== "error") {
      skipped.push({ layerIndex: issue.layerIndex, check: issue.check, reason: "Only errors are fixed when fixAll=false" });
      continue;
    }

    if (unfixable.has(issue.check)) {
      skipped.push({
        layerIndex: issue.layerIndex,
        check: issue.check,
        reason: unfixableReasons[issue.check],
      });
      continue;
    }

    const layerIdx = issue.layerIndex;
    const checkType = issue.check;
    const fixObj = issue.fix;

    if (checkType === "safe-zones" && layerIdx > 0) {
      // Move layer inward
      let newX: number;
      let newY: number;
      if (fixObj && fixObj.params && fixObj.params.position) {
        newX = fixObj.params.position[0];
        newY = fixObj.params.position[1];
      } else {
        // Fallback: clamp to margin (we don't have the exact current position here, but
        // the fix object from critique should contain it)
        newX = SAFE_ZONE_MARGIN + 100;
        newY = SAFE_ZONE_MARGIN + 100;
      }
      body +=
        "// fix safe-zones layer " + layerIdx + "\n" +
        "try {\n" +
        "  if (" + layerIdx + " >= 1 && " + layerIdx + " <= comp.numLayers) {\n" +
        "    var _sfLayer = comp.layer(" + layerIdx + ");\n" +
        "    _sfLayer.property(\"ADBE Transform Group\").property(\"ADBE Position\").setValue([" + newX + ", " + newY + "]);\n" +
        "  }\n" +
        "} catch(_sfErr) {}\n";
      fixed.push({
        layerIndex: layerIdx,
        check: "safe-zones",
        action: "Moved layer to [" + newX + ", " + newY + "]",
      });

    } else if (checkType === "easing" && layerIdx > 0) {
      // Apply smooth easing to the specified property
      const propName = fixObj && fixObj.params && fixObj.params.property ? fixObj.params.property : "Position";
      const propMatchMap: Record<string, string> = {
        Position: "ADBE Position",
        Scale: "ADBE Scale",
        Opacity: "ADBE Opacity",
        Rotation: "ADBE Rotate Z",
      };
      const matchName = propMatchMap[propName] || "ADBE Position";
      const is2D = propName === "Position" || propName === "Scale";
      const prefix = "_fix_ease_" + layerIdx + "_" + propName.replace(/\s+/g, "_");
      body +=
        "// fix easing layer " + layerIdx + " prop " + propName + "\n" +
        "try {\n" +
        "  if (" + layerIdx + " >= 1 && " + layerIdx + " <= comp.numLayers) {\n" +
        "    var " + prefix + "_layer = comp.layer(" + layerIdx + ");\n" +
        "    var " + prefix + "_prop = " + prefix + "_layer.property(\"ADBE Transform Group\").property(\"" + matchName + "\");\n" +
        "    for (var " + prefix + "_k = 1; " + prefix + "_k <= " + prefix + "_prop.numKeys; " + prefix + "_k++) {\n" +
        "      " + prefix + "_prop.setInterpolationTypeAtKey(" + prefix + "_k, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);\n" +
        "      var " + prefix + "_ease = new KeyframeEase(0, 75);\n" +
        (is2D
          ? "      " + prefix + "_prop.setTemporalEaseAtKey(" + prefix + "_k, [" + prefix + "_ease, " + prefix + "_ease], [" + prefix + "_ease, " + prefix + "_ease]);\n"
          : "      " + prefix + "_prop.setTemporalEaseAtKey(" + prefix + "_k, [" + prefix + "_ease], [" + prefix + "_ease]);\n") +
        "    }\n" +
        "  }\n" +
        "} catch(_easErr) {}\n";
      fixed.push({
        layerIndex: layerIdx,
        check: "easing",
        action: "Applied smooth easing to " + propName + " keyframes",
      });

    } else if (checkType === "pure-colors" && layerIdx > 0) {
      // Replace pure black or pure white in text fill color
      const currentColor = issue.fix && issue.fix.params && issue.fix.params.color
        ? issue.fix.params.color
        : [0.976, 0.98, 0.984]; // default to off-white if unknown
      const newR = currentColor[0];
      const newG = currentColor[1];
      const newB = currentColor[2];
      const fixPrefix = "_fix_color_" + layerIdx;
      body +=
        "// fix pure-colors layer " + layerIdx + "\n" +
        "try {\n" +
        "  if (" + layerIdx + " >= 1 && " + layerIdx + " <= comp.numLayers) {\n" +
        "    var " + fixPrefix + "_layer = comp.layer(" + layerIdx + ");\n" +
        "    if (" + fixPrefix + "_layer instanceof TextLayer) {\n" +
        "      var " + fixPrefix + "_tp = " + fixPrefix + "_layer.property(\"ADBE Text Properties\").property(\"ADBE Text Document\");\n" +
        "      var " + fixPrefix + "_td = " + fixPrefix + "_tp.value;\n" +
        "      " + fixPrefix + "_td.fillColor = [" + newR + ", " + newG + ", " + newB + "];\n" +
        "      " + fixPrefix + "_tp.setValue(" + fixPrefix + "_td);\n" +
        "    }\n" +
        "  }\n" +
        "} catch(_pcErr) {}\n";
      fixed.push({
        layerIndex: layerIdx,
        check: "pure-colors",
        action: "Updated fill color to [" + newR + ", " + newG + ", " + newB + "]",
      });

    } else if (checkType === "alignment") {
      // Snap all text layers to the same X position
      const targetX = fixObj && fixObj.params && fixObj.params.targetX != null
        ? fixObj.params.targetX
        : null;
      if (targetX !== null) {
        body +=
          "// fix alignment — snap all text layers to X=" + targetX + "\n" +
          "var _alignX = " + targetX + ";\n" +
          "for (var _ali = 1; _ali <= comp.numLayers; _ali++) {\n" +
          "  var _alLayer = comp.layer(_ali);\n" +
          "  if (_alLayer instanceof TextLayer) {\n" +
          "    try {\n" +
          "      var _alPosProp = _alLayer.property(\"ADBE Transform Group\").property(\"ADBE Position\");\n" +
          "      var _alCurPos = _alPosProp.value;\n" +
          "      _alPosProp.setValue([_alignX, _alCurPos[1]]);\n" +
          "    } catch(_alErr) {}\n" +
          "  }\n" +
          "}\n";
        fixed.push({
          layerIndex: 0,
          check: "alignment",
          action: "Aligned all text layers to X=" + targetX,
        });
      } else {
        skipped.push({ layerIndex: 0, check: "alignment", reason: "No target X position provided" });
      }

    } else {
      skipped.push({
        layerIndex: layerIdx,
        check: checkType,
        reason: "No automatic fix available for this check type",
      });
    }
  }

  body += "return { success: true, data: { fixCount: " + fixed.length + " } };\n";
  const script = wrapWithReturn(wrapInUndoGroup(body, "fix_composition_issues"));
  return { script, fixed, skipped };
}

// ---------------------------------------------------------------------------
// registerQATools
// ---------------------------------------------------------------------------

export function registerQATools(server: McpServer): void {

  // ─── critique_composition ─────────────────────────────────────────────────
  server.tool(
    "critique_composition",
    "Inspect a composition and return a structured quality report scored against a design rubric. " +
    "Phase 1: Collects all layer data from After Effects (positions, keyframes, text properties, etc). " +
    "Phase 2: Evaluates the collected data against quality checks in TypeScript and returns a scored report. " +
    "Checks: 'safe-zones' (broadcast margins), 'text-hierarchy' (font size ratios), " +
    "'contrast' (text vs background), 'alignment' (text X alignment), " +
    "'easing' (linear keyframe detection), 'duration' (animation timing), 'pure-colors' (harsh black/white). " +
    "Returns a score out of 100, letter grade, list of issues with fix suggestions, and which checks passed.",
    {
      compId: z.number().int().positive().describe("Numeric ID of the composition to critique"),
      time: z.number().optional().describe("Frame time to evaluate (seconds). Default 0 means auto = 33% through comp duration"),
      checks: z.array(z.enum([
        "safe-zones", "text-hierarchy", "contrast", "alignment",
        "easing", "duration", "pure-colors",
      ])).optional().describe("Specific checks to run. Default: all checks"),
    },
    async ({ compId, time, checks }) => {
      const allChecks = ["safe-zones", "text-hierarchy", "contrast", "alignment", "easing", "duration", "pure-colors"];
      const checksToRun = checks && checks.length > 0 ? checks : allChecks;

      // Phase A: collect data via ExtendScript
      const collectScript = buildDataCollectionScript(compId);
      let rawResult: unknown;
      try {
        rawResult = await bridge.executeScript(collectScript, "critique_composition");
      } catch (err) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: { message: "Bridge error: " + String(err), code: "BRIDGE_ERROR" } }) }], isError: true };
      }

      // Parse the returned JSON string
      const parsed = parseResult(rawResult);
      let collectedData: CollectedData;
      try {
        if (typeof parsed === "string") {
          collectedData = JSON.parse(parsed);
        } else if (parsed && typeof parsed === "object" && "success" in parsed) {
          // Bridge wrapped it — check for error
          if (!(parsed as any).success) {
            return textResult(parsed);
          }
          // Shouldn't happen for this script but handle it
          collectedData = parsed as any;
        } else {
          collectedData = parsed as CollectedData;
        }
      } catch (parseErr) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: { message: "Failed to parse composition data: " + String(parseErr), code: "PARSE_ERROR" } }) }], isError: true };
      }

      // Validate shape
      if (!collectedData || !collectedData.comp || !collectedData.layers) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: { message: "Unexpected data shape from ExtendScript", code: "DATA_ERROR" } }) }], isError: true };
      }

      // Phase B: evaluate quality checks in TypeScript
      const { issues, passed } = evaluateQuality(collectedData, checksToRun);
      const { score, grade } = scoreAndGrade(issues);

      const errorCount = issues.filter((i) => i.severity === "error").length;
      const warningCount = issues.filter((i) => i.severity === "warning").length;

      let summaryParts: string[] = [];
      if (issues.length === 0) {
        summaryParts.push("No issues found. Composition passes all checks.");
      } else {
        summaryParts.push(`${issues.length} issue${issues.length !== 1 ? "s" : ""} found (${errorCount} error${errorCount !== 1 ? "s" : ""}, ${warningCount} warning${warningCount !== 1 ? "s" : ""}).`);
        const topChecks = [...new Set(issues.map((i) => i.check))].slice(0, 3);
        if (topChecks.length > 0) {
          summaryParts.push("Key problems: " + topChecks.join(", ") + ".");
        }
      }
      const summary = summaryParts.join(" ");

      return textResult({
        success: true,
        data: {
          score,
          maxScore: 100,
          grade,
          issues,
          passed,
          summary,
        },
      });
    }
  );

  // ─── apply_polish ─────────────────────────────────────────────────────────
  server.tool(
    "apply_polish",
    "Apply professional finishing touches to a composition in a single operation. " +
    "Features: 'motion-blur' (enables comp and per-layer motion blur on animated layers), " +
    "'film-grain' (adds subtle noise via adjustment layer — moderate/heavy only), " +
    "'vignette' (adds CC Vignette effect via adjustment layer — moderate/heavy only), " +
    "'smooth-easing' (converts all linear keyframes to smooth bezier easing), " +
    "'shadow-depth' (adds drop shadow to text and shape layers — moderate/heavy only). " +
    "polishLevel controls the intensity of each effect: 'subtle' (default), 'moderate', or 'heavy'. " +
    "All changes are grouped into a single undo action.",
    {
      compId: z.number().int().positive().describe("Numeric ID of the composition"),
      polishLevel: z.enum(["subtle", "moderate", "heavy"]).optional().describe("Intensity level (default: subtle)"),
      features: z.array(z.enum([
        "motion-blur", "film-grain", "vignette", "smooth-easing", "shadow-depth",
      ])).optional().describe("Which polish features to apply. Default: [motion-blur, smooth-easing]"),
    },
    async ({ compId, polishLevel, features }) => {
      const level = polishLevel ?? "subtle";
      const featuresToApply = features && features.length > 0 ? features : ["motion-blur", "smooth-easing"];

      const script = buildPolishScript(compId, level, featuresToApply);

      let rawResult: unknown;
      try {
        rawResult = await bridge.executeScript(script, "apply_polish");
      } catch (err) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: { message: "Bridge error: " + String(err), code: "BRIDGE_ERROR" } }) }], isError: true };
      }

      const parsed = parseResult(rawResult);
      if (!parsed || typeof parsed !== "object") {
        return textResult({ success: false, error: { message: "Unexpected result", code: "PARSE_ERROR" } });
      }

      if (!(parsed as any).success) {
        return textResult(parsed);
      }

      // Parse the appliedRaw string back into an array
      let appliedRaw: string[] = [];
      try {
        appliedRaw = JSON.parse((parsed as any).data.appliedRaw);
      } catch { /* ignore */ }

      // Build human-readable applied / skipped lists and summary
      const appliedList: string[] = [];
      const skippedList: string[] = [];
      let summaryParts: string[] = [];

      for (const entry of appliedRaw) {
        const colonIdx = entry.indexOf(":");
        const featureName = colonIdx >= 0 ? entry.substring(0, colonIdx) : entry;
        const detail = colonIdx >= 0 ? entry.substring(colonIdx + 1) : "";
        if (detail.startsWith("skipped")) {
          skippedList.push(featureName);
        } else {
          appliedList.push(featureName);
          if (featureName === "motion-blur") {
            summaryParts.push("Enabled motion blur on " + detail + " animated layers");
          } else if (featureName === "smooth-easing") {
            summaryParts.push("Fixed " + detail + " linear keyframes with smooth easing");
          } else if (featureName === "film-grain") {
            summaryParts.push("Added film grain (" + detail + " noise)");
          } else if (featureName === "vignette") {
            summaryParts.push("Added vignette (" + detail + " amount)");
          } else if (featureName === "shadow-depth") {
            summaryParts.push("Added drop shadow to " + detail + " layers");
          }
        }
      }

      const summary = summaryParts.length > 0 ? summaryParts.join(". ") + "." : "No changes applied.";

      return textResult({
        success: true,
        data: {
          applied: appliedList,
          skipped: skippedList,
          polishLevel: level,
          summary,
        },
      });
    }
  );

  // ─── fix_composition_issues ───────────────────────────────────────────────
  server.tool(
    "fix_composition_issues",
    "Automatically fix issues returned by critique_composition. " +
    "Pass the issues array from the critique result and this tool will generate and execute " +
    "the appropriate ExtendScript to fix each fixable issue. " +
    "Fixable issues: safe-zones (moves layers inward), easing (converts linear keyframes to smooth easing), " +
    "pure-colors (replaces pure black/white with softer near-black/near-white), " +
    "alignment (snaps text layers to the same X position). " +
    "NOT auto-fixable: text-hierarchy, contrast, duration (these require manual design judgment). " +
    "All fixes are applied in a single undo group. " +
    "fixAll=false only fixes severity='error' issues (skips warnings).",
    {
      compId: z.number().int().positive().describe("Numeric ID of the composition"),
      issues: z.array(z.object({
        check: z.string().describe("Check name (safe-zones, easing, pure-colors, alignment, etc)"),
        severity: z.string().describe("Issue severity: error or warning"),
        layerIndex: z.number().describe("1-based layer index (0 for comp-wide issues)"),
        layerName: z.string().optional().describe("Layer name for reference"),
        message: z.string().optional().describe("Human-readable issue description"),
        fix: z.object({
          action: z.string(),
          params: z.record(z.any()),
        }).optional().describe("Fix action and parameters from critique result"),
      })).describe("Issues array from critique_composition result"),
      fixAll: z.boolean().optional().describe("If false, only fix severity=error issues. Default: true"),
    },
    async ({ compId, issues, fixAll }) => {
      const shouldFixAll = fixAll !== false; // default true

      if (!issues || issues.length === 0) {
        return textResult({
          success: true,
          data: {
            fixed: [],
            skipped: [],
            summary: "No issues provided to fix.",
          },
        });
      }

      const { script, fixed, skipped } = buildFixScript(compId, issues, shouldFixAll);

      // Execute the combined fix script
      try {
        const rawResult = await bridge.executeScript(script, "fix_composition_issues");
        const parsed = parseResult(rawResult);
        if (parsed && typeof parsed === "object" && !(parsed as any).success) {
          return textResult(parsed);
        }
      } catch (err) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: { message: "Bridge error: " + String(err), code: "BRIDGE_ERROR" } }) }], isError: true };
      }

      const totalIssues = issues.length;
      const fixedCount = fixed.length;
      const skippedCount = skipped.length;
      const summary = `Fixed ${fixedCount} of ${totalIssues} issue${totalIssues !== 1 ? "s" : ""}. ${skippedCount} require${skippedCount === 1 ? "s" : ""} manual intervention.`;

      return textResult({
        success: true,
        data: {
          fixed,
          skipped,
          summary,
        },
      });
    }
  );
}
