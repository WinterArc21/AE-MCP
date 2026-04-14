#!/usr/bin/env node
/**
 * Single-file ESM bundle for the MCP server (esbuild).
 * Dependencies stay external (node_modules) via packages: "external".
 */
import * as fs from "fs";
import * as esbuild from "esbuild";

if (fs.existsSync("dist")) {
  fs.rmSync("dist", { recursive: true });
}

await esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  outfile: "dist/index.js",
  platform: "node",
  format: "esm",
  target: "node18",
  packages: "external",
});
