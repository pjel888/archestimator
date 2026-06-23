"use server";

import { redirect } from "next/navigation";

import { requireAuth, requireCurrentUserContext } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  parseBetaFeedbackSubmission,
} from "@/lib/workshop/beta-feedback";
import type { Json } from "@/lib/supabase/types";

export type BetaFeedbackInlineState = {
  message?: string;
  status: "idle" | "saved" | "error" | "fallback";
};

function feedbackRedirect(params: Record<string, string>): never {
  const searchParams = new URLSearchParams(params);
  redirect(`/workshop/feedback?${searchParams.toString()}`);
}

async function saveBetaFeedback(formData: FormData) {
  const parsed = parseBetaFeedbackSubmission(formData);
  if (!parsed.ok) return { ok: false as const, code: parsed.code };

  const context = await requireCurrentUserContext();
  const supabase = await createSupabaseServerClient();
  const payload = parsed.payload;

  const { error } = await supabase.from("beta_feedback_submissions").insert({
    feedback_type: payload.feedbackType,
    message: payload.message,
    metadata_json: {
      source: "workshop_feedback_form",
    } satisfies Json,
    page_path: payload.pagePath,
    project_id: payload.projectId,
    severity: payload.severity,
    user_email: context.email,
    // react-doctor-disable-next-line react-doctor/supabase-client-owned-authz-field -- Server action stamps authenticated context.userId; clients cannot choose this value.
    user_id: context.userId,
    workspace_id: context.profile.default_workspace_id,
  });

  if (error) {
    return { ok: false as const, code: "fallback" };
  }

  return { ok: true as const };
}

export async function submitBetaFeedback(formData: FormData) {
  await requireAuth();
  const result = await saveBetaFeedback(formData);
  if (!result.ok) {
    if (result.code === "fallback") feedbackRedirect({ fallback: "1" });
    feedbackRedirect({ error: result.code });
  }

  feedbackRedirect({ saved: "1" });
}

export async function submitBetaFeedbackInline(
  _previousState: BetaFeedbackInlineState,
  formData: FormData,
): Promise<BetaFeedbackInlineState> {
  await requireAuth();
  const result = await saveBetaFeedback(formData);
  if (result.ok) {
    return {
      status: "saved",
      message: "Feedback saved. Philip will review beta issues during the monitoring window.",
    };
  }

  if (result.code === "fallback") {
    return {
      status: "fallback",
      message: "Feedback could not be saved in the app. Email support@archestimator.com instead.",
    };
  }

  return {
    status: "error",
    message: betaFeedbackInlineErrorMessage(result.code),
  };
}

function betaFeedbackInlineErrorMessage(code: Exclude<Awaited<ReturnType<typeof saveBetaFeedback>>, { ok: true }>["code"]) {
  if (code === "message_too_short") return "Add at least 10 characters so the feedback is actionable.";
  if (code === "message_too_long") return "Keep feedback under 4,000 characters.";
  if (code === "invalid_project") return "Project context must be a valid UUID or left blank.";
  if (code === "invalid_type" || code === "invalid_severity") return "Choose a valid feedback type and severity.";
  return "Feedback could not be saved. Try again or email support@archestimator.com.";
}
