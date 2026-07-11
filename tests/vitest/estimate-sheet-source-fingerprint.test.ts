import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import type { SourceFingerprint } from "../../scripts/lib/estimate-sheet-performance-contract";

const repoRoot = resolve(process.cwd());
const reference = resolve(repoRoot, ".ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization/evidence/source-fingerprint-v1.mjs");
const typedHelper = resolve(repoRoot, "scripts/compute-estimate-sheet-source-fingerprint.ts");

function runReference(extraEnv: Record<string, string> = {}) {
  const result = spawnSync(process.execPath, [reference], {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      PATH: "/usr/bin:/bin",
      HOME: "/tmp/archestimator-fingerprint-home",
      LC_ALL: "C",
      LANG: "C",
      ...extraEnv,
    },
  });
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout) as SourceFingerprint;
}

function runTyped(extraArgs: string[] = []) {
  return spawnSync("bun", ["run", typedHelper, "--", ...extraArgs], {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      PATH: process.env.PATH ?? "/opt/homebrew/bin:/usr/bin:/bin",
      HOME: "/tmp/archestimator-fingerprint-home",
      LC_ALL: "C",
      LANG: "C",
      TZ: "UTC",
    },
  });
}

describe("estimate-sheet source fingerprint contract", () => {
  it("emits the v2 pair with separate application and producer scopes", () => {
    const fingerprint = runReference();
    expect(fingerprint.contract_version).toBe("estimate-sheet-source-fingerprint.v2");
    expect(fingerprint.head).toMatch(/^[0-9a-f]{7,64}$/);
    expect(fingerprint.path_count).toBeGreaterThan(0);
    expect(fingerprint.path_list_sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(fingerprint.application.contract_version).toBe("estimate-sheet-application-fingerprint.v1");
    expect(fingerprint.producer.contract_version).toBe("estimate-sheet-producer-fingerprint.v1");
    expect(fingerprint.application.path_count).toBeGreaterThan(0);
    expect(fingerprint.producer.path_count).toBeGreaterThan(0);
  });

  it("is invariant to caller locale and unrelated startup environment", () => {
    const baseline = runReference({ LC_ALL: "C", LANG: "C", NODE_OPTIONS: "" });
    const alternate = runReference({ LC_ALL: "POSIX", LANG: "en_US.UTF-8", NODE_OPTIONS: "" });
    expect(alternate).toEqual(baseline);
  });

  it("keeps the typed post-bootstrap helper in the declared producer path", () => {
    expect(existsSync(typedHelper)).toBe(true);
  });

  it("byte-compares the typed helper output with a fresh immutable reference invocation", () => {
    const referenceResult = spawnSync(process.execPath, [reference], {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        PATH: "/usr/bin:/bin",
        HOME: "/tmp/archestimator-fingerprint-home",
        LC_ALL: "C",
        LANG: "C",
        TZ: "UTC",
      },
    });
    expect(referenceResult.status, referenceResult.stderr).toBe(0);

    const result = runTyped([`--compare-reference=${reference}`]);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toBe(referenceResult.stdout);
  });

  it("rejects a valid-looking sabotaged reference instead of delegating computation to it", () => {
    const sandbox = mkdtempSync(resolve(tmpdir(), "estimate-fingerprint-sabotage-"));
    try {
      const sabotagedReference = resolve(sandbox, "source-fingerprint-v1.mjs");
      const sabotagedFingerprint = {
        ...runReference(),
        path_count: 0,
      };
      writeFileSync(
        sabotagedReference,
        `process.stdout.write(${JSON.stringify(`${JSON.stringify(sabotagedFingerprint, null, 2)}\n`)});\n`,
        { mode: 0o600 },
      );

      const result = runTyped([`--compare-reference=${sabotagedReference}`]);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("typed fingerprint output differs from reference output");
      expect(result.stdout).toBe("");
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  it("does not treat the three generated .impeccable metadata files as source scope", () => {
    const fingerprint = runReference();
    expect(fingerprint.generated_metadata_exclusion_rule).toBe("untracked-impeccable-metadata-exclusions.v1");
  });
});
