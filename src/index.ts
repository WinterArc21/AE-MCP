#!/usr/bin/env node
/**
 * ae-mcp — After Effects MCP Server
 *
 * Connects AI assistants (Claude, Cursor, etc.) to After Effects via the
 * Model Context Protocol.  Uses a file-based bridge to send ExtendScript
 * commands to the AE MCP Bridge CEP panel running inside After Effects.
 *
 * Transport: stdio (standard for MCP)
 * Bridge:    ~/Documents/ae-mcp-commands/ (JSON command files)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Tool registration functions — each module registers its own tools
import { registerProjectTools } from "./tools/project.js";
import { registerCompositionTools } from "./tools/composition.js";
import { registerLayerTools } from "./tools/layer.js";
import { registerAnimationTools } from "./tools/animation.js";
import { registerExpressionTools } from "./tools/expression.js";
import { registerMotionDesignTools } from "./tools/motion-design.js";
import { registerRenderTools } from "./tools/render.js";
import { registerScriptTools } from "./tools/script.js";

// New tool modules
import { registerEffectTools } from "./tools/effects.js";
import { registerBlendModeTools } from "./tools/blend-modes.js";
import { registerMaskTools } from "./tools/masks.js";
import { registerThreeDTools } from "./tools/three-d.js";
import { registerTextAnimatorTools } from "./tools/text-animators.js";
import { registerShapeOperationTools } from "./tools/shape-operations.js";
import { registerPrecompTools } from "./tools/precomp.js";
import { registerMarkerTools } from "./tools/markers.js";
import { registerLayerSettingsTools } from "./tools/layer-settings.js";

// Import bridge so the singleton is initialized (and stale files cleaned) at
// startup, before the server begins accepting requests.
import { bridge } from "./bridge.js";

// ─── Server setup ─────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "ae-mcp",
  version: "2.0.0",
});

// Register all tool groups — original
registerProjectTools(server);
registerCompositionTools(server);
registerLayerTools(server);
registerAnimationTools(server);
registerExpressionTools(server);
registerMotionDesignTools(server);
registerRenderTools(server);
registerScriptTools(server);

// Register all tool groups — new in v2
registerEffectTools(server);
registerBlendModeTools(server);
registerMaskTools(server);
registerThreeDTools(server);
registerTextAnimatorTools(server);
registerShapeOperationTools(server);
registerPrecompTools(server);
registerMarkerTools(server);
registerLayerSettingsTools(server);

// ─── Startup diagnostics (stderr only — stdout is reserved for MCP) ───────────

process.stderr.write(`[ae-mcp] Server v2.0.0 starting\n`);
process.stderr.write(`[ae-mcp] Commands directory: ${bridge.commandsDirectory}\n`);
process.stderr.write(`[ae-mcp] Client prefix: ${bridge.prefix}\n`);
process.stderr.write(
  `[ae-mcp] Make sure the AE MCP Bridge CEP panel is open in After Effects\n`
);
process.stderr.write(`[ae-mcp]   (Window > Extensions > AE MCP Bridge)\n`);

// ─── Connect stdio transport ──────────────────────────────────────────────────

const transport = new StdioServerTransport();

await server.connect(transport);

process.stderr.write(`[ae-mcp] Connected via stdio. Ready.\n`);
