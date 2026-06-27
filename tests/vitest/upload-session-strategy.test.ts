import { describe, expect, it } from "vitest";

import {
  buildUploadSessionFinalizeRequirements,
  chooseUploadSessionStrategy,
} from "@/lib/uploads/session-strategy";

describe("upload session strategy", () => {
  it("keeps current capped uploads server-mediated with finalization required", () => {
    const strategy = chooseUploadSessionStrategy({
      surface: "component-attachment",
      sizeBytes: 20 * 1024 * 1024,
    });

    expect(strategy).toEqual({
      kind: "server_mediated",
      reason: "within_current_cap",
      requiresFinalizeRpc: true,
      supportsResume: false,
    });
    expect(strategy.kind === "rejected" ? null : buildUploadSessionFinalizeRequirements(strategy)).toEqual({
      requiresObjectExistenceCheck: true,
      requiresChecksumOrEtag: false,
      requiresActorWorkspaceSurfaceBinding: true,
      requiresUploadAssetRecord: true,
      requiresScanBeforeUse: false,
    });
  });

  it("routes larger single-part uploads to short-lived signed sessions", () => {
    const strategy = chooseUploadSessionStrategy({
      surface: "component-attachment",
      sizeBytes: 24 * 1024 * 1024,
      signedUploadThresholdBytes: 21 * 1024 * 1024,
      multipartThresholdBytes: 64 * 1024 * 1024,
    });

    expect(strategy).toEqual({
      kind: "signed_single_part",
      reason: "large_file_under_multipart_threshold",
      expiresInSeconds: 300,
      requiresFinalizeRpc: true,
      supportsResume: false,
    });
    expect(strategy.kind === "rejected" ? null : buildUploadSessionFinalizeRequirements(strategy)).toEqual({
      requiresObjectExistenceCheck: true,
      requiresChecksumOrEtag: true,
      requiresActorWorkspaceSurfaceBinding: true,
      requiresUploadAssetRecord: true,
      requiresScanBeforeUse: true,
    });
  });

  it("routes very large files to multipart resumable sessions", () => {
    expect(chooseUploadSessionStrategy({
      surface: "component-attachment",
      sizeBytes: 80 * 1024 * 1024,
      multipartThresholdBytes: 64 * 1024 * 1024,
    })).toEqual({
      kind: "multipart_resumable",
      reason: "large_file_requires_resume",
      partSizeBytes: 8 * 1024 * 1024,
      maxParts: 1000,
      requiresFinalizeRpc: true,
      supportsResume: true,
    });
  });

  it("rejects unknown, policy-gap, and absolute oversize sessions", () => {
    expect(chooseUploadSessionStrategy({
      surface: "project-image",
      sizeBytes: null,
    })).toEqual({ kind: "rejected", reason: "unknown_size", retryable: false });

    expect(chooseUploadSessionStrategy({
      surface: "project-image",
      sizeBytes: 16 * 1024 * 1024,
      signedUploadThresholdBytes: 24 * 1024 * 1024,
    })).toEqual({ kind: "rejected", reason: "surface_policy_exceeded", retryable: false });

    expect(chooseUploadSessionStrategy({
      surface: "component-attachment",
      sizeBytes: 600 * 1024 * 1024,
    })).toEqual({ kind: "rejected", reason: "exceeds_absolute_cap", retryable: false });
  });
});
