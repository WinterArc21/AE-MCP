# ae-mcp — After Effects MCP Server

AI-powered motion design automation for Adobe After Effects. Connect Claude, Cursor, or any MCP-compatible AI assistant directly to After Effects.

## How it works

```
┌─────────────┐    stdio     ┌─────────────┐   file bridge   ┌──────────────────┐
│  AI Client   │◄───────────►│  MCP Server  │◄───────────────►│  After Effects   │
│ (Claude, etc)│             │  (Node.js)   │  ~/Documents/   │  CEP Panel +     │
└─────────────┘             └─────────────┘  ae-mcp-commands/ │  ExtendScript    │
                                                               └──────────────────┘
```

1. The AI sends tool calls via MCP (stdio transport)
2. The MCP server translates them into ExtendScript and writes JSON command files
3. A CEP panel inside After Effects polls for new commands, executes them, and writes response files
4. The server reads responses and returns results to the AI

## Requirements

- **Adobe After Effects** 2022 (v22) or later
- **Node.js** 18+
- **macOS** or **Windows**

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Build the TypeScript source
npm run build

# 3. Install the CEP extension into After Effects
npm run install-extension

# 4. Restart After Effects, then open the panel:
#    Window > Extensions > AE MCP Bridge

# 5. Start the MCP server
npm start
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

## Available Tools (44 total)

### Project Management (5 tools)
| Tool | Description |
|------|-------------|
| `get_project_info` | Get current project metadata |
| `create_project` | Create a new AE project |
| `save_project` | Save the current project |
| `open_project` | Open a project file |
| `import_file` | Import a file (image, video, audio, AI) |

### Composition (5 tools)
| Tool | Description |
|------|-------------|
| `create_composition` | Create a new composition |
| `get_composition` | Get details about a composition |
| `list_compositions` | List all compositions in the project |
| `duplicate_composition` | Duplicate a composition |
| `set_comp_settings` | Update comp settings (resolution, fps, duration, bg) |

### Layer Management (12 tools)
| Tool | Description |
|------|-------------|
| `add_solid_layer` | Add a solid-color layer |
| `add_text_layer` | Add a text layer with full formatting |
| `add_shape_layer` | Add a shape layer (rectangle, ellipse, polygon, star) |
| `add_null_layer` | Add a null object (for parenting/expressions) |
| `add_adjustment_layer` | Add an adjustment layer |
| `list_layers` | List all layers in a composition |
| `get_layer_properties` | Get detailed properties of a specific layer |
| `set_layer_properties` | Set layer properties (position, scale, opacity, etc.) |
| `delete_layer` | Delete a layer by index |
| `duplicate_layer` | Duplicate a layer |
| `set_parent` | Set a layer's parent (for hierarchical animation) |
| `reorder_layer` | Move a layer to a different position in the stack |

### Animation & Keyframes (5 tools)
| Tool | Description |
|------|-------------|
| `add_keyframe` | Add a keyframe to any animatable property |
| `batch_keyframes` | Add multiple keyframes at once |
| `set_keyframe_easing` | Set easing on a specific keyframe |
| `set_all_keyframes_easing` | Apply easing to all keyframes on a property |
| `remove_keyframes` | Remove all keyframes from a property |

### Expressions (5 tools)
| Tool | Description |
|------|-------------|
| `set_expression` | Set a custom expression on a property |
| `remove_expression` | Remove an expression |
| `wiggle_expression` | Apply a wiggle expression |
| `loop_expression` | Apply a loopIn/loopOut expression |
| `link_expression` | Link a property to another property via expression |

### Motion Design Presets (8 tools)
| Tool | Description |
|------|-------------|
| `fade_in` | Fade a layer in from transparent |
| `fade_out` | Fade a layer out to transparent |
| `slide_in` | Slide a layer in from off-screen (any direction) |
| `scale_in` | Scale a layer from 0% to 100% |
| `bounce_in` | Bounce-in effect with elastic easing |
| `typewriter` | Character-by-character text reveal |
| `apply_color_theme` | Set consistent colors across layers |
| `create_scene` | Create a full scene with background + title + subtitle |

### Rendering (3 tools)
| Tool | Description |
|------|-------------|
| `add_to_render_queue` | Add a composition to the render queue |
| `get_render_status` | Check render queue status |
| `start_render` | Start rendering |

### Scripting (1 tool)
| Tool | Description |
|------|-------------|
| `run_extendscript` | Execute raw ExtendScript (escape hatch for advanced use) |

## File Bridge Protocol

The MCP server and CEP panel communicate through JSON files in `~/Documents/ae-mcp-commands/`:

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
npm run dev

# Type-check without building
npm run typecheck
```

## Architecture

```
ae-mcp/
├── src/
│   ├── index.ts              # Entry point — registers all tools, starts server
│   ├── bridge.ts             # AEBridge class — file-based command/response
│   ├── script-builder.ts     # ES3 ExtendScript code builder helpers
│   └── tools/
│       ├── project.ts        # Project management tools
│       ├── composition.ts    # Composition tools
│       ├── layer.ts          # Layer creation & manipulation
│       ├── animation.ts      # Keyframe & easing tools
│       ├── expression.ts     # Expression tools
│       ├── motion-design.ts  # High-level motion presets
│       ├── render.ts         # Render queue tools
│       └── script.ts         # Raw ExtendScript execution
├── cep-extension/
│   ├── CSXS/manifest.xml     # CEP bundle manifest
│   ├── .debug                # Debug signing override
│   ├── index.html            # Panel UI (status, stats, log)
│   ├── js/CSInterface.js     # Adobe CSInterface library
│   └── jsx/host.jsx          # ExtendScript executor (ES3)
├── scripts/
│   └── install-extension.js  # One-click CEP install + debug mode
├── package.json
├── tsconfig.json
└── README.md
```

## Troubleshooting

### "Tool timed out — is the AE MCP Bridge panel open?"
- Make sure After Effects is running
- Open the panel: **Window > Extensions > AE MCP Bridge**
- The panel should show "Waiting for commands..."
- If the panel doesn't appear, re-run `npm run install-extension` and restart AE

### Panel doesn't appear in Window > Extensions
- Make sure you ran `npm run install-extension` (it enables PlayerDebugMode)
- Restart After Effects completely (not just close/reopen the project)
- On macOS, check: `~/Library/Application Support/Adobe/CEP/extensions/com.motiona.ae-mcp/`
- On Windows, check: `%APPDATA%/Adobe/CEP/extensions/com.motiona.ae-mcp/`

### ExtendScript errors
- The server returns detailed error messages from After Effects including line numbers
- Use the `run_extendscript` tool to test scripts directly
- The CEP panel log shows all executed commands and their results

## Credits

Bridge architecture inspired by [p10q/ae-mcp](https://github.com/p10q/ae-mcp). Extended with motion design tools, batch operations, and high-level animation presets for AI-driven video production workflows.

## License

MIT
