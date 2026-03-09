/**
 * value-validator.ts - Shared transform value shape validation.
 *
 * Used by animation, text-animator, and property tools to reject
 * mismatched value dimensions before generating ExtendScript.
 */

/**
 * Validate that a value's shape matches the expected transform property.
 * Returns an error message string if invalid, or null if valid.
 *
 * Rules:
 *   Opacity / Rotation             -> single number
 *   Position / Anchor Point        -> [x, y] or [x, y, z]
 *   Scale                          -> [x, y] or [x, y, z]
 *   Fill Color / Stroke Color      -> [r, g, b] (always 3)
 *   Tracking / Tracking Amount     -> single number
 */
export function validateTransformValue(
  property: string,
  value: number | number[] | boolean | string
): string | null {
  const isArr = Array.isArray(value);
  const arrLen = isArr ? (value as number[]).length : 0;

  switch (property) {
    case "Opacity":
    case "Rotation":
    case "Tracking":
    case "Tracking Amount":
      if (typeof value !== "number") {
        return property + " requires a single number. Got " + JSON.stringify(value) + ".";
      }
      break;

    case "Scale":
      if (!isArr || (arrLen !== 2 && arrLen !== 3)) {
        return "Scale requires [x, y] or [x, y, z]. Got " + JSON.stringify(value) + ".";
      }
      break;

    case "Position":
    case "Anchor Point":
      if (!isArr || (arrLen !== 2 && arrLen !== 3)) {
        return property + " requires [x, y] or [x, y, z]. Got " + JSON.stringify(value) + ".";
      }
      break;

    case "Fill Color":
    case "Stroke Color":
      if (!isArr || arrLen !== 3) {
        return property + " requires [r, g, b] (3 values). Got " + JSON.stringify(value) + ".";
      }
      break;

    // Unknown properties - no validation (effects, generic props, etc.)
    default:
      break;
  }

  return null;
}

/**
 * Build a structured MCP error result for an invalid value shape.
 */
export function valueShapeError(message: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: { message, code: "INVALID_VALUE_SHAPE" } }) }],
    isError: true,
  };
}