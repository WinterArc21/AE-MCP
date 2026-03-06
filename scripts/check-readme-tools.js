import fs from "fs";
import path from "path";

const repoRoot = process.cwd();
const toolsDocPath = path.join(repoRoot, "TOOLS.md");
const toolsDir = path.join(repoRoot, "src", "tools");

function readRegisteredTools() {
  const files = fs.readdirSync(toolsDir).filter((file) => file.endsWith(".ts"));
  const toolNames = new Set();

  for (const file of files) {
    const source = fs.readFileSync(path.join(toolsDir, file), "utf8");
    const matches = source.matchAll(/server\.tool\(\s*"([^"]+)"/g);
    for (const match of matches) {
      toolNames.add(match[1]);
    }
  }

  return [...toolNames].sort();
}

function readToolsDocTools() {
  const toolsDoc = fs.readFileSync(toolsDocPath, "utf8");
  const start = toolsDoc.indexOf("## Project Management");
  const end = toolsDoc.length;

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Could not find the tool sections in TOOLS.md");
  }

  const section = toolsDoc.slice(start, end);
  const toolNames = new Set();
  const matches = section.matchAll(/^### `([a-z0-9_]+)`$/gm);

  for (const match of matches) {
    toolNames.add(match[1]);
  }

  return [...toolNames].sort();
}

function diff(left, right) {
  return left.filter((item) => !right.includes(item));
}

const sourceTools = readRegisteredTools();
const toolsDocTools = readToolsDocTools();
const missingFromToolsDoc = diff(sourceTools, toolsDocTools);
const missingFromSource = diff(toolsDocTools, sourceTools);

if (missingFromToolsDoc.length === 0 && missingFromSource.length === 0) {
  console.log(`TOOLS.md tool list is in sync (${sourceTools.length} tools).`);
  process.exit(0);
}

if (missingFromToolsDoc.length > 0) {
  console.error("Tools registered in source but missing from TOOLS.md:");
  for (const tool of missingFromToolsDoc) {
    console.error(`  - ${tool}`);
  }
}

if (missingFromSource.length > 0) {
  console.error("Tools listed in README but not registered in source:");
  for (const tool of missingFromSource) {
    console.error(`  - ${tool}`);
  }
}

process.exit(1);
