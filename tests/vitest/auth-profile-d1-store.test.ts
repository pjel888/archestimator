import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { getProfileByEmailFromD1 } from "@/lib/auth/profile-d1-store";

type StoredProfile = {
  avatar_url: string | null;
  created_at: string;
  default_workspace_id: string | null;
  display_name: string | null;
  email: string;
  id: string;
  role: string;
  updated_at: string;
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
    if (!normalizedSql.includes("from profiles")) return null;
    const [email] = this.values;
    return (this.database.rows.get(String(email)) ?? null) as R | null;
  }

  async all<R = T>() {
    return { results: [] as R[] };
  }

  async run() {
    return { success: true, meta: { changes: 0 } };
  }
}

class FakeD1Database {
  rows = new Map<string, StoredProfile>();

  prepare<T = Record<string, unknown>>(sql: string) {
    return new FakeD1Statement<T>(this, sql);
  }
}

describe("Cloudflare D1 auth profile store", () => {
  it("normalizes email lookup and returns a current-user compatible profile", async () => {
    const database = new FakeD1Database();
    database.rows.set("owner@example.com", {
      avatar_url: null,
      created_at: "2026-06-30T00:00:00.000Z",
      default_workspace_id: "workspace-1",
      display_name: "Owner",
      email: "owner@example.com",
      id: "11111111-1111-4111-8111-111111111111",
      role: "ceo",
      updated_at: "2026-06-30T00:00:00.000Z",
    });

    await expect(getProfileByEmailFromD1(database, " Owner@Example.COM ")).resolves.toMatchObject({
      default_workspace_id: "workspace-1",
      display_name: "Owner",
      email: "owner@example.com",
      id: "11111111-1111-4111-8111-111111111111",
      role: "ceo",
    });
  });

  it("keeps the Better Auth session profile lookup off Supabase", () => {
    const sessionSource = readFileSync("src/lib/auth/session.ts", "utf8");
    const storeSource = readFileSync("src/lib/auth/profile-d1-store.ts", "utf8");

    expect(sessionSource).toContain("getProfileByEmailFromCloudflareD1");
    expect(sessionSource).not.toMatch(/createSupabase|@\/lib\/supabase\/server|@\/lib\/supabase\/types/);
    expect(storeSource).toContain("getCloudflareD1Database");
    expect(storeSource).not.toMatch(/createSupabase|@\/lib\/supabase/);
  });
});
