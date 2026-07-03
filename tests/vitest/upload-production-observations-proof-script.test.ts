import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildUploadProductionObservationReports,
  writeUploadProductionObservationReports,
} from "../../scripts/verify-upload-production-observations";

const UPLOAD_PLAN_DIR = ".ai/03_plans/000-Follow Ups/2026-06-26-File-Upload-Audit-And-Improvement";

function completeObservationInput() {
  return {
    dashboard: {
      hostedObserved: true,
      pathSafe: true,
      backpressureMetricPresent: true,
      cleanupScanMetricsPresent: true,
    },
    backpressure: {
      hosted: true,
      rejectionStatus: 429,
      retryAfterPresent: true,
      telemetryObserved: true,
      pathSafe: true,
    },
    retentionRunbook: {
      hostedCronObserved: true,
      cleanupRetryObserved: true,
      dashboardObserved: true,
      alertObserved: true,
      noRawStoragePaths: true,
    },
  };
}

function readTemplateInput() {
  return JSON.parse(readFileSync(join(
    process.cwd(),
    `${UPLOAD_PLAN_DIR}/evidence/upload-production-observations-input.template.json`,
  ), "utf8")) as ReturnType<typeof completeObservationInput>;
}

function collectStringValues(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStringValues);
  if (value && typeof value === "object") return Object.values(value).flatMap(collectStringValues);
  return [];
}

describe("upload production observation proof script", () => {
  it("fails closed without explicit proof opt-in or observation input", () => {
    const reports = buildUploadProductionObservationReports({
      generatedAt: "2026-06-27T00:00:00.000Z",
    });

    expect(reports.dashboard.passed).toBe(false);
    expect(reports.dashboard.skipped).toBe(true);
    expect(reports.dashboard.proofBoundary).toBe("hosted-dashboard-proof-skipped");
    expect(reports.backpressure.passed).toBe(false);
    expect(reports.backpressure.skipped).toBe(true);
    expect(reports.backpressure.proofBoundary).toBe("hosted-backpressure-proof-skipped");
    expect(reports.retentionRunbook.passed).toBe(false);
    expect(reports.retentionRunbook.skipped).toBe(true);
    expect(reports.retentionRunbook.proofBoundary).toBe("production-retention-runbook-proof-skipped");
  });

  it("passes only with explicit opt-in and complete path-safe hosted observations", () => {
    const reports = buildUploadProductionObservationReports({
      generatedAt: "2026-06-27T00:00:00.000Z",
      explicitProofOptIn: true,
      inputFile: { requested: true, loaded: true, path: "sanitized-observations.json" },
      input: completeObservationInput(),
    });

    expect(reports.dashboard.passed).toBe(true);
    expect(reports.dashboard.proofBoundary).toBe("hosted-dashboard-observation");
    expect(reports.dashboard.dashboard).toEqual({
      hostedObserved: true,
      pathSafe: true,
      backpressureMetricPresent: true,
      cleanupScanMetricsPresent: true,
    });
    expect(reports.backpressure.passed).toBe(true);
    expect(reports.backpressure.proofBoundary).toBe("hosted-backpressure-observation");
    expect(reports.backpressure.exercise).toEqual({
      hosted: true,
      rejectionStatus: 429,
      retryAfterPresent: true,
      telemetryObserved: true,
      pathSafe: true,
    });
    expect(reports.retentionRunbook.passed).toBe(true);
    expect(reports.retentionRunbook.proofBoundary).toBe("production-retention-runbook-exercise");
    expect(reports.retentionRunbook.runbook).toEqual({
      hostedCronObserved: true,
      cleanupRetryObserved: true,
      dashboardObserved: true,
      alertObserved: true,
      noRawStoragePaths: true,
    });
    expect(JSON.stringify(reports)).not.toMatch(/storage_path|file_name|component-attachments\/|https?:\/\//i);
  });

  it("keeps the operator input template parseable, sanitized, and fail-closed until filled", () => {
    const template = readTemplateInput();

    const templateReports = buildUploadProductionObservationReports({
      generatedAt: "2026-06-27T00:00:00.000Z",
      explicitProofOptIn: true,
      inputFile: { requested: true, loaded: true, path: "upload-production-observations-input.template.json" },
      input: template,
    });

    expect(templateReports.dashboard.passed).toBe(false);
    expect(templateReports.backpressure.passed).toBe(false);
    expect(templateReports.retentionRunbook.passed).toBe(false);
    expect(collectStringValues(template)).toEqual([]);

    const filledTemplateReports = buildUploadProductionObservationReports({
      generatedAt: "2026-06-27T00:00:00.000Z",
      explicitProofOptIn: true,
      inputFile: { requested: true, loaded: true, path: "sanitized-observations.json" },
      input: {
        dashboard: {
          ...template.dashboard,
          hostedObserved: true,
          pathSafe: true,
          backpressureMetricPresent: true,
          cleanupScanMetricsPresent: true,
        },
        backpressure: {
          ...template.backpressure,
          hosted: true,
          rejectionStatus: 429,
          retryAfterPresent: true,
          telemetryObserved: true,
          pathSafe: true,
        },
        retentionRunbook: {
          ...template.retentionRunbook,
          hostedCronObserved: true,
          cleanupRetryObserved: true,
          dashboardObserved: true,
          alertObserved: true,
          noRawStoragePaths: true,
        },
      },
    });

    expect(filledTemplateReports.dashboard.passed).toBe(true);
    expect(filledTemplateReports.backpressure.passed).toBe(true);
    expect(filledTemplateReports.retentionRunbook.passed).toBe(true);
  });

  it("rejects unsafe observation input without echoing raw paths", () => {
    const reports = buildUploadProductionObservationReports({
      generatedAt: "2026-06-27T00:00:00.000Z",
      explicitProofOptIn: true,
      inputFile: { requested: true, loaded: true, path: "unsafe-observations.json" },
      input: {
        ...completeObservationInput(),
        dashboard: {
          ...completeObservationInput().dashboard,
          rawStoragePath: "component-attachments/private/customer-file.pdf",
        },
      },
    });

    expect(reports.dashboard.passed).toBe(false);
    expect(reports.backpressure.passed).toBe(false);
    expect(reports.retentionRunbook.passed).toBe(false);
    expect(reports.dashboard.failedChecks).toContain("dashboard-path-safe");
    expect(reports.backpressure.failedChecks).toContain("backpressure-path-safe");
    expect(reports.retentionRunbook.failedChecks).toContain("retention-runbook-path-safe");
    expect(JSON.stringify(reports)).not.toContain("customer-file.pdf");
    expect(JSON.stringify(reports)).not.toContain("component-attachments/private");
  });

  it("writes the three checker-compatible production observation artifacts", () => {
    const reports = buildUploadProductionObservationReports({
      generatedAt: "2026-06-27T00:00:00.000Z",
      explicitProofOptIn: true,
      inputFile: { requested: true, loaded: true, path: "sanitized-observations.json" },
      input: completeObservationInput(),
    });
    const dir = mkdtempSync(join(tmpdir(), "upload-production-observations-"));
    try {
      const outputs = writeUploadProductionObservationReports(reports, dir);
      expect(JSON.parse(readFileSync(outputs.dashboard, "utf8")).mode).toBe("upload-dashboard-production-proof");
      expect(JSON.parse(readFileSync(outputs.backpressure, "utf8")).mode).toBe("upload-backpressure-production-proof");
      expect(JSON.parse(readFileSync(outputs.retentionRunbook, "utf8")).mode).toBe("upload-retention-runbook-production-proof");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
