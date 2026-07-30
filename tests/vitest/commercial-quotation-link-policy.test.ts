import { describe, expect, it } from "vitest";

import {
  clientSafeQuotationAttachment,
  projectQuotationAttachment,
  type QuotationAttachmentCandidate,
} from "@/lib/commercial-terms/quotation-policy";
import { readQuotationAttachmentPolicyBatch } from "@/lib/commercial-terms/repository";
import type { D1DatabaseLike, D1Value } from "@/lib/cloudflare/d1";

const now = "2026-07-30T00:00:00.000Z";

function candidate(overrides: Partial<QuotationAttachmentCandidate> = {}): QuotationAttachmentCandidate {
  return {
    linkedVersionId: "version-1",
    expectedWorkspaceId: "workspace-1",
    expectedProjectId: "project-1",
    versionWorkspaceId: "workspace-1",
    versionProjectId: "project-1",
    versionArtifactId: "artifact-1",
    versionContentSha256: "hash-1",
    artifactId: "artifact-1",
    artifactWorkspaceId: "workspace-1",
    artifactProjectId: "project-1",
    artifactType: "quotation",
    artifactStatus: "active",
    uploadWorkspaceId: "workspace-1",
    uploadProjectId: "project-1",
    uploadSurface: "project-artifact",
    uploadStatus: "finalized",
    uploadPurgeState: "active",
    uploadContentType: "application/pdf",
    uploadChecksumSha256: "hash-1",
    uploadScanStatus: "clean",
    scanOverrideActorUserId: null,
    scanOverrideReason: null,
    scanOverrideExpiresAt: null,
    scanOverrideChecksumSha256: null,
    ...overrides,
  };
}

describe("commercial quotation attachment policy", () => {
  it("keeps business quotation status orthogonal to attachment truth", () => {
    expect(projectQuotationAttachment(candidate({ linkedVersionId: null }), now)).toEqual({
      attachmentState: "none",
      hasAttachment: false,
      downloadableVersionId: null,
    });
    expect(projectQuotationAttachment(candidate(), now)).toEqual({
      attachmentState: "available",
      hasAttachment: true,
      downloadableVersionId: "version-1",
    });
  });

  it.each([
    { versionWorkspaceId: "workspace-2" },
    { versionProjectId: "project-2" },
    { artifactWorkspaceId: "workspace-2" },
    { artifactProjectId: "project-2" },
    { artifactType: "report" },
    { artifactStatus: "archived" },
    { uploadStatus: "pending" },
    { uploadPurgeState: "pending" },
    { uploadContentType: "image/png" },
    { uploadChecksumSha256: "other-hash" },
    { uploadScanStatus: "pending" },
    { uploadScanStatus: "infected" },
    { uploadScanStatus: "failed_permanent" },
  ])("projects unusable retained links as one private-safe unavailable state: %o", (override) => {
    expect(projectQuotationAttachment(candidate(override), now)).toEqual({
      attachmentState: "unavailable",
      hasAttachment: false,
      downloadableVersionId: null,
    });
  });

  it("accepts a complete unexpired scan override and rejects stale or incomplete overrides", () => {
    const approved = candidate({
      uploadScanStatus: "override_approved",
      scanOverrideActorUserId: "admin-1",
      scanOverrideReason: "reviewed clean",
      scanOverrideExpiresAt: "2026-07-31T00:00:00.000Z",
      scanOverrideChecksumSha256: "hash-1",
    });
    expect(projectQuotationAttachment(approved, now).attachmentState).toBe("available");
    expect(projectQuotationAttachment({ ...approved, scanOverrideExpiresAt: now }, now).attachmentState)
      .toBe("unavailable");
    expect(projectQuotationAttachment({ ...approved, scanOverrideReason: "short" }, now).attachmentState)
      .toBe("unavailable");
  });

  it("removes private version identity from client-safe output", () => {
    const internal = projectQuotationAttachment(candidate(), now);
    const clientSafe = clientSafeQuotationAttachment(internal);
    expect(clientSafe).toEqual({ attachmentState: "available", hasAttachment: true });
    expect(clientSafe).not.toHaveProperty("downloadableVersionId");
    expect(JSON.stringify(clientSafe)).not.toContain("version-1");
  });

  it("projects many retained links with one repository query and fails missing identities closed", async () => {
    const statements: Array<{ sql: string; values: D1Value[] }> = [];
    const database = {
      prepare(sql: string) {
        const record = { sql, values: [] as D1Value[] };
        statements.push(record);
        return {
          bind(...values: D1Value[]) {
            record.values = values;
            return this;
          },
          async first() { return null; },
          async run() { return { success: true, meta: { changes: 0 } }; },
          async all() {
            return {
              success: true,
              results: [{
                version_id: "version-1",
                version_workspace_id: "workspace-1",
                version_project_id: "project-1",
                version_artifact_id: "artifact-1",
                version_content_sha256: "hash-1",
                artifact_id: "artifact-1",
                artifact_workspace_id: "workspace-1",
                artifact_project_id: "project-1",
                artifact_type: "quotation",
                artifact_status: "active",
                upload_workspace_id: "workspace-1",
                upload_project_id: "project-1",
                upload_surface: "project-artifact",
                upload_status: "finalized",
                upload_purge_state: "active",
                upload_content_type: "application/pdf",
                upload_checksum_sha256: "hash-1",
                upload_scan_status: "clean",
                scan_override_actor_user_id: null,
                scan_override_reason: null,
                scan_override_expires_at: null,
                scan_override_checksum_sha256: null,
              }],
            };
          },
        };
      },
    } as unknown as D1DatabaseLike;

    const result = await readQuotationAttachmentPolicyBatch({
      database,
      workspaceId: "workspace-1",
      projectId: "project-1",
      versionIds: ["version-1", "missing-version"],
      now,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(statements).toHaveLength(1);
    expect(statements[0]?.sql).toContain("version.id IN (?, ?)");
    expect(result.value.get("version-1")?.attachmentState).toBe("available");
    expect(result.value.get("missing-version")).toEqual({
      attachmentState: "unavailable",
      hasAttachment: false,
      downloadableVersionId: null,
    });
  });
});
