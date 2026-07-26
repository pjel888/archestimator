import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

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

export function normalizeStorybookBoundaryPath(path) {
  return path.replaceAll("\\", "/").replace(/^\.\/+/, "");
}

export function isStorybookInfrastructurePath(projectRelativePath) {
  const normalizedPath = normalizeStorybookBoundaryPath(projectRelativePath);
  return normalizedPath === ".storybook"
    || normalizedPath.startsWith(".storybook/")
    || normalizedPath === "src/stories"
    || normalizedPath.startsWith("src/stories/");
}

function walk(root, dir, files = []) {
  if (!existsSync(dir)) return files;

  for (const entry of readdirSync(dir)) {
    const absolute = join(dir, entry);
    const stat = statSync(absolute);

    if (stat.isDirectory()) {
      walk(root, absolute, files);
      continue;
    }

    const extension = entry.slice(entry.lastIndexOf("."));
    const storyFile = /\.(stories|story)\.(ts|tsx|js|jsx|mdx)$/.test(entry);
    const storyInfrastructure = isStorybookInfrastructurePath(relative(root, absolute));
    const previewHead = entry === "preview-head.html";

    if ((storyInfrastructure || storyFile || previewHead) && (scannedExtensions.has(extension) || previewHead)) {
      files.push(absolute);
    }
  }

  return files;
}

export function runStorybookBoundaryCheck(root = process.cwd()) {
  const files = Array.from(new Set(storyRoots.flatMap((storyRoot) => walk(root, join(root, storyRoot)))));
  const violations = files.flatMap((file) => {
    const source = readFileSync(file, "utf8");
    return forbiddenImportPatterns
      .filter((pattern) => pattern.test(source))
      .map((pattern) => `${normalizeStorybookBoundaryPath(relative(root, file))} matches ${pattern}`);
  });

  if (files.length === 0) {
    console.error("No Storybook config, story, fixture, or decorator files were found.");
    return 1;
  }

  if (violations.length > 0) {
    console.error("Storybook provider boundary violations:");
    for (const violation of violations) console.error(`- ${violation}`);
    return 1;
  }

  console.log(`Storybook provider boundary OK: ${files.length} current files scanned.`);
  return 0;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  process.exitCode = runStorybookBoundaryCheck();
}
