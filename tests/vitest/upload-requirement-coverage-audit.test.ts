import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  checkUploadRequirementCoverage,
  writeUploadRequirementCoverageAuditReport,
} from "../../scripts/check-upload-requirement-coverage";

const REQUIREMENTS_FILE = ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/04_REQUIREMENTS_SPECIFICATION.md";
const RELEASE_GATES_FILE = ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-release-gates.json";

function writeJson(path: string, value: unknown) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

describe("upload requirement coverage audit", () => {
  it("maps every upload plan requirement to release-gate evidence while preserving production blockers", () => {
    const report = checkUploadRequirementCoverage({
      requirementsFile: REQUIREMENTS_FILE,
      releaseGatesFile: RELEASE_GATES_FILE,
      generatedAt: "2026-06-27T00:00:00.000Z",
    });

    expect(report.mode).toBe("upload-requirement-coverage-audit");
    expect(report.proofBoundary).toBe("traceability-only");
    expect(report.passed).toBe(true);
    expect(report.traceabilityReady).toBe(true);
    expect(report.productionReady).toBe(false);
    expect(report.releaseGateStatuses).toEqual({
      closedBeta: "ready",
      production: "blocked",
      platform: "ready",
    });
    expect(report.totals).toEqual({
      requirements: 25,
      mapped: 25,
      missing: 0,
      blocked: 8,
      unknownReferences: 0,
    });
    expect(report.requirements.map((requirement) => requirement.id)).toContain("UPLOAD-REQ-001");
    expect(report.requirements.map((requirement) => requirement.id)).toContain("UPLOAD-REQ-025");
    expect(report.requirements.every((requirement) => requirement.evidenceRefs.length > 0)).toBe(true);
    expect(report.requirements.find((requirement) => requirement.id === "UPLOAD-REQ-024")?.status).toBe("blocked");
    expect(report.requirements.find((requirement) => requirement.id === "UPLOAD-REQ-024")?.blockerRefs.map((ref) => ref.id)).toContain("UPLOAD-GATE-HOSTED-BACKPRESSURE-OBSERVATION");
    expect(report.requirements.find((requirement) => requirement.id === "UPLOAD-REQ-022")?.status).toBe("blocked");
    expect(report.note).toContain("does not prove production readiness");
  });

  it("fails when a requirement from the spec has no release-gate mapping", () => {
    const dir = mkdtempSync(join(tmpdir(), "upload-requirement-coverage-missing-"));
    try {
      const requirementsFile = join(dir, "requirements.md");
      const releaseGatesFile = join(dir, "release-gates.json");
      writeFileSync(requirementsFile, [
        "| ID | Priority | Requirement | Acceptance Criteria | Validation |",
        "| --- | --- | --- | --- | --- |",
        "| UPLOAD-REQ-001 | P0 | One | A | V |",
        "| UPLOAD-REQ-002 | P0 | Two | A | V |",
      ].join("\n"));
      writeJson(releaseGatesFile, {
        closedBeta: {
          status: "ready",
          localPasses: [{ id: "UPLOAD-GATE-ONE", requirements: ["UPLOAD-REQ-001"] }],
          blockers: [],
        },
        production: { status: "blocked", localPasses: [], blockers: [] },
        platform: { status: "ready", localPasses: [], blockers: [] },
      });

      const report = checkUploadRequirementCoverage({
        requirementsFile,
        releaseGatesFile,
        generatedAt: "2026-06-27T00:00:00.000Z",
      });

      expect(report.passed).toBe(false);
      expect(report.traceabilityReady).toBe(false);
      expect(report.totals.missing).toBe(1);
      expect(report.requirements.find((requirement) => requirement.id === "UPLOAD-REQ-002")?.status).toBe("missing");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("fails when release gates cite a requirement absent from the spec", () => {
    const dir = mkdtempSync(join(tmpdir(), "upload-requirement-coverage-unknown-"));
    try {
      const requirementsFile = join(dir, "requirements.md");
      const releaseGatesFile = join(dir, "release-gates.json");
      writeFileSync(requirementsFile, [
        "| ID | Priority | Requirement | Acceptance Criteria | Validation |",
        "| --- | --- | --- | --- | --- |",
        "| UPLOAD-REQ-001 | P0 | One | A | V |",
      ].join("\n"));
      writeJson(releaseGatesFile, {
        closedBeta: {
          status: "ready",
          localPasses: [{ id: "UPLOAD-GATE-ONE", requirements: ["UPLOAD-REQ-001", "UPLOAD-REQ-999"] }],
          blockers: [],
        },
        production: { status: "blocked", localPasses: [], blockers: [] },
        platform: { status: "ready", localPasses: [], blockers: [] },
      });

      const report = checkUploadRequirementCoverage({
        requirementsFile,
        releaseGatesFile,
        generatedAt: "2026-06-27T00:00:00.000Z",
      });

      expect(report.passed).toBe(false);
      expect(report.totals.unknownReferences).toBe(1);
      expect(report.unknownRequirementReferences).toEqual([
        {
          scope: "closedBeta",
          kind: "localPass",
          id: "UPLOAD-GATE-ONE",
          requirement: "UPLOAD-REQ-999",
        },
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("writes a compact sanitized traceability report", () => {
    const dir = mkdtempSync(join(tmpdir(), "upload-requirement-coverage-output-"));
    try {
      const report = checkUploadRequirementCoverage({
        requirementsFile: REQUIREMENTS_FILE,
        releaseGatesFile: RELEASE_GATES_FILE,
        generatedAt: "2026-06-27T00:00:00.000Z",
      });
      const output = join(dir, "report.json");
      writeUploadRequirementCoverageAuditReport(report, output);
      const saved = readFileSync(output, "utf8");

      expect(JSON.parse(saved)).toEqual(report);
      expect(saved).not.toContain("Bearer ");
      expect(saved).not.toContain("https://");
      expect(saved).not.toContain("supabase.co/storage");
      expect(saved).toContain("UPLOAD-GATE-PRODUCTION-PROOF-RUNBOOK-LOCAL");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
