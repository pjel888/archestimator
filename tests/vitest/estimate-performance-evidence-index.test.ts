import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  INDEX_SCHEMA,
  canonicalJson,
  sha256Hex,
} from "../../scripts/lib/estimate-sheet-performance-contract";
import { updateEstimateSheetPerformanceEvidenceIndex } from "../../scripts/update-estimate-sheet-performance-evidence-index";

const scriptPath = resolve(process.cwd(), "scripts/update-estimate-sheet-performance-evidence-index.ts");
const describeIndex = describe.skipIf(!existsSync(scriptPath));

describeIndex("estimate-sheet performance evidence index", () => {
  it("uses the dedicated v1 index schema and immutable projection vocabulary", () => {
    const source = readFileSync(scriptPath, "utf8");
    expect(source).toContain(INDEX_SCHEMA);
    expect(source).toMatch(/dependencySources/);
    expect(source).toMatch(/immutable/i);
    expect(source).toMatch(/sha256/i);
    expect(source).toMatch(/cleanup/i);
  });

  it("binds index identity to canonical bytes rather than object insertion order", () => {
    const first = { schema_version: INDEX_SCHEMA, evidence: [{ id: "EVID-001", sha256: sha256Hex("a") }] };
    const second = { evidence: [{ sha256: sha256Hex("a"), id: "EVID-001" }], schema_version: INDEX_SCHEMA };
    expect(canonicalJson(first)).toBe(canonicalJson(second));
    expect(sha256Hex(canonicalJson(first))).toBe(sha256Hex(canonicalJson(second)));
  });

  it("does not permit a projection to become its own immutable source", () => {
    const source = readFileSync(scriptPath, "utf8");
    expect(source).toMatch(/source.*projection|projection.*source/i);
    expect(source).toMatch(/cyclic|cycle|self/i);
  });

  it("indexes a run-contained immutable source and rejects its projection as a source", () => {
    const root = mkdtempSync(join(tmpdir(), "estimate-index-"));
    const runRoot = join(root, "run");
    const fingerprint = {
      contract_version: "estimate-sheet-fingerprint.v1",
      path_count: 1,
      path_list_sha256: sha256Hex("paths"),
      content_sha256: sha256Hex("content"),
    };
    try {
      mkdirSync(runRoot, { recursive: true });
      writeFileSync(join(runRoot, "evidence.json"), "{\"artifact\":true}\n", { mode: 0o600 });
      writeFileSync(join(runRoot, "run-manifest.json"), `${JSON.stringify({
        schema_version: "estimate-sheet-performance-run.v1",
        package_id: "PLAN-2026-07-08-project-estimate-sheet-performance",
        unit_id: "UNIT-001",
        run_id: "test-run",
        profile: "artifact-only",
        cleanupRequirement: "NOT_APPLICABLE",
        run_root: runRoot,
        pointer_path: join(root, "current.json"),
        created_at: "2026-07-11T00:00:00.000Z",
        status: "PREPARED",
        sourceFingerprint: { contract_version: "estimate-sheet-source-fingerprint.v2", head: "1234567", path_count: 1, path_list_sha256: sha256Hex("source-paths"), application: fingerprint, producer: fingerprint },
        applicationFingerprint: fingerprint,
        producerFingerprint: fingerprint,
        namespaces: {},
        mutationJournal: [],
        previewProcesses: [],
      })}\n`, { mode: 0o600 });

      const projection = join(root, "projection.json");
      const result = updateEstimateSheetPerformanceEvidenceIndex({
        runManifest: join(runRoot, "run-manifest.json"),
        evidenceId: "EVID-001",
        evidencePath: "evidence.json",
        projectPath: projection,
      });
      expect(result.index.schema_version).toBe(INDEX_SCHEMA);
      expect(result.index.evidence[0]?.sha256).toBe(sha256Hex("{\"artifact\":true}\n"));
      expect(readFileSync(projection, "utf8")).toContain(INDEX_SCHEMA);

      expect(() => updateEstimateSheetPerformanceEvidenceIndex({
        runManifest: join(runRoot, "run-manifest.json"),
        evidenceId: "EVID-001",
        evidencePath: "evidence-index.json",
        projectPath: join(runRoot, "evidence-index.json"),
      })).toThrow(/cyclic/i);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
