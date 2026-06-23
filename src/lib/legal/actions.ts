"use server";

import { redirect } from "next/navigation";

import { sanitizeNextPath } from "@/lib/auth/redirects";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { CURRENT_TERMS } from "@/lib/legal/terms-content";
import { recordCurrentTermsAcceptance } from "@/lib/legal/terms-acceptance";
import { TERMS_ACCEPTANCE_ROUTE, TERMS_GATE_FALLBACK_NEXT } from "@/lib/legal/terms-gate";

function buildAcceptanceErrorRedirect(errorCode: string, next: string) {
  const params = new URLSearchParams({
    error: errorCode,
    next,
  });
  return `${TERMS_ACCEPTANCE_ROUTE}?${params.toString()}`;
}

export async function acceptCurrentTermsAction(formData: FormData) {
  const next = sanitizeNextPath(formData.get("next"), TERMS_GATE_FALLBACK_NEXT);
  const submittedVersion = String(formData.get("terms_version") ?? "").trim();
  const acceptedResponsibility = formData.get("accepted_responsibility") === "on";

  if (submittedVersion !== CURRENT_TERMS.version || !acceptedResponsibility) {
    redirect(buildAcceptanceErrorRedirect("invalid_acceptance", next));
  }

  const context = await requireCurrentUserContext({ enforceTermsAcceptance: false });
  const result = await recordCurrentTermsAcceptance({
    userId: context.userId,
    acceptanceContext: "workshop_terms_gate",
    acceptanceMethod: "authenticated_clickwrap",
  });

  if (!result.ok) {
    redirect(buildAcceptanceErrorRedirect("save_failed", next));
  }

  // react-doctor-disable-next-line react-doctor/clickjacking-redirect-risk -- `next` is constrained by sanitizeNextPath to an internal terms-gate destination.
  redirect(next);
}
