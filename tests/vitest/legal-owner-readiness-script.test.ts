import { describe, expect, it } from "vitest";

import {
  checkLegalOwnerReadiness,
  parseApprovalDate,
  parseLegalProofFlag,
  sanitizeLegalLabel,
} from "@/../scripts/check-legal-owner-readiness";

describe("legal owner readiness checker", () => {
  it("parses explicit legal proof flags only", () => {
    expect(parseLegalProofFlag("true")).toBe(true);
    expect(parseLegalProofFlag("1")).toBe(true);
    expect(parseLegalProofFlag("yes")).toBe(true);
    expect(parseLegalProofFlag("approved")).toBe(true);
    expect(parseLegalProofFlag("pending")).toBe(false);
    expect(parseLegalProofFlag("")).toBe(false);
    expect(parseLegalProofFlag(undefined)).toBe(false);
  });

  it("keeps labels short and sanitized", () => {
    expect(sanitizeLegalLabel(" Philip / Product ")).toBe("Philip / Product");
    expect(sanitizeLegalLabel("bad<script>")).toBeNull();
    expect(sanitizeLegalLabel("x".repeat(101))).toBeNull();
  });

  it("accepts only real YYYY-MM-DD approval dates", () => {
    expect(parseApprovalDate("2026-06-02")).toBe("2026-06-02");
    expect(parseApprovalDate("2026-02-31")).toBeNull();
    expect(parseApprovalDate("06/02/2026")).toBeNull();
    expect(parseApprovalDate(undefined)).toBeNull();
  });

  it("fails closed when legal proof is not provided", () => {
    const result = checkLegalOwnerReadiness({});

    expect(result.legalOwnerReady).toBe(false);
    expect(result.missing).toEqual([
      "terms review confirmed",
      "privacy review confirmed",
      "closed-beta copy approval confirmed",
      "data retention wording confirmed",
      "support communications wording confirmed",
      "product owner label",
      "legal reviewer label",
      "approval date in YYYY-MM-DD format",
      "approval reference label",
    ]);
    expect(result.note).toContain("does not provide legal advice");
  });

  it("passes only when all legal flags and labels are present", () => {
    const result = checkLegalOwnerReadiness({
      LEGAL_OWNER_TERMS_CONFIRMED: "approved",
      LEGAL_OWNER_PRIVACY_CONFIRMED: "approved",
      LEGAL_OWNER_BETA_COPY_CONFIRMED: "approved",
      LEGAL_OWNER_DATA_RETENTION_CONFIRMED: "approved",
      LEGAL_OWNER_SUPPORT_COMMS_CONFIRMED: "approved",
      LEGAL_OWNER_PRODUCT_OWNER: "Philip / Product",
      LEGAL_OWNER_LEGAL_REVIEWER: "Counsel / Reviewer",
      LEGAL_OWNER_APPROVAL_DATE: "2026-06-02",
      LEGAL_OWNER_APPROVAL_REFERENCE: "Closed beta legal approval note",
    });

    expect(result.legalOwnerReady).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.productOwner).toBe("Philip / Product");
    expect(result.legalReviewer).toBe("Counsel / Reviewer");
    expect(result.approvalDate).toBe("2026-06-02");
    expect(result.approvalReference).toBe("Closed beta legal approval note");
  });
});
