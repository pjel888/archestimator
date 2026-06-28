import { CURRENT_TERMS } from "@/lib/legal/terms-content";

export type LegalTermsAcceptanceStatus = {
  requiredTerms: typeof CURRENT_TERMS;
  acceptedCurrentVersion: boolean;
  requiresAcceptance: boolean;
  acceptedAt: string | null;
  latestAcceptedVersion: string | null;
  bypassReason?: "missing_local_supabase_env";
};

type LegalTermsAcceptanceRow = {
  accepted_at: string | null;
  terms_version: string | null;
};

type LegalTermsAcceptanceFilterQuery = {
  eq(column: string, value: string): LegalTermsAcceptanceFilterQuery;
  order(column: string, options: { ascending: boolean }): LegalTermsAcceptanceFilterQuery;
  limit(count: number): LegalTermsAcceptanceFilterQuery;
  maybeSingle(): PromiseLike<{
    data: LegalTermsAcceptanceRow | null;
    error: { message?: string } | null;
  }>;
};

type LegalTermsAcceptanceQuery = {
  select(columns: string): LegalTermsAcceptanceFilterQuery;
};

export type LegalTermsAcceptanceClient = {
  from(table: "legal_terms_acceptances"): LegalTermsAcceptanceQuery;
};

export function toLegalTermsAcceptanceClient(client: unknown): LegalTermsAcceptanceClient {
  const source = client as { from(table: string): unknown };
  return {
    from(table) {
      return source.from(table) as ReturnType<LegalTermsAcceptanceClient["from"]>;
    },
  };
}

export async function readCurrentUserTermsAcceptanceStatusFromClient(
  supabase: LegalTermsAcceptanceClient,
  userId: string,
): Promise<LegalTermsAcceptanceStatus> {
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
