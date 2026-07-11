import { describe, expect, it } from "vitest";

import {
  assertClosedPredecessorAdmissionLineage,
  createPreparedNamespaces,
  parsePrepareCli,
  resolvePrepareContract,
} from "../../scripts/prepare-estimate-sheet-performance-run";
import { sha256Hex } from "../../scripts/lib/estimate-sheet-performance-contract";

describe("estimate-sheet prepare contract", () => {
  it("accepts only the closed prepare CLI surface", () => {
    expect(parsePrepareCli([
      "--unit=UNIT-002",
      "--profile=limit",
      "--port=auto",
    ])).toEqual({
      unit: "UNIT-002",
      profile: "limit",
      artifactOnly: false,
      cleanupNotApplicable: false,
      port: "auto",
    });
    expect(() => parsePrepareCli([
      "--unit=UNIT-002",
      "--profile=limit",
      "--port=3101",
    ])).toThrow(/exactly auto or none/);
    expect(() => parsePrepareCli([
      "--unit=UNIT-002",
      "--profile=artifact-only",
      "--port=auto",
    ])).toThrow(/exactly limit/);
    expect(() => parsePrepareCli([
      "--unit=UNIT-002",
      "--profile=limit",
      "--port=auto",
      "--evidence-class=local-browser",
    ])).toThrow(/unknown prepare option/);
    expect(parsePrepareCli(["--recover"])).toEqual({ recover: true });
    expect(() => parsePrepareCli(["--recover", "--unit=UNIT-002"])).toThrow(/cannot be combined/);
  });

  it("infers exact local resource classes and namespace roles by unit", () => {
    expect(resolvePrepareContract({ unit: "UNIT-002", profile: "limit", port: "auto" })).toMatchObject({
      evidenceClass: "local-browser",
      cleanupRequirement: "REQUIRED",
      portPolicy: "auto",
      namespaceRoles: ["browser"],
    });
    expect(resolvePrepareContract({ unit: "UNIT-003", profile: "limit", port: "none" })).toMatchObject({
      evidenceClass: "local-d1",
      cleanupRequirement: "REQUIRED",
      portPolicy: "none",
      namespaceRoles: ["d1"],
    });
    expect(resolvePrepareContract({
      unit: "UNIT-005",
      profile: "limit",
      port: "auto",
      decisionAction: "activate",
    })).toMatchObject({
      evidenceClass: "local-browser",
      namespaceRoles: ["mode", "browser", "d1"],
    });
    expect(resolvePrepareContract({ unit: "UNIT-010", profile: "limit", port: "auto" })).toMatchObject({
      evidenceClass: "local-browser",
      namespaceRoles: ["mode", "browser", "d1"],
    });
  });

  it("keeps artifact-only cleanup variants exact", () => {
    expect(resolvePrepareContract({
      unit: "UNIT-001",
      profile: "limit",
      artifactOnly: true,
      cleanupNotApplicable: true,
    })).toMatchObject({
      profile: "artifact-only",
      evidenceClass: "jsdom",
      cleanupRequirement: "NOT_APPLICABLE",
      namespaceRoles: [],
    });
    expect(resolvePrepareContract({
      unit: "UNIT-007",
      profile: "limit",
      artifactOnly: true,
      cleanupNotApplicable: true,
      decisionAction: "supersede",
    })).toMatchObject({
      profile: "artifact-only",
      evidenceClass: "jsdom",
      cleanupRequirement: "NOT_APPLICABLE",
    });
    expect(resolvePrepareContract({
      unit: "UNIT-011",
      profile: "limit",
      artifactOnly: true,
      cleanupRequirement: "REQUIRED",
    })).toMatchObject({
      profile: "artifact-only",
      evidenceClass: "hosted-d1",
      cleanupRequirement: "REQUIRED",
      namespaceRoles: [],
    });
    expect(() => resolvePrepareContract({
      unit: "UNIT-011",
      profile: "limit",
      artifactOnly: true,
      cleanupNotApplicable: true,
    })).toThrow(/cleanup-requirement=REQUIRED/);
  });

  it("allocates distinct role identifiers over one canonical prestate", () => {
    const preState = sha256Hex("canonical-limit-prestate");
    const namespaces = createPreparedNamespaces("run-1", ["mode", "browser", "d1"], preState);
    expect(Object.values(namespaces).map((namespace) => namespace.preStateSha256)).toEqual([
      preState,
      preState,
      preState,
    ]);
    expect(new Set(Object.values(namespaces).map((namespace) => namespace.idSha256)).size).toBe(3);
  });

  it("fails closed when predecessor fingerprints or admitted scope records drift", () => {
    const application = {
      contract_version: "estimate-sheet-application-fingerprint.v1",
      path_count: 1,
      path_list_sha256: sha256Hex("application-paths"),
      content_sha256: sha256Hex("application-content"),
    };
    const producer = {
      contract_version: "estimate-sheet-producer-fingerprint.v1",
      path_count: 1,
      path_list_sha256: sha256Hex("producer-paths"),
      content_sha256: sha256Hex("producer-content"),
    };
    const currentFingerprint = {
      contract_version: "estimate-sheet-source-fingerprint.v2" as const,
      head: "1234567",
      path_count: 2,
      path_list_sha256: sha256Hex("source-paths"),
      application,
      producer,
    };
    const currentScopeRecords = {
      application: [{ path: "src/application.ts", mode: "100644" as const, sha256: sha256Hex("application") }],
      producer: [{ path: "scripts/producer.ts", mode: "100644" as const, sha256: sha256Hex("producer") }],
    };
    const admission = {
      predecessor: {
        application_fingerprint: application,
        producer_fingerprint: producer,
      },
      input_application_fingerprint: application,
      input_producer_fingerprint: producer,
      input_scope_records: currentScopeRecords,
      require_producer_equality: true,
    };
    expect(() => assertClosedPredecessorAdmissionLineage({
      admission,
      currentFingerprint,
      currentScopeRecords,
    })).not.toThrow();
    expect(() => assertClosedPredecessorAdmissionLineage({
      admission,
      currentFingerprint: {
        ...currentFingerprint,
        application: { ...application, content_sha256: sha256Hex("drift") },
      },
      currentScopeRecords,
    })).toThrow(/one cohort/);
    expect(() => assertClosedPredecessorAdmissionLineage({
      admission,
      currentFingerprint,
      currentScopeRecords: {
        ...currentScopeRecords,
        producer: [{ ...currentScopeRecords.producer[0]!, sha256: sha256Hex("drift") }],
      },
    })).toThrow(/scope delta/);
  });
});
