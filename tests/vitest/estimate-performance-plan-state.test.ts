import { describe, expect, it } from "vitest";

import { ESTIMATE_UNITS, type EstimateUnit } from "../../scripts/lib/estimate-sheet-performance-contract";
import {
  ESTIMATE_SHEET_RUNTIME_PROJECTIONS,
  ESTIMATE_SHEET_RUNTIME_REGISTRY,
  ESTIMATE_SHEET_RUNTIME_STATE_CONTRACT,
  calculateEstimateSheetManifestSha256,
  canonicalEstimateSheetManifestBytes,
  deriveEstimateSheetFinalCloseoutTransition,
  deriveEstimateSheetPrepareTransition,
  deriveEstimateSheetRefreezeReopenTransition,
  deriveEstimateSheetReleaseReopenTransition,
  deriveEstimateSheetTechnicalBlockTransition,
  deriveEstimateSheetVerifiedTransition,
  type EstimateSheetPlanManifest,
  type RuntimeFileSet,
  type RuntimeMaterialization,
  validateEstimateSheetPrepareTransition,
  validateEstimateSheetFinalCloseoutTransition,
  validateEstimateSheetRefreezeReopenTransition,
  validateEstimateSheetReleaseReopenTransition,
  validateEstimateSheetRuntimeState,
  validateEstimateSheetTechnicalBlockTransition,
  validateEstimateSheetVerifiedTransition,
} from "../../scripts/lib/estimate-sheet-performance-plan-state";
import {
  canonicalManifestBytes as genericCanonicalManifestBytes,
  sha256 as genericSha256,
} from "../../scripts/lib/plan-pack-validator.mjs";

const UPDATED_AT = "2026-07-11T08:00:00.000Z";

function placeholderBytes(artifactId: string, evidenceId?: string): string {
  return `${JSON.stringify({
    artifactId,
    ...(evidenceId ? { evidenceId } : {}),
    schema: evidenceId
      ? "estimate-sheet-evidence-projection-placeholder.v1"
      : "estimate-sheet-evidence-registry-placeholder.v1",
    status: "STALE",
  })}\n`;
}

function digest(value: string | Uint8Array): string {
  return genericSha256(value);
}

function makeInitialState(): { manifest: EstimateSheetPlanManifest; files: RuntimeFileSet } {
  const projectionRows = ESTIMATE_SHEET_RUNTIME_PROJECTIONS.map((spec) => {
    const content = placeholderBytes(spec.artifact_id, spec.evidence_id);
    return {
      artifact_id: spec.artifact_id,
      evidence_id: spec.evidence_id,
      relationship: spec.relationship,
      role: spec.role,
      projection_path: spec.projection_path,
      immutable_path: null,
      sha256: digest(content),
    };
  });
  const registryContent = placeholderBytes(ESTIMATE_SHEET_RUNTIME_REGISTRY.artifact_id);
  const registrySha = digest(registryContent);
  const artifacts = [
    ...projectionRows.map((row) => ({
      id: row.artifact_id,
      role: "runtime-evidence-projection",
      path: row.projection_path,
      sha256: row.sha256,
    })),
    {
      id: ESTIMATE_SHEET_RUNTIME_REGISTRY.artifact_id,
      role: "runtime-evidence-registry",
      path: ESTIMATE_SHEET_RUNTIME_REGISTRY.projection_path,
      sha256: registrySha,
    },
  ];
  const primarySpecs = ESTIMATE_SHEET_RUNTIME_PROJECTIONS.filter(
    (spec) => spec.relationship === "PRIMARY",
  );
  const manifest = {
    package_id: "PLAN-2026-07-08-project-estimate-sheet-performance",
    package_status: "IMPLEMENTATION_READY",
    implementation_status: "NOT_STARTED",
    release_status: "NOT_EVALUATED",
    plan_lifecycle: "ACTIVE",
    terminal_status: "ACTIVE",
    last_observed_run_scope: "PLAN_ONLY",
    artifacts,
    runtime_evidence: {
      contract_version: ESTIMATE_SHEET_RUNTIME_STATE_CONTRACT,
      transition_sequence: 0,
      latest_unit_id: null,
      latest_run_id: null,
      registry: {
        artifact_id: ESTIMATE_SHEET_RUNTIME_REGISTRY.artifact_id,
        projection_path: ESTIMATE_SHEET_RUNTIME_REGISTRY.projection_path,
        immutable_path: null,
        sha256: registrySha,
      },
      projections: projectionRows,
    },
    units: ESTIMATE_UNITS.map((unitId, index) => ({
      id: unitId,
      status: "READY",
      depends_on: index === 0 ? [] : [ESTIMATE_UNITS[index - 1]],
    })),
    tests: Array.from({ length: 7 }, (_, index) => ({
      id: `TEST-${String(index + 1).padStart(3, "0")}`,
      status: index === 0 || index === 6 ? "PASS" : "PLANNED",
    })),
    ready_slices: [{ id: "SLICE-001", unit_ids: [...ESTIMATE_UNITS] }],
    evidence_index: primarySpecs.map((spec) => {
      const row = projectionRows.find((candidate) => candidate.artifact_id === spec.artifact_id)!;
      return {
        id: spec.evidence_id,
        status: "STALE",
        artifact_path: spec.projection_path,
        sha256: row.sha256,
        source_revision: `planned:${spec.unit_id}`,
        valid_until: null,
      };
    }),
    requirements: [
      { id: "REQ-014", status: "ACCEPTED" },
      { id: "DATA-004", status: "ACCEPTED" },
    ],
    risks: [
      { id: "RISK-001", status: "OPEN" },
      { id: "RISK-002", status: "OPEN" },
    ],
    next_unit: "UNIT-001",
    updated_at: "2026-07-10T13:50:41.879Z",
    manifest_sha256: "",
  } as EstimateSheetPlanManifest;
  manifest.manifest_sha256 = calculateEstimateSheetManifestSha256(manifest);

  const files: Record<string, RuntimeFileSet[string]> = {};
  for (const spec of ESTIMATE_SHEET_RUNTIME_PROJECTIONS) {
    files[spec.projection_path] = {
      bytes: placeholderBytes(spec.artifact_id, spec.evidence_id),
      kind: "file",
    };
  }
  files[ESTIMATE_SHEET_RUNTIME_REGISTRY.projection_path] = {
    bytes: registryContent,
    kind: "file",
  };
  return { manifest, files };
}

function materializations(unitId: EstimateUnit, runId: string): RuntimeMaterialization[] {
  const rows = ESTIMATE_SHEET_RUNTIME_PROJECTIONS
    .filter((spec) => spec.unit_id === unitId)
    .map((spec) => ({
      artifactId: spec.artifact_id,
      immutablePath: `evidence/runtime/runs/${unitId}/${runId}/${spec.role}.json`,
      bytes: `${JSON.stringify({ artifact: spec.artifact_id, unit: unitId, overall: "PASS" })}\n`,
    }));
  return [
    ...rows,
    {
      artifactId: ESTIMATE_SHEET_RUNTIME_REGISTRY.artifact_id,
      immutablePath: `evidence/runtime/runs/${unitId}/${runId}/evidence-index.json`,
      bytes: `${JSON.stringify({
        schema_version: "estimate-sheet-evidence-index.v1",
        unit_id: unitId,
        run_id: runId,
        entries: rows.map((row) => ({ artifact_id: row.artifactId, immutable_path: row.immutablePath })),
      })}\n`,
    },
  ];
}

function stateReadyFor(unitId: EstimateUnit): EstimateSheetPlanManifest {
  const { manifest } = makeInitialState();
  const index = ESTIMATE_UNITS.indexOf(unitId);
  for (let priorIndex = 0; priorIndex < index; priorIndex += 1) {
    const priorUnit = ESTIMATE_UNITS[priorIndex]!;
    manifest.units[priorIndex]!.status = "VERIFIED";
    for (const spec of ESTIMATE_SHEET_RUNTIME_PROJECTIONS.filter((row) => row.unit_id === priorUnit)) {
      const row = manifest.runtime_evidence.projections.find(
        (candidate) => candidate.artifact_id === spec.artifact_id,
      )!;
      row.immutable_path = `evidence/runtime/runs/${priorUnit}/prior-${priorIndex}/${spec.role}.json`;
    }
    const primary = ESTIMATE_SHEET_RUNTIME_PROJECTIONS.find(
      (spec) => spec.unit_id === priorUnit && spec.relationship === "PRIMARY",
    )!;
    manifest.evidence_index.find((record) => record.id === primary.evidence_id)!.status = "PASS";
  }
  if (index > 0) {
    const priorUnit = ESTIMATE_UNITS[index - 1]!;
    manifest.runtime_evidence.transition_sequence = index * 2;
    manifest.runtime_evidence.latest_unit_id = priorUnit;
    manifest.runtime_evidence.latest_run_id = `prior-${index - 1}`;
    manifest.runtime_evidence.registry.immutable_path =
      `evidence/runtime/runs/${priorUnit}/prior-${index - 1}/evidence-index.json`;
    manifest.implementation_status = "IN_PROGRESS";
    manifest.last_observed_run_scope = "IMPLEMENT_LOCAL";
  }
  if (index > 3) manifest.tests.find((test) => test.id === "TEST-002")!.status = "PASS";
  if (index > 4) manifest.tests.find((test) => test.id === "TEST-004")!.status = "PASS";
  if (index > 9) {
    manifest.tests.find((test) => test.id === "TEST-003")!.status = "PASS";
    manifest.tests.find((test) => test.id === "TEST-005")!.status = "PASS";
  }
  manifest.next_unit = unitId;
  manifest.manifest_sha256 = calculateEstimateSheetManifestSha256(manifest);
  return manifest;
}

describe("estimate-sheet plan runtime state", () => {
  it("matches the generic canonical manifest hash and validates every initial placeholder", () => {
    const { manifest, files } = makeInitialState();
    expect(canonicalEstimateSheetManifestBytes(manifest)).toEqual(genericCanonicalManifestBytes(manifest));
    expect(calculateEstimateSheetManifestSha256(manifest)).toBe(
      genericSha256(genericCanonicalManifestBytes(manifest)),
    );
    expect(validateEstimateSheetRuntimeState(manifest, files)).toEqual([]);

    const reordered = structuredClone(manifest);
    [reordered.runtime_evidence.projections[0], reordered.runtime_evidence.projections[1]] = [
      reordered.runtime_evidence.projections[1]!,
      reordered.runtime_evidence.projections[0]!,
    ];
    reordered.manifest_sha256 = calculateEstimateSheetManifestSha256(reordered);
    expect(validateEstimateSheetRuntimeState(reordered)).toContain(
      "runtime_evidence.projections[0].artifact_id mismatch",
    );
  });

  it("derives and validates a prepare transition without mutating evidence projections", () => {
    const { manifest } = makeInitialState();
    const original = structuredClone(manifest);
    const input = { unitId: "UNIT-001", runId: "run-001", updatedAt: UPDATED_AT } as const;
    const prepared = deriveEstimateSheetPrepareTransition(manifest, input);

    expect(manifest).toEqual(original);
    expect(prepared.units[0]?.status).toBe("IN_PROGRESS");
    expect(prepared.implementation_status).toBe("IN_PROGRESS");
    expect(prepared.last_observed_run_scope).toBe("IMPLEMENT_LOCAL");
    expect(prepared.runtime_evidence).toMatchObject({
      transition_sequence: 1,
      latest_unit_id: "UNIT-001",
      latest_run_id: "run-001",
    });
    expect(prepared.runtime_evidence.projections).toEqual(manifest.runtime_evidence.projections);
    expect(validateEstimateSheetPrepareTransition(manifest, prepared, input)).toEqual([]);

    const extraMutation = structuredClone(prepared);
    extraMutation.package_status = "NOT_READY";
    extraMutation.manifest_sha256 = calculateEstimateSheetManifestSha256(extraMutation);
    expect(validateEstimateSheetPrepareTransition(manifest, extraMutation, input)).toEqual([
      "prepare transition contains a missing, incorrect, or extra mutation",
    ]);
  });

  it("materializes immutable UNIT-001 evidence, projections, registry, and the next-unit tuple", () => {
    const { manifest, files } = makeInitialState();
    const prepareInput = { unitId: "UNIT-001", runId: "run-001", updatedAt: UPDATED_AT } as const;
    const prepared = deriveEstimateSheetPrepareTransition(manifest, prepareInput);
    const transitionInput = {
      ...prepareInput,
      updatedAt: "2026-07-11T08:01:00.000Z",
      sourceRevision: "run:run-001:application:producer",
      materializations: materializations("UNIT-001", "run-001"),
    } as const;
    const result = deriveEstimateSheetVerifiedTransition(prepared, transitionInput);

    expect(result.manifest.units[0]?.status).toBe("VERIFIED");
    expect(result.manifest.next_unit).toBe("UNIT-002");
    expect(result.manifest.runtime_evidence.transition_sequence).toBe(2);
    expect(result.projectionWrites.map((write) => write.artifactId)).toEqual([
      "ART-039",
      "ART-040",
      "ART-052",
    ]);
    expect(result.manifest.evidence_index.find((record) => record.id === "EVID-002")).toMatchObject({
      status: "PASS",
      artifact_path: "evidence/runtime/jsdom-baseline.json",
      source_revision: transitionInput.sourceRevision,
    });
    expect(validateEstimateSheetVerifiedTransition(prepared, result.manifest, transitionInput)).toEqual([]);

    const materializedFiles: Record<string, RuntimeFileSet[string]> = { ...files };
    for (const write of result.projectionWrites) {
      materializedFiles[write.path] = { bytes: write.bytes, kind: "file" };
      materializedFiles[write.immutablePath] = {
        bytes: write.bytes,
        kind: "file",
        noOverwrite: true,
      };
    }
    expect(validateEstimateSheetRuntimeState(result.manifest, materializedFiles)).toEqual([]);

    const mismatchedFiles = structuredClone(materializedFiles);
    const immutable = result.projectionWrites[0]!.immutablePath;
    mismatchedFiles[immutable] = { bytes: "changed\n", kind: "file", noOverwrite: true };
    expect(validateEstimateSheetRuntimeState(result.manifest, mismatchedFiles)).toEqual(
      expect.arrayContaining(["ART-039 immutable and projection bytes differ"]),
    );
  });

  it("applies the exact VERIFIED next-unit and test matrix through UNIT-011", () => {
    const expectedTests: Partial<Record<EstimateUnit, string[]>> = {
      "UNIT-004": ["TEST-002"],
      "UNIT-005": ["TEST-004"],
      "UNIT-010": ["TEST-003", "TEST-005"],
      "UNIT-011": ["TEST-006"],
    };
    for (const [index, unitId] of ESTIMATE_UNITS.entries()) {
      const ready = stateReadyFor(unitId);
      const runId = `run-${unitId.toLowerCase()}`;
      const prepared = deriveEstimateSheetPrepareTransition(ready, {
        unitId,
        runId,
        updatedAt: UPDATED_AT,
      });
      const result = deriveEstimateSheetVerifiedTransition(prepared, {
        unitId,
        runId,
        updatedAt: "2026-07-11T08:01:00.000Z",
        sourceRevision: `run:${runId}:application:producer`,
        materializations: materializations(unitId, runId),
        ...(unitId === "UNIT-011" ? { releaseStatus: "READY" as const } : {}),
      });

      expect(result.manifest.next_unit).toBe(ESTIMATE_UNITS[index + 1] ?? null);
      expect(result.manifest.runtime_evidence.transition_sequence).toBe(ready.runtime_evidence.transition_sequence + 2);
      for (const testId of expectedTests[unitId] ?? []) {
        expect(result.manifest.tests.find((test) => test.id === testId)?.status).toBe("PASS");
      }
      if (unitId === "UNIT-011") {
        expect(result.manifest).toMatchObject({
          implementation_status: "COMPLETE",
          release_status: "READY",
          plan_lifecycle: "ACTIVE",
          terminal_status: "ACTIVE",
          last_observed_run_scope: "EXTERNAL_ACTIONS",
        });
        expect(result.manifest.ready_slices).toEqual([]);
      }
    }
  });

  it("rejects escaped immutable paths and registry self-entries", () => {
    const prepared = deriveEstimateSheetPrepareTransition(makeInitialState().manifest, {
      unitId: "UNIT-001",
      runId: "run-001",
      updatedAt: UPDATED_AT,
    });
    const escaped = materializations("UNIT-001", "run-001");
    escaped[0] = { ...escaped[0]!, immutablePath: "evidence/runtime/runs/UNIT-001/../escape.json" };
    expect(() => deriveEstimateSheetVerifiedTransition(prepared, {
      unitId: "UNIT-001",
      runId: "run-001",
      updatedAt: "2026-07-11T08:01:00.000Z",
      sourceRevision: "run:run-001:application:producer",
      materializations: escaped,
    })).toThrow(/outside the current run/);

    const cyclic = materializations("UNIT-001", "run-001");
    cyclic[2] = {
      ...cyclic[2]!,
      bytes: JSON.stringify({ entries: [{ artifact_id: "ART-052" }] }),
    };
    expect(() => deriveEstimateSheetVerifiedTransition(prepared, {
      unitId: "UNIT-001",
      runId: "run-001",
      updatedAt: "2026-07-11T08:01:00.000Z",
      sourceRevision: "run:run-001:application:producer",
      materializations: cyclic,
    })).toThrow(/cyclic self-entry/);
  });

  it("materializes decision-backed supersession and defers graph ownership only for UNIT-006", () => {
    const ready = stateReadyFor("UNIT-006");
    const prepared = deriveEstimateSheetPrepareTransition(ready, {
      unitId: "UNIT-006",
      runId: "run-unit-006-superseded",
      updatedAt: UPDATED_AT,
    });
    const result = deriveEstimateSheetVerifiedTransition(prepared, {
      unitId: "UNIT-006",
      runId: "run-unit-006-superseded",
      updatedAt: "2026-07-11T08:01:00.000Z",
      sourceRevision: "decision:unit-006:superseded",
      materializations: materializations("UNIT-006", "run-unit-006-superseded"),
      unitStatus: "SUPERSEDED",
    });
    expect(result.manifest.units.find((unit) => unit.id === "UNIT-006")?.status).toBe("SUPERSEDED");
    expect(result.manifest.next_unit).toBe("UNIT-007");
    expect(result.manifest.evidence_index.find((record) => record.id === "EVID-006")?.status).toBe("PASS");
    expect(result.manifest.requirements?.filter((record) => ["REQ-014", "DATA-004"].includes(record.id)))
      .toEqual([
        { id: "REQ-014", status: "DEFERRED" },
        { id: "DATA-004", status: "DEFERRED" },
      ]);
  });

  it("reopens UNIT-001 for an admitted refreeze without discarding immutable history", () => {
    const initial = makeInitialState().manifest;
    const prepared = deriveEstimateSheetPrepareTransition(initial, {
      unitId: "UNIT-001",
      runId: "run-unit-001-original",
      updatedAt: UPDATED_AT,
    });
    const verified = deriveEstimateSheetVerifiedTransition(prepared, {
      unitId: "UNIT-001",
      runId: "run-unit-001-original",
      updatedAt: "2026-07-11T08:01:00.000Z",
      sourceRevision: "run:unit-001:original",
      materializations: materializations("UNIT-001", "run-unit-001-original"),
    }).manifest;
    const input = { updatedAt: "2026-07-11T08:02:00.000Z" } as const;
    const reopened = deriveEstimateSheetRefreezeReopenTransition(verified, input);
    expect(reopened.units.find((unit) => unit.id === "UNIT-001")?.status).toBe("READY");
    expect(reopened.evidence_index.find((record) => record.id === "EVID-002")?.status).toBe("STALE");
    expect(reopened.runtime_evidence.projections.find((row) => row.artifact_id === "ART-040")?.immutable_path)
      .toContain("run-unit-001-original");
    expect(reopened.runtime_evidence).toMatchObject({
      transition_sequence: 3,
      latest_unit_id: "UNIT-001",
      latest_run_id: "run-unit-001-original",
    });
    expect(validateEstimateSheetRuntimeState(reopened)).toEqual([]);
    expect(validateEstimateSheetRefreezeReopenTransition(verified, reopened, input)).toEqual([]);
  });

  it("supports the distinct UNIT-011 technical-block and release-reopen paths", () => {
    const ready = stateReadyFor("UNIT-011");
    const prepared = deriveEstimateSheetPrepareTransition(ready, {
      unitId: "UNIT-011",
      runId: "run-unit-011-hosted",
      updatedAt: UPDATED_AT,
    });
    const blockInput = {
      runId: "run-unit-011-hosted",
      updatedAt: "2026-07-11T08:01:00.000Z",
      releaseStatus: "NOT_EVALUATED" as const,
    };
    const blocked = deriveEstimateSheetTechnicalBlockTransition(prepared, blockInput);
    expect(blocked).toMatchObject({
      package_status: "NOT_READY",
      implementation_status: "INCOMPLETE",
      terminal_status: "TECH_BLOCKED",
      next_unit: null,
    });
    expect(blocked.ready_slices).toEqual([]);
    expect(validateEstimateSheetTechnicalBlockTransition(prepared, blocked, blockInput)).toEqual([]);

    const notReady = deriveEstimateSheetVerifiedTransition(prepared, {
      unitId: "UNIT-011",
      runId: "run-unit-011-hosted",
      updatedAt: "2026-07-11T08:01:00.000Z",
      sourceRevision: "run:unit-011:not-ready",
      materializations: materializations("UNIT-011", "run-unit-011-hosted"),
      releaseStatus: "NOT_READY",
    }).manifest;
    const reopenInput = { updatedAt: "2026-07-11T08:02:00.000Z" } as const;
    const reopened = deriveEstimateSheetReleaseReopenTransition(notReady, reopenInput);
    expect(reopened.units.find((unit) => unit.id === "UNIT-011")?.status).toBe("READY");
    expect(reopened.next_unit).toBe("UNIT-011");
    expect(reopened.ready_slices[0]?.unit_ids).toEqual(ESTIMATE_UNITS);
    expect(validateEstimateSheetReleaseReopenTransition(notReady, reopened, reopenInput)).toEqual([]);
  });

  it("closes a READY release only with terminal tests and every open-risk disposition", () => {
    const ready = stateReadyFor("UNIT-011");
    const prepared = deriveEstimateSheetPrepareTransition(ready, {
      unitId: "UNIT-011",
      runId: "run-unit-011-ready",
      updatedAt: UPDATED_AT,
    });
    const verified = deriveEstimateSheetVerifiedTransition(prepared, {
      unitId: "UNIT-011",
      runId: "run-unit-011-ready",
      updatedAt: "2026-07-11T08:01:00.000Z",
      sourceRevision: "run:unit-011:ready",
      materializations: materializations("UNIT-011", "run-unit-011-ready"),
      releaseStatus: "READY",
    }).manifest;
    const input = {
      updatedAt: "2026-07-11T08:02:00.000Z",
      riskDispositions: [
        { riskId: "RISK-001", disposition: "MITIGATED" as const, evidenceIds: ["EVID-010"], rationale: "integrated proof" },
        { riskId: "RISK-002", disposition: "ACCEPTED" as const, evidenceIds: ["EVID-011"], rationale: "hosted residual recorded" },
      ],
    };
    const closed = deriveEstimateSheetFinalCloseoutTransition(verified, input);
    expect(closed.plan_lifecycle).toBe("ARCHIVE_READY");
    expect(closed.terminal_status).toBe("ACHIEVED");
    expect(closed.risks?.map((risk) => risk.status)).toEqual(["MITIGATED", "ACCEPTED"]);
    expect(validateEstimateSheetFinalCloseoutTransition(verified, closed, input)).toEqual([]);

    const extra = structuredClone(closed);
    extra.next_unit = "UNIT-011";
    extra.manifest_sha256 = calculateEstimateSheetManifestSha256(extra);
    expect(validateEstimateSheetFinalCloseoutTransition(verified, extra, input)).toEqual([
      "final closeout transition contains a missing, incorrect, or extra mutation",
    ]);
  });
});
