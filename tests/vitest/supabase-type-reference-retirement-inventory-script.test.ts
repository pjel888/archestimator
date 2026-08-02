import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildSupabaseTypeReferenceRetirementInventory,
  renderSupabaseTypeReferenceRetirementMarkdown,
  writeSupabaseTypeReferenceRetirementInventoryArtifacts,
} from "@/../scripts/generate-supabase-type-reference-retirement-inventory";

function writeFixture(root: string, path: string, text: string) {
  const fullPath = join(root, path);
  mkdirSync(fullPath.slice(0, fullPath.lastIndexOf("/")), { recursive: true });
  writeFileSync(fullPath, text);
}

function runCli(env: NodeJS.ProcessEnv) {
  return spawnSync("bun", ["run", "scripts/generate-supabase-type-reference-retirement-inventory.ts"], {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    encoding: "utf8",
    timeout: 30_000,
  });
}

describe("Supabase type-reference retirement inventory script", () => {
  it("separates deletion blockers from negative import guards", () => {
    const root = mkdtempSync(join(tmpdir(), "supabase-type-reference-inventory-"));
    writeFixture(
      root,
      "tests/vitest/type-import.test.ts",
      'import type { Database, Tables } from "@/lib/supabase/types";\n',
    );
    writeFixture(
      root,
      "tests/vitest/schema-read.test.ts",
      'const source = readFileSync(join(process.cwd(), "src/lib/supabase/types.ts"), "utf8");\n',
    );
    writeFixture(
      root,
      "tests/vitest/existence.test.ts",
      'expect(existsSync(join(process.cwd(), "src/lib/supabase/types.ts"))).toBe(true);\n',
    );
    writeFixture(
      root,
      "tests/vitest/negative-guard.test.ts",
      'expect(source).not.toContain("@/lib/supabase/types");\n',
    );
    writeFixture(
      root,
      "tests/vitest/unknown.test.ts",
      'const legacyPath = "@/lib/supabase/types";\n',
    );
    writeFixture(
      root,
      "supabase/migration-evidence/archived.test.ts",
      'import type { Database } from "@/lib/supabase/types";\n',
    );

    const report = buildSupabaseTypeReferenceRetirementInventory({
      generatedAt: "2026-07-04T00:00:00.000Z",
      rootDir: root,
      scanPaths: ["tests", "supabase"],
    });

    expect(report.scan.totalReferenceFiles).toBe(5);
    expect(report.scan.deletionBlockingFiles).toEqual([
      "tests/vitest/existence.test.ts",
      "tests/vitest/schema-read.test.ts",
      "tests/vitest/type-import.test.ts",
      "tests/vitest/unknown.test.ts",
    ]);
    expect(report.scan.nonBlockingGuardFiles).toEqual(["tests/vitest/negative-guard.test.ts"]);
    expect(report.scan.unknownReferenceFiles).toEqual(["tests/vitest/unknown.test.ts"]);
    expect(report.scan.usageKindCounts).toMatchObject({
      "type-import-fixture": 1,
      "schema-source-read": 1,
      "file-existence-guard": 1,
      "negative-import-guard": 1,
      "unknown-reference": 1,
    });
    expect(report.scan.files.find((file) => file.file.includes("archived.test.ts"))).toBeUndefined();
    expect(report.readiness.allReferencesClassified).toBe(false);
    expect(report.readiness.negativeImportGuardsSeparated).toBe(true);
    expect(report.readiness.typeReferenceDeletionReady).toBe(false);
  });

  it("renders and writes JSON plus Markdown reports", () => {
    const dir = mkdtempSync(join(tmpdir(), "supabase-type-reference-output-"));
    const outputFile = join(dir, "report.json");
    const markdownFile = join(dir, "report.md");
    writeFixture(
      dir,
      "tests/vitest/negative-guard.test.ts",
      'expect(source).not.toContain("@/lib/supabase/types");\n',
    );
    const report = buildSupabaseTypeReferenceRetirementInventory({
      generatedAt: "2026-07-04T00:00:00.000Z",
      rootDir: dir,
      scanPaths: ["tests"],
    });

    writeSupabaseTypeReferenceRetirementInventoryArtifacts({
      report,
      outputFile,
      markdownFile,
    });

    const writtenReport = JSON.parse(readFileSync(outputFile, "utf8"));
    const markdown = readFileSync(markdownFile, "utf8");
    expect(writtenReport).toEqual(report);
    expect(writtenReport.mode).toBe("supabase-type-reference-retirement-inventory");
    expect(markdown).toContain("Supabase type-reference retirement inventory");
    expect(renderSupabaseTypeReferenceRetirementMarkdown(report)).toContain(
      "Supabase type-reference retirement inventory",
    );
  });

  it("passes strict mode once only nonblocking references remain", () => {
    const dir = mkdtempSync(join(tmpdir(), "supabase-type-reference-strict-"));
    const run = runCli({
      OUTPUT_FILE: join(dir, "strict.json"),
      MARKDOWN_FILE: join(dir, "strict.md"),
      STRICT_TYPE_REFERENCE_EXIT: "1",
    });

    expect(run.status).toBe(0);
    expect(run.stderr).toBe("");
    expect(run.stdout).toContain('"strictTypeReferenceExit": true');
    expect(run.stdout).toContain('"deletionBlockingFileCount": 0');
    expect(run.stdout).toContain('"typeReferenceDeletionReady": true');
    expect(run.stdout).toContain('"exitCode": 0');
  });
});
