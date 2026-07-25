import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  BETA_FEEDBACK_STATUSES,
  buildBetaFeedbackMailto,
  isBetaFeedbackStatus,
  parseBetaFeedbackSubmission,
} from "@/lib/workshop/beta-feedback";

const migration = readFileSync("migrations/0001_closed_beta_feedback.sql", "utf8");
const supportMigration = readFileSync("migrations/0100_user_support_system.sql", "utf8");
const pageSource = readFileSync("src/app/workshop/feedback/page.tsx", "utf8");
const reviewPageSource = readFileSync("src/app/admin/feedback/page.tsx", "utf8");
const reviewSource = readFileSync("src/lib/workshop/beta-feedback-review.ts", "utf8");
const reviewActionSource = readFileSync("src/lib/workshop/beta-feedback-review-actions.ts", "utf8");
const legacyImportSource = readFileSync("src/lib/support/legacy-import-service.ts", "utf8");

function feedbackFormData(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  formData.set("feedbackType", overrides.feedbackType ?? "export_issue");
  formData.set("severity", overrides.severity ?? "high");
  formData.set("message", overrides.message ?? "Workbook formulas need clearer section totals.");
  formData.set("pagePath", overrides.pagePath ?? "/workshop/projects/project-1");
  formData.set("projectId", overrides.projectId ?? "11111111-1111-4111-8111-111111111111");
  return formData;
}

describe("closed beta feedback", () => {
  it("validates feedback submissions before persistence", () => {
    expect(parseBetaFeedbackSubmission(feedbackFormData())).toMatchObject({
      ok: true,
      payload: {
        feedbackType: "export_issue",
        severity: "high",
      },
    });

    expect(parseBetaFeedbackSubmission(feedbackFormData({ message: "short" }))).toEqual({
      ok: false,
      code: "message_too_short",
    });
    expect(parseBetaFeedbackSubmission(feedbackFormData({ feedbackType: "sales" }))).toEqual({
      ok: false,
      code: "invalid_type",
    });
    expect(parseBetaFeedbackSubmission(feedbackFormData({ projectId: "project-1" }))).toEqual({
      ok: false,
      code: "invalid_project",
    });
  });

  it("validates review statuses for admin triage", () => {
    expect(BETA_FEEDBACK_STATUSES).toEqual(["new", "reviewing", "resolved", "archived"]);
    expect(isBetaFeedbackStatus("reviewing")).toBe(true);
    expect(isBetaFeedbackStatus("deleted")).toBe(false);
  });

  it("builds an email fallback with context when persistence is unavailable", () => {
    const mailto = buildBetaFeedbackMailto({
      email: "reviewer@example.com",
      feedbackType: "bug",
      message: "The project export button did not respond.",
      pagePath: "/workshop/projects/project-1",
      severity: "blocker",
    });

    expect(mailto).toContain("mailto:support@archestimator.com?");
    expect(decodeURIComponent(mailto)).toContain("From: reviewer@example.com");
    expect(decodeURIComponent(mailto)).toContain("Type: bug");
    expect(decodeURIComponent(mailto)).toContain("Severity: blocker");
    expect(decodeURIComponent(mailto)).toContain("Page: /workshop/projects/project-1");
  });

  it("keeps legacy beta feedback durable in the active D1 migration chain", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS beta_feedback_submissions");
    expect(migration).toContain("feedback_type TEXT NOT NULL CHECK");
    expect(migration).toContain("severity TEXT NOT NULL CHECK");
    expect(migration).toContain("message TEXT NOT NULL CHECK (length(trim(message)) BETWEEN 10 AND 4000)");
    expect(migration).toContain("status TEXT NOT NULL DEFAULT 'new'");
    expect(migration).toContain("CREATE INDEX IF NOT EXISTS idx_beta_feedback_user_created_at");
  });

  it("maps legacy feedback into the current private support system without deleting source records", () => {
    expect(supportMigration).toContain("Legacy beta feedback remains read-only source data.");
    expect(supportMigration).toContain("CREATE TABLE IF NOT EXISTS support_legacy_feedback_imports");
    expect(supportMigration).toContain("feedback_id TEXT PRIMARY KEY REFERENCES beta_feedback_submissions(id) ON DELETE RESTRICT");
    expect(legacyImportSource).toContain("support_legacy_feedback_imports");
    expect(legacyImportSource).toContain("FROM beta_feedback_submissions feedback");
    expect(legacyImportSource).toContain('source: "beta_feedback_submission"');
  });

  it("opens feedback review only to platform admins", () => {
    expect(reviewSource).toContain("isPlatformAdmin({ role: context.role");
    expect(reviewSource).toContain("isPlatformAdminRole(context)");
    expect(reviewSource).toContain("readBetaFeedbackReviewQueueFromD1");
    expect(reviewActionSource).toContain("parseBetaFeedbackStatusUpdate");
    expect(reviewActionSource).toContain("updateBetaFeedbackReviewStatusInD1");
    expect(reviewPageSource).toContain("Only platform admins can review feedback.");
    expect(reviewPageSource).toContain("Showing {submissions.length} latest feedback submissions.");
  });

  it("routes the protected feedback page through the current Support Center", () => {
    expect(pageSource).toContain("SupportChatWidget");
    expect(pageSource).toContain('title="Support Center"');
    expect(pageSource).toContain("onboardingSupportContextFromSearchParams");
    expect(pageSource).not.toContain("BetaFeedbackForm");
  });
});
