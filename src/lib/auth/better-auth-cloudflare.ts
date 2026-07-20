export const BETTER_AUTH_CLOUDFLARE_BASE_PATH = "/api/auth";
export const BETTER_AUTH_CLOUDFLARE_D1_ROUTE_GATE_PROOF_MARKER =
  "better-auth Cloudflare D1 database route gate getSession requireUser";

type CloudflareD1DatabaseOption = unknown;

type BetterAuthDatabaseHooks = {
  user?: {
    create?: {
      before?: (user: { email?: string | null } & Record<string, unknown>) => Promise<boolean | void>;
    };
  };
  session?: {
    create?: {
      before?: (session: { userId?: string | null } & Record<string, unknown>) => Promise<boolean | void>;
    };
  };
};

type BetterAuthConfig = {
  appName: string;
  basePath: string;
  baseURL: string | { allowedHosts?: string[]; fallback: string };
  secret: string;
  trustedOrigins?: string[] | ((request?: Request) => Promise<(string | null | undefined)[]> | (string | null | undefined)[]);
  database: CloudflareD1DatabaseOption;
  socialProviders?: Record<string, unknown>;
  account?: {
    accountLinking?: {
      enabled?: boolean;
      disableImplicitLinking?: boolean;
      trustedProviders?: string[];
      requireLocalEmailVerified?: boolean;
      allowDifferentEmails?: boolean;
    };
  };
  // SEC-11: Better Auth 1.6.23 stores session.token raw in D1 (no session-hash config).
  // Compensating controls: cookieCache disabled (every request hits D1), 7d TTL, least-privilege D1 bindings.
  session: {
    expiresIn?: number;
    cookieCache: {
      enabled: false;
    };
  };
  databaseHooks?: BetterAuthDatabaseHooks;
  rateLimit?: {
    enabled: boolean;
    window: number;
    max: number;
    storage: "database" | "memory" | "secondary-storage";
  };
  advanced?: {
    backgroundTasks?: {
      handler: (promise: Promise<unknown>) => void;
    };
    ipAddress?: {
      ipAddressHeaders?: string[];
    };
  };
  plugins: unknown[];
};

type BetterAuthRuntime = {
  betterAuth: (config: BetterAuthConfig) => BetterAuthHandler;
  nextCookies: () => unknown;
  toNextJsHandler: (auth: BetterAuthHandler) => BetterAuthNextHandlers;
  getMigrations: (config: BetterAuthConfig) => Promise<{
    compileMigrations: () => Promise<string>;
  }>;
};

type BetterAuthHandler = {
  handler: (request: Request) => Promise<Response>;
  api: BetterAuthRouteGateSessionSource["api"];
};

type BetterAuthNextHandlers = {
  GET: (request: Request) => Promise<Response>;
  POST: (request: Request) => Promise<Response>;
  PATCH: (request: Request) => Promise<Response>;
  PUT: (request: Request) => Promise<Response>;
  DELETE: (request: Request) => Promise<Response>;
};

export type CreateCloudflareBetterAuthOptions = {
  d1Database: CloudflareD1DatabaseOption;
  baseURL: BetterAuthConfig["baseURL"];
  secret: string;
  trustedOrigins?: BetterAuthConfig["trustedOrigins"];
  socialProviders?: BetterAuthConfig["socialProviders"];
  waitUntil?: (promise: Promise<unknown>) => void;
  enableNextCookies?: boolean;
  plugins?: unknown[];
};

export type BetterAuthRouteGateSessionSource = {
  api: {
    getSession: (input: {
      headers: Headers;
      query?: {
        disableCookieCache?: boolean;
      };
    }) => Promise<unknown>;
  };
};

export type BetterAuthRouteGateUserIdentity = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type SendBetterAuthMagicLinkEmailInput = {
  email: string;
  url: string;
};

export type BetterAuthRouteGateParityRequirement = {
  key: string;
  previousProviderBehavior: string;
  betterAuthD1Requirement: string;
  localProofStatus: "mapped" | "deferred";
};

export const BETTER_AUTH_ROUTE_GATE_PARITY_MATRIX = [
  {
    key: "signed-out-protected-route",
    previousProviderBehavior: "Proxy checks signed-in claims and redirects protected /workshop requests to /login with a safe next path.",
    betterAuthD1Requirement:
      "Use auth.api.getSession({ headers, query: { disableCookieCache: true } }) and redirect null sessions before protected routes render.",
    localProofStatus: "mapped",
  },
  {
    key: "signed-in-auth-route",
    previousProviderBehavior: "Authenticated users visiting login/signup are redirected back to the workshop shell.",
    betterAuthD1Requirement:
      "Use the secure Better Auth server session check rather than getSessionCookie before auth-route redirects.",
    localProofStatus: "mapped",
  },
  {
    key: "closed-beta-denial",
    previousProviderBehavior: "Closed-beta access uses the session email and redirects blocked users to /access-required.",
    betterAuthD1Requirement:
      "Resolve the Better Auth user email from D1-backed session identity before running the existing closed-beta policy.",
    localProofStatus: "mapped",
  },
  {
    key: "terms-gate",
    previousProviderBehavior: "Terms acceptance is enforced after identity is known and before protected workshop access.",
    betterAuthD1Requirement:
      "Preserve the terms gate after Better Auth session validation and before setting protected-route gate headers.",
    localProofStatus: "mapped",
  },
  {
    key: "invite-entry",
    previousProviderBehavior: "Invite continue, accept, and sign-out routes branch on current user context.",
    betterAuthD1Requirement:
      "Keep invite entry on the Better Auth D1 session/user context before production cutover.",
    localProofStatus: "mapped",
  },
  {
    key: "local-dev-bypass",
    previousProviderBehavior: "Local dev auth can satisfy protected routes without a live provider session.",
    betterAuthD1Requirement:
      "Keep the local dev auth gate ahead of provider-backed Better Auth session validation for local-only proof runs.",
    localProofStatus: "mapped",
  },
  {
    key: "oauth-magic-link-callback",
    previousProviderBehavior: "The legacy callback and OTP actions owned OAuth, magic-link, and sign-out provider calls.",
    betterAuthD1Requirement:
      "Mount Better Auth handlers and email/OAuth provider config only after D1 schema, secrets, and callback tests are ready.",
    localProofStatus: "deferred",
  },
] as const satisfies readonly BetterAuthRouteGateParityRequirement[];

async function loadBetterAuthRuntime(): Promise<BetterAuthRuntime> {
  const [{ betterAuth }, { nextCookies, toNextJsHandler }, { getMigrations }] = await Promise.all([
    import("better-auth"),
    import("better-auth/next-js"),
    import("better-auth/db/migration"),
  ]);

  return {
    betterAuth: betterAuth as BetterAuthRuntime["betterAuth"],
    nextCookies: nextCookies as BetterAuthRuntime["nextCookies"],
    toNextJsHandler: toNextJsHandler as BetterAuthRuntime["toNextJsHandler"],
    getMigrations: getMigrations as BetterAuthRuntime["getMigrations"],
  };
}

function asD1DatabaseLike(value: unknown): import("@/lib/cloudflare/d1").D1DatabaseLike | null {
  if (!value || typeof (value as { prepare?: unknown }).prepare !== "function") return null;
  return value as import("@/lib/cloudflare/d1").D1DatabaseLike;
}

function createClosedBetaDatabaseHooks(d1Database: CloudflareD1DatabaseOption): BetterAuthDatabaseHooks | undefined {
  const db = asD1DatabaseLike(d1Database);
  if (!db) return undefined;

  return {
    user: {
      create: {
        before: async (user) => {
          const { assertClosedBetaEmailAllowedForAuth } = await import("@/lib/auth/closed-beta-auth-gate");
          await assertClosedBetaEmailAllowedForAuth(db, user.email);
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const { assertClosedBetaUserIdAllowedForAuth } = await import("@/lib/auth/closed-beta-auth-gate");
          await assertClosedBetaUserIdAllowedForAuth(db, session.userId);
        },
      },
    },
  };
}

function createCloudflareBetterAuthOptions(options: CreateCloudflareBetterAuthOptions, runtime: BetterAuthRuntime) {
  const config: BetterAuthConfig = {
    appName: "Archestimator",
    basePath: BETTER_AUTH_CLOUDFLARE_BASE_PATH,
    baseURL: options.baseURL,
    secret: options.secret,
    trustedOrigins: options.trustedOrigins,
    database: options.d1Database,
    socialProviders: options.socialProviders,
    // SEC-14 / DEC-7: block implicit OAuth↔magic-link account merge (ATO). Explicit link only.
    account: {
      accountLinking: {
        enabled: true,
        disableImplicitLinking: true,
        trustedProviders: ["google"],
        requireLocalEmailVerified: true,
        allowDifferentEmails: false,
      },
    },
    // SEC-11 compensating controls (DEC-6b): no BA session-token hash config in 1.6.23.
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      cookieCache: {
        enabled: false,
      },
    },
    // Close-beta: deny user/session creation for non-allowlisted emails at the auth boundary
    // (Google OAuth + magic-link share this gate). App session reads remain a second layer.
    databaseHooks: createClosedBetaDatabaseHooks(options.d1Database),
    // SEC-5: durable D1-backed rate limits (not isolate memory on Workers).
    rateLimit: {
      enabled: true,
      window: 60,
      max: 60,
      storage: "database",
    },
    advanced: {
      ...(options.waitUntil
        ? {
            backgroundTasks: {
              handler: options.waitUntil,
            },
          }
        : {}),
      // Prefer Cloudflare edge IP only — client-spoofable X-Forwarded-For / X-Real-IP omitted.
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip"],
      },
    },
    plugins: [
      ...(options.enableNextCookies === false ? [] : [runtime.nextCookies()]),
      ...(options.plugins ?? []),
    ],
  };

  return config;
}

export function resolveCloudflareBetterAuthSocialProviders(env: Record<string, string | undefined> = process.env) {
  const googleClientId = env.BETTER_AUTH_GOOGLE_CLIENT_ID?.trim() || env.GOOGLE_CLIENT_ID?.trim();
  const googleClientSecret = env.BETTER_AUTH_GOOGLE_CLIENT_SECRET?.trim() || env.GOOGLE_CLIENT_SECRET?.trim();

  if (!googleClientId || !googleClientSecret) return undefined;
  return {
    google: {
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      prompt: "select_account",
    },
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function createCloudflareBetterAuthMagicLinkPlugin(options?: {
  d1Database?: CloudflareD1DatabaseOption;
  sendMagicLinkEmail?: (input: SendBetterAuthMagicLinkEmailInput) => Promise<unknown>;
}) {
  const [{ magicLink }, { sendCloudflareEmail }] = await Promise.all([
    import("better-auth/plugins/magic-link"),
    import("@/lib/email/cloudflare-email-client"),
  ]);

  return magicLink({
    // SEC-1: hash verification tokens at rest (defaultKeyHasher); verify path re-hashes automatically.
    storeToken: "hashed",
    // SEC-5: explicit expiry + per-path rate limit (matches/improves proof fixture).
    expiresIn: 300,
    rateLimit: {
      window: 60,
      max: 10,
    },
    sendMagicLink: async ({ email, url }: SendBetterAuthMagicLinkEmailInput) => {
      const db = asD1DatabaseLike(options?.d1Database);
      if (db) {
        const { assertClosedBetaEmailAllowedForAuth } = await import("@/lib/auth/closed-beta-auth-gate");
        await assertClosedBetaEmailAllowedForAuth(db, email);
      }

      if (options?.sendMagicLinkEmail) {
        await options.sendMagicLinkEmail({ email, url });
        return;
      }

      const result = await sendCloudflareEmail({
        to: email,
        subject: "Sign in to Archestimator",
        text: `Use this secure link to sign in to Archestimator:\n\n${url}\n\nIf you did not request this, you can ignore this email.`,
        html:
          `<!doctype html><html><body style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#292929;line-height:1.5;">`
          + `<p>Use this secure link to sign in to Archestimator:</p>`
          + `<p><a href="${escapeHtml(url)}" style="display:inline-block;background:#292929;color:#fff;padding:10px 14px;text-decoration:none;border-radius:4px;">Sign in to Archestimator</a></p>`
          + `<p style="color:#666;font-size:13px;">If you did not request this, you can ignore this email.</p>`
          + `</body></html>`,
      });

      if (!result.ok) {
        throw new Error(result.error ?? "Better Auth magic-link email delivery failed.");
      }
    },
  });
}

export async function createCloudflareBetterAuthForD1(options: CreateCloudflareBetterAuthOptions) {
  const runtime = await loadBetterAuthRuntime();
  return runtime.betterAuth(createCloudflareBetterAuthOptions(options, runtime));
}

export async function createCloudflareBetterAuthNextHandlers(options: CreateCloudflareBetterAuthOptions) {
  const runtime = await loadBetterAuthRuntime();
  return runtime.toNextJsHandler(runtime.betterAuth(createCloudflareBetterAuthOptions(options, runtime)));
}

export async function compileCloudflareBetterAuthD1Migrations(options: CreateCloudflareBetterAuthOptions) {
  const runtime = await loadBetterAuthRuntime();
  const migrations = await runtime.getMigrations(createCloudflareBetterAuthOptions(options, runtime));
  return migrations.compileMigrations();
}

export async function getBetterAuthRouteGateSession(auth: BetterAuthRouteGateSessionSource, headers: Headers) {
  return auth.api.getSession({
    headers,
    query: {
      disableCookieCache: true,
    },
  });
}

export async function requireUserForBetterAuthRouteGate(auth: BetterAuthRouteGateSessionSource, headers: Headers) {
  const session = await getBetterAuthRouteGateSession(auth, headers);
  if (!session) {
    return { ok: false as const, reason: "missing-session" };
  }
  return { ok: true as const, session };
}

export function readBetterAuthRouteGateUserIdentity(session: unknown): BetterAuthRouteGateUserIdentity | null {
  const user = session && typeof session === "object" && "user" in session
    ? (session as { user?: Record<string, unknown> | null }).user
    : null;
  const id = typeof user?.id === "string" ? user.id.trim() : "";
  const email = typeof user?.email === "string" ? user.email.trim().toLowerCase() : "";
  if (!id || !email) return null;

  return {
    id,
    email,
    displayName: typeof user?.name === "string" && user.name.trim() ? user.name.trim() : null,
    avatarUrl: typeof user?.image === "string" && user.image.trim() ? user.image.trim() : null,
  };
}
