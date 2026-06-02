"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canReviewBetaFeedback, parseBetaFeedbackStatusUpdate } from "@/lib/workshop/beta-feedback-review";

export async function updateBetaFeedbackReviewStatus(formData: FormData) {
  const parsed = parseBetaFeedbackStatusUpdate(formData);
  if (!parsed.ok) redirect("/workshop/settings/feedback?error=invalid");

  const context = await requireCurrentUserContext();
  if (!canReviewBetaFeedback(context.role)) redirect("/workshop/settings/feedback?error=forbidden");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("beta_feedback_submissions")
    .update({ status: parsed.status })
    .eq("id", parsed.id);

  if (error) redirect("/workshop/settings/feedback?error=save");

  revalidatePath("/workshop/settings/feedback");
  redirect("/workshop/settings/feedback?saved=1");
}
