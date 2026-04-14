# ae-mcp — After Effects MCP Server

AI-powered motion design automation for Adobe After Effects. Connect Claude, Cursor, or any MCP-compatible AI assistant directly to After Effects.

**v2.0.0** — **75** tools across **23** modules. Full API listing: [TOOLS.md](TOOLS.md).

## How it works

```
┌─────────────┐    stdio     ┌─────────────┐   file bridge   ┌──────────────────┐
│  AI Client   │◄───────────►│  MCP Server  │◄───────────────►│  After Effects   │
│ (Claude, etc)│             │  (Node.js)   │  commands dir   │  CEP Panel +     │
└─────────────┘             └─────────────┘  (see README)     │  ExtendScript    │
                                                               └──────────────────┘
```

1. The AI sends tool calls via MCP (stdio transport)
2. The MCP server translates them into ExtendScript and writes JSON command files
3. A CEP panel inside After Effects polls for new commands, executes them, and writes response files
4. The server reads responses and returns results to the AI

## Requirements

- **Adobe After Effects** 2022 (v22) or later
- **Node.js** 18+
- **pnpm** — [install pnpm](https://pnpm.io/installation); this repo uses `pnpm-lock.yaml` and `packageManager` in `package.json` (Corepack-compatible)
- **macOS** or **Windows**

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Build the TypeScript source
pnpm run build

# 3. Install the CEP extension into After Effects
pnpm run install-extension

# 4. Restart After Effects, then open the panel:
#    Window > Extensions > AE MCP Bridge

# 5. Start the MCP server
pnpm start
```

## Configure your AI client

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ae-mcp": {
      "command": "node",
      "args": ["/path/to/ae-mcp/dist/index.js"]
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "ae-mcp": {
      "command": "node",
      "args": ["/path/to/ae-mcp/dist/index.js"]
    }
  }
}
```

Replace `/path/to/ae-mcp` with the actual path to this directory.

## Available Tools

`ae-mcp` currently ships **75 tools across 23 modules**.

For the full copy-paste API reference, see [TOOLS.md](TOOLS.md).

### Tool Modules
- Project Management: 5 tools
- Project Items & Assets: 5 tools
- Composition: 6 tools
- Layer Management: 10 tools
- Typography: 2 tools
- Animation & Keyframes: 2 tools
- Generic Properties: 3 tools
- Expressions: 2 tools
- Motion Design Presets: 1 tool
- Effects: 4 tools
- Compositing: 1 tool
- Masks: 3 tools
- 3D: 4 tools
- Text Animators: 2 tools
- Shape Paths: 3 tools
- Shape Operations: 2 tools
- Pre-compositions: 2 tools
- Markers: 1 tool
- Layer Settings: 2 tools
- Rendering & Preview: 5 tools
- Scripting: 1 tool
- Compound Tools: 6 tools
- QA & Polish: 3 tools

### Recommended Entry Points
- Scene building: `create_composition`, `add_text_layer`, `add_shape_layer`, `create_scene`
- Animation: `add_keyframe`, `add_keyframes_batch`, `set_all_keyframes_easing`, motion presets
- Typography: `list_fonts`, `get_text_document`, `set_text_document`
- Arbitrary AE access: `list_property_tree`, `get_property`, `set_property`, `set_property_keyframes`
- Rendering: `add_to_render_queue`, `list_render_templates`, `capture_frame`, `start_render`

## File Bridge Protocol

The MCP server and CEP panel communicate through JSON files in a shared commands folder.

### Commands folder location

- **Default**: The user Documents folder (`~/Documents/ae-mcp-commands/` on macOS/Linux, `%USERPROFILE%\Documents\ae-mcp-commands\` on Windows).
- **Recommended override**: create `ae-mcp.config.json` in the repo root:

```json
{
  "commandsDir": "/absolute/path/to/ae-mcp-commands"
}
```

- You can use `ae-mcp.config.example.json` as a starting point.
- The server syncs the resolved folder to `~/Documents/ae-mcp-commands-dir.txt` so the CEP panel (which cannot read env vars) always uses the same path.

```
Command flow:
  Server writes:   {prefix}_{tool}_{timestamp}_{random}.json
  CEP renames to:  ...json.processed  (acknowledges receipt)
  CEP writes:      ...json.response   (with result data)
  Server reads and deletes both files
```

- **Polling interval**: 100ms
- **Command timeout**: 60 seconds
- Each server instance uses a unique prefix (`aemcp_{pid}_{timestamp}`) so multiple clients don't conflict

## Development

```bash
# Run in dev mode (auto-recompile with tsx)
pnpm run dev

# Type-check without building
pnpm run typecheck
```

## Architecture

```
ae-mcp/
|-- src/
|   |-- index.ts
|   |-- bridge.ts
|   |-- script-builder.ts
|   |-- value-validator.ts
|   `-- tools/
|       |-- project.ts
|       |-- composition.ts
|       |-- layer.ts
|       |-- animation.ts
|       |-- expression.ts
|       |-- motion-design.ts
|       |-- render.ts
|       |-- script.ts
|       |-- effects.ts
|       |-- blend-modes.ts
|       |-- masks.ts
|       |-- three-d.ts
|       |-- text-animators.ts
|       |-- shape-operations.ts
|       |-- precomp.ts
|       |-- markers.ts
|       |-- layer-settings.ts
|       |-- properties.ts
|       |-- typography.ts
|       |-- shape-paths.ts
|       |-- project-items.ts
|       |-- compound.ts
|       `-- qa.ts
|-- cep-extension/
|   |-- CSXS/manifest.xml
|   |-- .debug
|   |-- index.html
|   |-- js/CSInterface.js
|   `-- jsx/host.jsx
|-- scripts/
|   |-- build.mjs
|   |-- install-extension.js
|   `-- check-readme-tools.js
|-- .env.example
|-- TOOLS.md
|-- package.json
|-- tsconfig.json
`-- README.md
```

## Troubleshooting

### "Tool timed out — is the AE MCP Bridge panel open?"
- Make sure After Effects is running
- Open the panel: **Window > Extensions > AE MCP Bridge**
- The panel should show "Waiting for commands..."
- If the panel doesn't appear, re-run `pnpm run install-extension` and restart AE

### Panel doesn't appear in Window > Extensions
- Make sure you ran `pnpm run install-extension` (it enables PlayerDebugMode)
- Restart After Effects completely (not just close/reopen the project)
- On macOS, check: `~/Library/Application Support/Adobe/CEP/extensions/com.motiona.ae-mcp/`
- On Windows, check: `%APPDATA%/Adobe/CEP/extensions/com.motiona.ae-mcp/`

### ExtendScript errors
- The server returns detailed error messages from After Effects including line numbers
- Use the `run_extendscript` tool to test scripts directly
- The CEP panel log shows all executed commands and their results

## Credits

Bridge architecture inspired by [p10q/ae-mcp](https://github.com/p10q/ae-mcp). Extended with motion design tools, batch operations, high-level animation presets, effects system, 3D/camera support, compound workflows, and QA/polish tools for AI-driven video production.

## License

MIT




