import { describe, expect, it } from "vitest";

import type { StorageCleanupReport } from "@/lib/mass-deletion/bulk-action";
import {
  buildUploadCleanupOperationalSnapshot,
  buildUploadRetentionCutoffs,
  planUploadStorageCleanup,
  summarizeUploadCleanup,
} from "@/lib/uploads/cleanup";

const NOW = new Date("2026-06-26T19:40:00Z");

describe("upload storage cleanup planning", () => {
  it("plans failed image cleanup with thumbnails and deduped storage targets", () => {
    const plan = planUploadStorageCleanup([
      {
        assetId: "asset-1",
        uploadSessionId: "session-1",
        workspaceId: "workspace-1",
        surface: "component-image",
        bucket: "component-images",
        path: "workspace-1/user-1/component.webp",
        thumbnailPath: "workspace-1/user-1/component-thumb.webp",
        status: "failed",
      },
      {
        assetId: "asset-1-duplicate",
        workspaceId: "workspace-1",
        surface: "component-image",
        bucket: "component-images",
        path: "workspace-1/user-1/component.webp",
        thumbnailPath: "workspace-1/user-1/component-thumb.webp",
        status: "failed",
      },
    ], { now: NOW });

    expect(plan.rejected).toEqual([]);
    expect(plan.candidates).toEqual([
      {
        assetId: "asset-1",
        uploadSessionId: "session-1",
        workspaceId: "workspace-1",
        target: { bucket: "component-images", path: "workspace-1/user-1/component.webp" },
        reason: "failed_record",
      },
      {
        assetId: "asset-1",
        uploadSessionId: "session-1",
        workspaceId: "workspace-1",
        target: { bucket: "component-images", path: "workspace-1/user-1/component-thumb.webp" },
        reason: "failed_record",
      },
    ]);
  });

  it("keeps finalized assets out of cleanup even when they carry an expired timestamp", () => {
    const plan = planUploadStorageCleanup([
      {
        assetId: "asset-finalized",
        workspaceId: "workspace-1",
        surface: "project-image",
        bucket: "project-images",
        path: "workspace-1/user-1/project-images/project-1/cover.webp",
        status: "finalized",
        expiresAt: "2026-06-26T18:00:00Z",
      },
      {
        assetId: "session-reserved",
        uploadSessionId: "session-reserved",
        workspaceId: "workspace-1",
        surface: "project-image",
        bucket: "project-images",
        path: "workspace-1/user-1/project-images/project-1/draft.webp",
        status: "reserved",
        expiresAt: "2026-06-26T18:00:00Z",
      },
    ], { now: NOW });

    expect(plan.candidates).toEqual([
      expect.objectContaining({
        assetId: "session-reserved",
        target: { bucket: "project-images", path: "workspace-1/user-1/project-images/project-1/draft.webp" },
        reason: "expired_record",
      }),
    ]);
    expect(plan.rejected).toEqual([
      {
        assetId: "asset-finalized",
        bucket: "project-images",
        path: "workspace-1/user-1/project-images/project-1/cover.webp",
        reason: "not_cleanup_eligible",
      },
    ]);
  });

  it("rejects unsafe upload cleanup targets before they reach storage deletion", () => {
    const plan = planUploadStorageCleanup([
      {
        assetId: "asset-cross-workspace",
        workspaceId: "workspace-1",
        surface: "component-attachment",
        bucket: "component-attachments",
        path: "workspace-2/user-1/spec.pdf",
        status: "expired",
      },
      {
        assetId: "asset-traversal",
        workspaceId: "workspace-1",
        surface: "component-image",
        bucket: "component-images",
        path: "workspace-1/user-1/../component.webp",
        status: "failed",
      },
      {
        assetId: "asset-wrong-extension",
        workspaceId: "workspace-1",
        surface: "component-attachment",
        bucket: "component-attachments",
        path: "workspace-1/user-1/spec.exe",
        status: "deleted",
      },
    ], { now: NOW });

    expect(plan.candidates).toEqual([]);
    expect(plan.rejected).toEqual([
      {
        assetId: "asset-cross-workspace",
        bucket: "component-attachments",
        path: "workspace-2/user-1/spec.pdf",
        reason: "unsafe_path",
      },
      {
        assetId: "asset-traversal",
        bucket: "component-images",
        path: "workspace-1/user-1/../component.webp",
        reason: "unsafe_path",
      },
      {
        assetId: "asset-wrong-extension",
        bucket: "component-attachments",
        path: "workspace-1/user-1/spec.exe",
        reason: "unsafe_path",
      },
    ]);
  });

  it("summarizes cleanup outcomes without raw filenames or provider details", () => {
    const plan = planUploadStorageCleanup([
      {
        assetId: "asset-1",
        workspaceId: "workspace-1",
        surface: "component-attachment",
        bucket: "component-attachments",
        path: "workspace-1/user-1/spec.pdf",
        status: "failed",
      },
      {
        assetId: "asset-2",
        workspaceId: "workspace-1",
        surface: "component-image",
        bucket: "component-images",
        path: "workspace-1/user-1/component.png",
        status: "failed",
      },
    ], { now: NOW });
    const report: StorageCleanupReport = {
      removed: [{ bucket: "component-attachments", path: "workspace-1/user-1/spec.pdf" }],
      rejected: [],
      failed: [{ bucket: "component-attachments", path: "workspace-1/user-1/spec.pdf", message: "transient storage outage" }],
    };

    expect(summarizeUploadCleanup(plan, report)).toEqual({
      candidateCount: 1,
      removedCount: 1,
      failedCount: 1,
      rejectedCount: 1,
      failedBuckets: ["component-attachments"],
    });
  });

  it("builds retention cutoffs for assets, sessions, and audit events", () => {
    expect(buildUploadRetentionCutoffs(NOW, {
      failedAssetRetentionDays: 7,
      deletedAssetRetentionDays: 30,
      expiredSessionRetentionDays: 1,
      auditEventRetentionDays: 365,
    })).toEqual({
      failedAssetsBefore: "2026-06-19T19:40:00.000Z",
      deletedAssetsBefore: "2026-05-27T19:40:00.000Z",
      expiredSessionsBefore: "2026-06-25T19:40:00.000Z",
      auditEventsBefore: "2025-06-26T19:40:00.000Z",
    });
  });

  it("emits retry guidance and dashboard-safe cleanup metrics for failed cleanup", () => {
    const plan = planUploadStorageCleanup([
      {
        assetId: "asset-1",
        workspaceId: "workspace-1",
        surface: "component-attachment",
        bucket: "component-attachments",
        path: "workspace-1/user-1/spec.pdf",
        status: "failed",
      },
      {
        assetId: "asset-unsafe",
        workspaceId: "workspace-1",
        surface: "component-image",
        bucket: "component-images",
        path: "workspace-1/user-1/component.png",
        status: "failed",
      },
    ], { now: NOW });
    const metrics = summarizeUploadCleanup(plan, {
      removed: [],
      rejected: [],
      failed: [{ bucket: "component-attachments", path: "workspace-1/user-1/spec.pdf", message: "storage timeout" }],
    });

    expect(buildUploadCleanupOperationalSnapshot(plan, metrics, { now: NOW })).toEqual({
      status: "blocked",
      retryAfterSeconds: 300,
      retentionCutoffs: {
        failedAssetsBefore: "2026-06-19T19:40:00.000Z",
        deletedAssetsBefore: "2026-05-27T19:40:00.000Z",
        expiredSessionsBefore: "2026-06-25T19:40:00.000Z",
        auditEventsBefore: "2025-06-26T19:40:00.000Z",
      },
      dashboardMetrics: {
        cleanupCandidates: 1,
        cleanupRemoved: 0,
        cleanupFailed: 1,
        cleanupRejected: 1,
        failedBucketCount: 1,
      },
      alerts: [
        {
          code: "cleanup_failures",
          severity: "critical",
          message: "Storage cleanup failed and must be retried before claiming production cleanup health.",
        },
        {
          code: "cleanup_rejections",
          severity: "warning",
          message: "Storage cleanup rejected unsafe or ineligible records; investigation history must be preserved.",
        },
      ],
    });
  });

  it("classifies cleanup backlog pressure without provider details", () => {
    const records = Array.from({ length: 3 }, (_, index) => ({
      assetId: `asset-${index}`,
      workspaceId: "workspace-1",
      surface: "component-attachment" as const,
      bucket: "component-attachments",
      path: `workspace-1/user-1/spec-${index}.pdf`,
      status: "expired",
    }));
    const plan = planUploadStorageCleanup(records, { now: NOW });
    const metrics = summarizeUploadCleanup(plan, { removed: [], rejected: [], failed: [] });

    expect(buildUploadCleanupOperationalSnapshot(plan, metrics, {
      now: NOW,
      backlogWarningThreshold: 2,
      backlogCriticalThreshold: 4,
    })).toMatchObject({
      status: "attention",
      retryAfterSeconds: null,
      dashboardMetrics: {
        cleanupCandidates: 3,
        cleanupRemoved: 0,
        cleanupFailed: 0,
        cleanupRejected: 0,
        failedBucketCount: 0,
      },
      alerts: [
        {
          code: "cleanup_backlog",
          severity: "warning",
          message: "Storage cleanup backlog is above the warning threshold.",
        },
      ],
    });
  });
});
