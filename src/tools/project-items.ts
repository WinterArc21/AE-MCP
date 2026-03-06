/**
 * tools/project-items.ts
 *
 * Project item management tools for After Effects.
 *
 * Registers:
 *   - list_project_items      List items in the project panel
 *   - get_project_item_info   Get detailed info about a project item
 *   - replace_layer_source    Replace a layer's source with another project item
 *   - import_file_advanced    Import a file with advanced options
 *   - interpret_footage       Set footage interpretation settings
 *   - create_folder           Create a folder in the project panel
 *   - move_project_item       Move an item to a different folder
 *   - set_label_color         Set the label color on a project item
 *   - add_comment             Set or append a comment on a project item
 *
 * All ExtendScript is ES3-compatible (var only, no arrow functions,
 * no template literals, string concatenation only).
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

/** ES3 helper to find a project item by numeric ID. */
const FIND_ITEM_BY_ID =
  "function _findItemById(id) {\n" +
  "  for (var _fi = 1; _fi <= app.project.numItems; _fi++) {\n" +
  "    if (app.project.item(_fi).id === id) return app.project.item(_fi);\n" +
  "  }\n" +
  "  return null;\n" +
  "}\n";

// ---------------------------------------------------------------------------
// registerProjectItemTools
// ---------------------------------------------------------------------------

export function registerProjectItemTools(server: McpServer): void {

  // ─── list_project_items ─────────────────────────────────────────────────
  server.tool(
    "list_project_items",
    "List items in the AE project panel. Filter by type (composition, footage, folder) " +
      "and optionally by parent folder. Returns id, name, type, label, and parent info. " +
      "Use the returned id with get_project_item_info, replace_layer_source, and other tools.",
    {
      itemType: z
        .enum(["any", "composition", "footage", "folder"])
        .optional()
        .default("any")
        .describe("Filter by item type (default: 'any' returns all)"),
      folderId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Only return items directly inside this folder (by folder item ID)"),
      limit: z
        .number()
        .int()
        .positive()
        .optional()
        .default(200)
        .describe("Maximum items to return (default 200)"),
    },
    async ({ itemType, folderId, limit }) => {
      let filterCheck = "";
      if (itemType === "composition") {
        filterCheck = "    if (!(_item instanceof CompItem)) continue;\n";
      } else if (itemType === "footage") {
        filterCheck = "    if (!(_item instanceof FootageItem)) continue;\n";
      } else if (itemType === "folder") {
        filterCheck = "    if (!(_item instanceof FolderItem)) continue;\n";
      }

      let folderCheck = "";
      if (folderId !== undefined) {
        folderCheck =
          "    if (!_item.parentFolder || _item.parentFolder.id !== " + folderId + ") continue;\n";
      }

      const body =
        "var _items = [];\n" +
        "var _total = 0;\n" +
        "for (var _i = 1; _i <= app.project.numItems; _i++) {\n" +
        "  var _item = app.project.item(_i);\n" +
        filterCheck +
        folderCheck +
        "  _total++;\n" +
        "  if (_items.length < " + limit + ") {\n" +
        "    var _parentId = null;\n" +
        "    var _parentName = null;\n" +
        "    if (_item.parentFolder) {\n" +
        "      _parentId = _item.parentFolder.id;\n" +
        "      _parentName = _item.parentFolder.name;\n" +
        "    }\n" +
        "    var _filePath = null;\n" +
        "    try {\n" +
        "      if (_item instanceof FootageItem && _item.mainSource && _item.mainSource.file) {\n" +
        "        _filePath = _item.mainSource.file.fsName;\n" +
        "      }\n" +
        "    } catch(_e) {}\n" +
        "    _items.push({\n" +
        "      id: _item.id,\n" +
        "      name: _item.name,\n" +
        "      type: _item.typeName,\n" +
        "      label: _item.label,\n" +
        "      comment: _item.comment,\n" +
        "      parentFolderId: _parentId,\n" +
        "      parentFolderName: _parentName,\n" +
        "      filePath: _filePath\n" +
        "    });\n" +
        "  }\n" +
        "}\n" +
        "return { success: true, data: { items: _items, total: _total, truncated: (_total > " + limit + ") } };\n";

      const script = wrapWithReturn(body);
      return runScript(script, "list_project_items");
    }
  );

  // ─── get_project_item_info ──────────────────────────────────────────────
  server.tool(
    "get_project_item_info",
    "Get detailed information about a project item including type-specific details. " +
      "For compositions: dimensions, duration, fps, layer count. " +
      "For footage: file path, dimensions, duration, has audio/video. " +
      "For folders: number of child items.",
    {
      itemId: z
        .number()
        .int()
        .positive()
        .describe("Numeric ID of the project item"),
    },
    async ({ itemId }) => {
      const body =
        FIND_ITEM_BY_ID +
        "var _item = _findItemById(" + itemId + ");\n" +
        "if (!_item) {\n" +
        '  return { success: false, error: { message: "Project item not found with id: ' + itemId + '", code: "ITEM_NOT_FOUND" } };\n' +
        "}\n" +
        "var _parentId = null;\n" +
        "var _parentName = null;\n" +
        "if (_item.parentFolder) {\n" +
        "  _parentId = _item.parentFolder.id;\n" +
        "  _parentName = _item.parentFolder.name;\n" +
        "}\n" +
        "var _details = {};\n" +
        "if (_item instanceof CompItem) {\n" +
        "  _details.width = _item.width;\n" +
        "  _details.height = _item.height;\n" +
        "  _details.duration = _item.duration;\n" +
        "  _details.frameRate = _item.frameRate;\n" +
        "  _details.numLayers = _item.numLayers;\n" +
        "  try { _details.renderer = _item.renderer; } catch(_e) {}\n" +
        "} else if (_item instanceof FootageItem) {\n" +
        "  try { _details.filePath = _item.mainSource.file.fsName; } catch(_e) { _details.filePath = null; }\n" +
        "  _details.width = _item.width;\n" +
        "  _details.height = _item.height;\n" +
        "  _details.duration = _item.duration;\n" +
        "  _details.frameRate = _item.frameRate;\n" +
        "  _details.hasVideo = _item.hasVideo;\n" +
        "  _details.hasAudio = _item.hasAudio;\n" +
        "} else if (_item instanceof FolderItem) {\n" +
        "  _details.numItems = _item.numItems;\n" +
        "}\n" +
        "return { success: true, data: {\n" +
        "  id: _item.id,\n" +
        "  name: _item.name,\n" +
        "  type: _item.typeName,\n" +
        "  label: _item.label,\n" +
        "  comment: _item.comment,\n" +
        "  parentFolderId: _parentId,\n" +
        "  parentFolderName: _parentName,\n" +
        "  details: _details\n" +
        "} };\n";

      const script = wrapWithReturn(body);
      return runScript(script, "get_project_item_info");
    }
  );

  // ─── replace_layer_source ───────────────────────────────────────────────
  server.tool(
    "replace_layer_source",
    "Replace a layer's source with another project item. " +
      "The new source must be a footage item or composition. " +
      "Use list_project_items to find source IDs. " +
      "Common use: swap placeholder images/videos for final assets.",
    {
      compId: z
        .number()
        .int()
        .positive()
        .describe("Numeric ID of the composition containing the layer"),
      layerIndex: z
        .number()
        .int()
        .positive()
        .describe("1-based index of the layer to update"),
      newSourceId: z
        .number()
        .int()
        .positive()
        .describe("Numeric ID of the project item to use as the new source"),
      fixExpressions: z
        .boolean()
        .optional()
        .default(false)
        .describe("If true, update expressions that reference the old source name"),
    },
    async ({ compId, layerIndex, newSourceId, fixExpressions }) => {
      const body =
        findCompById("comp", compId) +
        findLayerByIndex("layer", "comp", layerIndex) +
        FIND_ITEM_BY_ID +
        "var _newSource = _findItemById(" + newSourceId + ");\n" +
        "if (!_newSource) {\n" +
        '  return { success: false, error: { message: "Source item not found with id: ' + newSourceId + '", code: "ITEM_NOT_FOUND" } };\n' +
        "}\n" +
        "if (!(_newSource instanceof CompItem) && !(_newSource instanceof FootageItem)) {\n" +
        '  return { success: false, error: { message: "New source must be a composition or footage item.", code: "INVALID_PARAMS" } };\n' +
        "}\n" +
        "if (!(layer instanceof AVLayer) || !layer.source) {\n" +
        '  return { success: false, error: { message: "Layer does not support source replacement.", code: "INVALID_PARAMS" } };\n' +
        "}\n" +
        "layer.replaceSource(_newSource, " + (fixExpressions ? "true" : "false") + ");\n" +
        "return { success: true, data: {\n" +
        "  layerIndex: layer.index,\n" +
        "  layerName: layer.name,\n" +
        "  sourceId: _newSource.id,\n" +
        "  sourceName: _newSource.name,\n" +
        "  sourceType: _newSource.typeName\n" +
        "} };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "replace_layer_source"));
      return runScript(script, "replace_layer_source");
    }
  );

  // ─── import_file_advanced ───────────────────────────────────────────────
  server.tool(
    "import_file_advanced",
    "Import a file into the AE project with advanced options. " +
      "Supports importing as footage, composition (for layered PSD/AI files), " +
      "or composition with cropped layers. Can import image sequences. " +
      "Optionally place the imported item in a specific project folder.",
    {
      path: z
        .string()
        .min(1)
        .describe("Absolute file path to import (e.g. '/Users/me/assets/logo.psd')"),
      importAs: z
        .enum(["footage", "composition", "composition_cropped_layers"])
        .optional()
        .default("footage")
        .describe("How to import: 'footage' (single item), 'composition' (layered PSD/AI), " +
          "'composition_cropped_layers' (layered with each layer cropped to content)"),
      sequence: z
        .boolean()
        .optional()
        .default(false)
        .describe("If true, treat the file as the first frame of an image sequence"),
      forceAlphabetical: z
        .boolean()
        .optional()
        .default(false)
        .describe("If true, force alphabetical ordering for image sequences"),
      parentFolderId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("ID of a project folder to place the imported item into"),
    },
    async ({ path: filePath, importAs, sequence, forceAlphabetical, parentFolderId }) => {
      let importAsLine = "";
      if (importAs === "composition") {
        importAsLine = "  try { _io.importAs = ImportAsType.COMP; } catch(_e) {}\n";
      } else if (importAs === "composition_cropped_layers") {
        importAsLine = "  try { _io.importAs = ImportAsType.COMP_CROPPED_LAYERS; } catch(_e) {}\n";
      }

      let folderValidation = "";
      let folderBlock = "";
      if (parentFolderId !== undefined) {
        folderValidation =
          FIND_ITEM_BY_ID +
          "var _folder = _findItemById(" + parentFolderId + ");\n" +
          "if (!_folder || !(_folder instanceof FolderItem)) {\n" +
          '  return { success: false, error: { message: "Folder not found with id: ' + parentFolderId + '", code: "FOLDER_NOT_FOUND" } };\n' +
          "}\n";
        folderBlock = "_imported.parentFolder = _folder;\n";
      }

      const body =
        folderValidation +
        'var _file = new File("' + escapeString(filePath) + '");\n' +
        "if (!_file.exists) {\n" +
        '  return { success: false, error: { message: "File not found: ' + escapeString(filePath) + '", code: "FILE_NOT_FOUND" } };\n' +
        "}\n" +
        "var _io = new ImportOptions(_file);\n" +
        (sequence ? "  _io.sequence = true;\n" : "") +
        (forceAlphabetical ? "  _io.forceAlphabetical = true;\n" : "") +
        importAsLine +
        "var _imported = app.project.importFile(_io);\n" +
        folderBlock +
        "return { success: true, data: {\n" +
        "  itemId: _imported.id,\n" +
        "  itemName: _imported.name,\n" +
        "  itemType: _imported.typeName\n" +
        "} };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "import_file_advanced"));
      return runScript(script, "import_file_advanced");
    }
  );

  // ─── interpret_footage ──────────────────────────────────────────────────
  server.tool(
    "interpret_footage",
    "Set footage interpretation settings like frame rate conforming, alpha mode, " +
      "field separation, and looping. Only works on footage items (not compositions).",
    {
      itemId: z
        .number()
        .int()
        .positive()
        .describe("Numeric ID of the footage item"),
      conformFrameRate: z
        .number()
        .positive()
        .optional()
        .describe("Override the footage frame rate (e.g. 24, 29.97, 30)"),
      alphaMode: z
        .enum(["ignore", "straight", "premultiplied"])
        .optional()
        .describe("Alpha channel interpretation: 'ignore', 'straight', or 'premultiplied'"),
      premulColor: z
        .array(z.number().min(0).max(1))
        .length(3)
        .optional()
        .describe("Premultiplication color [r,g,b] 0-1 (only used with 'premultiplied' alpha)"),
      fieldSeparationType: z
        .enum(["off", "upper_first", "lower_first"])
        .optional()
        .describe("Field separation: 'off', 'upper_first', or 'lower_first'"),
      loop: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Number of times to loop the footage"),
    },
    async ({ itemId, conformFrameRate, alphaMode, premulColor, fieldSeparationType, loop }) => {
      let setLines = "var _warnings = [];\n";

      if (conformFrameRate !== undefined) {
        setLines +=
          "try { _src.conformFrameRate = " + conformFrameRate + "; } catch(_e) { _warnings.push(\"conformFrameRate: \" + _e.toString()); }\n";
      }
      if (alphaMode !== undefined) {
        const aeAlpha: Record<string, string> = {
          ignore: "AlphaMode.IGNORE",
          straight: "AlphaMode.STRAIGHT",
          premultiplied: "AlphaMode.PREMULTIPLIED",
        };
        setLines +=
          "try { _src.alphaMode = " + aeAlpha[alphaMode] + "; } catch(_e) { _warnings.push(\"alphaMode: \" + _e.toString()); }\n";
      }
      if (premulColor !== undefined) {
        setLines +=
          "try { _src.premulColor = [" + premulColor.join(",") + "]; } catch(_e) { _warnings.push(\"premulColor: \" + _e.toString()); }\n";
      }
      if (fieldSeparationType !== undefined) {
        const aeField: Record<string, string> = {
          off: "FieldSeparationType.OFF",
          upper_first: "FieldSeparationType.UPPER_FIELD_FIRST",
          lower_first: "FieldSeparationType.LOWER_FIELD_FIRST",
        };
        setLines +=
          "try { _src.fieldSeparationType = " + aeField[fieldSeparationType] + "; } catch(_e) { _warnings.push(\"fieldSeparationType: \" + _e.toString()); }\n";
      }
      if (loop !== undefined) {
        setLines +=
          "try { _src.loop = " + loop + "; } catch(_e) { _warnings.push(\"loop: \" + _e.toString()); }\n";
      }

      const body =
        FIND_ITEM_BY_ID +
        "var _item = _findItemById(" + itemId + ");\n" +
        "if (!_item) {\n" +
        '  return { success: false, error: { message: "Item not found with id: ' + itemId + '", code: "ITEM_NOT_FOUND" } };\n' +
        "}\n" +
        "if (!(_item instanceof FootageItem)) {\n" +
        '  return { success: false, error: { message: "Item is not a footage item.", code: "INVALID_PARAMS" } };\n' +
        "}\n" +
        "var _src = _item.mainSource;\n" +
        setLines +
        "return { success: true, data: {\n" +
        "  itemId: _item.id,\n" +
        "  itemName: _item.name,\n" +
        "  warnings: _warnings\n" +
        "} };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "interpret_footage"));
      return runScript(script, "interpret_footage");
    }
  );

  // ─── create_folder ──────────────────────────────────────────────────────
  server.tool(
    "create_folder",
    "Create a new folder in the project panel for organizing items. " +
      "Optionally place it inside an existing folder.",
    {
      name: z
        .string()
        .min(1)
        .describe("Name of the new folder"),
      parentFolderId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("ID of a parent folder to nest this folder inside"),
    },
    async ({ name, parentFolderId }) => {
      let folderValidation = "";
      let folderBlock = "";
      if (parentFolderId !== undefined) {
        folderValidation =
          FIND_ITEM_BY_ID +
          "var _parent = _findItemById(" + parentFolderId + ");\n" +
          "if (!_parent || !(_parent instanceof FolderItem)) {\n" +
          '  return { success: false, error: { message: "Folder not found with id: ' + parentFolderId + '", code: "FOLDER_NOT_FOUND" } };\n' +
          "}\n";
        folderBlock = "_folder.parentFolder = _parent;\n";
      }

      const body =
        folderValidation +
        'var _folder = app.project.items.addFolder("' + escapeString(name) + '");\n' +
        folderBlock +
        "var _parentId = null;\n" +
        "var _parentName = null;\n" +
        "if (_folder.parentFolder) {\n" +
        "  _parentId = _folder.parentFolder.id;\n" +
        "  _parentName = _folder.parentFolder.name;\n" +
        "}\n" +
        "return { success: true, data: {\n" +
        "  itemId: _folder.id,\n" +
        "  name: _folder.name,\n" +
        "  parentFolderId: _parentId,\n" +
        "  parentFolderName: _parentName\n" +
        "} };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "create_folder"));
      return runScript(script, "create_folder");
    }
  );

  // ─── move_project_item ──────────────────────────────────────────────────
  server.tool(
    "move_project_item",
    "Move a project item into a different folder in the project panel.",
    {
      itemId: z
        .number()
        .int()
        .positive()
        .describe("Numeric ID of the item to move"),
      parentFolderId: z
        .number()
        .int()
        .positive()
        .describe("Numeric ID of the destination folder"),
    },
    async ({ itemId, parentFolderId }) => {
      const body =
        FIND_ITEM_BY_ID +
        "var _item = _findItemById(" + itemId + ");\n" +
        "if (!_item) {\n" +
        '  return { success: false, error: { message: "Item not found with id: ' + itemId + '", code: "ITEM_NOT_FOUND" } };\n' +
        "}\n" +
        "var _folder = _findItemById(" + parentFolderId + ");\n" +
        "if (!_folder || !(_folder instanceof FolderItem)) {\n" +
        '  return { success: false, error: { message: "Folder not found with id: ' + parentFolderId + '", code: "FOLDER_NOT_FOUND" } };\n' +
        "}\n" +
        "var _oldParentId = _item.parentFolder ? _item.parentFolder.id : null;\n" +
        "_item.parentFolder = _folder;\n" +
        "return { success: true, data: {\n" +
        "  itemId: _item.id,\n" +
        "  itemName: _item.name,\n" +
        "  oldParentFolderId: _oldParentId,\n" +
        "  newParentFolderId: _folder.id,\n" +
        "  newParentFolderName: _folder.name\n" +
        "} };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "move_project_item"));
      return runScript(script, "move_project_item");
    }
  );

  // ─── set_label_color ────────────────────────────────────────────────────
  server.tool(
    "set_label_color",
    "Set the label color index on a project item. " +
      "AE uses numeric labels 0-16: 0=None, 1=Red, 2=Yellow, 3=Aqua, 4=Pink, " +
      "5=Lavender, 6=Peach, 7=Sea Foam, 8=Blue, 9=Green, 10=Purple, " +
      "11=Orange, 12=Brown, 13=Fuchsia, 14=Cyan, 15=Sandstone, 16=DarkGreen.",
    {
      itemId: z
        .number()
        .int()
        .positive()
        .describe("Numeric ID of the project item"),
      label: z
        .number()
        .int()
        .min(0)
        .max(16)
        .describe("Label color index 0-16 (0=None, 1=Red, 2=Yellow, etc.)"),
    },
    async ({ itemId, label }) => {
      const body =
        FIND_ITEM_BY_ID +
        "var _item = _findItemById(" + itemId + ");\n" +
        "if (!_item) {\n" +
        '  return { success: false, error: { message: "Item not found with id: ' + itemId + '", code: "ITEM_NOT_FOUND" } };\n' +
        "}\n" +
        "_item.label = " + label + ";\n" +
        "return { success: true, data: {\n" +
        "  itemId: _item.id,\n" +
        "  itemName: _item.name,\n" +
        "  label: _item.label\n" +
        "} };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "set_label_color"));
      return runScript(script, "set_label_color");
    }
  );

  // ─── add_comment ────────────────────────────────────────────────────────
  server.tool(
    "add_comment",
    "Set or append a comment on a project item. " +
      "Comments are visible in the project panel's Comment column.",
    {
      itemId: z
        .number()
        .int()
        .positive()
        .describe("Numeric ID of the project item"),
      comment: z
        .string()
        .describe("Comment text to set or append"),
      append: z
        .boolean()
        .optional()
        .default(false)
        .describe("If true, append to existing comment instead of replacing"),
    },
    async ({ itemId, comment, append }) => {
      const commentEscaped = escapeString(comment);

      let setLine: string;
      if (append) {
        setLine =
          "var _existing = _item.comment;\n" +
          'if (_existing && _existing.length > 0) {\n' +
          '  _item.comment = _existing + "\\n" + "' + commentEscaped + '";\n' +
          "} else {\n" +
          '  _item.comment = "' + commentEscaped + '";\n' +
          "}\n";
      } else {
        setLine = '_item.comment = "' + commentEscaped + '";\n';
      }

      const body =
        FIND_ITEM_BY_ID +
        "var _item = _findItemById(" + itemId + ");\n" +
        "if (!_item) {\n" +
        '  return { success: false, error: { message: "Item not found with id: ' + itemId + '", code: "ITEM_NOT_FOUND" } };\n' +
        "}\n" +
        setLine +
        "return { success: true, data: {\n" +
        "  itemId: _item.id,\n" +
        "  itemName: _item.name,\n" +
        "  comment: _item.comment\n" +
        "} };\n";

      const script = wrapWithReturn(wrapInUndoGroup(body, "add_comment"));
      return runScript(script, "add_comment");
    }
  );
}
