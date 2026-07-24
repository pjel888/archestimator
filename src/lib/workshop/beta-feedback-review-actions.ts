"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { canReviewBetaFeedback, parseBetaFeedbackStatusUpdate } from "@/lib/workshop/beta-feedback-review";
import { updateBetaFeedbackReviewStatusInD1 } from "@/lib/workshop/beta-feedback-d1-store";

export async function updateBetaFeedbackReviewStatus(formData: FormData) {
  const parsed = parseBetaFeedbackStatusUpdate(formData);
  if (!parsed.ok) redirect("/admin/feedback?error=invalid");

  const context = await requireCurrentUserContext();
  if (!canReviewBetaFeedback(context)) redirect("/admin/feedback?error=forbidden");

  try {
    await updateBetaFeedbackReviewStatusInD1({
      actorUserId: context.userId,
      id: parsed.id,
      status: parsed.status,
    });
  } catch {
    redirect("/admin/feedback?error=save");
  }

  revalidatePath("/admin/feedback");
  redirect("/admin/feedback?saved=1");
}
