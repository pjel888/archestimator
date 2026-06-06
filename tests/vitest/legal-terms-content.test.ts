import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  CURRENT_PRIVACY_NOTICE,
  CURRENT_TERMS,
  TERMS_ACCEPTANCE_SUMMARY,
  TERMS_CANONICAL_TEXT,
  TERMS_CONTENT_SECTIONS,
} from "@/lib/legal/terms-content";

const termsText = [
  CURRENT_TERMS.title,
  CURRENT_TERMS.summary,
  TERMS_ACCEPTANCE_SUMMARY,
  ...TERMS_CONTENT_SECTIONS.flatMap((section) => [section.title, ...section.paragraphs]),
].join("\n");

describe("versioned Terms content", () => {
  it("publishes the current professional beta Terms metadata", () => {
    expect(CURRENT_TERMS.key).toBe("terms-of-service");
    expect(CURRENT_TERMS.version).toMatch(/^tos-2026-06-06-beta-v\d+$/);
    expect(CURRENT_TERMS.effectiveDate).toBe("2026-06-06");
    expect(CURRENT_TERMS.contentHash).toBe(`sha256:${createHash("sha256").update(TERMS_CANONICAL_TEXT).digest("hex")}`);
    expect(CURRENT_TERMS.privacyPolicyVersion).toBe(CURRENT_PRIVACY_NOTICE.version);
    expect(CURRENT_PRIVACY_NOTICE.effectiveDate).toBe("2026-06-06");
  });

  it("states ArchEstimator is only software and never promises zero liability", () => {
    expect(termsText).toMatch(/maximum extent permitted by law/i);
    expect(termsText).not.toMatch(/zero liability/i);
    expect(termsText).toMatch(/software tool/i);
    expect(termsText).toMatch(/not (a|an) licensed professional/i);
    expect(termsText).toMatch(/architect-of-record/i);
    expect(termsText).toMatch(/engineer-of-record/i);
    expect(termsText).toMatch(/estimator-of-record/i);
    expect(termsText).toMatch(/quantity surveyor/i);
    expect(termsText).toMatch(/contractor/i);
    expect(termsText).toMatch(/financial adviser/i);
    expect(termsText).toMatch(/legal adviser/i);
  });

  it("requires independent review of estimates, quantities, pricing, schedules, and project decisions", () => {
    expect(termsText).toMatch(/independently review/i);
    expect(termsText).toMatch(/material quantities/i);
    expect(termsText).toMatch(/supplier pricing/i);
    expect(termsText).toMatch(/labor rates/i);
    expect(termsText).toMatch(/taxes/i);
    expect(termsText).toMatch(/permitting/i);
    expect(termsText).toMatch(/code compliance/i);
    expect(termsText).toMatch(/site conditions/i);
    expect(termsText).toMatch(/project decisions/i);
  });
});
