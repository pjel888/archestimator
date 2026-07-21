import "server-only";

import { isPlatformAdmin, isPlatformAdminRole } from "@/lib/auth/roles";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { isBetaFeedbackStatus, type BetaFeedbackStatus } from "@/lib/workshop/beta-feedback";
import { readBetaFeedbackReviewQueueFromD1 } from "@/lib/workshop/beta-feedback-d1-store";

export type BetaFeedbackReviewRow = {
  created_at: string;
  feedback_type: string;
  id: string;
  message: string;
  page_path: string | null;
  project_id: string | null;
  severity: string;
  status: string;
  updated_at: string;
  user_email: string;
  workspace_id: string | null;
};

export type BetaFeedbackReviewQueue = {
  authorized: boolean;
  error: string | null;
  submissions: BetaFeedbackReviewRow[];
};

/**
 * Accepts a role string (legacy callers/tests) or a full platform-admin context
 * so email allowlist admins match `/admin` authority.
 */
export function canReviewBetaFeedback(
  context: string | null | undefined | { role: unknown; email?: string | null },
) {
  if (context && typeof context === "object") {
    return isPlatformAdmin({ role: context.role, email: context.email ?? null });
  }
  return isPlatformAdminRole(context);
}

export async function readBetaFeedbackReviewQueue(status?: string): Promise<BetaFeedbackReviewQueue> {
  const context = await requireCurrentUserContext();
  if (!canReviewBetaFeedback(context)) {
    return { authorized: false, error: null, submissions: [] };
  }

  const requestedStatus = status && isBetaFeedbackStatus(status) ? status : null;
  try {
    const submissions = await readBetaFeedbackReviewQueueFromD1(requestedStatus);
    return { authorized: true, error: null, submissions };
  } catch {
    return { authorized: true, error: "Beta feedback could not be loaded.", submissions: [] };
  }
}

export function parseBetaFeedbackStatusUpdate(formData: FormData): { ok: true; id: string; status: BetaFeedbackStatus } | { ok: false } {
  const id = formData.get("id");
  const status = formData.get("status");
  if (typeof id !== "string" || !id.trim()) return { ok: false };
  if (typeof status !== "string" || !isBetaFeedbackStatus(status)) return { ok: false };
  return { ok: true, id: id.trim(), status };
}
