import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  BETA_FEEDBACK_STATUSES,
  buildBetaFeedbackMailto,
  isBetaFeedbackStatus,
  parseBetaFeedbackSubmission,
} from "@/lib/workshop/beta-feedback";

const migration = readFileSync("supabase/migrations/20260602083000_beta_feedback_submissions.sql", "utf8");
const reviewMigration = readFileSync("supabase/migrations/20260602084500_beta_feedback_review_queue.sql", "utf8");
const actionSource = readFileSync("src/lib/workshop/beta-feedback-actions.ts", "utf8");
const pageSource = readFileSync("src/app/workshop/feedback/page.tsx", "utf8");
const reviewPageSource = readFileSync("src/app/workshop/settings/feedback/page.tsx", "utf8");
const reviewSource = readFileSync("src/lib/workshop/beta-feedback-review.ts", "utf8");
const reviewActionSource = readFileSync("src/lib/workshop/beta-feedback-review-actions.ts", "utf8");

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

  it("adds an authenticated insert-only beta feedback table", () => {
    expect(migration).toContain("create table if not exists public.beta_feedback_submissions");
    expect(migration).toContain("feedback_type text not null check");
    expect(migration).toContain("severity text not null check");
    expect(migration).toContain("alter table public.beta_feedback_submissions enable row level security");
    expect(migration).toContain("grant insert on public.beta_feedback_submissions to authenticated");
    expect(migration).toContain("with check (auth.uid() = user_id)");
    expect(migration).not.toContain("grant select on public.beta_feedback_submissions to authenticated");
  });

  it("opens feedback review only to platform admins", () => {
    expect(reviewMigration).toContain("grant select on table public.beta_feedback_submissions to authenticated");
    expect(reviewMigration).toContain("grant update (status) on table public.beta_feedback_submissions to authenticated");
    expect(reviewMigration).toContain('create policy "platform admins can review beta feedback"');
    expect(reviewMigration).toContain("for select");
    expect(reviewMigration).toContain("using (public.is_platform_admin())");
    expect(reviewMigration).toContain('create policy "platform admins can update beta feedback status"');
    expect(reviewMigration).toContain("for update");
    expect(reviewSource).toContain('role === "ceo" || role === "admin"');
    expect(reviewSource).toContain('from("beta_feedback_submissions")');
    expect(reviewActionSource).toContain("parseBetaFeedbackStatusUpdate");
    expect(reviewActionSource).toContain('update({ status: parsed.status })');
    expect(reviewPageSource).toContain("Only platform admins can review beta feedback.");
    expect(reviewPageSource).toContain("Showing {queue.submissions.length} latest beta feedback submissions.");
  });

  it("keeps the protected feedback page tied to persistence and fallback", () => {
    expect(actionSource).toContain("requireCurrentUserContext");
    expect(actionSource).toContain('from("beta_feedback_submissions").insert');
    expect(actionSource).toContain('feedbackRedirect({ fallback: "1" })');
    expect(pageSource).toContain("BetaFeedbackForm");
    expect(pageSource).toContain("Feedback could not be saved in the app.");
    expect(pageSource).toContain("Open an email draft instead");
  });
});
