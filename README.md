# ae-mcp — After Effects MCP Server

AI-powered motion design automation for Adobe After Effects. Connect Claude, Cursor, or any MCP-compatible AI assistant directly to After Effects.

**v2.0.0** — 75+ tools across 17 modules, agent knowledge base, and Cursor AI integration.

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

Cursor users also benefit from the included `.cursorrules` file, which gives the Cursor AI agent deep context about After Effects workflows, tool usage patterns, and motion design best practices.

Replace `/path/to/ae-mcp` with the actual path to this directory.

## Available Tools (82+ total)

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

### Layer Management (13 tools)
| Tool | Description |
|------|-------------|
| `add_solid_layer` | Add a solid-color layer |
| `add_text_layer` | Add a text layer with full formatting |
| `add_shape_layer` | Add a shape layer (rectangle, ellipse, polygon, star) |
| `add_null_layer` | Add a null object (for parenting/expressions) |
| `add_adjustment_layer` | Add an adjustment layer |
| `add_comp_layer` | Add an existing composition as a layer (comp nesting) |
| `list_layers` | List all layers in a composition |
| `get_layer_properties` | Get detailed properties of a specific layer |
| `set_layer_properties` | Set layer properties (position, scale, opacity, etc.) |
| `delete_layer` | Delete a layer by index |
| `duplicate_layer` | Duplicate a layer |
| `set_parent` | Set a layer's parent (for hierarchical animation) |
| `reorder_layer` | Move a layer to a different position in the stack |

### Animation & Keyframes (7 tools)
| Tool | Description |
|------|-------------|
| `add_keyframe` | Add a keyframe to any animatable property |
| `batch_keyframes` | Add multiple keyframes at once |
| `set_keyframe_easing` | Set easing on a specific keyframe |
| `set_all_keyframes_easing` | Apply easing to all keyframes on a property |
| `remove_keyframes` | Remove all keyframes from a property |
| `set_time_remap` | Enable time remapping for speed ramps, freeze frames, reverse |
| `set_spatial_interpolation` | Set linear or Bézier motion paths on Position keyframes |

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

### Effects (7 tools) — NEW
| Tool | Description |
|------|-------------|
| `add_effect` | Add any After Effects effect to a layer by match name |
| `set_effect_property` | Set a property value on an applied effect |
| `get_effect_properties` | Get all properties of an applied effect |
| `remove_effect` | Remove an effect from a layer |
| `enable_effect` | Enable or disable an effect |
| `duplicate_effect` | Duplicate an applied effect |
| `reorder_effect` | Change the order of effects on a layer |

### Blend Modes (2 tools) — NEW
| Tool | Description |
|------|-------------|
| `set_blend_mode` | Set the blending mode on a layer |
| `set_track_matte` | Configure track matte (alpha, luma) between layers |

### Masks (4 tools) — NEW
| Tool | Description |
|------|-------------|
| `add_mask` | Add a mask (rectangle, ellipse, or path) to a layer |
| `set_mask_properties` | Set mask feather, opacity, expansion, and mode |
| `remove_mask` | Remove a mask from a layer |
| `set_mask_path` | Update the path vertices of an existing mask |

### 3D (4 tools) — NEW
| Tool | Description |
|------|-------------|
| `set_layer_3d` | Toggle a layer's 3D switch |
| `add_camera` | Add a camera layer to the composition |
| `add_light` | Add a light layer (ambient, spot, point, parallel) |
| `set_camera_properties` | Configure camera zoom, depth of field, and focus |

### Text Animators (2 tools) — NEW
| Tool | Description |
|------|-------------|
| `add_text_animator` | Add a text animator with range selector and properties |
| `set_text_animator_property` | Update properties of an existing text animator |

### Shape Operations (12 tools) — NEW
| Tool | Description |
|------|-------------|
| `add_shape_group` | Add a shape group to an existing shape layer |
| `set_shape_fill` | Set the fill color and opacity of a shape |
| `set_shape_stroke` | Set the stroke color, width, and style of a shape |
| `add_shape_path` | Add a custom Bezier path to a shape group |
| `add_trim_paths` | Trim Paths for draw-on/draw-off line animation |
| `add_repeater` | Repeater to clone and offset shape contents |
| `add_wiggle_paths` | Wiggle Paths for organic/rough shape edges |
| `add_merge_paths` | Merge Paths for boolean shape operations |
| `add_offset_paths` | Offset Paths to expand or contract shape outlines |
| `add_pucker_bloat` | Pucker & Bloat for organic shape distortion |
| `add_zig_zag` | Zig Zag for wave/angular edge distortion |
| `add_twist` | Twist for spiral shape distortion |

### Pre-compositions (2 tools) — NEW
| Tool | Description |
|------|-------------|
| `precompose_layers` | Pre-compose selected layers into a new composition |
| `open_precomp` | Open a pre-comp in its own composition panel |

### Markers (2 tools) — NEW
| Tool | Description |
|------|-------------|
| `add_comp_marker` | Add a composition marker at a specified time |
| `add_layer_marker` | Add a marker to a specific layer |

### Layer Settings (4 tools) — NEW
| Tool | Description |
|------|-------------|
| `set_layer_quality` | Set render quality (best, draft, wireframe) |
| `set_motion_blur` | Enable or disable motion blur on a layer |
| `set_layer_timing` | Set layer in/out points, start time, and time stretch |
| `set_layer_flags` | Set boolean flags (shy, solo, locked, guide, collapse, frame blend) |

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

## Agent Knowledge Base

The `docs/` folder is a structured knowledge base designed for AI agents. It provides reference material that agents can consult to produce higher-quality, more idiomatic After Effects output — without needing to guess at effect names, expression syntax, or design conventions.

### docs/effects/ — Effect References (41 files)
Per-effect documentation covering match names, property names, value ranges, and usage notes for the most commonly used After Effects built-in effects. AI agents use these to call `add_effect` and `set_effect_property` with correct parameters the first time.

### docs/expressions/ — Expression Recipes (6 files)
| File | Contents |
|------|----------|
| `README.md` | Overview of the expression system and how to apply recipes |
| `time-based.md` | Time-driven expressions (clocks, countdowns, offsets) |
| `motion.md` | Motion expressions (wiggle, inertia, spring, follow) |
| `text.md` | Text expressions (dynamic strings, number counters) |
| `color.md` | Color expressions (HSL shifts, reactive color, gradients) |
| `utility.md` | Utility expressions (index offsets, conditionals, math helpers) |

### docs/templates/ — Scene Templates (6 files)
| File | Contents |
|------|----------|
| `README.md` | How to instantiate and customize templates |
| `lower-third.md` | Animated lower-third with name + title fields |
| `title-card.md` | Full-screen title card with reveal animation |
| `data-card.md` | Data visualization card for stats and metrics |
| `logo-reveal.md` | Logo reveal with customizable animation style |
| `social-story.md` | Vertical 9:16 social story layout |

### docs/best-practices.md
Comprehensive design guidelines covering timing, easing curves, typography, color usage, layer organization, and output settings. Agents reference this to make opinionated, professional-quality decisions rather than defaulting to arbitrary values.

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
│   ├── index.ts
│   ├── bridge.ts
│   ├── script-builder.ts
│   └── tools/
│       ├── project.ts
│       ├── composition.ts
│       ├── layer.ts
│       ├── animation.ts
│       ├── expression.ts
│       ├── motion-design.ts
│       ├── render.ts
│       ├── script.ts
│       ├── effects.ts          # NEW
│       ├── blend-modes.ts      # NEW
│       ├── masks.ts            # NEW
│       ├── three-d.ts          # NEW
│       ├── text-animators.ts   # NEW
│       ├── shape-operations.ts # NEW
│       ├── precomp.ts          # NEW
│       ├── markers.ts          # NEW
│       └── layer-settings.ts   # NEW
├── cep-extension/
│   ├── CSXS/manifest.xml
│   ├── .debug
│   ├── index.html
│   ├── js/CSInterface.js
│   └── jsx/host.jsx
├── docs/                       # NEW — Agent Knowledge Base
│   ├── effects/                # 41 effect reference docs
│   ├── expressions/            # Expression recipes
│   ├── templates/              # Scene templates
│   └── best-practices.md       # Design guidelines
├── scripts/
│   └── install-extension.js
├── .cursorrules                # NEW — Cursor AI agent rules
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

Bridge architecture inspired by [p10q/ae-mcp](https://github.com/p10q/ae-mcp). Extended with motion design tools, batch operations, high-level animation presets, effects system, 3D/camera support, and an agent knowledge base for AI-driven video production workflows.

## License

MIT
