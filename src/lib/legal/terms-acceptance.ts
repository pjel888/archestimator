import "server-only";

import { CURRENT_TERMS } from "@/lib/legal/terms-content";
import {
  buildLegalTermsAcceptanceInsert,
  type LegalTermsAcceptanceContext,
  type LegalTermsAcceptanceMethod,
} from "@/lib/legal/terms-acceptance-record";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import {
  getCurrentUserTermsAcceptanceStatusFromD1,
  recordCurrentTermsAcceptanceInD1,
} from "@/lib/legal/terms-acceptance-d1-store";
import type { LegalTermsAcceptanceStatus } from "@/lib/legal/terms-acceptance-status";

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

function missingLocalD1AcceptanceBypass(): LegalTermsAcceptanceStatus | null {
  if (process.env.NODE_ENV === "production") return null;

  return {
    requiredTerms: CURRENT_TERMS,
    acceptedCurrentVersion: true,
    requiresAcceptance: false,
    acceptedAt: null,
    latestAcceptedVersion: null,
    bypassReason: "missing_local_d1_binding",
  };
}

export async function getCurrentUserTermsAcceptanceStatus(userId: string): Promise<LegalTermsAcceptanceStatus> {
  const db = await getCloudflareD1Database();
  if (db) return getCurrentUserTermsAcceptanceStatusFromD1(db, userId);

  const localBypass = missingLocalD1AcceptanceBypass();
  if (localBypass) return localBypass;

  throw new Error("Something went wrong. Try again in a moment.");
}

export async function recordCurrentTermsAcceptance({
  userId,
  acceptanceContext = "workshop_terms_gate",
  acceptanceMethod = "authenticated_clickwrap",
}: RecordCurrentTermsAcceptanceInput): Promise<RecordCurrentTermsAcceptanceResult> {
  const db = await getCloudflareD1Database();
  if (!db) {
    return {
      ok: false,
      acceptedAt: null,
      duplicate: false,
      errorMessage: "Terms acceptance persistence is unavailable.",
    };
  }

  const row = buildLegalTermsAcceptanceInsert({
    userId,
    acceptanceContext,
    acceptanceMethod,
  });
  return recordCurrentTermsAcceptanceInD1(db, {
    userId,
    acceptanceContext,
    acceptanceMethod,
    row,
  });
}
