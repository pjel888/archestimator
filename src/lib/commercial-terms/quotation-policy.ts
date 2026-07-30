import {
  QUOTATION_REQUIREMENTS,
  QUOTATION_STATUSES,
  type QuotationFacts,
} from "./contracts";

type QuotationAttachmentState = "none" | "available" | "unavailable";

export type QuotationAttachmentCandidate = {
  linkedVersionId: string | null;
  expectedWorkspaceId: string;
  expectedProjectId: string;
  versionWorkspaceId: string | null;
  versionProjectId: string | null;
  versionArtifactId: string | null;
  versionContentSha256: string | null;
  artifactId: string | null;
  artifactWorkspaceId: string | null;
  artifactProjectId: string | null;
  artifactType: string | null;
  artifactStatus: string | null;
  uploadWorkspaceId: string | null;
  uploadProjectId: string | null;
  uploadSurface: string | null;
  uploadStatus: string | null;
  uploadPurgeState: string | null;
  uploadContentType: string | null;
  uploadChecksumSha256: string | null;
  uploadScanStatus: string | null;
  scanOverrideActorUserId: string | null;
  scanOverrideReason: string | null;
  scanOverrideExpiresAt: string | null;
  scanOverrideChecksumSha256: string | null;
};

export type QuotationAttachmentProjection = {
  attachmentState: QuotationAttachmentState;
  hasAttachment: boolean;
  downloadableVersionId: string | null;
};

export type ClientSafeQuotationAttachmentProjection = Pick<
  QuotationAttachmentProjection,
  "attachmentState" | "hasAttachment"
>;

export type NormalizeQuotationFactsResult =
  | { ok: true; value: QuotationFacts }
  | { ok: false };

const UNSAFE_QUOTATION_REFERENCE = /(?:https?:|token|signature|storage)/i;

export function normalizeQuotationFacts(input: {
  quotationRequirement: unknown;
  quotationStatus: unknown;
  quotationReference: unknown;
}): NormalizeQuotationFactsResult {
  if (!QUOTATION_REQUIREMENTS.includes(input.quotationRequirement as never)) return { ok: false };
  if (!QUOTATION_STATUSES.includes(input.quotationStatus as never)) return { ok: false };
  if (input.quotationReference !== null && input.quotationReference !== undefined
    && typeof input.quotationReference !== "string") return { ok: false };

  const quotationReference = typeof input.quotationReference === "string"
    ? input.quotationReference.trim() || null
    : null;
  if (quotationReference && (quotationReference.length > 160 || UNSAFE_QUOTATION_REFERENCE.test(quotationReference))) {
    return { ok: false };
  }

  return {
    ok: true,
    value: {
      quotationRequirement: input.quotationRequirement as QuotationFacts["quotationRequirement"],
      quotationStatus: input.quotationStatus as QuotationFacts["quotationStatus"],
      quotationReference,
    },
  };
}

function validOverride(candidate: QuotationAttachmentCandidate, now: string) {
  return candidate.uploadScanStatus === "override_approved"
    && Boolean(candidate.scanOverrideActorUserId?.trim())
    && (candidate.scanOverrideReason?.trim().length ?? 0) >= 8
    && candidate.scanOverrideChecksumSha256 === candidate.versionContentSha256
    && Boolean(candidate.scanOverrideExpiresAt && candidate.scanOverrideExpiresAt > now);
}

/**
 * Projects retained quotation provenance into live attachment truth. The result
 * deliberately exposes no invalidation reason or artifact/storage metadata.
 */
export function projectQuotationAttachment(
  candidate: QuotationAttachmentCandidate,
  now: string,
): QuotationAttachmentProjection {
  if (!candidate.linkedVersionId) {
    return { attachmentState: "none", hasAttachment: false, downloadableVersionId: null };
  }

  const sameScope = candidate.versionWorkspaceId === candidate.expectedWorkspaceId
    && candidate.versionProjectId === candidate.expectedProjectId
    && candidate.artifactWorkspaceId === candidate.expectedWorkspaceId
    && candidate.artifactProjectId === candidate.expectedProjectId
    && candidate.uploadWorkspaceId === candidate.expectedWorkspaceId
    && candidate.uploadProjectId === candidate.expectedProjectId;
  const immutableIdentity = Boolean(
    candidate.versionArtifactId
    && candidate.versionArtifactId === candidate.artifactId
    && candidate.versionContentSha256,
  );
  const activeQuotation = candidate.artifactType === "quotation"
    && candidate.artifactStatus === "active";
  const usableUpload = candidate.uploadSurface === "project-artifact"
    && candidate.uploadStatus === "finalized"
    && candidate.uploadPurgeState === "active"
    && candidate.uploadContentType === "application/pdf"
    && candidate.uploadChecksumSha256 === candidate.versionContentSha256
    && (candidate.uploadScanStatus === "clean" || validOverride(candidate, now));

  if (!sameScope || !immutableIdentity || !activeQuotation || !usableUpload) {
    return { attachmentState: "unavailable", hasAttachment: false, downloadableVersionId: null };
  }

  return {
    attachmentState: "available",
    hasAttachment: true,
    downloadableVersionId: candidate.linkedVersionId,
  };
}

export function clientSafeQuotationAttachment(
  projection: QuotationAttachmentProjection,
): ClientSafeQuotationAttachmentProjection {
  return {
    attachmentState: projection.attachmentState,
    hasAttachment: projection.hasAttachment,
  };
}
