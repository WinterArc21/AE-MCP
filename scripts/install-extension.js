#!/usr/bin/env node
/**
 * install-extension.js
 *
 * Copies the CEP extension folder into the correct location on the user's machine
 * so After Effects can load the "AE MCP Bridge" panel.
 *
 * Usage:
 *   node scripts/install-extension.js          (auto-detects OS)
 *   npm run install-extension                  (via package.json)
 *
 * On macOS:   ~/Library/Application Support/Adobe/CEP/extensions/com.motiona.ae-mcp
 * On Windows: %APPDATA%/Adobe/CEP/extensions/com.motiona.ae-mcp
 *
 * For unsigned CEP panels, this script also enables PlayerDebugMode in the
 * registry (Windows) or com.adobe.CSXS plist (macOS) so AE loads our extension
 * without a code-signing certificate.
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXTENSION_ID = "com.motiona.ae-mcp";

// ─── Determine install paths ────────────────────────────────────────────────────────────────

function getExtensionsDir() {
  const platform = os.platform();
  if (platform === "darwin") {
    return path.join(
      os.homedir(),
      "Library",
      "Application Support",
      "Adobe",
      "CEP",
      "extensions"
    );
  } else if (platform === "win32") {
    const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, "Adobe", "CEP", "extensions");
  } else {
    console.error("❌ Unsupported platform:", platform);
    console.error("   CEP extensions are only supported on macOS and Windows.");
    process.exit(1);
  }
}

// ─── Copy directory recursively ───────────────────────────────────────────────────────────────

function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// ─── Enable PlayerDebugMode (required for unsigned extensions) ────────────────────────────

function enableDebugMode() {
  const platform = os.platform();
  // We set it for CSXS versions 9–12 to cover AE 2020–2026+
  const versions = ["9", "10", "11", "12"];

  if (platform === "darwin") {
    console.log("🔧 Enabling PlayerDebugMode (macOS)...");
    for (const v of versions) {
      try {
        execSync(
          `defaults write com.adobe.CSXS.${v} PlayerDebugMode 1`,
          { stdio: "pipe" }
        );
      } catch {
        // Version may not exist — that's fine
      }
    }
    console.log("   ✅ PlayerDebugMode set for CSXS versions", versions.join(", "));
  } else if (platform === "win32") {
    console.log("🔧 Enabling PlayerDebugMode (Windows)...");
    for (const v of versions) {
      try {
        execSync(
          `reg add HKCU\\Software\\Adobe\\CSXS.${v} /v PlayerDebugMode /t REG_SZ /d 1 /f`,
          { stdio: "pipe" }
        );
      } catch {
        // Version may not exist — that's fine
      }
    }
    console.log("   ✅ PlayerDebugMode set for CSXS versions", versions.join(", "));
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────────────────

function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║    AE MCP Bridge — Extension Installer   ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log();

  const sourceDir = path.resolve(__dirname, "..", "cep-extension");
  if (!fs.existsSync(sourceDir)) {
    console.error("❌ Could not find cep-extension/ folder at:", sourceDir);
    process.exit(1);
  }

  const extensionsDir = getExtensionsDir();
  const targetDir = path.join(extensionsDir, EXTENSION_ID);

  console.log("📁 Source:     ", sourceDir);
  console.log("📁 Target:     ", targetDir);
  console.log();

  // Remove old version if it exists
  if (fs.existsSync(targetDir)) {
    console.log("🗑️  Removing previous installation...");
    fs.rmSync(targetDir, { recursive: true, force: true });
  }

  // Copy extension files
  console.log("📋 Copying extension files...");
  copyDirSync(sourceDir, targetDir);
  console.log("   ✅ Extension copied successfully.");
  console.log();

  // Enable debug mode for unsigned extensions
  enableDebugMode();

  console.log();
  console.log("════════════════════════════════════════════");
  console.log("✅ Installation complete!");
  console.log();
  console.log("Next steps:");
  console.log("  1. Restart After Effects (if it's running)");
  console.log("  2. Go to Window > Extensions > AE MCP Bridge");
  console.log("  3. The panel should show 'Waiting for commands...'");
  console.log("  4. Start the MCP server:  npm start");
  console.log("════════════════════════════════════════════");
}

main();
