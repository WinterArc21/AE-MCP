/**
 * AE MCP Bridge — host.jsx
 * ExtendScript (ES3) host file for the AE MCP CEP extension.
 *
 * This script runs inside the After Effects scripting engine.
 * It is loaded at panel startup via the ScriptPath in manifest.xml.
 *
 * CRITICAL: Pure ES3 — no arrow functions, no let/const, no template literals,
 * no destructuring, no spread, no Promises. Use var everywhere.
 */

// ---------------------------------------------------------------------------
// JSON Polyfill — for AE versions whose JS engine lacks a native JSON object.
// Based on Douglas Crockford's json2.js (public domain).
// ---------------------------------------------------------------------------
(function () {
    "use strict";

    function f(n) {
        return n < 10 ? "0" + n : n;
    }

    if (typeof JSON !== "object") {
        JSON = {};
    }

    if (typeof JSON.stringify !== "function") {
        var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
        var escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
        var meta = {
            "\b": "\\b",
            "\t": "\\t",
            "\n": "\\n",
            "\f": "\\f",
            "\r": "\\r",
            "\"": "\\\"",
            "\\": "\\\\"
        };

        function quote(string) {
            escapable.lastIndex = 0;
            return escapable.test(string)
                ? "\"" + string.replace(escapable, function (a) {
                    var c = meta[a];
                    return typeof c === "string"
                        ? c
                        : "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
                }) + "\""
                : "\"" + string + "\"";
        }

        function str(key, holder) {
            var i, k, v, length, mind = gap, partial, value = holder[key];

            if (value && typeof value === "object" && typeof value.toJSON === "function") {
                value = value.toJSON(key);
            }

            switch (typeof value) {
            case "string":
                return quote(value);
            case "number":
                return isFinite(value) ? String(value) : "null";
            case "boolean":
            case "null":
                return String(value);
            case "object":
                if (!value) {
                    return "null";
                }
                gap += indent;
                partial = [];
                if (Object.prototype.toString.apply(value) === "[object Array]") {
                    length = value.length;
                    for (i = 0; i < length; i += 1) {
                        partial[i] = str(i, value) || "null";
                    }
                    v = partial.length === 0
                        ? "[]"
                        : gap
                        ? "[\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "]"
                        : "[" + partial.join(",") + "]";
                    gap = mind;
                    return v;
                }
                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ": " : ":") + v);
                        }
                    }
                }
                v = partial.length === 0
                    ? "{}"
                    : gap
                    ? "{\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "}"
                    : "{" + partial.join(",") + "}";
                gap = mind;
                return v;
            }
        }

        var gap;
        var indent;

        JSON.stringify = function (value, replacer, space) {
            var i;
            gap = "";
            indent = "";
            if (typeof space === "number") {
                for (i = 0; i < space; i += 1) {
                    indent += " ";
                }
            } else if (typeof space === "string") {
                indent = space;
            }
            if (replacer && typeof replacer !== "function" &&
                    (typeof replacer !== "object" ||
                    typeof replacer.length !== "number")) {
                throw new Error("JSON.stringify");
            }
            return str("", {"": value});
        };
    }

    if (typeof JSON.parse !== "function") {
        JSON.parse = function (text, reviver) {
            var j;
            function walk(holder, key) {
                var k, v, value = holder[key];
                if (value && typeof value === "object") {
                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver ? reviver.call(holder, key, value) : value;
            }

            text = String(text);
            cx.lastIndex = 0;
            if (cx.test(text)) {
                text = text.replace(cx, function (a) {
                    return "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
                });
            }

            if (/^[\],:{}\s]*$/.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, "@")
                    .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, "]")
                    .replace(/(?:^|:|,)(?:\s*\[)+/g, ""))) {
                j = eval("(" + text + ")");
                return typeof reviver === "function"
                    ? walk({"": j}, "")
                    : j;
            }
            throw new SyntaxError("JSON.parse: invalid JSON");
        };
    }
}());

// ---------------------------------------------------------------------------
// Bridge globals
// ---------------------------------------------------------------------------

/** Name of the commands directory (inside user's Documents folder). */
var COMMANDS_FOLDER_NAME = "ae-mcp-commands";

/** Config file in Documents that overrides the commands path (synced from AE_MCP_COMMANDS_DIR). */
var COMMANDS_DIR_CONFIG_FILE = "ae-mcp-commands-dir.txt";

/** Cached Folder reference, created by initBridge(). */
var commandsFolder = null;

/**
 * Resolves the commands folder path. Same strategy as the MCP server:
 * 1. Primary: AE_MCP_COMMANDS_DIR override (via config file written by Node when env is set)
 * 2. Fallback: Documents/ae-mcp-commands
 */
function getCommandsFolderPath() {
    var configPath = Folder.myDocuments.fsName + "/" + COMMANDS_DIR_CONFIG_FILE;
    var configFile = new File(configPath);
    if (configFile.exists) {
        try {
            configFile.encoding = "UTF-8";
            if (configFile.open("r")) {
                var content = configFile.read();
                configFile.close();
                if (content && (content = content.replace(/^\s+|\s+$/g, "")).length > 0) {
                    return content;
                }
            }
        } catch (configErr) {
            /* fall through to default */
        }
    }
    return Folder.myDocuments.fsName + "/" + COMMANDS_FOLDER_NAME;
}

/**
 * In-memory set of file names that have already been dispatched in this
 * session. Prevents re-processing if a rename races with the next poll.
 * Keys are file basenames (e.g. "cmd_abc123.json"); values are always true.
 */
var processedCommands = {};

/** Bridge version string returned by getStatus(). */
var BRIDGE_VERSION = "1.0.0";

// ---------------------------------------------------------------------------
// initBridge()
// Called once from the panel JS after the panel loads.
// Creates the commands folder if it does not exist, resets session state.
// Returns a JSON string: { success, version, commandsPath, message }
// ---------------------------------------------------------------------------
function initBridge() {
    try {
        var commandsPath = getCommandsFolderPath();
        commandsFolder = new Folder(commandsPath);

        if (!commandsFolder.exists) {
            commandsFolder.create();
        }

        // Reset the in-memory dedup set on each init (panel reload).
        processedCommands = {};

        return JSON.stringify({
            success: true,
            version: BRIDGE_VERSION,
            commandsPath: commandsFolder.fsName,
            message: "Bridge initialised. Watching: " + commandsFolder.fsName
        });
    } catch (initErr) {
        return JSON.stringify({
            success: false,
            version: BRIDGE_VERSION,
            commandsPath: "",
            message: "initBridge error: " + initErr.toString()
        });
    }
}

// ---------------------------------------------------------------------------
// processCommands()
// Called on every poll tick from the panel JS (every 300 ms by default).
// Scans the commands folder for unprocessed .json files, executes each one,
// writes a .response file, then renames the command to .processed.
//
// Returns a JSON string:
// {
//   processed: <number>,   — commands successfully executed this tick
//   errors:    <number>,   — commands that failed this tick
//   commands:  <Array>     — summary entries for UI log
// }
// ---------------------------------------------------------------------------
function processCommands() {
    var result = {
        processed: 0,
        errors: 0,
        commands: []
    };

    // Ensure the bridge has been initialised; recover gracefully if not.
    if (!commandsFolder || !commandsFolder.exists) {
        try {
            var commandsPath = getCommandsFolderPath();
            commandsFolder = new Folder(commandsPath);
            if (!commandsFolder.exists) {
                commandsFolder.create();
            }
        } catch (reinitErr) {
            result.commands.push({
                id: "BRIDGE_ERROR",
                status: "error",
                message: "Commands folder unavailable: " + reinitErr.toString()
            });
            return JSON.stringify(result);
        }
    }

    // Retrieve all *.json files in the folder.
    // getFiles("*.json") returns files whose names end with .json —
    // this includes .json.response and .json.processed on some platforms
    // if the filter is handled naively, so we post-filter below.
    var allFiles;
    try {
        allFiles = commandsFolder.getFiles("*.json");
    } catch (listErr) {
        result.commands.push({
            id: "LIST_ERROR",
            status: "error",
            message: "Failed to list commands: " + listErr.toString()
        });
        return JSON.stringify(result);
    }

    if (!allFiles || allFiles.length === 0) {
        return JSON.stringify(result);
    }

    // Process each candidate file.
    for (var i = 0; i < allFiles.length; i++) {
        var file = allFiles[i];

        // Skip directories (getFiles can return Folder objects too).
        if (file instanceof Folder) {
            continue;
        }

        var fileName = file.name;

        // Only process plain .json files — skip .response, .processed, etc.
        // A valid command file ends with exactly ".json" (no further extension).
        if (fileName.length < 5) {
            continue;
        }
        var lastFive = fileName.substring(fileName.length - 5);
        if (lastFive !== ".json") {
            continue;
        }

        // Dedup: skip if we already dispatched this file in the current session.
        if (processedCommands[fileName]) {
            continue;
        }

        // Mark in dedup set immediately to prevent concurrent re-entry.
        processedCommands[fileName] = true;

        // -------------------------------------------------------------------
        // Read the command file.
        // -------------------------------------------------------------------
        var commandId = fileName;   // fallback id if parse fails
        var commandData = null;
        var readError = null;

        try {
            file.encoding = "UTF-8";
            if (!file.open("r")) {
                throw new Error("Could not open file for reading: " + fileName);
            }
            var rawContent = file.read();
            file.close();

            if (!rawContent || rawContent.length === 0) {
                throw new Error("Command file is empty: " + fileName);
            }

            commandData = JSON.parse(rawContent);

            if (commandData && commandData.id) {
                commandId = commandData.id;
            }
        } catch (readErr) {
            readError = readErr;
        }

        if (readError || !commandData || !commandData.script) {
            // Write a parse-error response so the server doesn't time out.
            var parseErrMsg = readError
                ? readError.toString()
                : "Missing 'script' field in command file: " + fileName;

            writeErrorResponse(file, commandId, "PARSE_ERROR", parseErrMsg);
            $.sleep(100);
            archiveCommand(file);

            result.errors += 1;
            result.commands.push({
                id: commandId,
                status: "error",
                message: parseErrMsg
            });
            continue;
        }

        // -------------------------------------------------------------------
        // Execute the script inside After Effects.
        // Wrap in an undo group so the user can Ctrl+Z the whole operation.
        // -------------------------------------------------------------------
        var execSuccess = false;
        var execMessage = "";

        app.beginUndoGroup("AE MCP: " + commandId);
        try {
            // eval() the script string in the current ExtendScript context.
            // The script is expected to return a value (or an object).
            var rawResult = eval(commandData.script); // jshint ignore:line

            // Normalise the result to { success: true, data: ... }.
            var formattedResult;
            if (rawResult !== null &&
                rawResult !== undefined &&
                typeof rawResult === "object" &&
                rawResult.hasOwnProperty("success")) {
                // Script returned a properly shaped result object.
                formattedResult = rawResult;
            } else if (rawResult === undefined || rawResult === null) {
                // Script returned nothing — treat as successful void operation.
                formattedResult = { success: true, data: null };
            } else {
                // Script returned a plain value; wrap it.
                formattedResult = { success: true, data: rawResult };
            }

            // Write response file.
            var responsePayload = JSON.stringify({
                id: commandId,
                result: formattedResult
            }, null, 2);

            var responseFile = new File(file.fsName + ".response");
            responseFile.encoding = "UTF-8";
            if (!responseFile.open("w")) {
                throw new Error("Could not open response file for writing: " + responseFile.fsName);
            }
            responseFile.write(responsePayload);
            responseFile.close();

            // Small delay to ensure the OS flushes the write before the
            // MCP server's polling loop reads the response file.
            $.sleep(100);

            // Archive the command (rename to .processed).
            archiveCommand(file);

            execSuccess = true;
            execMessage = formattedResult.success
                ? "OK"
                : ("Script reported failure: " + (formattedResult.error ? formattedResult.error.message : "unknown"));

            result.processed += 1;

        } catch (execErr) {
            // Execution error: write a structured error response, then archive.
            var errMsg = execErr.toString();
            var errLine = (typeof execErr.line !== "undefined") ? execErr.line : "unknown";
            var errDetail = errMsg + " (line " + errLine + ")";

            writeErrorResponse(file, commandId, "EXECUTION_ERROR", errDetail);
            $.sleep(100);
            archiveCommand(file);

            execSuccess = false;
            execMessage = errDetail;
            result.errors += 1;

        } finally {
            app.endUndoGroup();
        }

        result.commands.push({
            id: commandId,
            status: execSuccess ? "ok" : "error",
            message: execMessage
        });
    }

    return JSON.stringify(result);
}

// ---------------------------------------------------------------------------
// getStatus()
// Returns a JSON string with current bridge status information.
// Useful for health-checks from the panel UI.
// ---------------------------------------------------------------------------
function getStatus() {
    var folderExists = false;
    var folderPath = "";
    var pendingCount = 0;

    try {
        if (commandsFolder && commandsFolder.exists) {
            folderExists = true;
            folderPath = commandsFolder.fsName;

            // Count unprocessed .json files.
            var files = commandsFolder.getFiles("*.json");
            if (files) {
                for (var i = 0; i < files.length; i++) {
                    if (files[i] instanceof Folder) { continue; }
                    var n = files[i].name;
                    var last5 = n.substring(n.length - 5);
                    if (last5 === ".json") {
                        pendingCount += 1;
                    }
                }
            }
        }
    } catch (statusErr) {
        // Non-fatal; return best-effort info.
    }

    return JSON.stringify({
        success: true,
        version: BRIDGE_VERSION,
        folderExists: folderExists,
        commandsPath: folderPath,
        pendingCommands: pendingCount,
        aeVersion: app.version || "unknown"
    });
}

// ---------------------------------------------------------------------------
// archiveCommand(file)
// Renames the processed command file by appending ".processed".
// This keeps a record without blocking future poll cycles.
// Falls back to deletion if rename fails.
// ---------------------------------------------------------------------------
function archiveCommand(file) {
    try {
        // file.rename() changes only the base name within the same folder.
        // We append ".processed" to the current name.
        var newName = file.name + ".processed";
        var renamed = file.rename(newName);
        if (!renamed) {
            // rename() returned false — try deletion as a fallback.
            file.remove();
        }
    } catch (archiveErr) {
        // Last resort: try to delete so the file is not re-processed.
        try { file.remove(); } catch (delErr) { /* nothing more we can do */ }
    }
}

// ---------------------------------------------------------------------------
// writeErrorResponse(commandFile, commandId, errorCode, errorMessage)
// Writes a structured error response file alongside the command file.
// ---------------------------------------------------------------------------
function writeErrorResponse(commandFile, commandId, errorCode, errorMessage) {
    try {
        var payload = JSON.stringify({
            id: commandId,
            result: {
                success: false,
                error: {
                    message: errorMessage,
                    code: errorCode
                }
            }
        }, null, 2);

        var errResponseFile = new File(commandFile.fsName + ".response");
        errResponseFile.encoding = "UTF-8";
        if (errResponseFile.open("w")) {
            errResponseFile.write(payload);
            errResponseFile.close();
        }
    } catch (writeErr) {
        // Writing the error response itself failed.
        // There is nothing further we can do without risking a crash.
    }
}
