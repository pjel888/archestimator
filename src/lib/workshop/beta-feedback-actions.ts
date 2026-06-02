"use server";

import { redirect } from "next/navigation";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  parseBetaFeedbackSubmission,
} from "@/lib/workshop/beta-feedback";
import type { Json } from "@/lib/supabase/types";

function feedbackRedirect(params: Record<string, string>): never {
  const searchParams = new URLSearchParams(params);
  redirect(`/workshop/feedback?${searchParams.toString()}`);
}

export async function submitBetaFeedback(formData: FormData) {
  const parsed = parseBetaFeedbackSubmission(formData);
  if (!parsed.ok) feedbackRedirect({ error: parsed.code });

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
    user_id: context.userId,
    workspace_id: context.profile.default_workspace_id,
  });

  if (error) {
    feedbackRedirect({ fallback: "1" });
  }

  feedbackRedirect({ saved: "1" });
}
