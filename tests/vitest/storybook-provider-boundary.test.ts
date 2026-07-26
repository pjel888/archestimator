import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

import {
  isStorybookInfrastructurePath,
  normalizeStorybookBoundaryPath,
} from "../../scripts/check-storybook-boundary.mjs";

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
    const storyInfrastructure = isStorybookInfrastructurePath(relative(root, absolute));
    const previewHead = entry === "preview-head.html";
    if ((storyInfrastructure || storyFile || previewHead) && (scannedExtensions.has(extension) || previewHead)) {
      files.push(absolute);
    }
  }

  return files;
}

describe("Storybook provider boundary", () => {
  it("normalizes adversarial Windows-separated Storybook paths without widening scope", () => {
    expect(normalizeStorybookBoundaryPath(".storybook\\preview.ts")).toBe(".storybook/preview.ts");
    expect(normalizeStorybookBoundaryPath(".\\src\\stories\\decorators\\query.tsx")).toBe("src/stories/decorators/query.tsx");
    expect(isStorybookInfrastructurePath(".storybook\\preview.ts")).toBe(true);
    expect(isStorybookInfrastructurePath("src\\stories\\decorators\\query.tsx")).toBe(true);
    expect(isStorybookInfrastructurePath("src\\stories-archive\\fixture.tsx")).toBe(false);
    expect(isStorybookInfrastructurePath("..\\external\\.storybook\\preview.ts")).toBe(false);
  });

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

  it("runs without archived plan matrices and still rejects live boundary violations", () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "archestimator-storybook-boundary-"));
    const storybookRoot = join(fixtureRoot, ".storybook");
    const previewPath = join(storybookRoot, "preview.ts");

    try {
      mkdirSync(storybookRoot, { recursive: true });
      writeFileSync(previewPath, "export const parameters = {};\n");

      const validResult = spawnSync(
        process.execPath,
        [join(root, "scripts/check-storybook-boundary.mjs")],
        { cwd: fixtureRoot, encoding: "utf8" },
      );
      expect(validResult.status).toBe(0);
      expect(validResult.stdout).toContain(
        "Storybook provider boundary OK: 1 current files scanned.",
      );

      writeFileSync(previewPath, 'export const loadData = () => fetch("/api/live");\n');

      const invalidResult = spawnSync(
        process.execPath,
        [join(root, "scripts/check-storybook-boundary.mjs")],
        { cwd: fixtureRoot, encoding: "utf8" },
      );
      expect(invalidResult.status).toBe(1);
      expect(invalidResult.stderr).toContain("Storybook provider boundary violations:");
      expect(invalidResult.stderr).toContain(".storybook/preview.ts matches");
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("uses deterministic query state and an action-free settings guidance fixture", () => {
    const queryDecorator = readFileSync(
      join(root, "src/stories/decorators/withStaticQueryClient.tsx"),
      "utf8",
    );
    const modalPatterns = readFileSync(
      join(root, "src/stories/domain/workshop/modal-patterns.stories.tsx"),
      "utf8",
    );

    expect(queryDecorator).toContain("QueryClientProvider");
    expect(queryDecorator).toContain("useState(createStaticQueryClient)");
    expect(queryDecorator).toContain("gcTime: Infinity");
    expect(queryDecorator).toContain("staleTime: Infinity");
    expect(queryDecorator).toContain("refetchOnMount: false");
    expect(queryDecorator).toContain("refetchOnReconnect: false");
    expect(queryDecorator).toContain("refetchOnWindowFocus: false");
    expect(queryDecorator).toMatch(/retry:\s*false/g);
    expect(modalPatterns).toContain("StaticGuidanceToursSettings");
    expect(modalPatterns).toContain("renderGuidanceToursSettings");
    expect(modalPatterns).not.toContain(
      '@/components/workshop/settings/GuidanceToursSettings',
    );
  });
});
