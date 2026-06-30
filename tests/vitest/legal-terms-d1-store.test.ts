import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { buildLegalTermsAcceptanceInsert } from "@/lib/legal/terms-acceptance-record";
import {
  getCurrentUserTermsAcceptanceStatusFromD1,
  recordCurrentTermsAcceptanceInD1,
} from "@/lib/legal/terms-acceptance-d1-store";

type StoredTermsAcceptance = {
  accepted_at: string;
  terms_version: string;
};

class FakeD1Statement<T = Record<string, unknown>> {
  private values: unknown[] = [];

  constructor(
    private readonly database: FakeD1Database,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }

  async first<R = T>() {
    const normalizedSql = this.sql.toLowerCase();
    if (!normalizedSql.includes("from legal_terms_acceptances")) return null;
    const [userId, termsKey, termsVersion] = this.values;
    const row = this.database.rows.get(`${userId}:${termsKey}:${termsVersion}`);
    return (row ?? null) as R | null;
  }

  async all<R = T>() {
    return { results: [] as R[] };
  }

  async run() {
    const normalizedSql = this.sql.toLowerCase();
    if (!normalizedSql.includes("insert into legal_terms_acceptances")) {
      return { success: true, meta: { changes: 0 } };
    }

    const [
      ,
      userId,
      termsKey,
      termsVersion,
      ,
      ,
      ,
      ,
      ,
      ,
      acceptedAt,
    ] = this.values;
    const key = `${userId}:${termsKey}:${termsVersion}`;
    if (this.database.rows.has(key)) {
      return { success: true, meta: { changes: 0 } };
    }
    this.database.rows.set(key, {
      accepted_at: String(acceptedAt),
      terms_version: String(termsVersion),
    });
    return { success: true, meta: { changes: 1 } };
  }
}

class FakeD1Database {
  rows = new Map<string, StoredTermsAcceptance>();

  prepare<T = Record<string, unknown>>(sql: string) {
    return new FakeD1Statement<T>(this, sql);
  }
}

describe("Cloudflare D1 legal Terms acceptance store", () => {
  it("persists and rereads the current Terms acceptance idempotently", async () => {
    const database = new FakeD1Database();
    const input = {
      userId: "11111111-1111-4111-8111-111111111111",
      acceptanceContext: "workshop_terms_gate" as const,
      acceptanceMethod: "authenticated_clickwrap" as const,
      row: buildLegalTermsAcceptanceInsert({
        userId: "11111111-1111-4111-8111-111111111111",
        acceptanceContext: "workshop_terms_gate",
        acceptanceMethod: "authenticated_clickwrap",
      }),
    };

    const first = await recordCurrentTermsAcceptanceInD1(database, input);
    const duplicate = await recordCurrentTermsAcceptanceInD1(database, input);
    const status = await getCurrentUserTermsAcceptanceStatusFromD1(database, input.userId);

    expect(first).toMatchObject({ ok: true, duplicate: false });
    expect(duplicate).toMatchObject({ ok: true, duplicate: true });
    expect(status).toMatchObject({
      acceptedCurrentVersion: true,
      requiresAcceptance: false,
    });
    expect(database.rows).toHaveLength(1);
  });

  it("keeps Terms gate secrets on app/Cloudflare-owned secrets, not Supabase service role", () => {
    const cookieSource = readFileSync("src/lib/legal/terms-gate-cookie.ts", "utf8");
    const acceptanceSource = readFileSync("src/lib/legal/terms-acceptance.ts", "utf8");
    const recordSource = readFileSync("src/lib/legal/terms-acceptance-record.ts", "utf8");

    expect(cookieSource).toContain("BETTER_AUTH_SECRET");
    expect(cookieSource).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(acceptanceSource).not.toMatch(/createSupabase|SUPABASE_SERVICE_ROLE_KEY|@\/lib\/supabase/);
    expect(recordSource).not.toContain("@/lib/supabase/types");
  });
});
