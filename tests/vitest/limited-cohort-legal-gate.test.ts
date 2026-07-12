import { describe, expect, it } from "vitest";

import {
  evaluateLimitedCohortLegalGate,
  type BroaderLaunchCounselCandidate,
  type LegalDocumentVersions,
  type LimitedCohortLegalCandidate,
} from "@/lib/legal/limited-cohort-legal-gate";

const documents: LegalDocumentVersions = {
  termsVersion: "tos-test-v1",
  privacyVersion: "privacy-test-v1",
  cookieVersion: "cookie-test-v1",
  contactVersion: "contact-test-v1",
};

const candidate: LimitedCohortLegalCandidate = {
  receiptVersion: "LIMITED-COHORT-LEGAL-DECISION-RECEIPT-v1",
  scope: "limited_free_beta",
  cohortId: "beta-design-partners",
  maximumParticipants: 12,
  requestedParticipants: 3,
  startsAt: "2026-07-10T00:00:00.000Z",
  expiresAt: "2026-08-10T00:00:00.000Z",
  documents,
  incidentPolicy: { version: "incident-policy-v1", digest: `sha256:${"a".repeat(64)}` },
  support: { primary: "Support primary", backup: "Support backup", window: "Mon-Fri 09:00-17:00 Asia/Manila" },
  dataConstraints: { version: "data-use-v1", retentionVersion: "retention-v1" },
  ownerDecision: { approver: "Product owner", issuedAt: "2026-07-10T00:00:00.000Z", reference: "Sanitized decision reference" },
};

const counsel: BroaderLaunchCounselCandidate = {
  scope: "broader_public_paid",
  status: "approved",
  reviewedAt: "2026-07-10T00:00:00.000Z",
  expiresAt: "2026-08-10T00:00:00.000Z",
  artifactVersions: documents,
  jurisdictionAssumptionsVersion: "jurisdiction-v1",
  reference: "Sanitized counsel reference",
};

describe("limited cohort legal gate", () => {
  it("validates a complete local limited-cohort schema without authorizing it", () => {
    const result = evaluateLimitedCohortLegalGate({ candidate, counsel: null, currentDocuments: documents, now: "2026-07-12T00:00:00.000Z" });

    expect(result.limitedCohort).toEqual({ schemaReady: true, blockers: [], nextAction: "resolve_AUTH-003" });
    expect(result.authorizationBoundary).toBe("AUTH-003_REQUIRED");
    expect(result.broaderPublicPaid.status).toBe("BOUNDARY");
    expect(result.broaderPublicPaid.blockers).toContain("missing_counsel_evidence");
  });

  it("fails closed for missing, expired, version-mismatched, and overflow cohort fields", () => {
    const result = evaluateLimitedCohortLegalGate({
      candidate: { ...candidate, requestedParticipants: 13, expiresAt: "2026-07-11T00:00:00.000Z", documents: { ...documents, termsVersion: "stale" } },
      counsel: null,
      currentDocuments: documents,
      now: "2026-07-12T00:00:00.000Z",
    });

    expect(result.limitedCohort.schemaReady).toBe(false);
    expect(result.limitedCohort.blockers).toEqual(["cohort_overflow", "document_version_mismatch", "invalid_duration"]);
  });

  it("does not allow owner fields to satisfy a broader public or paid counsel gate", () => {
    const result = evaluateLimitedCohortLegalGate({ candidate, counsel: null, currentDocuments: documents, now: "2026-07-12T00:00:00.000Z" });
    expect(result.broaderPublicPaid).toMatchObject({ status: "BOUNDARY", nextAction: "obtain_qualified_counsel_scope" });
  });

  it("rejects expired or document-mismatched counsel evidence independently", () => {
    const result = evaluateLimitedCohortLegalGate({
      candidate,
      counsel: { ...counsel, expiresAt: "2026-07-11T00:00:00.000Z", artifactVersions: { ...documents, privacyVersion: "stale" } },
      currentDocuments: documents,
      now: "2026-07-12T00:00:00.000Z",
    });

    expect(result.broaderPublicPaid.blockers).toEqual(["counsel_document_mismatch", "expired_counsel_evidence"]);
  });
});
