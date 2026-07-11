import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  RUN_MANIFEST_SCHEMA,
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
});

