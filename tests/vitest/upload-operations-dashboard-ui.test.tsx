import { readFileSync } from "node:fs";

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UploadOperationsDashboardPanel } from "@/components/admin/UploadOperationsDashboardPanel";
import type { UploadOperationsDashboardSnapshot } from "@/lib/uploads/operations-dashboard";

const snapshot: UploadOperationsDashboardSnapshot = {
  generatedAt: "2026-06-27T08:00:00.000Z",
  windowStart: "2026-06-26T08:00:00.000Z",
  windowHours: 24,
  bySurface: {
    "project-image": {
      finalizedAssets: 3,
      removedAssets: 1,
      failedSessions: 0,
      activeOrReservedSessions: 1,
      totalBytes: 1_500_000,
      contentTypes: { "image/webp": 4 },
      sizeBuckets: { lt_1mb: 1, mb_1_to_10: 3, mb_10_to_20: 0, gt_20mb: 0 },
    },
    "component-image": {
      finalizedAssets: 2,
      removedAssets: 0,
      failedSessions: 1,
      activeOrReservedSessions: 0,
      totalBytes: 800_000,
      contentTypes: { "image/png": 2 },
      sizeBuckets: { lt_1mb: 2, mb_1_to_10: 0, mb_10_to_20: 0, gt_20mb: 0 },
    },
    "component-attachment": {
      finalizedAssets: 4,
      removedAssets: 0,
      failedSessions: 2,
      activeOrReservedSessions: 1,
      totalBytes: 30_001_000,
      contentTypes: { "application/pdf": 3 },
      sizeBuckets: { lt_1mb: 1, mb_1_to_10: 2, mb_10_to_20: 0, gt_20mb: 1 },
    },
  },
  scanQueue: {
    queuedCount: 2,
    queuedBytes: 5_000_000,
    oldestQueuedAt: "2026-06-27T06:00:00.000Z",
    blockedCount: 2,
    infectedCount: 1,
    unsupportedCount: 1,
    failedPermanentCount: 0,
    providerCounts: { clamd: 3, "archestimator-policy-scanner": 1 },
  },
  cleanupBacklog: {
    removedAssetCount: 1,
    expiredSessionCount: 2,
    cleanupQueuedEvents: 2,
    cleanupFailedEvents: 1,
    cleanupSucceededEvents: 1,
    auditEventRetentionDays: 365,
    retentionCutoffs: {
      failedBefore: "2026-06-20T08:00:00.000Z",
      deletedBefore: "2026-05-28T08:00:00.000Z",
      expiredSessionBefore: "2026-06-26T08:00:00.000Z",
      auditEventsBefore: "2025-06-27T08:00:00.000Z",
    },
  },
  operationsEvents: {
    downloadUrlIssued: 5,
    scanOverrideApproved: 1,
    backpressureDenied: 2,
    scanFailures: 1,
  },
};

describe("upload operations dashboard UI", () => {
  it("renders path-safe upload operations metrics for platform admins", () => {
    const { container } = render(<UploadOperationsDashboardPanel snapshot={snapshot} />);

    expect(screen.getByLabelText("Upload operations dashboard")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Operations window" })).toBeInTheDocument();
    expect(screen.getByText(/24 hours from/)).toBeInTheDocument();
    expect(screen.getByText("Scan queue")).toBeInTheDocument();
    expect(screen.getByText("5.0 MB queued; oldest Jun 27, 2026, 6:00 AM")).toBeInTheDocument();
    expect(screen.getByText("Blocked scans")).toBeInTheDocument();
    expect(screen.getByText("1 infected, 1 unsupported, 0 failed")).toBeInTheDocument();
    expect(screen.getByText("Cleanup backlog")).toBeInTheDocument();
    expect(screen.getByText("Backpressure denials")).toBeInTheDocument();

    const surfaceTable = screen.getByRole("region", { name: "Upload outcomes by surface" });
    expect(within(surfaceTable).getByText("component-attachment")).toBeInTheDocument();
    expect(within(surfaceTable).getByText("30.0 MB")).toBeInTheDocument();
    expect(screen.getByText("clamd")).toBeInTheDocument();
    expect(screen.getByText("archestimator-policy-scanner")).toBeInTheDocument();
    expect(screen.getByText("Download URLs issued")).toBeInTheDocument();
    expect(screen.getByText("Cleanup queued / failed / succeeded")).toBeInTheDocument();

    expect(container.textContent).not.toMatch(/storage_path|private\/path|signed url|access_token|Bearer/i);
  });

  it("keeps the admin page wired to the role-gated path-safe snapshot reader", () => {
    const pageSource = readFileSync("src/app/admin/upload-operations/page.tsx", "utf8");

    expect(pageSource).toContain("readUploadOperationsDashboardSnapshot({ windowHours })");
    expect(pageSource).toContain('action="/admin/upload-operations"');
    expect(pageSource).toContain("Only platform admins can review upload operations.");
    expect(pageSource).toContain("UploadOperationsDashboardPanel");
    expect(pageSource).toContain("windowHours");
    expect(pageSource).not.toMatch(/storage_path|file_name|metadata|signed|token/i);
  });
});
