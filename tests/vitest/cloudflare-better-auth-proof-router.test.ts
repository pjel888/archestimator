import { describe, expect, it } from "vitest";

import { routeCloudflareBetterAuthProofRequest } from "../../src/lib/cloudflare/better-auth-proof-router";

class FakeD1Statement<T = Record<string, unknown>> {
  private values: Array<string | number | null> = [];

  constructor(
    private readonly database: FakeD1Database,
    private readonly sql: string,
  ) {}

  bind(...values: Array<string | number | null>) {
    this.values = values;
    return this;
  }

  async run() {
    this.database.run(this.sql, this.values);
    return { success: true };
  }

  async all() {
    return { success: true, results: this.database.all(this.sql, this.values) as T[] };
  }
}

class FakeD1Database {
  indexes = new Set<string>();
  session: { id: string; token: string; userId: string } | null = null;
  tables = new Set<string>();
  user: { id: string; email: string } | null = null;

  prepare<T = Record<string, unknown>>(sql: string) {
    return new FakeD1Statement<T>(this, sql);
  }

  run(sql: string, values: Array<string | number | null>) {
    const tableMatch = sql.match(/^CREATE TABLE IF NOT EXISTS "([^"]+)"/);
    if (tableMatch) this.tables.add(tableMatch[1]);
    const indexMatch = sql.match(/^CREATE INDEX IF NOT EXISTS "([^"]+)"/);
    if (indexMatch) this.indexes.add(indexMatch[1]);
    if (sql.startsWith('INSERT INTO "user"')) this.user = { id: String(values[0]), email: String(values[2]) };
    if (sql.startsWith('INSERT INTO "session"')) {
      this.session = { id: String(values[0]), token: String(values[2]), userId: String(values[7]) };
    }
    if (sql.startsWith('DELETE FROM "session"')) this.session = null;
    if (sql.startsWith('DELETE FROM "user"')) this.user = null;
  }

  all(sql: string, values: Array<string | number | null>) {
    if (sql.includes("sqlite_master")) {
      const source = values[0] === "table" ? this.tables : this.indexes;
      return values.slice(1).filter((name): name is string => typeof name === "string" && source.has(name)).map((name) => ({ name }));
    }
    if (sql.includes("rows_remaining")) {
      return [{ rows_remaining: (this.user ? 1 : 0) + (this.session ? 1 : 0) }];
    }
    if (sql.includes('FROM "session" s')) {
      if (!this.session || !this.user || this.session.token !== values[0]) return [];
      return [{ session_id: this.session.id, user_id: this.user.id, email: this.user.email }];
    }
    return [];
  }
}

function createEnv() {
  return {
    ARCH_DB: new FakeD1Database(),
    BETTER_AUTH_GOOGLE_CLIENT_ID: "google-client-id",
    BETTER_AUTH_GOOGLE_CLIENT_SECRET: "google-client-secret",
    BETTER_AUTH_SECRET: "x".repeat(64),
    BETTER_AUTH_TRUSTED_ORIGINS: "https://archestimator-proof.example.workers.dev",
    BETTER_AUTH_URL: "https://archestimator-proof.example.workers.dev",
    CRON_SECRET: "secret",
    __betterAuthProofAuthFactory: async ({
      baseUrl,
      captureMagicLink,
    }: {
      baseUrl: string;
      captureMagicLink: (link: { email: string; token: string; url: string }) => void;
    }) => {
      let tokenConsumed = false;
      return {
        handler: async (request: Request) => {
          const url = new URL(request.url);
          if (url.pathname === "/api/auth/sign-in/magic-link") {
            const body = await request.json() as { email: string };
            tokenConsumed = false;
            captureMagicLink({
              email: body.email,
              token: "proof-magic-link-token",
              url: `${baseUrl}/api/auth/magic-link/verify?token=proof-magic-link-token&callbackURL=%2F`,
            });
            return Response.json({ status: true });
          }
          if (url.pathname === "/api/auth/magic-link/verify") {
            if (url.searchParams.get("token") !== "proof-magic-link-token") return Response.json({ error: "invalid" }, { status: 400 });
            if (tokenConsumed) return Response.json({ error: "invalid" }, { status: 400 });
            tokenConsumed = true;
            return Response.json(
              {
                token: "proof-session-token",
                user: { id: "proof_magic_user", email: "proof@example.invalid" },
                session: { id: "proof_magic_session", token: "proof-session-token" },
              },
              {
                headers: {
                  "set-cookie": "better-auth.session_token=signed-proof-session; Path=/; HttpOnly; SameSite=Lax",
                },
              },
            );
          }
          return Response.json({ error: "not found" }, { status: 404 });
        },
        api: {
          getSession: async () => ({
            user: { id: "proof_magic_user" },
            session: { token: "proof-session-token" },
          }),
        },
      };
    },
  };
}

describe("Cloudflare Better Auth provider proof router", () => {
  it("ignores unrelated paths", async () => {
    await expect(routeCloudflareBetterAuthProofRequest(new Request("https://example.com/api/health"), createEnv())).resolves.toBeNull();
  });

  it("requires POST and a matching bearer secret", async () => {
    const getResponse = await routeCloudflareBetterAuthProofRequest(
      new Request("https://example.com/__cloudflare/better-auth-proof", {
        headers: { authorization: "Bearer secret" },
      }),
      createEnv(),
    );
    const unauthorizedResponse = await routeCloudflareBetterAuthProofRequest(
      new Request("https://example.com/__cloudflare/better-auth-proof", { method: "POST" }),
      createEnv(),
    );

    expect(getResponse?.status).toBe(405);
    expect(unauthorizedResponse?.status).toBe(401);
  });

  it("proves hosted Better Auth schema, secret config, session fixture, and cleanup", async () => {
    const env = createEnv();
    const response = await routeCloudflareBetterAuthProofRequest(
      new Request("https://example.com/__cloudflare/better-auth-proof", {
        method: "POST",
        headers: { authorization: "Bearer secret" },
      }),
      env,
    );
    const body = await response?.json();

    expect(response?.status).toBe(200);
    expect(body.mode).toBe("cloudflare-better-auth-provider-proof");
    expect(body.result.schemaApplyReady).toBe(true);
    expect(body.result.expectedTablesPresent).toBe(true);
    expect(body.result.expectedIndexesPresent).toBe(true);
    expect(body.result.secretProviderReady).toBe(true);
    expect(body.result.googleOAuthProviderReady).toBe(true);
    expect(body.result.providerSessionFixtureReady).toBe(true);
    expect(body.result.magicLinkCutover).toMatchObject({
      magicLinkRequestReady: true,
      magicLinkTokenCaptured: true,
      magicLinkCallbackReady: true,
      sessionCookieIssued: true,
      routeGateSessionReadbackReady: true,
      replayBlockedReady: true,
      cleanupReady: true,
      providerBackedCallbackSessionCutoverReady: true,
      rowsRemaining: 0,
    });
    expect(body.result.cleanupReady).toBe(true);
    expect(body.result.rowsRemaining).toBe(0);
    expect(body.readiness.googleOAuthProviderReady).toBe(true);
    expect(body.readiness.providerBackedCallbackSessionCutoverReady).toBe(true);
    expect(body.readiness.betterAuthProviderProofReady).toBe(true);
    expect(body.readiness.productionCutoverReady).toBe(true);
    expect(body.blockers).toEqual([]);
    expect(env.ARCH_DB.user).toBeNull();
    expect(env.ARCH_DB.session).toBeNull();
  });
});
