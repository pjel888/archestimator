import {
  createCloudflareBetterAuthForD1,
  getBetterAuthRouteGateSession,
} from "@/lib/auth/better-auth-cloudflare";

type D1Result<T = Record<string, unknown>> = {
  results?: T[];
  success?: boolean;
};

type D1PreparedStatementLike<T = Record<string, unknown>> = {
  bind(...values: Array<string | number | null>): D1PreparedStatementLike<T>;
  run(): Promise<D1Result<T>>;
  all(): Promise<D1Result<T>>;
};

type D1DatabaseLike = {
  prepare<T = Record<string, unknown>>(sql: string): D1PreparedStatementLike<T>;
};

type CapturedMagicLink = {
  email: string;
  token: string;
  url: string;
};

type BetterAuthProofAuth = {
  handler: (request: Request) => Promise<Response>;
  api: {
    getSession: (input: {
      headers: Headers;
      query?: {
        disableCookieCache?: boolean;
      };
    }) => Promise<unknown>;
  };
};

type BetterAuthProofAuthFactoryInput = {
  baseUrl: string;
  captureMagicLink: (link: CapturedMagicLink) => void;
  d1Database: D1DatabaseLike;
  secret: string;
  trustedOrigins: string[];
};

type BetterAuthProofAuthFactory = (input: BetterAuthProofAuthFactoryInput) => Promise<BetterAuthProofAuth>;

export type CloudflareBetterAuthProofEnv = {
  ARCH_DB?: D1DatabaseLike;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_TRUSTED_ORIGINS?: string;
  BETTER_AUTH_URL?: string;
  CRON_SECRET?: string;
  __betterAuthProofAuthFactory?: BetterAuthProofAuthFactory;
};

const BETTER_AUTH_PROOF_PATH = "/__cloudflare/better-auth-proof";
const EXPECTED_TABLES = ["account", "session", "user", "verification"] as const;
const EXPECTED_INDEXES = ["account_userId_idx", "session_userId_idx", "verification_identifier_idx"] as const;
const SCHEMA_STATEMENTS = [
  'CREATE TABLE IF NOT EXISTS "user" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" integer not null, "image" text, "createdAt" date not null, "updatedAt" date not null)',
  'CREATE TABLE IF NOT EXISTS "session" ("id" text not null primary key, "expiresAt" date not null, "token" text not null unique, "createdAt" date not null, "updatedAt" date not null, "ipAddress" text, "userAgent" text, "userId" text not null references "user" ("id") on delete cascade)',
  'CREATE TABLE IF NOT EXISTS "account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" date, "refreshTokenExpiresAt" date, "scope" text, "password" text, "createdAt" date not null, "updatedAt" date not null)',
  'CREATE TABLE IF NOT EXISTS "verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" date not null, "createdAt" date not null, "updatedAt" date not null)',
  'CREATE INDEX IF NOT EXISTS "session_userId_idx" on "session" ("userId")',
  'CREATE INDEX IF NOT EXISTS "account_userId_idx" on "account" ("userId")',
  'CREATE INDEX IF NOT EXISTS "verification_identifier_idx" on "verification" ("identifier")',
];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    },
  });
}

function isAuthorized(request: Request, env: CloudflareBetterAuthProofEnv) {
  const secret = env.CRON_SECRET?.trim();
  if (!secret) return "missing-secret";
  return request.headers.get("authorization") === `Bearer ${secret}` ? "authorized" : "unauthorized";
}

async function runStatement(db: D1DatabaseLike, sql: string, values: Array<string | number | null> = []) {
  await db.prepare(sql).bind(...values).run();
}

async function queryRows<T extends Record<string, unknown>>(
  db: D1DatabaseLike,
  sql: string,
  values: Array<string | number | null> = [],
) {
  const result = await db.prepare<T>(sql).bind(...values).all();
  return result.results ?? [];
}

function normalizeOrigin(value: string | undefined) {
  if (!value?.trim()) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function splitOrigins(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => normalizeOrigin(item.trim()))
    .filter((item): item is string => Boolean(item));
}

async function listSqliteNames(db: D1DatabaseLike, type: "table" | "index", names: readonly string[]) {
  const placeholders = names.map(() => "?").join(", ");
  const rows = await queryRows<{ name: string }>(
    db,
    `SELECT name FROM sqlite_master WHERE type = ? AND name IN (${placeholders}) ORDER BY name`,
    [type, ...names],
  );
  return rows.map((row) => row.name).filter(Boolean).sort();
}

async function cleanupFixture(db: D1DatabaseLike, userId: string, sessionId: string) {
  await runStatement(db, 'DELETE FROM "session" WHERE "id" = ? OR "userId" = ?', [sessionId, userId]);
  await runStatement(db, 'DELETE FROM "account" WHERE "userId" = ?', [userId]);
  await runStatement(db, 'DELETE FROM "verification" WHERE "identifier" LIKE ?', [`proof:${userId}:%`]);
  await runStatement(db, 'DELETE FROM "user" WHERE "id" = ?', [userId]);
}

async function cleanupMagicLinkFixture(
  db: D1DatabaseLike,
  email: string,
  userId: string | null,
  sessionId: string | null,
  verificationToken: string | null,
) {
  await runStatement(
    db,
    `
      DELETE FROM "session"
      WHERE "id" = ?
        OR "userId" = ?
        OR "userId" IN (SELECT "id" FROM "user" WHERE "email" = ?)
    `,
    [sessionId, userId, email],
  );
  await runStatement(
    db,
    `
      DELETE FROM "account"
      WHERE "userId" = ?
        OR "userId" IN (SELECT "id" FROM "user" WHERE "email" = ?)
    `,
    [userId, email],
  );
  await runStatement(
    db,
    'DELETE FROM "verification" WHERE "identifier" = ? OR "value" LIKE ?',
    [verificationToken, `%${email}%`],
  );
  await runStatement(db, 'DELETE FROM "user" WHERE "id" = ? OR "email" = ?', [userId, email]);
}

async function countFixtureRows(db: D1DatabaseLike, userId: string, sessionId: string) {
  const rows = await queryRows<{ rows_remaining: number }>(
    db,
    `
      SELECT
        (SELECT COUNT(*) FROM "session" WHERE "id" = ? OR "userId" = ?)
        + (SELECT COUNT(*) FROM "account" WHERE "userId" = ?)
        + (SELECT COUNT(*) FROM "verification" WHERE "identifier" LIKE ?)
        + (SELECT COUNT(*) FROM "user" WHERE "id" = ?) AS rows_remaining
    `,
    [sessionId, userId, userId, `proof:${userId}:%`, userId],
  );
  return Number(rows[0]?.rows_remaining ?? 0);
}

async function countMagicLinkFixtureRows(
  db: D1DatabaseLike,
  email: string,
  userId: string | null,
  sessionId: string | null,
  verificationToken: string | null,
) {
  const rows = await queryRows<{ rows_remaining: number }>(
    db,
    `
      SELECT
        (SELECT COUNT(*) FROM "session"
          WHERE "id" = ?
            OR "userId" = ?
            OR "userId" IN (SELECT "id" FROM "user" WHERE "email" = ?))
        + (SELECT COUNT(*) FROM "account"
          WHERE "userId" = ?
            OR "userId" IN (SELECT "id" FROM "user" WHERE "email" = ?))
        + (SELECT COUNT(*) FROM "verification" WHERE "identifier" = ? OR "value" LIKE ?)
        + (SELECT COUNT(*) FROM "user" WHERE "id" = ? OR "email" = ?) AS rows_remaining
    `,
    [sessionId, userId, email, userId, email, verificationToken, `%${email}%`, userId, email],
  );
  return Number(rows[0]?.rows_remaining ?? 0);
}

async function createDefaultProofAuth({
  baseUrl,
  captureMagicLink,
  d1Database,
  secret,
  trustedOrigins,
}: BetterAuthProofAuthFactoryInput) {
  const { magicLink } = await import("better-auth/plugins");
  const auth = await createCloudflareBetterAuthForD1({
    d1Database,
    baseURL: baseUrl,
    secret,
    trustedOrigins,
    enableNextCookies: false,
    plugins: [
      magicLink({
        expiresIn: 60,
        rateLimit: {
          window: 60,
          max: 10,
        },
        sendMagicLink(data) {
          captureMagicLink({
            email: data.email,
            token: data.token,
            url: data.url,
          });
        },
        storeToken: "plain",
      }),
    ],
  });
  return auth as BetterAuthProofAuth;
}

async function readJsonBody(response: Response) {
  try {
    return await response.clone().json() as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractCookieHeader(headers: Headers) {
  const maybeGetSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const setCookieHeaders = typeof maybeGetSetCookie === "function"
    ? maybeGetSetCookie.call(headers)
    : headers.get("set-cookie")
      ? [headers.get("set-cookie") as string]
      : [];
  return setCookieHeaders
    .map((header) => header.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ");
}

function sessionUserId(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const user = (value as { user?: unknown }).user;
  if (!user || typeof user !== "object") return null;
  const id = (user as { id?: unknown }).id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

function sessionToken(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const session = (value as { session?: unknown }).session;
  if (!session || typeof session !== "object") return null;
  const token = (session as { token?: unknown }).token;
  return typeof token === "string" && token.length > 0 ? token : null;
}

async function runMagicLinkCutoverProof(
  db: D1DatabaseLike,
  env: CloudflareBetterAuthProofEnv,
  baseUrl: string | null,
  trustedOrigins: string[],
  secret: string | undefined,
) {
  const email = `proof_magic_${crypto.randomUUID()}@example.invalid`;
  const capturedMagicLink: { value: CapturedMagicLink | null } = { value: null };
  let userId: string | null = null;
  let sessionId: string | null = null;
  let verificationToken: string | null = null;
  let rowsRemaining: number | null = null;

  const emptyResult = {
    magicLinkRequestReady: false,
    magicLinkTokenCaptured: false,
    magicLinkCallbackReady: false,
    sessionCookieIssued: false,
    routeGateSessionReadbackReady: false,
    replayBlockedReady: false,
    cleanupReady: false,
    providerBackedCallbackSessionCutoverReady: false,
    rowsRemaining,
    error: null as string | null,
  };

  if (!baseUrl || !secret || secret.length < 32 || trustedOrigins.length === 0) return emptyResult;

  try {
    const authFactory = env.__betterAuthProofAuthFactory ?? createDefaultProofAuth;
    const auth = await authFactory({
      baseUrl,
      captureMagicLink(link) {
        capturedMagicLink.value = link;
        verificationToken = link.token;
      },
      d1Database: db,
      secret,
      trustedOrigins,
    });
    const signInResponse = await auth.handler(new Request(`${baseUrl}/api/auth/sign-in/magic-link`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: baseUrl,
      },
      body: JSON.stringify({
        email,
        name: "Proof Magic Link User",
      }),
    }));
    const signInBody = await readJsonBody(signInResponse);
    const magicLinkRequestReady = signInResponse.ok && signInBody?.status === true && Boolean(capturedMagicLink.value?.url);
    const verifyUrl = new URL(`${baseUrl}/api/auth/magic-link/verify`);
    if (capturedMagicLink.value?.token) verifyUrl.searchParams.set("token", capturedMagicLink.value.token);
    const verifyResponse = await auth.handler(new Request(verifyUrl, {
      method: "GET",
      headers: {
        origin: baseUrl,
      },
    }));
    const verifyBody = await readJsonBody(verifyResponse);
    userId = sessionUserId(verifyBody);
    const verifiedSessionToken = sessionToken(verifyBody);
    sessionId = verifyBody && typeof verifyBody === "object" && verifyBody.session && typeof verifyBody.session === "object"
      ? ((verifyBody.session as { id?: unknown }).id as string | undefined) ?? null
      : null;
    const cookieHeader = extractCookieHeader(verifyResponse.headers);
    const routeGateSession = cookieHeader
      ? await getBetterAuthRouteGateSession(auth, new Headers({ cookie: cookieHeader }))
      : null;
    const readbackUserId = sessionUserId(routeGateSession);
    const readbackSessionToken = sessionToken(routeGateSession);
    const replayResponse = await auth.handler(new Request(verifyUrl, {
      method: "GET",
      headers: {
        origin: baseUrl,
      },
    }));

    await cleanupMagicLinkFixture(db, email, userId, sessionId, verificationToken);
    rowsRemaining = await countMagicLinkFixtureRows(db, email, userId, sessionId, verificationToken);
    const cleanupReady = rowsRemaining === 0;
    const magicLinkCallbackReady = verifyResponse.ok && Boolean(userId) && Boolean(verifiedSessionToken);
    const routeGateSessionReadbackReady = Boolean(readbackUserId)
      && readbackUserId === userId
      && Boolean(readbackSessionToken)
      && readbackSessionToken === verifiedSessionToken;
    const replayBlockedReady = !replayResponse.ok;
    const sessionCookieIssued = cookieHeader.includes("better-auth.session_token=");
    const providerBackedCallbackSessionCutoverReady = magicLinkRequestReady
      && Boolean(capturedMagicLink.value?.token)
      && magicLinkCallbackReady
      && sessionCookieIssued
      && routeGateSessionReadbackReady
      && replayBlockedReady
      && cleanupReady;

    return {
      magicLinkRequestReady,
      magicLinkTokenCaptured: Boolean(capturedMagicLink.value?.token),
      magicLinkCallbackReady,
      sessionCookieIssued,
      routeGateSessionReadbackReady,
      replayBlockedReady,
      cleanupReady,
      providerBackedCallbackSessionCutoverReady,
      rowsRemaining,
      error: null,
    };
  } catch (error) {
    try {
      await cleanupMagicLinkFixture(db, email, userId, sessionId, verificationToken);
      rowsRemaining = await countMagicLinkFixtureRows(db, email, userId, sessionId, verificationToken);
    } catch {
      rowsRemaining = null;
    }

    return {
      ...emptyResult,
      rowsRemaining,
      cleanupReady: rowsRemaining === 0,
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    };
  }
}

async function runBetterAuthProof(env: CloudflareBetterAuthProofEnv) {
  const db = env.ARCH_DB;
  const baseUrl = normalizeOrigin(env.BETTER_AUTH_URL);
  const trustedOrigins = splitOrigins(env.BETTER_AUTH_TRUSTED_ORIGINS);
  const secret = env.BETTER_AUTH_SECRET?.trim();
  const secretLength = secret?.length ?? 0;

  if (!db) {
    return {
      d1BindingPresent: false,
      schemaApplyReady: false,
      expectedTablesPresent: false,
      expectedIndexesPresent: false,
      secretProviderReady: secretLength >= 32,
      baseUrlReady: Boolean(baseUrl),
      trustedOriginsReady: baseUrl ? trustedOrigins.includes(baseUrl) : trustedOrigins.length > 0,
      providerSessionFixtureReady: false,
      cleanupReady: false,
      tableNames: [] as string[],
      indexNames: [] as string[],
      magicLinkCutover: {
        magicLinkRequestReady: false,
        magicLinkTokenCaptured: false,
        magicLinkCallbackReady: false,
        sessionCookieIssued: false,
        routeGateSessionReadbackReady: false,
        replayBlockedReady: false,
        cleanupReady: false,
        providerBackedCallbackSessionCutoverReady: false,
        rowsRemaining: null as number | null,
        error: null as string | null,
      },
      rowsRemaining: null as number | null,
      error: null as string | null,
    };
  }

  const userId = `proof_user_${crypto.randomUUID()}`;
  const sessionId = `proof_session_${crypto.randomUUID()}`;
  const token = `proof_token_${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 60_000).toISOString();
  let cleanupReady = false;
  let rowsRemaining: number | null = null;

  try {
    for (const statement of SCHEMA_STATEMENTS) await runStatement(db, statement);
    const tableNames = await listSqliteNames(db, "table", EXPECTED_TABLES);
    const indexNames = await listSqliteNames(db, "index", EXPECTED_INDEXES);
    await cleanupFixture(db, userId, sessionId);
    await runStatement(
      db,
      'INSERT INTO "user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, "Proof User", `${userId}@example.invalid`, 1, null, now, now],
    );
    await runStatement(
      db,
      'INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [sessionId, expiresAt, token, now, now, null, "archestimator-cloudflare-proof", userId],
    );
    const fixtureRows = await queryRows<{ session_id: string; user_id: string; email: string }>(
      db,
      `
        SELECT s."id" AS session_id, u."id" AS user_id, u."email" AS email
        FROM "session" s
        JOIN "user" u ON u."id" = s."userId"
        WHERE s."token" = ? AND s."expiresAt" > ?
      `,
      [token, now],
    );
    await cleanupFixture(db, userId, sessionId);
    rowsRemaining = await countFixtureRows(db, userId, sessionId);
    cleanupReady = rowsRemaining === 0;
    const magicLinkCutover = await runMagicLinkCutoverProof(db, env, baseUrl, trustedOrigins, secret);

    return {
      d1BindingPresent: true,
      schemaApplyReady: true,
      expectedTablesPresent: EXPECTED_TABLES.every((table) => tableNames.includes(table)),
      expectedIndexesPresent: EXPECTED_INDEXES.every((index) => indexNames.includes(index)),
      secretProviderReady: secretLength >= 32,
      baseUrlReady: Boolean(baseUrl),
      trustedOriginsReady: baseUrl ? trustedOrigins.includes(baseUrl) : trustedOrigins.length > 0,
      providerSessionFixtureReady: fixtureRows.length === 1
        && fixtureRows[0]?.session_id === sessionId
        && fixtureRows[0]?.user_id === userId,
      cleanupReady,
      tableNames,
      indexNames,
      magicLinkCutover,
      rowsRemaining,
      error: null,
    };
  } catch (error) {
    try {
      await cleanupFixture(db, userId, sessionId);
      rowsRemaining = await countFixtureRows(db, userId, sessionId);
      cleanupReady = rowsRemaining === 0;
    } catch {
      cleanupReady = false;
    }

    return {
      d1BindingPresent: true,
      schemaApplyReady: false,
      expectedTablesPresent: false,
      expectedIndexesPresent: false,
      secretProviderReady: secretLength >= 32,
      baseUrlReady: Boolean(baseUrl),
      trustedOriginsReady: baseUrl ? trustedOrigins.includes(baseUrl) : trustedOrigins.length > 0,
      providerSessionFixtureReady: false,
      cleanupReady,
      tableNames: [] as string[],
      indexNames: [] as string[],
      magicLinkCutover: {
        magicLinkRequestReady: false,
        magicLinkTokenCaptured: false,
        magicLinkCallbackReady: false,
        sessionCookieIssued: false,
        routeGateSessionReadbackReady: false,
        replayBlockedReady: false,
        cleanupReady: false,
        providerBackedCallbackSessionCutoverReady: false,
        rowsRemaining: null as number | null,
        error: null as string | null,
      },
      rowsRemaining,
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    };
  }
}

function buildResponseBody(result: Awaited<ReturnType<typeof runBetterAuthProof>>) {
  const betterAuthProviderProofReady = result.d1BindingPresent
    && result.schemaApplyReady
    && result.expectedTablesPresent
    && result.expectedIndexesPresent
    && result.secretProviderReady
    && result.baseUrlReady
    && result.trustedOriginsReady
    && result.providerSessionFixtureReady
    && result.cleanupReady
    && result.magicLinkCutover.providerBackedCallbackSessionCutoverReady;
  const blockers: string[] = [];

  if (!result.d1BindingPresent) blockers.push("ARCH_DB binding is missing.");
  if (!result.schemaApplyReady) blockers.push("Better Auth D1 schema could not be applied to hosted D1.");
  if (!result.expectedTablesPresent) blockers.push("Better Auth D1 expected tables are not all present.");
  if (!result.expectedIndexesPresent) blockers.push("Better Auth D1 expected indexes are not all present.");
  if (!result.secretProviderReady) blockers.push("BETTER_AUTH_SECRET is missing or shorter than 32 characters.");
  if (!result.baseUrlReady) blockers.push("BETTER_AUTH_URL is missing or invalid.");
  if (!result.trustedOriginsReady) blockers.push("BETTER_AUTH_TRUSTED_ORIGINS does not include the Better Auth base URL.");
  if (!result.providerSessionFixtureReady) blockers.push("Hosted D1 Better Auth session fixture readback did not pass.");
  if (!result.magicLinkCutover.magicLinkRequestReady) blockers.push("Hosted Better Auth magic-link request did not pass.");
  if (!result.magicLinkCutover.magicLinkCallbackReady) blockers.push("Hosted Better Auth magic-link callback did not mint a D1-backed session.");
  if (!result.magicLinkCutover.sessionCookieIssued) blockers.push("Hosted Better Auth magic-link callback did not issue a session cookie.");
  if (!result.magicLinkCutover.routeGateSessionReadbackReady) blockers.push("Hosted Better Auth session cookie did not pass route-gate getSession readback.");
  if (!result.magicLinkCutover.replayBlockedReady) blockers.push("Hosted Better Auth magic-link token replay was not blocked.");
  if (!result.magicLinkCutover.cleanupReady) blockers.push("Hosted Better Auth magic-link proof rows were not fully cleaned up.");
  if (!result.cleanupReady) blockers.push("Hosted D1 Better Auth proof rows were not fully cleaned up.");
  if (result.magicLinkCutover.error) blockers.push(result.magicLinkCutover.error);
  if (result.error) blockers.push(result.error);

  return {
    generatedAt: new Date().toISOString(),
    mode: "cloudflare-better-auth-provider-proof",
    endpointProofScope: "hosted-d1-schema-secret-session-fixture",
    providerBacked: true,
    result,
    readiness: {
      providerBacked: true,
      schemaApplyReady: result.schemaApplyReady,
      expectedTablesPresent: result.expectedTablesPresent,
      expectedIndexesPresent: result.expectedIndexesPresent,
      secretProviderReady: result.secretProviderReady,
      baseUrlReady: result.baseUrlReady,
      trustedOriginsReady: result.trustedOriginsReady,
      providerSessionFixtureReady: result.providerSessionFixtureReady,
      cleanupReady: result.cleanupReady,
      magicLinkRequestReady: result.magicLinkCutover.magicLinkRequestReady,
      magicLinkCallbackReady: result.magicLinkCutover.magicLinkCallbackReady,
      sessionCookieIssued: result.magicLinkCutover.sessionCookieIssued,
      routeGateSessionReadbackReady: result.magicLinkCutover.routeGateSessionReadbackReady,
      replayBlockedReady: result.magicLinkCutover.replayBlockedReady,
      providerBackedCallbackSessionCutoverReady: result.magicLinkCutover.providerBackedCallbackSessionCutoverReady,
      betterAuthProviderProofReady,
      productionCutoverReady: false,
    },
    blockers,
    note: "Protected hosted Better Auth provider proof. It applies the Better Auth D1 schema if needed, verifies expected table/index readback and Worker secret configuration, seeds one sanitized session fixture, runs a real Better Auth magic-link callback/session-cookie/route-gate readback flow with captured proof email delivery, blocks token replay, then deletes proof rows. It does not print secrets, magic-link tokens, cookies, session tokens, change DNS, replace Supabase auth, prove OAuth provider credentials, or make production cutover ready.",
  };
}

export async function routeCloudflareBetterAuthProofRequest(request: Request, env: CloudflareBetterAuthProofEnv) {
  const url = new URL(request.url);
  if (url.pathname !== BETTER_AUTH_PROOF_PATH) return null;

  const auth = isAuthorized(request, env);
  if (auth === "missing-secret") return jsonResponse({ error: "CRON_SECRET is not configured." }, 503);
  if (auth === "unauthorized") return jsonResponse({ error: "Unauthorized." }, 401);
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  const body = buildResponseBody(await runBetterAuthProof(env));
  return jsonResponse(body, body.readiness.betterAuthProviderProofReady ? 200 : 500);
}
