"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { canReviewBetaFeedback, parseBetaFeedbackStatusUpdate } from "@/lib/workshop/beta-feedback-review";
import { updateBetaFeedbackReviewStatusInD1 } from "@/lib/workshop/beta-feedback-d1-store";

export type BetaFeedbackReviewActionResult =
  | { ok: false; code: "forbidden" | "invalid" | "save"; message: string }
  | { ok: true; code: "updated"; message: string; stale?: true };

export async function updateBetaFeedbackReviewStatus(formData: FormData): Promise<BetaFeedbackReviewActionResult> {
  const parsed = parseBetaFeedbackStatusUpdate(formData);
  if (!parsed.ok) {
    return { ok: false, code: "invalid", message: "Choose a valid feedback status before saving." };
  }

  const context = await requireCurrentUserContext();
  if (!canReviewBetaFeedback(context)) {
    return { ok: false, code: "forbidden", message: "Only platform admins can review feedback." };
  }

  try {
    await updateBetaFeedbackReviewStatusInD1({
      actorUserId: context.userId,
      id: parsed.id,
      status: parsed.status,
    });
  } catch {
    return { ok: false, code: "save", message: "Feedback status could not be saved." };
  }

  try {
    revalidatePath("/admin/feedback");
    return { ok: true, code: "updated", message: "Feedback status updated." };
  } catch {
    return {
      ok: true,
      code: "updated",
      stale: true,
      message: "Feedback status updated. Refresh this page to see the latest data.",
    };
  }
}
