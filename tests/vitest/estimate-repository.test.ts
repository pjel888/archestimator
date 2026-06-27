import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { estimateRepository } from "@/lib/repositories/estimate-repository";

const repositorySource = readFileSync("src/lib/repositories/estimate-repository.ts", "utf8");
const estimateRowItemWritePattern = /\.from\(\s*["']estimate_row_items["']\s*\)[\s\S]{0,400}?\.(?:insert|upsert|update|delete)\s*\(/;

function sourceFiles(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const path = join(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) return sourceFiles(path);
    return /\.(?:ts|tsx)$/.test(path) && !path.endsWith(".d.ts") ? [path] : [];
  });
}

describe("estimate repository row-item contract", () => {
  it("exposes read-only browser methods for estimate trees", () => {
    expect(Object.keys(estimateRepository).sort()).toEqual(["getEstimateTabTree", "getEstimateTree"]);
    expect("moveEstimateRowItem" in estimateRepository).toBe(false);
    expect("insertEstimateRowItem" in estimateRepository).toBe(false);
    expect("updateEstimateRowItem" in estimateRepository).toBe(false);
    expect("deleteEstimateRowItem" in estimateRepository).toBe(false);
  });

  it("does not contain direct browser writes to estimate row items", () => {
    expect(repositorySource).not.toMatch(/\.from\("estimate_row_items"\)\.(?:insert|upsert|update|delete)/);
  });

  it("keeps production browser clients from directly writing estimate row items", () => {
    const directBrowserWriters = sourceFiles("src").filter((path) => {
      const source = readFileSync(path, "utf8");
      return source.includes("createSupabaseBrowserClient") && estimateRowItemWritePattern.test(source);
    });

    expect(directBrowserWriters).toEqual([]);
  });
});
