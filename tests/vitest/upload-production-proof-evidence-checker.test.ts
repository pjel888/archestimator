import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  checkUploadProductionProofEvidence,
  writeUploadProductionProofEvidenceReport,
} from "../../scripts/check-upload-production-proof-evidence";

const PLAN_EVIDENCE_DIR = ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence";
const PRODUCTION_PROOF_RUNBOOK = ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/UPLOAD_PRODUCTION_PROOF_RUNBOOK.md";

function writeJson(dir: string, file: string, value: unknown) {
  writeFileSync(join(dir, file), `${JSON.stringify(value, null, 2)}\n`);
}

function hostedOperationsProof() {
  return {
    mode: "hosted-upload-operations-proof",
    proofBoundary: "hosted-authenticated-dry-run",
    passed: true,
    productionProofReady: true,
    authenticatedDryRunKinds: ["cleanup", "scan"],
    missingAuthenticatedProbeSecrets: [],
  };
}

function hostedRuntimeProof() {
  return {
    mode: "hosted-upload-runtime-proof",
    proofBoundary: "hosted-runtime-authenticated-dry-run",
    passed: true,
    productionProofReady: true,
    authenticated: true,
    missingAuthenticatedProbeSecrets: [],
    samples: [
      { type: "unauthenticated-fail-closed", passed: true },
      { type: "authenticated-runtime-dry-run", passed: true },
      { type: "authenticated-body-probe", passed: true },
      { type: "authenticated-concurrency-probe", passed: true },
    ],
  };
}

function liveScannerProof() {
  return {
    mode: "upload-clamd-live-proof",
    proofBoundary: "live-clamd-scanner-service-proof",
    scannerProvider: "clamd",
    passed: true,
    skipped: false,
    samples: {
      clean: { outcome: "clean" },
      eicar: { outcome: "infected" },
    },
    failedChecks: [],
  };
}

function alertDeliveryProof() {
  return {
    mode: "upload-alert-delivery-production-proof",
    proofBoundary: "hosted-alert-delivery-observation",
    passed: true,
    delivery: {
      delivered: true,
      statusCode: 204,
      secretRedacted: true,
      payloadPathSafe: true,
    },
  };
}

function dashboardProof() {
  return {
    mode: "upload-dashboard-production-proof",
    proofBoundary: "hosted-dashboard-observation",
    passed: true,
    dashboard: {
      hostedObserved: true,
      pathSafe: true,
      backpressureMetricPresent: true,
      cleanupScanMetricsPresent: true,
    },
  };
}

function backpressureProof() {
  return {
    mode: "upload-backpressure-production-proof",
    proofBoundary: "hosted-backpressure-observation",
    passed: true,
    exercise: {
      hosted: true,
      rejectionStatus: 429,
      retryAfterPresent: true,
      telemetryObserved: true,
      pathSafe: true,
    },
  };
}

function retentionRunbookProof() {
  return {
    mode: "upload-retention-runbook-production-proof",
    proofBoundary: "production-retention-runbook-exercise",
    passed: true,
    runbook: {
      hostedCronObserved: true,
      cleanupRetryObserved: true,
      dashboardObserved: true,
      alertObserved: true,
      noRawStoragePaths: true,
    },
  };
}

describe("upload production proof evidence checker", () => {
  it("keeps the production proof runbook aligned with every required artifact", () => {
    const runbook = readFileSync(PRODUCTION_PROOF_RUNBOOK, "utf8");
    const expectedTokens = [
      "hostedUploadOperations",
      "upload-hosted-operations-proof.json",
      "hosted-authenticated-dry-run",
      "verify-hosted-upload-operations.ts",
      "hostedUploadRuntime",
      "upload-hosted-runtime-proof.json",
      "hosted-runtime-authenticated-dry-run",
      "verify-hosted-upload-runtime.ts",
      "liveScanner",
      "upload-clamd-live-proof.json",
      "live-clamd-scanner-service-proof",
      "prove-upload-clamd-live.ts",
      "alertDelivery",
      "upload-alert-delivery-production-proof.json",
      "hosted-alert-delivery-observation",
      "verify-upload-alert-delivery.ts",
      "dashboardObservation",
      "upload-dashboard-production-proof.json",
      "hosted-dashboard-observation",
      "hostedBackpressure",
      "upload-backpressure-production-proof.json",
      "hosted-backpressure-observation",
      "retentionRunbook",
      "upload-retention-runbook-production-proof.json",
      "production-retention-runbook-exercise",
      "verify-upload-production-observations.ts",
      "check-upload-production-proof-evidence.ts",
      "upload-hosted-deployment-readback.json",
      "read-only-vercel-deployment-inspection",
      "hostedProofRoutesObservedDeployed=false",
      "productionDeploymentPredatesUploadProofRoutes=true",
      "productionDeploymentAttemptedFromThisSession=false",
      "passed=7",
      "failed=0",
      "missing=0",
      "invalid=0",
    ];

    for (const token of expectedTokens) {
      expect(runbook).toContain(token);
    }
    expect(runbook).not.toMatch(/Bearer |https:\/\/hooks\.|supabase\.co\/storage/i);
  });

  it("fails closed against the current incomplete production proof bundle", () => {
    const report = checkUploadProductionProofEvidence({
      evidenceDir: PLAN_EVIDENCE_DIR,
      generatedAt: "2026-06-27T00:00:00.000Z",
    });

    expect(report.mode).toBe("upload-production-proof-evidence-check");
    expect(report.passed).toBe(false);
    expect(report.productionProofReady).toBe(false);
    expect(report.totals.required).toBe(7);
    expect(report.totals.failed).toBe(7);
    expect(report.totals.missing).toBe(0);
    expect(report.requirements.find((item) => item.key === "hostedUploadOperations")?.status).toBe("failed");
    expect(report.requirements.find((item) => item.key === "hostedUploadRuntime")?.status).toBe("failed");
    expect(report.requirements.find((item) => item.key === "liveScanner")?.status).toBe("failed");
    expect(report.requirements.find((item) => item.key === "liveScanner")?.failedChecks).toContain("live-scanner-eicar-detected");
    expect(report.requirements.find((item) => item.key === "alertDelivery")?.status).toBe("failed");
    expect(report.requirements.find((item) => item.key === "alertDelivery")?.failedChecks).toContain("alert-delivery-observed");
    expect(report.requirements.find((item) => item.key === "dashboardObservation")?.status).toBe("failed");
    expect(report.requirements.find((item) => item.key === "hostedBackpressure")?.status).toBe("failed");
    expect(report.requirements.find((item) => item.key === "retentionRunbook")?.status).toBe("failed");
    expect(JSON.stringify(report)).not.toContain("Bearer ");
  });

  it("passes only when every hosted/live production evidence artifact satisfies its contract", () => {
    const dir = mkdtempSync(join(tmpdir(), "upload-production-proof-"));
    try {
      writeJson(dir, "upload-hosted-operations-proof.json", hostedOperationsProof());
      writeJson(dir, "upload-hosted-runtime-proof.json", hostedRuntimeProof());
      writeJson(dir, "upload-clamd-live-proof.json", liveScannerProof());
      writeJson(dir, "upload-alert-delivery-production-proof.json", alertDeliveryProof());
      writeJson(dir, "upload-dashboard-production-proof.json", dashboardProof());
      writeJson(dir, "upload-backpressure-production-proof.json", backpressureProof());
      writeJson(dir, "upload-retention-runbook-production-proof.json", retentionRunbookProof());

      const report = checkUploadProductionProofEvidence({
        evidenceDir: dir,
        generatedAt: "2026-06-27T00:00:00.000Z",
      });

      expect(report.passed).toBe(true);
      expect(report.productionProofReady).toBe(true);
      expect(report.totals).toEqual({
        required: 7,
        passed: 7,
        failed: 0,
        missing: 0,
        invalid: 0,
      });
      expect(report.requirements.map((item) => item.status)).toEqual(Array.from({ length: 7 }, () => "passed"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("treats malformed or partial artifacts as not production ready", () => {
    const dir = mkdtempSync(join(tmpdir(), "upload-production-proof-invalid-"));
    try {
      writeFileSync(join(dir, "upload-hosted-operations-proof.json"), "{not-json");
      writeJson(dir, "upload-hosted-runtime-proof.json", {
        ...hostedRuntimeProof(),
        productionProofReady: false,
      });

      const report = checkUploadProductionProofEvidence({
        evidenceDir: dir,
        generatedAt: "2026-06-27T00:00:00.000Z",
      });

      expect(report.passed).toBe(false);
      expect(report.requirements.find((item) => item.key === "hostedUploadOperations")?.status).toBe("invalid");
      expect(report.requirements.find((item) => item.key === "hostedUploadRuntime")?.status).toBe("failed");
      expect(report.requirements.find((item) => item.key === "hostedUploadRuntime")?.failedChecks).toContain("hosted-runtime-production-proof-ready");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("writes a sanitized report artifact", () => {
    const dir = mkdtempSync(join(tmpdir(), "upload-production-proof-output-"));
    try {
      const report = checkUploadProductionProofEvidence({
        evidenceDir: PLAN_EVIDENCE_DIR,
        generatedAt: "2026-06-27T00:00:00.000Z",
      });
      const output = join(dir, "report.json");
      writeUploadProductionProofEvidenceReport(report, output);
      const saved = readFileSync(output, "utf8");

      expect(JSON.parse(saved)).toEqual(report);
      expect(saved).not.toContain("Bearer ");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
