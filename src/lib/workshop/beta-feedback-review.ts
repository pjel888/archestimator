import "server-only";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";
import { isBetaFeedbackStatus, type BetaFeedbackStatus } from "@/lib/workshop/beta-feedback";

export type BetaFeedbackReviewRow = Pick<
  Tables<"beta_feedback_submissions">,
  | "created_at"
  | "feedback_type"
  | "id"
  | "message"
  | "page_path"
  | "project_id"
  | "severity"
  | "status"
  | "updated_at"
  | "user_email"
  | "workspace_id"
>;

export type BetaFeedbackReviewQueue = {
  authorized: boolean;
  error: string | null;
  submissions: BetaFeedbackReviewRow[];
};

export function canReviewBetaFeedback(role: string | null | undefined) {
  return role === "ceo" || role === "admin";
}

export async function readBetaFeedbackReviewQueue(status?: string): Promise<BetaFeedbackReviewQueue> {
  const context = await requireCurrentUserContext();
  if (!canReviewBetaFeedback(context.role)) {
    return { authorized: false, error: null, submissions: [] };
  }

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("beta_feedback_submissions")
    .select("id, created_at, updated_at, feedback_type, severity, status, user_email, workspace_id, project_id, page_path, message")
    .order("created_at", { ascending: false })
    .limit(50);

  if (status && isBetaFeedbackStatus(status)) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  return {
    authorized: true,
    error: error ? "Beta feedback could not be loaded." : null,
    submissions: (data ?? []) as BetaFeedbackReviewRow[],
  };
}

export function parseBetaFeedbackStatusUpdate(formData: FormData): { ok: true; id: string; status: BetaFeedbackStatus } | { ok: false } {
  const id = formData.get("id");
  const status = formData.get("status");
  if (typeof id !== "string" || !id.trim()) return { ok: false };
  if (typeof status !== "string" || !isBetaFeedbackStatus(status)) return { ok: false };
  return { ok: true, id: id.trim(), status };
}
