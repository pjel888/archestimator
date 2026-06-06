import { CURRENT_TERMS } from "@/lib/legal/terms-content";
import type { TablesInsert } from "@/lib/supabase/types";

export type LegalTermsAcceptanceMethod = "authenticated_clickwrap";
export type LegalTermsAcceptanceContext = "workshop_terms_gate" | "settings_reacceptance" | "admin_support_record";

type BuildLegalTermsAcceptanceInsertInput = {
  userId: string;
  acceptanceMethod: LegalTermsAcceptanceMethod;
  acceptanceContext: LegalTermsAcceptanceContext;
  metadata?: Record<string, string | number | boolean | null>;
};

export function buildLegalTermsAcceptanceInsert({
  userId,
  acceptanceMethod,
  acceptanceContext,
  metadata,
}: BuildLegalTermsAcceptanceInsertInput): TablesInsert<"legal_terms_acceptances"> {
  return {
    user_id: userId,
    terms_key: CURRENT_TERMS.key,
    terms_version: CURRENT_TERMS.version,
    terms_effective_date: CURRENT_TERMS.effectiveDate,
    terms_content_hash: CURRENT_TERMS.contentHash,
    privacy_policy_version: CURRENT_TERMS.privacyPolicyVersion,
    acceptance_method: acceptanceMethod,
    acceptance_context: acceptanceContext,
    metadata_json: {
      source: "archestimator_web_app",
      ...(metadata ?? {}),
    },
  };
}
