#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const storyRoots = [".storybook", "src/stories", "src"];
const scannedExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mdx"]);
const forbiddenImportPatterns = [
  /\bfrom\s+["']@\/lib\/supabase(?:\/|["'])/,
  /\bfrom\s+["']@\/lib\/auth(?:\/|["'])/,
  /\bfrom\s+["']@\/lib\/email(?:\/|["'])/,
  /\bfrom\s+["']@\/app\/api(?:\/|["'])/,
  /\bfrom\s+["']@\/proxy(?:\/|["'])/,
  /\bfrom\s+["'][^"']*\/actions(?:\/|["'])/,
  /\bfrom\s+["'][^"']*\/repository[^"']*["']/,
  /\bfrom\s+["']@vercel\/analytics(?:\/|["'])/,
  /\bfrom\s+["']@vercel\/speed-insights(?:\/|["'])/,
  /\bimport\s*\(\s*["']@\/lib\/supabase(?:\/|["'])/,
  /\bimport\s*\(\s*["']@\/lib\/auth(?:\/|["'])/,
  /\bimport\s*\(\s*["']@\/lib\/email(?:\/|["'])/,
  /\bimport\s*\(\s*["']@\/app\/api(?:\/|["'])/,
  /\bimport\s*\(\s*["'][^"']*\/actions(?:\/|["'])/,
  /\bimport\s*\(\s*["'][^"']*\/repository[^"']*["']/,
  /\brequire\s*\(\s*["']@\/lib\/supabase(?:\/|["'])/,
  /\brequire\s*\(\s*["']@\/lib\/auth(?:\/|["'])/,
  /\brequire\s*\(\s*["']@\/lib\/email(?:\/|["'])/,
  /\brequire\s*\(\s*["']@\/app\/api(?:\/|["'])/,
  /\brequire\s*\(\s*["'][^"']*\/actions(?:\/|["'])/,
  /\brequire\s*\(\s*["'][^"']*\/repository[^"']*["']/,
  /\bprocess\.env\b/,
  /\bfetch\s*\(/,
];

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;

  for (const entry of readdirSync(dir)) {
    const absolute = join(dir, entry);
    const stat = statSync(absolute);

    if (stat.isDirectory()) {
      walk(absolute, files);
      continue;
    }

    const extension = entry.slice(entry.lastIndexOf("."));
    const storyFile = /\.(stories|story)\.(ts|tsx|js|jsx|mdx)$/.test(entry);
    const storyInfrastructure = absolute.includes(`${join(root, "src/stories")}/`) || absolute.includes(`${join(root, ".storybook")}/`);
    const previewHead = entry === "preview-head.html";

    if ((storyInfrastructure || storyFile || previewHead) && (scannedExtensions.has(extension) || previewHead)) {
      files.push(absolute);
    }
  }

  return files;
}

function markdownTableRows(source, rowPrefix) {
  return source
    .split(/\r?\n/)
    .filter((line) => line.startsWith(`| ${rowPrefix}`))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
}

const files = Array.from(new Set(storyRoots.flatMap((storyRoot) => walk(join(root, storyRoot)))));
const violations = files.flatMap((file) => {
  const source = readFileSync(file, "utf8");
  return forbiddenImportPatterns
    .filter((pattern) => pattern.test(source))
    .map((pattern) => `${relative(root, file)} matches ${pattern}`);
});

if (files.length === 0) {
  console.error("No Storybook config, story, fixture, or decorator files were found.");
  process.exit(1);
}

if (violations.length > 0) {
  console.error("Storybook provider boundary violations:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

// The componentization plan pack was archived; resolve each matrix from the
// original plan path first, then the archive location.
function readPlanMatrix(fileName) {
  const candidates = [
    join(root, ".ai/03_plans/2026-06-06-ui-component-optimization-componentization", fileName),
    join(root, ".ai/09_archive/2026-06-06-ui-component-optimization-componentization", fileName),
  ];
  const path = candidates.find((candidate) => existsSync(candidate));
  if (!path) {
    console.error(`Storybook matrix file not found in plan or archive: ${fileName}`);
    process.exit(1);
  }
  return readFileSync(path, "utf8");
}

const inventorySource = readPlanMatrix("15_COMPONENT_INVENTORY_MATRIX.md");
const storyCoverageSource = readPlanMatrix("17_STORYBOOK_STORY_COVERAGE_MATRIX.md");
const inventoryRows = markdownTableRows(inventorySource, "").filter((cells) => /^[A-Z]{3}-\d{3}$/.test(cells[0] ?? ""));
const storyRows = markdownTableRows(storyCoverageSource, "ST-");
const p0Rows = storyRows.filter((cells) => cells[11] === "P0_FIRST_REVIEW");
const p1Rows = storyRows.filter((cells) => cells[11] === "P1_PRE_MIGRATION");

if (inventoryRows.length !== 809 || storyRows.length !== 703 || p0Rows.length === 0 || p1Rows.length === 0) {
  console.error(`Unexpected Storybook matrix counts: inventory=${inventoryRows.length}, stories=${storyRows.length}, p0=${p0Rows.length}, p1=${p1Rows.length}`);
  process.exit(1);
}

console.log(`Storybook boundary OK: ${files.length} files scanned, ${inventoryRows.length} inventory rows, ${storyRows.length} story rows.`);
