import { createRequire } from "node:module";

import { makeSignature } from "better-auth/crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createCloudflareBetterAuthForD1,
  getBetterAuthRouteGateSession,
  requireUserForBetterAuthRouteGate,
  type BetterAuthRouteGateSessionSource,
} from "@/lib/auth/better-auth-cloudflare";
import { generateLocalBetterAuthD1SchemaSqlProof } from "../../scripts/generate-cloudflare-better-auth-proof";

const BETTER_AUTH_COOKIE_NAME = "better-auth.session_token";
const BETTER_AUTH_TEST_SECRET = "local-better-auth-d1-session-fixture-secret";
const requireRuntime = createRequire(import.meta.url);

type LocalSqliteDatabase = {
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    all: (...parameters: unknown[]) => unknown[];
    run: (...parameters: unknown[]) => { changes?: number | bigint; lastInsertRowid?: number | bigint };
  };
  close: () => void;
};

type LocalD1PreparedStatement = {
  bind: (...values: unknown[]) => LocalD1PreparedStatement;
  all: () => Promise<{ results: unknown[]; meta: { changes: number; last_row_id: number | null } }>;
  run: () => Promise<{ results: unknown[]; meta: { changes: number; last_row_id: number | null } }>;
  raw: () => Promise<unknown[]>;
};

const openedDatabases: LocalSqliteDatabase[] = [];

function createAuth(session: unknown): BetterAuthRouteGateSessionSource {
  return {
    api: {
      getSession: vi.fn(async () => session),
    },
  };
}

async function createMemoryDatabase() {
  const { DatabaseSync } = requireRuntime("node:sqlite") as {
    DatabaseSync: new (path: string) => LocalSqliteDatabase;
  };
  return new DatabaseSync(":memory:");
}

function createLocalD1Binding(database: LocalSqliteDatabase) {
  return {
    prepare(sql: string) {
      let parameters: unknown[] = [];
      const statement: LocalD1PreparedStatement = {
        bind(...values: unknown[]) {
          parameters = values;
          return statement;
        },
        async all() {
          const prepared = database.prepare(sql);
          return {
            results: prepared.all(...parameters),
            meta: {
              changes: 0,
              last_row_id: null,
            },
          };
        },
        async run() {
          const prepared = database.prepare(sql);
          const result = prepared.run(...parameters);
          return {
            results: [],
            meta: {
              changes: Number(result.changes ?? 0),
              last_row_id: typeof result.lastInsertRowid === "bigint" ? Number(result.lastInsertRowid) : null,
            },
          };
        },
        async raw() {
          return database.prepare(sql).all(...parameters);
        },
      };
      return statement;
    },
    async batch(statements: LocalD1PreparedStatement[]) {
      return Promise.all(statements.map((statement) => statement.all()));
    },
    async exec(sql: string) {
      database.exec(sql);
      return { count: 0, duration: 0 };
    },
  };
}

async function createSignedSessionHeaders(token: string, secret = BETTER_AUTH_TEST_SECRET) {
  const signature = await makeSignature(token, secret);
  return new Headers({
    cookie: `${BETTER_AUTH_COOKIE_NAME}=${token}.${signature}`,
  });
}

async function createFixtureAuth(options: { expiresAt: Date }) {
  const database = await createMemoryDatabase();
  openedDatabases.push(database);
  database.exec("pragma foreign_keys = on");

  const schemaProof = await generateLocalBetterAuthD1SchemaSqlProof();
  if (!schemaProof.sql) throw new Error(schemaProof.error ?? "Better Auth schema SQL was not generated.");
  database.exec(schemaProof.sql);

  const now = new Date("2026-06-30T00:00:00.000Z").toISOString();
  database
    .prepare('insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt") values (?, ?, ?, ?, ?, ?)')
    .run("user_d1_fixture", "Owner", "owner@example.com", 1, now, now);
  database
    .prepare('insert into "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "userId") values (?, ?, ?, ?, ?, ?)')
    .run("session_d1_fixture", options.expiresAt.toISOString(), "session-token-fixture", now, now, "user_d1_fixture");

  return createCloudflareBetterAuthForD1({
    d1Database: createLocalD1Binding(database),
    baseURL: "http://localhost:3000",
    secret: BETTER_AUTH_TEST_SECRET,
    enableNextCookies: false,
  }) as Promise<BetterAuthRouteGateSessionSource>;
}

describe("Cloudflare Better Auth route gate helpers", () => {
  afterEach(() => {
    while (openedDatabases.length > 0) {
      openedDatabases.pop()?.close();
    }
    vi.clearAllMocks();
  });

  it("requests an uncached server session from Better Auth", async () => {
    const session = { user: { id: "user_1", email: "owner@example.com" } };
    const auth = createAuth(session);
    const headers = new Headers({ cookie: "better-auth.session_token=fixture" });

    await expect(getBetterAuthRouteGateSession(auth, headers)).resolves.toBe(session);
    expect(auth.api.getSession).toHaveBeenCalledWith({
      headers,
      query: {
        disableCookieCache: true,
      },
    });
  });

  it("fails closed for missing sessions", async () => {
    const auth = createAuth(null);

    await expect(requireUserForBetterAuthRouteGate(auth, new Headers())).resolves.toEqual({
      ok: false,
      reason: "missing-session",
    });
  });

  it("passes through the verified session when Better Auth returns one", async () => {
    const session = { session: { id: "session_1" }, user: { id: "user_1" } };
    const auth = createAuth(session);

    await expect(requireUserForBetterAuthRouteGate(auth, new Headers())).resolves.toEqual({
      ok: true,
      session,
    });
  });

  it("accepts a signed Better Auth cookie backed by a local D1 session fixture", async () => {
    const auth = await createFixtureAuth({
      expiresAt: new Date("2026-07-30T00:00:00.000Z"),
    });
    const headers = await createSignedSessionHeaders("session-token-fixture");

    const result = await requireUserForBetterAuthRouteGate(auth, headers);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.session).toMatchObject({
        user: {
          id: "user_d1_fixture",
          email: "owner@example.com",
        },
        session: {
          id: "session_d1_fixture",
          token: "session-token-fixture",
        },
      });
    }
  });

  it("fails closed for expired D1-backed Better Auth session fixtures", async () => {
    const auth = await createFixtureAuth({
      expiresAt: new Date("2026-06-01T00:00:00.000Z"),
    });
    const headers = await createSignedSessionHeaders("session-token-fixture");

    await expect(requireUserForBetterAuthRouteGate(auth, headers)).resolves.toEqual({
      ok: false,
      reason: "missing-session",
    });
  });
});
