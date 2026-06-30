import { CURRENT_TERMS } from "@/lib/legal/terms-content";

export type LegalTermsAcceptanceMethod = "authenticated_clickwrap";
export type LegalTermsAcceptanceContext = "workshop_terms_gate" | "settings_reacceptance" | "admin_support_record";
export type LegalTermsAcceptanceInsert = {
  user_id: string;
  terms_key: string;
  terms_version: string;
  terms_effective_date: string;
  terms_content_hash: string;
  privacy_policy_version: string;
  acceptance_method: LegalTermsAcceptanceMethod;
  acceptance_context: LegalTermsAcceptanceContext;
  metadata_json: Record<string, string | number | boolean | null>;
};

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
}: BuildLegalTermsAcceptanceInsertInput): LegalTermsAcceptanceInsert {
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
