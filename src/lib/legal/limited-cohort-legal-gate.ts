import { CURRENT_PRIVACY_NOTICE, CURRENT_TERMS } from "@/lib/legal/terms-content";

export const LIMITED_COHORT_LEGAL_GATE_VERSION = "limited-cohort-legal-gate-v1";
export const LIMITED_COHORT_LEGAL_DECISION_RECEIPT_VERSION = "LIMITED-COHORT-LEGAL-DECISION-RECEIPT-v1";

export type LegalDocumentVersions = {
  termsVersion: string;
  privacyVersion: string;
  cookieVersion: string;
  contactVersion: string;
};

export type LimitedCohortLegalCandidate = {
  receiptVersion: typeof LIMITED_COHORT_LEGAL_DECISION_RECEIPT_VERSION;
  scope: "limited_free_beta";
  cohortId: string;
  maximumParticipants: number;
  requestedParticipants: number;
  startsAt: string;
  expiresAt: string;
  documents: LegalDocumentVersions;
  incidentPolicy: { version: string; digest: string };
  support: { primary: string; backup: string; window: string };
  dataConstraints: { version: string; retentionVersion: string };
  ownerDecision: { approver: string; issuedAt: string; reference: string };
};

export type BroaderLaunchCounselCandidate = {
  scope: "broader_public_paid";
  status: "approved" | "pending" | "not_provided";
  reviewedAt: string | null;
  expiresAt: string | null;
  artifactVersions: LegalDocumentVersions | null;
  jurisdictionAssumptionsVersion: string | null;
  reference: string | null;
};

export type LegalGateBlocker =
  | "missing_candidate"
  | "invalid_receipt_version"
  | "invalid_scope"
  | "invalid_cohort"
  | "cohort_overflow"
  | "invalid_duration"
  | "missing_document_version"
  | "document_version_mismatch"
  | "missing_incident_policy"
  | "missing_support_coverage"
  | "missing_data_constraint"
  | "missing_owner_decision"
  | "missing_counsel_evidence"
  | "expired_counsel_evidence"
  | "counsel_scope_mismatch"
  | "counsel_document_mismatch";

export type LimitedCohortLegalGateResult = {
  gateVersion: typeof LIMITED_COHORT_LEGAL_GATE_VERSION;
  evaluatedAt: string;
  limitedCohort: {
    schemaReady: boolean;
    blockers: LegalGateBlocker[];
    nextAction: "resolve_AUTH-003" | "repair_local_candidate";
  };
  broaderPublicPaid: {
    status: "BOUNDARY" | "NOT_READY";
    blockers: LegalGateBlocker[];
    nextAction: "obtain_qualified_counsel_scope";
  };
  authorizationBoundary: "AUTH-003_REQUIRED";
  note: string;
};

export const CURRENT_LEGAL_DOCUMENT_VERSIONS = {
  termsVersion: CURRENT_TERMS.version,
  privacyVersion: CURRENT_PRIVACY_NOTICE.version,
  // Cookie and contact artifacts must be bound by the AUTH-003 packet. There
  // is no current source-owned versioned artifact for either surface yet.
  cookieVersion: "",
  contactVersion: "",
} as const satisfies LegalDocumentVersions;

function isNonEmptyText(value: string | null | undefined, maxLength = 160): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength && !/[<>{}[\]\\]/.test(value);
}

function isIsoTimestamp(value: string | null | undefined): value is string {
  if (!isNonEmptyText(value, 40)) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function sameDocumentVersions(left: LegalDocumentVersions | null, right: LegalDocumentVersions): boolean {
  if (!left) return false;

  return left.termsVersion === right.termsVersion
    && left.privacyVersion === right.privacyVersion
    && left.cookieVersion === right.cookieVersion
    && left.contactVersion === right.contactVersion;
}

function hasAllDocumentVersions(value: LegalDocumentVersions | null | undefined): value is LegalDocumentVersions {
  if (!value) return false;

  return isNonEmptyText(value.termsVersion)
    && isNonEmptyText(value.privacyVersion)
    && isNonEmptyText(value.cookieVersion)
    && isNonEmptyText(value.contactVersion);
}

function uniqueSorted(blockers: LegalGateBlocker[]) {
  return [...new Set(blockers)].sort();
}

export function evaluateLimitedCohortLegalGate({
  candidate,
  currentDocuments,
  counsel,
  now = new Date().toISOString(),
}: {
  candidate: LimitedCohortLegalCandidate | null;
  currentDocuments: LegalDocumentVersions;
  counsel: BroaderLaunchCounselCandidate | null;
  now?: string;
}): LimitedCohortLegalGateResult {
  const limitedBlockers: LegalGateBlocker[] = [];
  const nowMs = Date.parse(now);
  if (!candidate) {
    limitedBlockers.push("missing_candidate");
  } else {
    if (candidate.receiptVersion !== LIMITED_COHORT_LEGAL_DECISION_RECEIPT_VERSION) limitedBlockers.push("invalid_receipt_version");
    if (candidate.scope !== "limited_free_beta") limitedBlockers.push("invalid_scope");
    if (!isNonEmptyText(candidate.cohortId) || !Number.isSafeInteger(candidate.maximumParticipants) || candidate.maximumParticipants < 1 || !Number.isSafeInteger(candidate.requestedParticipants) || candidate.requestedParticipants < 0) limitedBlockers.push("invalid_cohort");
    if (Number.isSafeInteger(candidate.maximumParticipants) && Number.isSafeInteger(candidate.requestedParticipants) && candidate.requestedParticipants > candidate.maximumParticipants) limitedBlockers.push("cohort_overflow");
    if (!isIsoTimestamp(candidate.startsAt) || !isIsoTimestamp(candidate.expiresAt) || Date.parse(candidate.startsAt) >= Date.parse(candidate.expiresAt) || (Number.isFinite(nowMs) && Date.parse(candidate.expiresAt) <= nowMs)) limitedBlockers.push("invalid_duration");
    if (!hasAllDocumentVersions(candidate.documents) || !hasAllDocumentVersions(currentDocuments)) limitedBlockers.push("missing_document_version");
    else if (!sameDocumentVersions(candidate.documents, currentDocuments)) limitedBlockers.push("document_version_mismatch");
    if (!isNonEmptyText(candidate.incidentPolicy.version) || !/^sha256:[a-f0-9]{64}$/.test(candidate.incidentPolicy.digest)) limitedBlockers.push("missing_incident_policy");
    if (!isNonEmptyText(candidate.support.primary) || !isNonEmptyText(candidate.support.backup) || candidate.support.primary === candidate.support.backup || !isNonEmptyText(candidate.support.window)) limitedBlockers.push("missing_support_coverage");
    if (!isNonEmptyText(candidate.dataConstraints.version) || !isNonEmptyText(candidate.dataConstraints.retentionVersion)) limitedBlockers.push("missing_data_constraint");
    if (!isNonEmptyText(candidate.ownerDecision.approver) || !isIsoTimestamp(candidate.ownerDecision.issuedAt) || !isNonEmptyText(candidate.ownerDecision.reference)) limitedBlockers.push("missing_owner_decision");
  }

  const counselBlockers: LegalGateBlocker[] = [];
  if (!counsel || counsel.status !== "approved") counselBlockers.push("missing_counsel_evidence");
  if (!counsel || counsel.scope !== "broader_public_paid") counselBlockers.push("counsel_scope_mismatch");
  if (counsel?.status === "approved" && (!isIsoTimestamp(counsel.reviewedAt) || !isIsoTimestamp(counsel.expiresAt) || !Number.isFinite(nowMs) || Date.parse(counsel.expiresAt) <= nowMs)) counselBlockers.push("expired_counsel_evidence");
  if (counsel?.status === "approved" && (!hasAllDocumentVersions(counsel.artifactVersions) || !hasAllDocumentVersions(currentDocuments) || !sameDocumentVersions(counsel.artifactVersions, currentDocuments))) counselBlockers.push("counsel_document_mismatch");
  if (counsel?.status === "approved" && (!isNonEmptyText(counsel.jurisdictionAssumptionsVersion) || !isNonEmptyText(counsel.reference))) counselBlockers.push("missing_counsel_evidence");

  const normalizedLimitedBlockers = uniqueSorted(limitedBlockers);
  return {
    gateVersion: LIMITED_COHORT_LEGAL_GATE_VERSION,
    evaluatedAt: now,
    limitedCohort: {
      schemaReady: normalizedLimitedBlockers.length === 0,
      blockers: normalizedLimitedBlockers,
      nextAction: normalizedLimitedBlockers.length === 0 ? "resolve_AUTH-003" : "repair_local_candidate",
    },
    broaderPublicPaid: {
      status: "BOUNDARY",
      blockers: uniqueSorted(counselBlockers),
      nextAction: "obtain_qualified_counsel_scope",
    },
    authorizationBoundary: "AUTH-003_REQUIRED",
    note: "Local schema validation only. It does not record an owner decision, verify counsel, authorize invitations, or authorize public, paid, hosted, provider, or release action.",
  };
}
