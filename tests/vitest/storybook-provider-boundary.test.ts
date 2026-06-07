import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

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

function walk(dir: string, files: string[] = []) {
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

describe("Storybook provider boundary", () => {
  it("keeps stories, fixtures, decorators, and config provider-free", () => {
    const files = Array.from(new Set(storyRoots.flatMap((storyRoot) => walk(join(root, storyRoot)))));
    expect(files.length).toBeGreaterThan(0);

    const violations = files.flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return forbiddenImportPatterns
        .filter((pattern) => pattern.test(source))
        .map((pattern) => `${relative(root, file)} matches ${pattern}`);
    });

    expect(violations).toEqual([]);
  });
});
