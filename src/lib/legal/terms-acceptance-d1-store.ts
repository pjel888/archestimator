import "server-only";

import { getCloudflareD1Database, type D1DatabaseLike } from "@/lib/cloudflare/d1";
import { CURRENT_TERMS } from "@/lib/legal/terms-content";
import type {
  LegalTermsAcceptanceInsert,
  LegalTermsAcceptanceMethod,
  LegalTermsAcceptanceContext,
} from "@/lib/legal/terms-acceptance-record";
import type { LegalTermsAcceptanceStatus } from "@/lib/legal/terms-acceptance-status";

type LegalTermsAcceptanceD1Row = {
  accepted_at: string | null;
  terms_version: string | null;
};

export type RecordCurrentTermsAcceptanceD1Input = {
  userId: string;
  acceptanceContext: LegalTermsAcceptanceContext;
  acceptanceMethod: LegalTermsAcceptanceMethod;
  row: LegalTermsAcceptanceInsert;
};

function toStatus(row: LegalTermsAcceptanceD1Row | null): LegalTermsAcceptanceStatus {
  return {
    requiredTerms: CURRENT_TERMS,
    acceptedCurrentVersion: Boolean(row),
    requiresAcceptance: !row,
    acceptedAt: row?.accepted_at ?? null,
    latestAcceptedVersion: row?.terms_version ?? null,
  };
}

function metadataJson(row: LegalTermsAcceptanceInsert) {
  return JSON.stringify(row.metadata_json ?? { source: "archestimator_web_app" });
}

async function readCurrentAcceptanceFromD1(db: D1DatabaseLike, userId: string) {
  return db
    .prepare<LegalTermsAcceptanceD1Row>(
      `
        SELECT accepted_at, terms_version
        FROM legal_terms_acceptances
        WHERE user_id = ?
          AND terms_key = ?
          AND terms_version = ?
        ORDER BY accepted_at DESC
        LIMIT 1
      `,
    )
    .bind(userId, CURRENT_TERMS.key, CURRENT_TERMS.version)
    .first<LegalTermsAcceptanceD1Row>();
}

export async function getCurrentUserTermsAcceptanceStatusFromD1(
  db: D1DatabaseLike,
  userId: string,
): Promise<LegalTermsAcceptanceStatus> {
  const row = await readCurrentAcceptanceFromD1(db, userId);
  return toStatus(row);
}

export async function getCurrentUserTermsAcceptanceStatusFromCloudflareD1(
  userId: string,
): Promise<LegalTermsAcceptanceStatus | null> {
  const db = await getCloudflareD1Database();
  return db ? getCurrentUserTermsAcceptanceStatusFromD1(db, userId) : null;
}

export async function recordCurrentTermsAcceptanceInD1(
  db: D1DatabaseLike,
  input: RecordCurrentTermsAcceptanceD1Input,
) {
  const now = new Date().toISOString();
  const row = input.row;
  const insert = await db
    .prepare(
      `
        INSERT INTO legal_terms_acceptances (
          id,
          user_id,
          terms_key,
          terms_version,
          terms_effective_date,
          terms_content_hash,
          privacy_policy_version,
          acceptance_method,
          acceptance_context,
          metadata_json,
          accepted_at,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, terms_key, terms_version) DO NOTHING
      `,
    )
    .bind(
      crypto.randomUUID(),
      input.userId,
      row.terms_key,
      row.terms_version,
      row.terms_effective_date,
      row.terms_content_hash,
      row.privacy_policy_version,
      input.acceptanceMethod,
      input.acceptanceContext,
      metadataJson(row),
      now,
      now,
    )
    .run();

  const existing = await readCurrentAcceptanceFromD1(db, input.userId);
  const duplicate = (insert.meta?.changes ?? 0) === 0;
  return {
    ok: Boolean(existing),
    acceptedAt: existing?.accepted_at ?? null,
    duplicate,
    errorMessage: existing ? undefined : "Terms acceptance could not be re-read after persistence.",
  };
}

export async function recordCurrentTermsAcceptanceInCloudflareD1(input: RecordCurrentTermsAcceptanceD1Input) {
  const db = await getCloudflareD1Database();
  if (!db) return null;
  return recordCurrentTermsAcceptanceInD1(db, input);
}
