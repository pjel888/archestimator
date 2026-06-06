import "server-only";

import { CURRENT_TERMS } from "@/lib/legal/terms-content";
import {
  buildLegalTermsAcceptanceInsert,
  type LegalTermsAcceptanceContext,
  type LegalTermsAcceptanceMethod,
} from "@/lib/legal/terms-acceptance-record";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import type { Tables } from "@/lib/supabase/types";

type LegalTermsAcceptanceStatus = {
  requiredTerms: typeof CURRENT_TERMS;
  acceptedCurrentVersion: boolean;
  requiresAcceptance: boolean;
  acceptedAt: string | null;
  latestAcceptedVersion: string | null;
  bypassReason?: "missing_local_supabase_env";
};

type RecordCurrentTermsAcceptanceInput = {
  userId: string;
  acceptanceContext?: LegalTermsAcceptanceContext;
  acceptanceMethod?: LegalTermsAcceptanceMethod;
};

type RecordCurrentTermsAcceptanceResult = {
  ok: boolean;
  acceptedAt: string | null;
  duplicate: boolean;
  errorMessage?: string;
};

function hasSupabaseServerEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());
}

function hasSupabaseServiceRoleEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

function missingLocalEnvAcceptanceBypass(): LegalTermsAcceptanceStatus | null {
  if (hasSupabaseServerEnv()) return null;
  if (process.env.NODE_ENV === "production") return null;

  return {
    requiredTerms: CURRENT_TERMS,
    acceptedCurrentVersion: true,
    requiresAcceptance: false,
    acceptedAt: null,
    latestAcceptedVersion: null,
    bypassReason: "missing_local_supabase_env",
  };
}

export async function getCurrentUserTermsAcceptanceStatus(userId: string): Promise<LegalTermsAcceptanceStatus> {
  const localBypass = missingLocalEnvAcceptanceBypass();
  if (localBypass) return localBypass;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("legal_terms_acceptances")
    .select("accepted_at, terms_version")
    .eq("user_id", userId)
    .eq("terms_key", CURRENT_TERMS.key)
    .eq("terms_version", CURRENT_TERMS.version)
    .order("accepted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to verify Terms acceptance status: ${error.message}`);
  }

  return {
    requiredTerms: CURRENT_TERMS,
    acceptedCurrentVersion: Boolean(data),
    requiresAcceptance: !data,
    acceptedAt: data?.accepted_at ?? null,
    latestAcceptedVersion: data?.terms_version ?? null,
  };
}

async function readCurrentAcceptanceWithServiceRole(userId: string): Promise<Tables<"legal_terms_acceptances"> | null> {
  const serviceClient = createSupabaseServiceRoleClient("archestimator-legal-terms-acceptance-read");
  const { data, error } = await serviceClient
    .from("legal_terms_acceptances")
    .select("*")
    .eq("user_id", userId)
    .eq("terms_key", CURRENT_TERMS.key)
    .eq("terms_version", CURRENT_TERMS.version)
    .order("accepted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ?? null;
}

export async function recordCurrentTermsAcceptance({
  userId,
  acceptanceContext = "workshop_terms_gate",
  acceptanceMethod = "authenticated_clickwrap",
}: RecordCurrentTermsAcceptanceInput): Promise<RecordCurrentTermsAcceptanceResult> {
  if (!hasSupabaseServiceRoleEnv()) {
    return {
      ok: false,
      acceptedAt: null,
      duplicate: false,
      errorMessage: "Terms acceptance persistence is unavailable.",
    };
  }

  const serviceClient = createSupabaseServiceRoleClient("archestimator-legal-terms-acceptance");
  const row = buildLegalTermsAcceptanceInsert({
    userId,
    acceptanceContext,
    acceptanceMethod,
  });

  const { data, error } = await serviceClient
    .from("legal_terms_acceptances")
    .insert(row)
    .select("*")
    .single();

  if (!error) {
    return {
      ok: true,
      acceptedAt: data.accepted_at,
      duplicate: false,
    };
  }

  if (error.code === "23505") {
    const existing = await readCurrentAcceptanceWithServiceRole(userId);
    return {
      ok: Boolean(existing),
      acceptedAt: existing?.accepted_at ?? null,
      duplicate: Boolean(existing),
      errorMessage: existing ? undefined : "Terms acceptance already existed but could not be re-read.",
    };
  }

  return {
    ok: false,
    acceptedAt: null,
    duplicate: false,
    errorMessage: error.message,
  };
}
