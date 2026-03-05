import fs from "fs";
import path from "path";

const repoRoot = process.cwd();
const readmePath = path.join(repoRoot, "README.md");
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

function readReadmeTools() {
  const readme = fs.readFileSync(readmePath, "utf8");
  const start = readme.indexOf("## Available Tools");
  const end = readme.indexOf("## Agent Knowledge Base");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Could not find the Available Tools section in README.md");
  }

  const section = readme.slice(start, end);
  const toolNames = new Set();
  const matches = section.matchAll(/`([a-z0-9_]+)`/g);

  for (const match of matches) {
    toolNames.add(match[1]);
  }

  return [...toolNames].sort();
}

function diff(left, right) {
  return left.filter((item) => !right.includes(item));
}

const sourceTools = readRegisteredTools();
const readmeTools = readReadmeTools();
const missingFromReadme = diff(sourceTools, readmeTools);
const missingFromSource = diff(readmeTools, sourceTools);

if (missingFromReadme.length === 0 && missingFromSource.length === 0) {
  console.log(`README tool list is in sync (${sourceTools.length} tools).`);
  process.exit(0);
}

if (missingFromReadme.length > 0) {
  console.error("Tools registered in source but missing from README:");
  for (const tool of missingFromReadme) {
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
