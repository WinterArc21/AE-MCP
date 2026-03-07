# ae-mcp Tools Reference

Canonical API reference for the shipped MCP tool surface.

- Total tools: `118`
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

### `create_folder`
- Purpose: create a folder in the project panel
- Args:
- `name`
- `parentFolderId?`
- Returns/features: folder id/name and parent info

### `move_project_item`
- Purpose: move an item into another folder
- Args:
- `itemId`
- `parentFolderId`
- Returns/features: old/new parent info

### `set_label_color`
- Purpose: change a project item's label color
- Args:
- `itemId`
- `label`: `0-16`
- Returns/features: updated label index

### `add_comment`
- Purpose: set or append a project item comment
- Args:
- `itemId`
- `comment`
- `append?`
- Returns/features: updated comment text

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

### `set_work_area`
- Purpose: set work area start and duration
- Args:
- `compId`
- `start`
- `duration`
- Returns/features: updated work area values

### `set_comp_renderer`
- Purpose: switch the composition renderer
- Args:
- `compId`
- renderer selection value
- Returns/features: active renderer after change

### `set_motion_blur_settings`
- Purpose: set comp-level motion blur settings
- Args:
- `compId`
- shutter/sample-related fields
- Returns/features: updated motion blur settings

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

### `add_comp_layer`
- Purpose: add an existing comp as a layer
- Args:
- `compId`
- `sourceCompId`
- `name?`
- `position?`
- `startTime?`
- Returns/features: nested comp layer details

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

### `set_layer_parent`
- Purpose: parent or unparent a layer
- Args:
- `compId`
- `childIndex`
- `parentIndex`
- Returns/features: parent relationship update

### `reorder_layer`
- Purpose: move a layer in stack order
- Args:
- `compId`
- `layerIndex`
- `newIndex`
- Returns/features: actual new index

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

### `add_keyframe`
- Purpose: add one transform keyframe
- Args:
- `compId`
- `layerIndex`
- `property`
- `time`
- `value`
- Returns/features: one keyframe placed on a transform property

### `add_keyframes_batch`
- Purpose: add multiple keyframes to one transform property
- Args:
- `compId`
- `layerIndex`
- `property`
- `keyframes[]`
- Returns/features: bulk keyframe creation

### `set_keyframe_easing`
- Purpose: set easing on one keyframe
- Args:
- `compId`
- `layerIndex`
- `property`
- `keyframeIndex`
- `easingType`
- Returns/features: linear, ease-in, ease-out, ease-in-out, hold

### `set_all_keyframes_easing`
- Purpose: set easing on all keyframes for a property
- Args:
- `compId`
- `layerIndex`
- `property`
- `easingType`
- Returns/features: bulk easing shortcut

### `remove_keyframes`
- Purpose: clear all keyframes from a transform property
- Args:
- `compId`
- `layerIndex`
- `property`
- Returns/features: property becomes static again

### `get_keyframes`
- Purpose: inspect keyframes on an arbitrary property path
- Args:
- `compId`
- `layerIndex`
- `propertyPath`
- Returns/features: keyframe times, values, interpolation types

### `set_time_remap`
- Purpose: enable and control time remapping
- Args:
- `compId`
- `layerIndex`
- `enabled`
- `keyframes?`
- Returns/features: freeze, reverse, slow-mo, retiming workflows

### `set_spatial_interpolation`
- Purpose: set motion path shape
- Args:
- `compId`
- `layerIndex`
- `property`
- `interpolationType`
- `keyframeIndex?`
- Returns/features: linear vs bezier path geometry

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

### `set_property_keyframes`
- Purpose: keyframe any animatable layer property by path
- Args:
- `compId`
- `layerIndex`
- `propertyPath`
- `keyframes[]`
- `clearExisting?`
- Returns/features: per-keyframe interpolation support

### `get_text_bounds`
- Purpose: measure layer bounds in comp space
- Args:
- `compId`
- `layerIndex`
- `time?`
- Returns/features: source rect, comp-space bounds, safe-area flag

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

### `add_wiggle`
- Purpose: convenience wiggle expression
- Args:
- `compId`
- `layerIndex`
- `property`
- `frequency?`
- `amplitude?`
- Returns/features: organic motion helper

### `add_loop`
- Purpose: convenience loopOut expression
- Args:
- `compId`
- `layerIndex`
- `property`
- `loopType`
- `numKeyframes?`
- Returns/features: cycle, pingpong, offset, continue

### `link_properties`
- Purpose: link one transform property to another
- Args:
- `compId`
- `sourceLayerIndex`
- `sourceProperty`
- `targetLayerIndex`
- `targetProperty`
- Returns/features: expression-based property following

## Motion Design Presets

### `apply_fade_in`
- Purpose: opacity fade-in preset
- Args:
- `compId`
- `layerIndex`
- `duration?`
- `startTime?`

### `apply_fade_out`
- Purpose: opacity fade-out preset
- Args:
- `compId`
- `layerIndex`
- `duration?`
- `endTime?`

### `apply_slide_in`
- Purpose: slide-in preset
- Args:
- `compId`
- `layerIndex`
- `direction`
- `distance?`
- `duration?`
- `startTime?`

### `apply_scale_in`
- Purpose: scale-in preset
- Args:
- `compId`
- `layerIndex`
- `fromScale?`
- `duration?`
- `startTime?`

### `apply_bounce_in`
- Purpose: springy bounce-in preset
- Args:
- `compId`
- `layerIndex`
- `duration?`
- `startTime?`

### `apply_typewriter`
- Purpose: character reveal preset
- Args:
- `compId`
- `layerIndex`
- `duration?`
- `startTime?`

### `apply_color_theme`
- Purpose: create color controls for a comp-wide palette
- Args:
- `compId`
- palette colors
- Returns/features: color theme null with expression controls

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

### `list_layer_effects`
- Purpose: list all effects on a layer
- Args:
- `compId`
- `layerIndex`

### `get_effect_docs`
- Purpose: read bundled effect docs
- Args:
- `effectName`

### `list_available_effects`
- Purpose: list common AE effects and match names
- Args: none

## Compositing

### `set_blend_mode`
- Purpose: set layer blend mode
- Args:
- `compId`
- `layerIndex`
- `blendMode`

### `get_blend_mode`
- Purpose: inspect layer blend mode
- Args:
- `compId`
- `layerIndex`

### `set_track_matte`
- Purpose: set alpha or luma matte relationship
- Args:
- `compId`
- `layerIndex`
- `trackMatteType`

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

### `list_masks`
- Purpose: list masks on a layer
- Args:
- `compId`
- `layerIndex`

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

### `delete_mask`
- Purpose: delete a mask
- Args:
- `compId`
- `layerIndex`
- `maskIndex`

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

### `set_camera_options`
- Purpose: edit camera options
- Args:
- `compId`
- `layerIndex`
- `zoom?`
- `depthOfField?`
- `focusDistance?`
- `aperture?`
- `blurLevel?`

### `set_light_options`
- Purpose: edit light options
- Args:
- `compId`
- `layerIndex`
- `intensity?`
- `color?`
- `coneAngle?`
- `coneFeather?`
- `castsShadows?`
- `shadowDarkness?`
- `shadowDiffusion?`

### `set_material_options`
- Purpose: edit material response on a 3D layer
- Args:
- `compId`
- `layerIndex`
- `acceptsLights?`
- `acceptsShadows?`
- `ambient?`
- `diffuse?`
- `specularIntensity?`
- `specularShininess?`
- `metal?`
- `lightTransmission?`
- Returns/features: reports `requested`, `applied`, and `warnings`

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

### `list_text_animators`
- Purpose: list text animators on a layer
- Args:
- `compId`
- `layerIndex`
- Returns/features: animator properties plus selector settings

### `set_text_selector`
- Purpose: edit a text animator's range selector
- Args:
- `compId`
- `layerIndex`
- `animatorIndex`
- `selectorIndex?`
- `start?`
- `end?`
- `offset?`
- `amount?`
- `basedOn?`

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

### `add_wiggle_paths`
- Purpose: add Wiggle Paths
- Args:
- `compId`
- `layerIndex`
- `size`
- `detail`
- `points?`

### `add_merge_paths`
- Purpose: add Merge Paths
- Args:
- `compId`
- `layerIndex`
- `mode`

### `add_offset_paths`
- Purpose: add Offset Paths
- Args:
- `compId`
- `layerIndex`
- `amount`
- `lineJoin?`
- `miterLimit?`

### `add_pucker_bloat`
- Purpose: add Pucker & Bloat
- Args:
- `compId`
- `layerIndex`
- `amount`

### `add_zig_zag`
- Purpose: add Zig Zag
- Args:
- `compId`
- `layerIndex`
- `size`
- `ridgesPerSegment`
- `points?`

### `add_twist`
- Purpose: add Twist
- Args:
- `compId`
- `layerIndex`
- `angle`

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

### `list_markers`
- Purpose: list markers on a comp or layer
- Args:
- `compId`
- `layerIndex?`

## Layer Settings

### `set_layer_quality`
- Purpose: set layer quality and sampling quality
- Args:
- `compId`
- `layerIndex`
- `quality?`
- `samplingQuality?`

### `set_motion_blur`
- Purpose: toggle motion blur
- Args:
- `compId`
- `enabled`
- `layerIndex?`
- Returns/features: can set comp-level only or comp+layer together

### `set_layer_timing`
- Purpose: set in/out/start/stretch
- Args:
- `compId`
- `layerIndex`
- `inPoint?`
- `outPoint?`
- `startTime?`
- `stretch?`

### `set_layer_flags`
- Purpose: set boolean layer flags
- Args:
- `compId`
- `layerIndex`
- `shy?`
- `solo?`
- `locked?`
- `guide?`
- `collapseTransformation?`
- `frameBlending?`

## Rendering & Preview

### `add_to_render_queue`
- Purpose: add a comp to the render queue
- Args:
- `compId`
- `outputPath`
- `format?`

### `list_render_templates`
- Purpose: list available render and output templates
- Args: none

### `set_render_item_settings`
- Purpose: set render settings on a queued item
- Args:
- render item selector
- template/settings fields

### `set_output_module_settings`
- Purpose: set output module settings on a queued item
- Args:
- render item selector
- output module selector
- template/settings/path fields

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

## Design Knowledge

### `get_design_reference`
- Purpose: read a design reference document from the knowledge base (easing curves, timing, color palettes, typography, composition rules, texture/depth, transitions, camera animation, shape animation, scene building, expressions library, storytelling)
- Args:
- `topic` — topic name, e.g. 'easing-curves', 'transitions', 'expressions-library'
- Returns/features: full markdown reference content; lists available topics when topic not found

### `get_golden_example`
- Purpose: return a production-ready golden example — a complete sequence of MCP tool calls for building a specific scene type
- Args:
- `sceneType` — e.g. 'lower-third-corporate', 'title-card-cinematic', 'kinetic-typography'
- Returns/features: JSON with exact tool calls and parameters using $compId/$layerIndex_N placeholders; lists available examples when scene type not found
