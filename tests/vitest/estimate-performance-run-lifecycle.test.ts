import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  RUN_MANIFEST_SCHEMA,
  defaultRunRoot,
  replaceFileAtomically,
  sha256File,
  sha256Hex,
  validateRunManifest,
  writeNoOverwrite,
} from "../../scripts/lib/estimate-sheet-performance-contract";

const digest = sha256Hex("run-lifecycle");
const fingerprint = {
  contract_version: "estimate-sheet-application-fingerprint.v1",
  path_count: 1,
  path_list_sha256: digest,
  content_sha256: digest,
};

function validManifest(root: string, overrides: Record<string, unknown> = {}) {
  return {
    schema_version: RUN_MANIFEST_SCHEMA,
    package_id: "PLAN-2026-07-08-project-estimate-sheet-performance",
    unit_id: "UNIT-001",
    run_id: "00000000-0000-4000-8000-000000000001",
    profile: "artifact-only",
    cleanupRequirement: "NOT_APPLICABLE",
    run_root: root,
    pointer_path: join(root, "current.json"),
    created_at: "2026-07-11T00:00:00.000Z",
    status: "PREPARED",
    sourceFingerprint: {
      contract_version: "estimate-sheet-source-fingerprint.v2",
      head: "abcdef1234567",
      path_count: 1,
      path_list_sha256: digest,
      application: fingerprint,
      producer: fingerprint,
    },
    applicationFingerprint: fingerprint,
    producerFingerprint: fingerprint,
    namespaces: {},
    mutationJournal: [],
    previewProcesses: [],
    ...overrides,
  };
}

describe("estimate-sheet performance run lifecycle contract", () => {
  it("accepts the artifact-only UNIT-001 preparation state", () => {
    const root = join(tmpdir(), "estimate-sheet-lifecycle");
    expect(validateRunManifest(validManifest(root))).toEqual([]);
  });

  it("rejects a NOT_APPLICABLE run that declares preview or mutation resources", () => {
    const root = join(tmpdir(), "estimate-sheet-lifecycle-invalid");
    const errors = validateRunManifest(validManifest(root, {
      runtimeEnv: join(root, "runtime.env"),
      previewProcesses: [{ role: "preview", phase: "start" }],
      mutationJournal: [{ commandId: "mutate-1" }],
    }));
    expect(errors).toEqual(expect.arrayContaining([
      "NOT_APPLICABLE manifest cannot contain runtimeEnv",
      "NOT_APPLICABLE manifest cannot launch preview processes",
      "NOT_APPLICABLE manifest cannot contain mutations",
    ]));
  });

  it("publishes immutable files and refuses replacement", () => {
    const root = mkdtempSync(join(tmpdir(), "estimate-sheet-run-"));
    const target = join(root, "receipt.json");
    try {
      writeNoOverwrite(target, "first\n");
      expect(readFileSync(target, "utf8")).toBe("first\n");
      expect(() => writeNoOverwrite(target, "second\n")).toThrow(/refusing to overwrite/);
      expect(readFileSync(target, "utf8")).toBe("first\n");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("stores immutable runs beneath the plan runtime evidence root", () => {
    const repoRoot = join(tmpdir(), "estimate-sheet-repo");
    expect(defaultRunRoot(repoRoot)).toBe(join(
      repoRoot,
      ".ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization/evidence/runtime/runs",
    ));
  });

  it("atomically replaces only the expected registered bytes", () => {
    const root = mkdtempSync(join(tmpdir(), "estimate-sheet-replace-"));
    const target = join(root, "projection.json");
    try {
      writeNoOverwrite(target, "stale\n", 0o644);
      const staleSha256 = sha256File(target);
      const currentSha256 = replaceFileAtomically(target, "current\n", staleSha256, 0o644);
      expect(currentSha256).toBe(sha256Hex("current\n"));
      expect(readFileSync(target, "utf8")).toBe("current\n");

      expect(() => replaceFileAtomically(target, "unexpected\n", staleSha256, 0o644))
        .toThrow(/current hash mismatch/);
      expect(readFileSync(target, "utf8")).toBe("current\n");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
