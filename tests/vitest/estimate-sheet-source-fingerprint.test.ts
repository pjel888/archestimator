import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

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
  return JSON.parse(result.stdout) as Record<string, any>;
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

  it("does not treat the three generated .impeccable metadata files as source scope", () => {
    const fingerprint = runReference();
    expect(fingerprint.generated_metadata_exclusion_rule).toBe("untracked-impeccable-metadata-exclusions.v1");
  });
});

