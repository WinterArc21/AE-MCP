# ae-mcp Tools Reference

Canonical API reference for the shipped MCP tool surface.

- Total tools: `75`
- Server version: `v2.0.0`
- Source of truth: `src/tools/*.ts`

## Conventions

- `compId`: numeric composition ID
- `layerIndex`: 1-based layer index
- `itemId`: numeric project item ID
- Colors use normalized `[r, g, b]` floats in the `0-1` range unless noted otherwise
- Positions use pixels
- Times use seconds

## Project Management

### `get_project_info`
- Purpose: read current AE project metadata
- Args: none
- Returns/features: project name, path, item count, bit depth

### `create_project`
- Purpose: create a new empty AE project
- Args: none
- Returns/features: clears current unsaved project state in AE

### `save_project`
- Purpose: save the current project
- Args:
- `path?`: optional Save As target
- Returns/features: saved file path

### `open_project`
- Purpose: open an existing `.aep` or `.aepx`
- Args:
- `path`
- Returns/features: opened project name and path

### `import_file`
- Purpose: import media into the project
- Args:
- `path`
- `compId?`: optionally add imported item as a layer in a comp
- Returns/features: imported item id, name, type

## Project Items & Assets

### `list_project_items`
- Purpose: list project panel items
- Args:
- `itemType?`: `any | composition | footage | folder`
- `folderId?`
- `limit?`
- Returns/features: ids, names, types, labels, comments, parent folder info, file path when available

### `get_project_item_info`
- Purpose: inspect a single project item
- Args:
- `itemId`
- Returns/features: common metadata plus type-specific details for comps, footage, and folders

### `replace_layer_source`
- Purpose: replace a layer's source with another project item
- Args:
- `compId`
- `layerIndex`
- `newSourceId`
- `fixExpressions?`
- Returns/features: updated source id/name/type

### `import_file_advanced`
- Purpose: import footage with richer options
- Args:
- `path`
- `importAs?`: `footage | composition | composition_cropped_layers`
- `sequence?`
- `forceAlphabetical?`
- `parentFolderId?`
- Returns/features: imported item id/name/type

### `interpret_footage`
- Purpose: set footage interpretation options
- Args:
- `itemId`
- `conformFrameRate?`
- `alphaMode?`: `ignore | straight | premultiplied`
- `premulColor?`
- `fieldSeparationType?`: `off | upper_first | lower_first`
- `loop?`
- Returns/features: warnings array for unsupported interpretation fields

## Composition

### `create_composition`
- Purpose: create a new composition
- Args:
- `name`
- `width`
- `height`
- `duration`
- `frameRate`
- `bgColor?`
- Returns/features: comp id

### `get_composition`
- Purpose: inspect one composition
- Args:
- `compId`
- Returns/features: dimensions, duration, frame rate, bg color, work area, layer count

### `list_compositions`
- Purpose: list all compositions
- Args: none
- Returns/features: id, name, size, duration, fps, layer count

### `duplicate_composition`
- Purpose: duplicate a composition
- Args:
- `compId`
- `newName?`
- Returns/features: duplicate comp id and settings

### `set_composition_settings`
- Purpose: modify comp settings
- Args:
- `compId`
- `name?`
- `width?`
- `height?`
- `duration?`
- `frameRate?`
- `bgColor?`
- Returns/features: updated comp settings

### `set_all_keyframes_easing`
- Purpose: set easing on all keyframes for a property
- Args:
- `compId`
- `layerIndex`
- `property`
- `easingType`
- Returns/features: bulk easing shortcut

## Layer Management

### `add_solid_layer`
- Purpose: add a solid layer
- Args:
- `compId`
- `color?`
- `name?`
- `width?`
- `height?`
- `opacity?`
- `duration?`
- `startTime?`
- Returns/features: new layer index/name

### `add_text_layer`
- Purpose: add a text layer
- Args:
- `compId`
- `text`
- `font?`
- `fontSize?`
- `color?`
- `justification?`
- `position?`
- `bold?`
- `italic?`
- Returns/features: new text layer index/name

### `add_shape_layer`
- Purpose: add a basic vector shape layer
- Args:
- `compId`
- `shapeType`
- `name?`
- `position?`
- `size?`
- `fillColor?`
- `strokeColor?`
- `strokeWidth?`
- Returns/features: new shape layer index/name

### `add_null_layer`
- Purpose: add a null object
- Args:
- `compId`
- `name?`
- Returns/features: new null layer index/name

### `add_adjustment_layer`
- Purpose: add an adjustment layer
- Args:
- `compId`
- `name?`
- Returns/features: new adjustment layer index/name

### `list_layers`
- Purpose: list layers in stacking order
- Args:
- `compId`
- Returns/features: indices, names, types, timing, visibility flags

### `get_layer_info`
- Purpose: inspect one layer in detail
- Args:
- `compId`
- `layerIndex`
- Returns/features: transforms, timing, parent, effects, type

### `set_layer_properties`
- Purpose: update transform and timing fields on a layer
- Args:
- `compId`
- `layerIndex`
- `name?`
- `position?`
- `scale?`
- `rotation?`
- `opacity?`
- `anchorPoint?`
- `enabled?`
- `startTime?`
- `inPoint?`
- `outPoint?`
- Returns/features: current layer values after update

### `delete_layer`
- Purpose: delete a layer
- Args:
- `compId`
- `layerIndex`
- Returns/features: deleted layer index/name

### `duplicate_layer`
- Purpose: duplicate a layer
- Args:
- `compId`
- `layerIndex`
- Returns/features: new duplicate index/name

## Typography

### `list_fonts`
- Purpose: query installed fonts
- Args:
- `query?`
- `limit?`
- Returns/features: PostScript name, family, style, full name

### `get_text_document`
- Purpose: read a text layer's full text document
- Args:
- `compId`
- `layerIndex`
- `time?`
- Returns/features: text, font, size, justification, tracking, leading, fill/stroke settings, faux styles

### `set_text_document`
- Purpose: update a text layer's text document
- Args:
- `compId`
- `layerIndex`
- `text?`
- `font?`
- `fontSize?`
- `justification?`
- `tracking?`
- `leading?`
- `applyFill?`
- `fillColor?`
- `applyStroke?`
- `strokeColor?`
- `strokeWidth?`
- `fauxBold?`
- `fauxItalic?`
- Returns/features: serialized updated text document

## Animation & Keyframes

### `add_keyframes_batch`
- Purpose: add multiple keyframes to one transform property
- Args:
- `compId`
- `layerIndex`
- `property`
- `keyframes[]`
- Returns/features: bulk keyframe creation

### `set_all_keyframes_easing`
- Purpose: set easing on all keyframes for a property
- Args:
- `compId`
- `layerIndex`
- `property`
- `easingType`
- Returns/features: bulk easing shortcut

## Generic Properties

### `list_property_tree`
- Purpose: discover arbitrary property hierarchies
- Args:
- `compId`
- `layerIndex`
- `propertyPath?`
- `maxDepth?`
- `includeValues?`
- Returns/features: property names, match names, indices, group/property typing

### `get_property`
- Purpose: read any layer property by path
- Args:
- `compId`
- `layerIndex`
- `propertyPath`
- `time?`
- `preExpression?`
- Returns/features: value plus metadata; serializes text documents and shapes

### `set_property`
- Purpose: set any settable layer property by path
- Args:
- `compId`
- `layerIndex`
- `propertyPath`
- `value`
- `clearKeyframes?`
- Returns/features: scalar, vector, boolean, string support

## Expressions

### `set_expression`
- Purpose: apply an AE expression
- Args:
- `compId`
- `layerIndex`
- `property`
- `expression`
- Returns/features: supports transform and non-transform properties

### `remove_expression`
- Purpose: clear a property expression
- Args:
- `compId`
- `layerIndex`
- `property`
- Returns/features: falls back to keyframes/static value

## Motion Design Presets

### `create_scene`
- Purpose: batch-create a simple scene
- Args:
- `compId`
- `elements[]`
- `sceneName?`
- Returns/features: efficient multi-layer creation

## Effects

### `apply_effect`
- Purpose: apply a built-in AE effect by match name
- Args:
- `compId`
- `layerIndex`
- `effectMatchName`
- `effectDisplayName?`
- `properties?`

### `set_effect_property`
- Purpose: set a property on an applied effect
- Args:
- `compId`
- `layerIndex`
- `effectIndex`
- `propertyName`
- `value`
- `time?`

### `get_effect_properties`
- Purpose: inspect applied effect properties
- Args:
- `compId`
- `layerIndex`
- `effectIndex`

### `remove_effect`
- Purpose: remove an effect by index or name
- Args:
- `compId`
- `layerIndex`
- `effectIndex?`
- `effectName?`

## Compositing

### `set_blend_mode`
- Purpose: set layer blend mode
- Args:
- `compId`
- `layerIndex`
- `blendMode`

## Masks

### `add_mask`
- Purpose: add a rectangle or ellipse mask
- Args:
- `compId`
- `layerIndex`
- `shape`
- `top`
- `left`
- `width`
- `height`
- `inverted?`
- `feather?`
- `opacity?`
- `expansion?`
- `mode?`

### `set_mask_properties`
- Purpose: edit mask settings
- Args:
- `compId`
- `layerIndex`
- `maskIndex`
- `feather?`
- `opacity?`
- `expansion?`
- `mode?`
- `inverted?`

### `set_mask_path`
- Purpose: set or keyframe a custom mask path
- Args:
- `compId`
- `layerIndex`
- `maskIndex`
- `vertices`
- `inTangents?`
- `outTangents?`
- `closed?`
- `time?`
- Returns/features: tangent-length validation before scripting

## 3D

### `set_3d_layer`
- Purpose: enable or disable 3D on a layer
- Args:
- `compId`
- `layerIndex`
- `enabled`

### `add_camera`
- Purpose: add a camera layer
- Args:
- `compId`
- `name?`
- `zoom?`
- `position?`
- `pointOfInterest?`

### `add_light`
- Purpose: add a light layer
- Args:
- `compId`
- `lightType`
- `name?`
- `position?`
- `intensity?`
- `color?`
- `coneAngle?`
- `coneFalloff?`

### `set_3d_position`
- Purpose: set 3D transforms
- Args:
- `compId`
- `layerIndex`
- `position?`
- `orientation?`
- `xRotation?`
- `yRotation?`
- `zRotation?`

## Text Animators

### `add_text_animator`
- Purpose: add a text animator with a range selector
- Args:
- `compId`
- `layerIndex`
- `properties[]`
- `rangeType`
- `rangeStart?`
- `rangeEnd?`
- `rangeOffset?`

### `set_text_animator_values`
- Purpose: set animator property values
- Args:
- `compId`
- `layerIndex`
- `animatorIndex`
- `property`
- `value`

## Shape Paths

### `add_shape_group`
- Purpose: add a shape group to a shape layer
- Args:
- `compId`
- `layerIndex`
- `name?`

### `set_shape_path`
- Purpose: replace a shape group's path with a custom Bezier path
- Args:
- `compId`
- `layerIndex`
- `groupIndex`
- `vertices`
- `inTangents?`
- `outTangents?`
- `closed?`
- Returns/features: removes existing primitive paths first; validates tangent lengths

### `set_shape_style`
- Purpose: set fill and stroke styling on a shape group
- Args:
- `compId`
- `layerIndex`
- `groupIndex`
- `fillColor?`
- `fillOpacity?`
- `strokeColor?`
- `strokeOpacity?`
- `strokeWidth?`
- `lineJoin?`
- `lineCap?`
- `removeFill?`
- `removeStroke?`

## Shape Operations

### `add_trim_paths`
- Purpose: add Trim Paths
- Args:
- `compId`
- `layerIndex`
- `start`
- `end`
- `offset?`

### `add_repeater`
- Purpose: add Repeater
- Args:
- `compId`
- `layerIndex`
- `copies`
- `offset?`
- `position?`
- `scale?`
- `rotation?`

## Pre-compositions

### `precompose_layers`
- Purpose: pre-compose selected layers
- Args:
- `compId`
- `layerIndices[]`
- `newCompName`
- `moveAttributes?`

### `nest_composition`
- Purpose: nest one comp inside another
- Args:
- `sourceCompId`
- `targetCompId`

## Markers

### `add_marker`
- Purpose: add a comp or layer marker
- Args:
- `compId`
- `time`
- `layerIndex?`
- `comment?`
- `duration?`
- `label?`

## Layer Settings

### `set_layer_quality`
- Purpose: set layer quality and sampling quality
- Args:
- `compId`
- `layerIndex`
- `quality?`
- `samplingQuality?`

### `set_layer_timing`
- Purpose: set in/out/start/stretch
- Args:
- `compId`
- `layerIndex`
- `inPoint?`
- `outPoint?`
- `startTime?`
- `stretch?`

## Rendering & Preview

### `add_to_render_queue`
- Purpose: add a comp to the render queue
- Args:
- `compId`
- `outputPath`
- `format?`

### `get_render_status`
- Purpose: read render queue statuses
- Args: none

### `start_render`
- Purpose: start rendering queued items
- Args: none

### `capture_frame`
- Purpose: render a single PNG preview frame
- Args:
- `compId`
- `time?`
- `outputPath?`

### `capture_frame_sequence`
- Purpose: render multiple preview frames
- Args:
- `compId`
- `count`
- `startTime?`
- `endTime?`
- `outputDir?`

## Scripting

### `run_extendscript`
- Purpose: execute raw ExtendScript inside After Effects
- Args:
- `script`
- Returns/features: general escape hatch for unsupported workflows

## Compound Tools

### `position_layer_semantic`
- Purpose: position a layer using semantic location names instead of pixel coordinates
- Args:
- `compId`
- `layerIndex`
- `position` — one of: center, top-left, top-center, top-right, bottom-left, bottom-center, bottom-right, left-center, right-center, lower-third, upper-third, title-safe-center
- `margin?` — pixel margin from edges (default 48)

### `apply_text_style`
- Purpose: apply professional typography (font, size, tracking, color) to a text layer based on its role and style
- Args:
- `compId`
- `layerIndex`
- `role` — one of: title, subtitle, body, caption, label, accent
- `style?` — one of: corporate, cinematic, minimal, bold, editorial (default corporate)
- `color?` — RGB array [0-1]
- `fontOverride?`

### `apply_overshoot`
- Purpose: add elastic/bounce/spring overshoot expression to any animated property
- Args:
- `compId`
- `layerIndex`
- `property` — e.g. "Position", "Scale", "Rotation", "Opacity"
- `type?` — elastic (default), bounce, spring
- `intensity?` — 0.0-1.0 (default 0.5)

### `animate_entrance`
- Purpose: animate a layer entering the scene with professional easing and timing
- Args:
- `compId`
- `layerIndex`
- `preset` — fade, slide-up, slide-left, slide-right, slide-down, scale, scale-rotate, pop, drop, typewriter
- `startTime?`
- `duration?`
- `overshoot?` — default true for pop/scale/drop
- `easing?` — smooth (default), snappy, heavy, elastic
- `style?` — corporate, cinematic, energetic, minimal

### `animate_exit`
- Purpose: animate a layer leaving the scene
- Args:
- `compId`
- `layerIndex`
- `preset` — fade, slide-up, slide-left, slide-right, slide-down, scale, scale-rotate, shrink, drop-out
- `endTime?`
- `duration?`
- `easing?`
- `style?`

### `stagger_animation`
- Purpose: apply entrance animation to multiple layers with staggered timing (cascading reveal)
- Args:
- `compId`
- `layerIndices` — array of layer indices
- `preset` — same as animate_entrance
- `staggerDelay?` — seconds between each layer (default 0.08)
- `duration?`
- `easing?`
- `style?`
- `direction?` — forward (default), reverse, center-out, random

## QA & Polish

### `critique_composition`
- Purpose: inspect a composition and return a structured quality report scored against design rules (safe zones, text hierarchy, contrast, alignment, easing, duration, pure colors)
- Args:
- `compId`
- `time?` — frame time to evaluate (default: 33% through comp)
- `checks?` — array of specific checks to run (default: all). Options: safe-zones, text-hierarchy, contrast, alignment, easing, duration, pure-colors
- Returns/features: score (0-100), grade (A-F), issues array with severity/layer/message/fix, passed checks list, summary

### `apply_polish`
- Purpose: apply professional finishing touches — motion blur, film grain, vignette, smooth easing, drop shadows
- Args:
- `compId`
- `polishLevel?` — subtle (default), moderate, heavy
- `features?` — array of features to apply (default: motion-blur, smooth-easing). Options: motion-blur, film-grain, vignette, smooth-easing, shadow-depth
- Returns/features: list of applied/skipped features with summary

### `fix_composition_issues`
- Purpose: automatically fix issues identified by critique_composition (safe zone violations, linear keyframes, pure colors, alignment)
- Args:
- `compId`
- `issues` — the issues array from critique_composition output
- `fixAll?` — fix all issues (default true), or only errors if false
- Returns/features: list of fixed/skipped issues with action descriptions
