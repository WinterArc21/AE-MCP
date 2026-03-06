/**
 * tools/three-d.ts
 *
 * 3D layer, camera, and light tools for After Effects.
 *
 * Registers:
 *   - set_3d_layer         Enable or disable 3D mode on any layer
 *   - add_camera           Add a camera layer to a composition
 *   - add_light            Add a light layer (Parallel, Spot, Point, Ambient)
 *   - set_3d_position      Set position, rotation, and orientation on a 3D layer
 *   - set_camera_options   Set camera options like zoom, depth of field, focus distance
 *   - set_light_options    Set light options like intensity, color, shadow settings
 *   - set_material_options Set material options on a 3D layer
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

/** Map friendly light type name to AE LightType enum. */
function lightTypeToAE(type: string): string {
  const map: Record<string, string> = {
    Parallel: "PARALLEL",
    Spot:     "SPOT",
    Point:    "POINT",
    Ambient:  "AMBIENT",
  };
  return "LightType." + (map[type] ?? "POINT");
}

// ---------------------------------------------------------------------------
// registerThreeDTools
// ---------------------------------------------------------------------------

export function registerThreeDTools(server: McpServer): void {

  // ─── set_3d_layer ─────────────────────────────────────────────────────────────
  server.tool(
    "set_3d_layer",
    "Enable or disable 3D mode on a layer. " +
      "When enabled, the layer gains Z-position, X/Y/Z rotation, and Orientation properties, " +
      "and it interacts with camera and light layers in the composition. " +
      "Enabling 3D on all relevant layers is required before setting 3D transforms with set_3d_position. " +
      "Text, shape, solid, footage, and pre-comp layers can all be made 3D. " +
      "Note: enabling 3D on a layer does not change its visual appearance until you add a camera " +
      "or change its Z position/rotation.",
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
        .describe("1-based index of the layer to make 3D"),
      enabled: z
        .boolean()
        .describe("true = enable 3D, false = disable 3D (flatten back to 2D)"),
    },
    async ({ compId, layerIndex, enabled }) => {
      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        "layer.threeDLayer = " + (enabled ? "true" : "false") + ";\n" +
        "return { success: true, data: { layerIndex: " + layerIndex + ", layerName: layer.name, threeDLayer: " + (enabled ? "true" : "false") + " } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "set_3d_layer"));

      try {
        return runScript(script, "set_3d_layer");
      } catch (err) {
        return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
      }
    }
  );

  // ─── add_camera ──────────────────────────────────────────────────────────────
  server.tool(
    "add_camera",
    "Add a camera layer to a composition. " +
      "Cameras define the viewer's perspective in a 3D scene — required to see 3D layers properly. " +
      "A new composition starts with no camera, rendering everything in orthographic projection. " +
      "The zoom value controls the focal length equivalent: " +
      "1777.8 ≈ 50mm (standard), 2666.7 ≈ 80mm (telephoto), 888.9 ≈ 28mm (wide). " +
      "Position is [x, y, z] in composition pixels; default z = -1777.8 (standard distance). " +
      "pointOfInterest controls what the camera points at — defaults to the center of the comp. " +
      "Only one active camera is needed per comp (AE uses the topmost camera layer by default). " +
      "After adding a camera, enable 3D on content layers with set_3d_layer.",
    {
      compId: z
        .number()
        .int()
        .positive()
        .describe("Numeric ID of the composition"),
      name: z
        .string()
        .optional()
        .describe("Camera layer name (default: 'Camera 1')"),
      zoom: z
        .number()
        .positive()
        .optional()
        .describe("Zoom / focal length value: 1777.8 ≈ 50mm standard lens (default), 2666.7 ≈ 80mm telephoto, 888.9 ≈ 28mm wide"),
      position: z
        .array(z.number())
        .length(3)
        .optional()
        .describe("Camera position [x, y, z] in pixels. Typical: [width/2, height/2, -1777.8]"),
      pointOfInterest: z
        .array(z.number())
        .length(3)
        .optional()
        .describe("Point the camera aims at [x, y, z]. Defaults to comp center [width/2, height/2, 0]"),
    },
    async ({ compId, name, zoom, position, pointOfInterest }) => {
      const cameraName = escapeString(name ?? "Camera 1");

      let setProps = "";
      if (zoom !== undefined) {
        setProps += "_cam.property(\"Zoom\").setValue(" + zoom + ");\n";
      }
      if (position !== undefined) {
        setProps += "_cam.property(\"Transform\").property(\"Position\").setValue([" + position.join(",") + "]);\n";
      }
      if (pointOfInterest !== undefined) {
        setProps += "_cam.property(\"Transform\").property(\"Point of Interest\").setValue([" + pointOfInterest.join(",") + "]);\n";
      }

      const body =
        findCompById("comp", compId) +
        "var _cx = comp.width / 2;\n" +
        "var _cy = comp.height / 2;\n" +
        "var _cam = comp.layers.addCamera(\"" + cameraName + "\", [_cx, _cy]);\n" +
        setProps +
        "return { success: true, data: { layerIndex: _cam.index, layerName: _cam.name } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "add_camera"));

      try {
        return runScript(script, "add_camera");
      } catch (err) {
        return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
      }
    }
  );

  // ─── add_light ──────────────────────────────────────────────────────────────
  server.tool(
    "add_light",
    "Add a light layer to a composition to illuminate 3D layers. " +
      "Light types: " +
      "'Parallel' = directional like sunlight, casts parallel shadows; " +
      "'Spot' = cone-shaped directional beam with controllable angle and falloff; " +
      "'Point' = omni-directional like a lightbulb, illuminates in all directions; " +
      "'Ambient' = fills the scene with non-directional ambient light (no shadows). " +
      "intensity is 0-400% (100 = standard). " +
      "color is [r, g, b] normalized 0-1 (e.g. [1, 0.9, 0.7] for warm white). " +
      "coneAngle controls the Spot light's beam width in degrees (typical: 45-90). " +
      "coneFalloff controls how soft the Spot light's edge is. " +
      "3D layers must have 'Accepts Lights' enabled (on by default) to respond to lights.",
    {
      compId: z
        .number()
        .int()
        .positive()
        .describe("Numeric ID of the composition"),
      name: z
        .string()
        .optional()
        .describe("Light layer name (default: 'Light 1')"),
      lightType: z
        .enum(["Parallel", "Spot", "Point", "Ambient"])
        .describe("Type of light: Parallel (sun), Spot (cone), Point (bulb), or Ambient (fill)"),
      position: z
        .array(z.number())
        .length(3)
        .optional()
        .describe("Light position [x, y, z] in pixels (not applicable to Ambient lights)"),
      intensity: z
        .number()
        .min(0)
        .max(400)
        .optional()
        .describe("Light intensity as percentage 0-400 (default 100)"),
      color: z
        .array(z.number())
        .length(3)
        .optional()
        .describe("Light color as [r, g, b] normalized 0-1 (default [1, 1, 1] = white)"),
      coneAngle: z
        .number()
        .optional()
        .describe("Spot light cone angle in degrees (Spot lights only, default 90)"),
      coneFalloff: z
        .number()
        .optional()
        .describe("Spot light cone edge softness in degrees (Spot lights only)"),
    },
    async ({ compId, name, lightType, position, intensity, color, coneAngle, coneFalloff }) => {
      const lightName = escapeString(name ?? "Light 1");
      const aeType = lightTypeToAE(lightType);

      let setProps = "";
      setProps += "_light.lightType = " + aeType + ";\n";
      if (intensity !== undefined) {
        setProps += "_light.property(\"Light Options\").property(\"Intensity\").setValue(" + intensity + ");\n";
      }
      if (color !== undefined) {
        setProps += "_light.property(\"Light Options\").property(\"Color\").setValue([" + color.join(",") + "]);\n";
      }
      if (coneAngle !== undefined) {
        setProps += "_light.property(\"Light Options\").property(\"Cone Angle\").setValue(" + coneAngle + ");\n";
      }
      if (coneFalloff !== undefined) {
        setProps += "_light.property(\"Light Options\").property(\"Cone Feather\").setValue(" + coneFalloff + ");\n";
      }
      if (position !== undefined) {
        setProps += "_light.property(\"Transform\").property(\"Position\").setValue([" + position.join(",") + "]);\n";
      }

      const body =
        findCompById("comp", compId) +
        "var _cx = comp.width / 2;\n" +
        "var _cy = comp.height / 2;\n" +
        "var _light = comp.layers.addLight(\"" + lightName + "\", [_cx, _cy]);\n" +
        setProps +
        "return { success: true, data: { layerIndex: _light.index, layerName: _light.name, lightType: \"" + escapeString(lightType) + "\" } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "add_light"));

      try {
        return runScript(script, "add_light");
      } catch (err) {
        return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
      }
    }
  );

  // ─── set_3d_position ───────────────────────────────────────────────────────────
  server.tool(
    "set_3d_position",
    "Set 3D transform properties on a 3D-enabled layer: position, X/Y/Z rotation, and orientation. " +
      "The layer must have 3D enabled first (use set_3d_layer). " +
      "All parameters are optional — only the ones provided will be changed. " +
      "position [x, y, z]: moves the layer in 3D space (z: positive = farther from camera, negative = closer). " +
      "xRotation, yRotation, zRotation: rotate around each axis in degrees. " +
      "  zRotation is the standard 2D rotation; xRotation tilts forward/back; yRotation spins left/right. " +
      "orientation [x, y, z]: sets the absolute orientation in degrees (alternative to per-axis rotation). " +
      "Use add_keyframe to animate these properties over time for 3D camera moves and rotations.",
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
        .describe("1-based index of the 3D layer"),
      position: z
        .array(z.number())
        .length(3)
        .optional()
        .describe("Layer position [x, y, z] in pixels"),
      xRotation: z
        .number()
        .optional()
        .describe("X-axis rotation in degrees (tilts layer forward/back)"),
      yRotation: z
        .number()
        .optional()
        .describe("Y-axis rotation in degrees (spins layer left/right like a door opening)"),
      zRotation: z
        .number()
        .optional()
        .describe("Z-axis rotation in degrees (same as 2D rotation, positive = clockwise)"),
      orientation: z
        .array(z.number())
        .length(3)
        .optional()
        .describe("Absolute orientation [x, y, z] in degrees — alternative to per-axis rotation"),
    },
    async ({ compId, layerIndex, position, xRotation, yRotation, zRotation, orientation }) => {
      let setProps = "";
      if (position    !== undefined) setProps += "layer.property(\"Transform\").property(\"Position\").setValue([" + position.join(",") + "]);\n";
      if (orientation !== undefined) setProps += "layer.property(\"Transform\").property(\"Orientation\").setValue([" + orientation.join(",") + "]);\n";
      if (xRotation   !== undefined) setProps += "layer.property(\"Transform\").property(\"X Rotation\").setValue(" + xRotation + ");\n";
      if (yRotation   !== undefined) setProps += "layer.property(\"Transform\").property(\"Y Rotation\").setValue(" + yRotation + ");\n";
      if (zRotation   !== undefined) setProps += "layer.property(\"Transform\").property(\"Z Rotation\").setValue(" + zRotation + ");\n";

      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        "if (!layer.threeDLayer) {\n" +
        "  return { success: false, error: { message: \"Layer \" + " + layerIndex + " + \" is not a 3D layer. Call set_3d_layer first.\", code: \"INVALID_STATE\" } };\n" +
        "}\n" +
        setProps +
        "return { success: true, data: { layerIndex: " + layerIndex + ", layerName: layer.name } };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "set_3d_position"));

      try {
        return runScript(script, "set_3d_position");
      } catch (err) {
        return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
      }
    }
  );

  // ─── set_camera_options ─────────────────────────────────────────────────────────
  server.tool(
    "set_camera_options",
    "Set camera options like zoom, depth of field, focus distance, and aperture. " +
      "The layer must be a camera layer.",
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
        .describe("1-based index of the camera layer"),
      zoom: z
        .number()
        .optional()
        .describe("Camera zoom value (focal length equivalent)"),
      depthOfField: z
        .boolean()
        .optional()
        .describe("Enable or disable depth of field"),
      focusDistance: z
        .number()
        .optional()
        .describe("Focus distance in pixels"),
      aperture: z
        .number()
        .optional()
        .describe("Aperture value in pixels"),
      blurLevel: z
        .number()
        .optional()
        .describe("Blur level as percentage (100 = full blur)"),
    },
    async ({ compId, layerIndex, zoom, depthOfField, focusDistance, aperture, blurLevel }) => {
      let setProps = "";
      if (zoom !== undefined) {
        setProps += "_camOpts.property(\"Zoom\").setValue(" + zoom + ");\n";
      }
      if (depthOfField !== undefined) {
        setProps += "_camOpts.property(\"Depth of Field\").setValue(" + (depthOfField ? 1 : 0) + ");\n";
      }
      if (focusDistance !== undefined) {
        setProps += "_camOpts.property(\"Focus Distance\").setValue(" + focusDistance + ");\n";
      }
      if (aperture !== undefined) {
        setProps += "_camOpts.property(\"Aperture\").setValue(" + aperture + ");\n";
      }
      if (blurLevel !== undefined) {
        setProps += "_camOpts.property(\"Blur Level\").setValue(" + blurLevel + ");\n";
      }

      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        "if (!(layer instanceof CameraLayer)) {\n" +
        "  return { success: false, error: { message: \"Layer \" + " + layerIndex + " + \" is not a camera layer.\", code: \"INVALID_PARAMS\" } };\n" +
        "}\n" +
        "var _camOpts = layer.property(\"Camera Options\");\n" +
        setProps +
        "return { success: true, data: {\n" +
        "  layerIndex: " + layerIndex + ",\n" +
        "  layerName: layer.name,\n" +
        "  zoom: _camOpts.property(\"Zoom\").value,\n" +
        "  depthOfField: _camOpts.property(\"Depth of Field\").value,\n" +
        "  focusDistance: _camOpts.property(\"Focus Distance\").value,\n" +
        "  aperture: _camOpts.property(\"Aperture\").value,\n" +
        "  blurLevel: _camOpts.property(\"Blur Level\").value\n" +
        "} };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "set_camera_options"));

      try {
        return runScript(script, "set_camera_options");
      } catch (err) {
        return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
      }
    }
  );

  // ─── set_light_options ──────────────────────────────────────────────────────────
  server.tool(
    "set_light_options",
    "Set light options like intensity, color, shadow settings. " +
      "The layer must be a light layer.",
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
        .describe("1-based index of the light layer"),
      intensity: z
        .number()
        .optional()
        .describe("Light intensity as percentage (0-400)"),
      color: z
        .array(z.number())
        .length(3)
        .optional()
        .describe("Light color as [r, g, b] normalized 0-1"),
      coneAngle: z
        .number()
        .optional()
        .describe("Cone angle in degrees (Spot lights only)"),
      coneFeather: z
        .number()
        .optional()
        .describe("Cone feather / edge softness in degrees (Spot lights only)"),
      castsShadows: z
        .boolean()
        .optional()
        .describe("Enable or disable shadow casting"),
      shadowDarkness: z
        .number()
        .optional()
        .describe("Shadow darkness 0-100"),
      shadowDiffusion: z
        .number()
        .optional()
        .describe("Shadow diffusion in pixels"),
    },
    async ({ compId, layerIndex, intensity, color, coneAngle, coneFeather, castsShadows, shadowDarkness, shadowDiffusion }) => {
      let setProps = "";
      if (intensity !== undefined) {
        setProps += "_lightOpts.property(\"Intensity\").setValue(" + intensity + ");\n";
      }
      if (color !== undefined) {
        setProps += "_lightOpts.property(\"Color\").setValue([" + color.join(",") + "]);\n";
      }
      if (coneAngle !== undefined) {
        setProps += "_lightOpts.property(\"Cone Angle\").setValue(" + coneAngle + ");\n";
      }
      if (coneFeather !== undefined) {
        setProps += "_lightOpts.property(\"Cone Feather\").setValue(" + coneFeather + ");\n";
      }
      if (castsShadows !== undefined) {
        setProps += "_lightOpts.property(\"Casts Shadows\").setValue(" + (castsShadows ? 1 : 0) + ");\n";
      }
      if (shadowDarkness !== undefined) {
        setProps += "_lightOpts.property(\"Shadow Darkness\").setValue(" + shadowDarkness + ");\n";
      }
      if (shadowDiffusion !== undefined) {
        setProps += "_lightOpts.property(\"Shadow Diffusion\").setValue(" + shadowDiffusion + ");\n";
      }

      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        "if (!(layer instanceof LightLayer)) {\n" +
        "  return { success: false, error: { message: \"Layer \" + " + layerIndex + " + \" is not a light layer.\", code: \"INVALID_PARAMS\" } };\n" +
        "}\n" +
        "var _lightOpts = layer.property(\"Light Options\");\n" +
        setProps +
        "var _ltMap = {};\n" +
        "_ltMap[LightType.PARALLEL] = \"Parallel\";\n" +
        "_ltMap[LightType.SPOT] = \"Spot\";\n" +
        "_ltMap[LightType.POINT] = \"Point\";\n" +
        "_ltMap[LightType.AMBIENT] = \"Ambient\";\n" +
        "var _ltStr = _ltMap[layer.lightType] || \"Unknown\";\n" +
        "return { success: true, data: {\n" +
        "  layerIndex: " + layerIndex + ",\n" +
        "  layerName: layer.name,\n" +
        "  lightType: _ltStr\n" +
        "} };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "set_light_options"));

      try {
        return runScript(script, "set_light_options");
      } catch (err) {
        return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
      }
    }
  );

  // ─── set_material_options ────────────────────────────────────────────────────────
  server.tool(
    "set_material_options",
    "Set material options on a 3D layer to control how it responds to lights and shadows. " +
      "The layer must be 3D-enabled.",
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
        .describe("1-based index of the 3D layer"),
      acceptsLights: z
        .boolean()
        .optional()
        .describe("Whether the layer responds to lights"),
      acceptsShadows: z
        .boolean()
        .optional()
        .describe("Whether the layer receives shadows from other layers"),
      ambient: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe("Ambient light contribution 0-100"),
      diffuse: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe("Diffuse light contribution 0-100"),
      specularIntensity: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe("Specular highlight intensity 0-100"),
      specularShininess: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe("Specular highlight shininess 0-100"),
      metal: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe("Metal appearance 0-100"),
      lightTransmission: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe("Light transmission 0-100 (how much light passes through the layer)"),
    },
    async ({ compId, layerIndex, acceptsLights, acceptsShadows, ambient, diffuse, specularIntensity, specularShininess, metal, lightTransmission }) => {
      const requestedProps: string[] = [];
      let setProps = "";
      const addMaterialSetter = (input: unknown, propertyName: string, valueLiteral: string, resultKey: string) => {
        if (input === undefined) {
          return;
        }
        requestedProps.push(resultKey);
        setProps +=
          "try {\n" +
          "  var _prop = _matOpts.property(\"" + propertyName + "\");\n" +
          "  if (!_prop) {\n" +
          "    _warnings.push(\"" + propertyName + " is not available on this layer or renderer.\");\n" +
          "  } else {\n" +
          "    _prop.setValue(" + valueLiteral + ");\n" +
          "    _applied.push(\"" + resultKey + "\");\n" +
          "  }\n" +
          "} catch (_e) {\n" +
          "  _warnings.push(\"Failed to set " + propertyName + ": \" + _e.toString());\n" +
          "}\n";
      };

      addMaterialSetter(acceptsLights, "Accepts Lights", acceptsLights ? "1" : "0", "acceptsLights");
      addMaterialSetter(acceptsShadows, "Accepts Shadows", acceptsShadows ? "1" : "0", "acceptsShadows");
      addMaterialSetter(ambient, "Ambient", String(ambient), "ambient");
      addMaterialSetter(diffuse, "Diffuse", String(diffuse), "diffuse");
      addMaterialSetter(specularIntensity, "Specular Intensity", String(specularIntensity), "specularIntensity");
      addMaterialSetter(specularShininess, "Specular Shininess", String(specularShininess), "specularShininess");
      addMaterialSetter(metal, "Metal", String(metal), "metal");
      addMaterialSetter(lightTransmission, "Light Transmission", String(lightTransmission), "lightTransmission");

      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        "if (!layer.threeDLayer) {\n" +
        "  return { success: false, error: { message: \"Layer \" + " + layerIndex + " + \" is not a 3D layer. Call set_3d_layer first.\", code: \"INVALID_STATE\" } };\n" +
        "}\n" +
        "if (layer instanceof CameraLayer || layer instanceof LightLayer) {\n" +
        "  return { success: false, error: { message: \"Cannot set material options on camera or light layers.\", code: \"INVALID_PARAMS\" } };\n" +
        "}\n" +
        "var _matOpts = layer.property(\"Material Options\");\n" +
        "if (!_matOpts) {\n" +
        "  return { success: false, error: { message: \"Material Options group not found on this layer.\", code: \"INVALID_STATE\" } };\n" +
        "}\n" +
        "var _applied = [];\n" +
        "var _warnings = [];\n" +
        setProps +
        "if (_applied.length === 0 && " + requestedProps.length + " > 0) {\n" +
        "  return { success: false, error: { message: \"None of the requested material options could be applied.\", code: \"UNSUPPORTED_OPERATION\" }, data: { layerIndex: " + layerIndex + ", layerName: layer.name, requested: " + JSON.stringify(requestedProps) + ", warnings: _warnings } };\n" +
        "}\n" +
        "return { success: true, data: {\n" +
        "  layerIndex: " + layerIndex + ",\n" +
        "  layerName: layer.name,\n" +
        "  requested: " + JSON.stringify(requestedProps) + ",\n" +
        "  applied: _applied,\n" +
        "  warnings: _warnings\n" +
        "} };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "set_material_options"));

      try {
        return runScript(script, "set_material_options");
      } catch (err) {
        return { content: [{ type: "text" as const, text: "Error: " + String(err) }], isError: true };
      }
    }
  );
}
