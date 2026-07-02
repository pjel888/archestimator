import { describe, expect, it } from "vitest";

import { buildReport } from "../../scripts/verify-cloudflare-hosted-upload-lifecycle-proof";

function passingBody() {
  return {
    mode: "cloudflare-hosted-upload-lifecycle-proof",
    proofSurface: "/api/internal/upload-lifecycle-proof",
    readiness: {
      d1BindingPresent: true,
      r2BindingPresent: true,
      storagePutReady: true,
      uploadAssetRecorded: true,
      scanQueueListed: true,
      scanJobRan: true,
      scanResultPersisted: true,
      attachmentDownloadEligible: true,
      cleanupReady: true,
      hostedUploadLifecycleReady: true,
    },
    proof: {
      objectPathShape: "{workspaceId}/{userId}/codex-upload-proof-object-{runId}.pdf",
      objectPathHash: "path-hash",
      storagePut: {
        passed: true,
        contentType: "application/pdf",
        sizeBytes: 76,
        checksumMatches: true,
      },
      uploadAssetRecord: {
        passed: true,
        uploadSessionIdPresent: true,
        assetIdPresent: true,
        initialScanStatus: "pending",
      },
      scanQueue: {
        passed: true,
        listedRecordCount: 1,
        targetRecordFound: true,
      },
      scanJob: {
        passed: true,
        scannedCount: 1,
        writeFailedCount: 0,
        downloadFailedCount: 0,
        scannerFailedCount: 0,
        outcomeCounts: { clean: 1, infected: 0, rejected: 0, error: 0 },
      },
      scanReadback: {
        passed: true,
        scanStatus: "clean",
        scanProvider: "archestimator-policy-scanner",
        scannedAtPresent: true,
        checksumMatches: true,
        eventTypes: ["created", "scan_clean"],
      },
      attachmentDownloadEligibility: {
        passed: true,
        attachmentPresent: true,
        approved: true,
        finalizedCleanAssetPresent: true,
        storageBytesReadable: true,
        storageChecksumMatches: true,
      },
    },
    cleanupAfter: {
      workspaces: 0,
      profiles: 0,
      workspaceMembers: 0,
      uploadSessions: 0,
      uploadAssets: 0,
      uploadEvents: 0,
      attachments: 0,
    },
    passed: true,
  };
}

describe("Cloudflare hosted upload lifecycle proof verifier script", () => {
  it("marks the hosted R2 upload and scanner lifecycle gate ready from sanitized endpoint evidence", async () => {
    const requested: { url: string; authorization: string | null }[] = [];
    const fetchImpl = async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" || input instanceof URL ? String(input) : input.url;
      requested.push({
        url,
        authorization: new Headers(init?.headers).get("authorization"),
      });
      return Response.json(passingBody(), { status: 200 });
    };

    const report = await buildReport({
      baseUrl: "https://archestimator.example",
      secret: "cron-secret",
      secretInput: { name: "CRON_SECRET", present: true, source: "test" },
      fetchImpl,
    });

    expect(requested).toEqual([
      {
        url: "https://archestimator.example/api/internal/upload-lifecycle-proof",
        authorization: "Bearer cron-secret",
      },
    ]);
    expect(report.readiness.hostedUploadLifecycleReady).toBe(true);
    expect(report.readiness.cleanupReady).toBe(true);
    expect(report.blockers).toEqual([]);
  });

  it("keeps cleanup as a hard readiness gate", async () => {
    const body = passingBody();
    body.cleanupAfter.uploadAssets = 1;
    const fetchImpl = async () => Response.json(body, { status: 200 });

    const report = await buildReport({
      baseUrl: "https://archestimator.example",
      secret: "cron-secret",
      secretInput: { name: "CRON_SECRET", present: true, source: "test" },
      fetchImpl,
    });

    expect(report.readiness.hostedUploadLifecycleReady).toBe(false);
    expect(report.blockers).toContain("Synthetic upload lifecycle proof fixture cleanup did not return to zero.");
  });

  it("reports missing secret without calling the hosted endpoint", async () => {
    let called = false;
    const fetchImpl = async () => {
      called = true;
      return Response.json(passingBody(), { status: 200 });
    };

    const report = await buildReport({
      baseUrl: "https://archestimator.example",
      secret: null,
      secretInput: { name: "CRON_SECRET", present: false, source: null },
      fetchImpl,
    });

    expect(called).toBe(false);
    expect(report.readiness.hostedUploadLifecycleReady).toBe(false);
    expect(report.blockers).toContain("CRON_SECRET is missing from process.env or configured local env files.");
  });
});
