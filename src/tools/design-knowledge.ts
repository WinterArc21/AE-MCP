/**
 * tools/design-knowledge.ts
 *
 * MCP tool registrations for design knowledge and golden examples.
 *
 * Tools:
 *   - get_design_reference   Read a design reference document from docs/design-system/ or docs/techniques/
 *   - get_golden_example     Return a complete golden example JSON for a specific scene type
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function textResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}

// Resolve docs directories relative to this file (works on Windows too)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DOCS_DESIGN_SYSTEM_DIR = path.resolve(__dirname, "../../docs/design-system");
const DOCS_TECHNIQUES_DIR    = path.resolve(__dirname, "../../docs/techniques");
const DOCS_GOLDEN_EXAMPLES_DIR = path.resolve(__dirname, "../../docs/golden-examples");

// ---------------------------------------------------------------------------
// registerDesignKnowledgeTools
// ---------------------------------------------------------------------------

export function registerDesignKnowledgeTools(server: McpServer): void {

  // ── get_design_reference ───────────────────────────────────────────────────

  server.tool(
    "get_design_reference",
    "Reads a design reference document from the knowledge base. Available topics include " +
      "easing curves, timing, color palettes, typography, composition rules, texture/depth, " +
      "transitions, camera animation, shape animation, scene building, expressions library, " +
      "and storytelling. Call with a topic name to get the full reference. " +
      "Call without arguments to list available topics.",
    {
      topic: z
        .string()
        .describe(
          "Topic name, e.g. 'easing-curves', 'color-palettes', 'transitions', " +
            "'expressions-library'. Case-insensitive, hyphens optional."
        ),
    },
    async ({ topic }) => {
      // Convert topic to filename: lowercase, spaces → hyphens, strip non-alphanum
      const fileName =
        topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".md";

      // Try design-system/ first, then techniques/
      const candidates = [
        { dir: DOCS_DESIGN_SYSTEM_DIR, label: "design-system" },
        { dir: DOCS_TECHNIQUES_DIR,    label: "techniques"    },
      ];

      for (const { dir } of candidates) {
        const filePath = path.join(dir, fileName);
        if (fs.existsSync(filePath)) {
          try {
            const content = fs.readFileSync(filePath, "utf8");
            return textResult({
              success: true,
              data: {
                topic,
                content,
              },
            });
          } catch (readErr) {
            return textResult({
              success: false,
              error: {
                message: "Error reading reference file: " + String(readErr),
                code: "READ_ERROR",
              },
            });
          }
        }
      }

      // File not found in either directory — list all available topics
      const availableTopics: string[] = [];
      for (const { dir } of candidates) {
        try {
          if (fs.existsSync(dir)) {
            const files = fs
              .readdirSync(dir)
              .filter((f) => f.endsWith(".md"))
              .map((f) => f.replace(/\.md$/, ""));
            availableTopics.push(...files);
          }
        } catch (_listErr) {
          // ignore listing errors
        }
      }

      return textResult({
        success: false,
        error: {
          message:
            'No reference document found for "' +
            topic +
            '" (looked for: ' +
            fileName +
            " in design-system/ and techniques/).",
          code: "DOC_NOT_FOUND",
        },
        data: {
          availableTopics,
          searchedDirs: [DOCS_DESIGN_SYSTEM_DIR, DOCS_TECHNIQUES_DIR],
        },
      });
    }
  );

  // ── get_golden_example ─────────────────────────────────────────────────────

  server.tool(
    "get_golden_example",
    "Returns a golden example — a complete, production-ready sequence of MCP tool calls " +
      "for building a specific scene type. The example includes exact parameter values " +
      "based on professional motion design research. Use $compId and $layerIndex_N as " +
      "placeholders to substitute with actual runtime values. " +
      "Available examples: lower-third-corporate, title-card-cinematic, " +
      "logo-reveal-light-sweep, data-viz-bar-chart, kinetic-typography, " +
      "social-story-vertical, scene-transition-whip, particle-background.",
    {
      sceneType: z
        .string()
        .describe(
          "Scene type name, e.g. 'lower-third-corporate', 'kinetic-typography'. " +
            "Case-insensitive."
        ),
    },
    async ({ sceneType }) => {
      // Convert sceneType to filename: lowercase, spaces → hyphens
      const fileName =
        sceneType.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".json";

      const filePath = path.join(DOCS_GOLDEN_EXAMPLES_DIR, fileName);

      if (fs.existsSync(filePath)) {
        try {
          const raw = fs.readFileSync(filePath, "utf8");
          const parsedContent = JSON.parse(raw);
          return textResult({
            success: true,
            data: parsedContent,
          });
        } catch (parseErr) {
          return textResult({
            success: false,
            error: {
              message: "Error reading or parsing golden example: " + String(parseErr),
              code: "PARSE_ERROR",
            },
          });
        }
      }

      // File not found — list available examples
      let availableExamples: string[] = [];
      try {
        if (fs.existsSync(DOCS_GOLDEN_EXAMPLES_DIR)) {
          availableExamples = fs
            .readdirSync(DOCS_GOLDEN_EXAMPLES_DIR)
            .filter((f) => f.endsWith(".json"))
            .map((f) => f.replace(/\.json$/, ""));
        }
      } catch (_listErr) {
        // ignore
      }

      return textResult({
        success: false,
        error: {
          message:
            'No golden example found for "' +
            sceneType +
            '" (looked for: ' +
            fileName +
            ").",
          code: "EXAMPLE_NOT_FOUND",
        },
        data: {
          availableExamples,
          examplesDir: DOCS_GOLDEN_EXAMPLES_DIR,
        },
      });
    }
  );

}
