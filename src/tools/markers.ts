/**
 * tools/markers.ts
 *
 * Marker tools for After Effects layers and compositions.
 *
 * Registers:
 *   - add_marker    Add a marker to a layer or the composition timeline
 *   - list_markers  List all markers on a layer or composition with time and comment
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
  findLayerByIndex,
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
// registerMarkerTools
// ---------------------------------------------------------------------------

export function registerMarkerTools(server: McpServer): void {

  // ─── add_marker ────────────────────────────────────────────────────────────
  server.tool(
    "add_marker",
    "Add a marker to a layer or to the composition's own marker track. " +
      "Markers appear as flags on the timeline and can carry comments, cue points, and duration. " +
      "If layerIndex is provided, the marker is placed on that specific layer's marker track. " +
      "If layerIndex is omitted, the marker is placed on the COMPOSITION's marker track " +
      "(visible at the top of the timeline, useful for scene labels and sync points). " +
      "time: when the marker appears, in seconds from the start of the comp. " +
      "comment: text label shown on the marker (useful for naming scenes or sync points). " +
      "duration: extends the marker into a range marker (shown as a colored band) in seconds. " +
      "label: AE color label index 0-15 (0 = None, 1 = Red, 2 = Yellow, 3 = Aqua, 4 = Pink, " +
      "5 = Lavender, 6 = Peach, 7 = Sea Foam, 8 = Blue, 9 = Green, 10 = Purple, 11 = Orange, " +
      "12 = Brown, 13 = Fuchsia, 14 = Cyan, 15 = Sandstone). " +
      "Composition markers can be used to navigate the timeline and mark sync beats.",
    {
      compId: z
        .number()
        .int()
        .positive()
        .describe("Numeric ID of the composition"),
      layerIndex: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("1-based index of the layer to add the marker to. If omitted, adds to the composition's marker track"),
      time: z
        .number()
        .min(0)
        .describe("Time in seconds at which to place the marker (e.g. 0, 1.5, 10.0)"),
      comment: z
        .string()
        .optional()
        .describe("Text comment displayed on the marker (e.g. 'Scene Start', 'Beat 1', 'Cut here')"),
      duration: z
        .number()
        .min(0)
        .optional()
        .describe("Duration in seconds to make this a range marker (shows as a colored band on the timeline)"),
      label: z
        .number()
        .int()
        .min(0)
        .max(15)
        .optional()
        .describe("AE color label 0-15 (0=None, 1=Red, 2=Yellow, 3=Aqua, 4=Pink, 8=Blue, 9=Green, 11=Orange)"),
    },
    async ({ compId, layerIndex, time, comment, duration, label }) => {
      const commentStr = escapeString(comment ?? "");
      const durationVal = duration !== undefined ? duration : 0;
      const labelVal    = label    !== undefined ? label    : 0;

      // Build the marker creation script
      const markerBuild =
        "var _marker = new MarkerValue(\"" + commentStr + "\");\n" +
        "_marker.duration = " + durationVal + ";\n" +
        "_marker.label = " + labelVal + ";\n";

      let body: string;

      if (layerIndex !== undefined) {
        // Layer marker
        body =
          findCompById("comp", compId) +
          findLayerByIndex("layer", "comp", layerIndex) +
          markerBuild +
          "var _markerProp = layer.property(\"Marker\");\n" +
          "_markerProp.setValueAtTime(" + time + ", _marker);\n" +
          "return { success: true, data: { target: \"layer\", layerIndex: " + layerIndex + ", layerName: layer.name, time: " + time + ", comment: \"" + commentStr + "\" } };\n";
      } else {
        // Comp marker
        body =
          findCompById("comp", compId) +
          markerBuild +
          "var _markerProp = comp.markerProperty;\n" +
          "_markerProp.setValueAtTime(" + time + ", _marker);\n" +
          "return { success: true, data: { target: \"composition\", compId: " + compId + ", time: " + time + ", comment: \"" + commentStr + "\" } };\n";
      }

      const script = wrapWithReturn(wrapInUndoGroup(body, "add_marker"));

      try {
        return runScript(script, "add_marker");
      } catch (err) {
        return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
      }
    }
  );
}

// ---------------------------------------------------------------------------
// Demoted helpers (formerly server.tool registrations)
// ---------------------------------------------------------------------------

export async function listMarkersHelper(params: {
  compId: number;
  layerIndex?: number;
}) {
  const { compId, layerIndex } = params;
  const markerLoop =
    "var _markers = [];\n" +
    "for (var _mk = 1; _mk <= _markerProp.numKeys; _mk++) {\n" +
    "  var _mval = _markerProp.keyValue(_mk);\n" +
    "  _markers.push({\n" +
    "    index: _mk,\n" +
    "    time: _markerProp.keyTime(_mk),\n" +
    "    comment: _mval.comment,\n" +
    "    duration: _mval.duration,\n" +
    "    label: _mval.label\n" +
    "  });\n" +
    "}\n";

  let body: string;

  if (layerIndex !== undefined) {
    body =
      findCompById("comp", compId) +
      findLayerByIndex("layer", "comp", layerIndex) +
      "var _markerProp = layer.property(\"Marker\");\n" +
      markerLoop +
      "return { success: true, data: { target: \"layer\", layerIndex: " + layerIndex + ", layerName: layer.name, markers: _markers, count: _markers.length } };\n";
  } else {
    body =
      findCompById("comp", compId) +
      "var _markerProp = comp.markerProperty;\n" +
      markerLoop +
      "return { success: true, data: { target: \"composition\", compId: " + compId + ", markers: _markers, count: _markers.length } };\n";
  }

  const script = wrapWithReturn(body);

  try {
    return runScript(script, "list_markers");
  } catch (err) {
    return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
  }
}
