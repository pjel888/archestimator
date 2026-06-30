export const BETTER_AUTH_CLOUDFLARE_BASE_PATH = "/api/auth";
export const BETTER_AUTH_CLOUDFLARE_D1_ROUTE_GATE_PROOF_MARKER =
  "better-auth Cloudflare D1 database route gate getSession requireUser";

const BETTER_AUTH_MODULE: string = "better-auth";
const BETTER_AUTH_NEXT_MODULE: string = "better-auth/next-js";
const BETTER_AUTH_MIGRATION_MODULE: string = "better-auth/db/migration";

type CloudflareD1DatabaseOption = unknown;

type BetterAuthConfig = {
  appName: string;
  basePath: string;
  baseURL: string | { allowedHosts?: string[]; fallback: string };
  secret: string;
  trustedOrigins?: string[] | ((request?: Request) => Promise<(string | null | undefined)[]> | (string | null | undefined)[]);
  database: CloudflareD1DatabaseOption;
  session: {
    cookieCache: {
      enabled: false;
    };
  };
  advanced?: {
    backgroundTasks: {
      handler: (promise: Promise<unknown>) => void;
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
  waitUntil?: (promise: Promise<unknown>) => void;
  enableNextCookies?: boolean;
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

export type BetterAuthRouteGateParityRequirement = {
  key: string;
  currentSupabaseBehavior: string;
  betterAuthD1Requirement: string;
  localProofStatus: "mapped" | "deferred";
};

export const BETTER_AUTH_ROUTE_GATE_PARITY_MATRIX = [
  {
    key: "signed-out-protected-route",
    currentSupabaseBehavior: "Proxy checks Supabase claims and redirects protected /workshop requests to /login with a safe next path.",
    betterAuthD1Requirement:
      "Use auth.api.getSession({ headers, query: { disableCookieCache: true } }) and redirect null sessions before protected routes render.",
    localProofStatus: "mapped",
  },
  {
    key: "signed-in-auth-route",
    currentSupabaseBehavior: "Authenticated users visiting login/signup are redirected back to the workshop shell.",
    betterAuthD1Requirement:
      "Use the secure Better Auth server session check rather than getSessionCookie before auth-route redirects.",
    localProofStatus: "mapped",
  },
  {
    key: "closed-beta-denial",
    currentSupabaseBehavior: "Closed-beta access uses the session email and redirects blocked users to /access-required.",
    betterAuthD1Requirement:
      "Resolve the Better Auth user email from D1-backed session identity before running the existing closed-beta policy.",
    localProofStatus: "mapped",
  },
  {
    key: "terms-gate",
    currentSupabaseBehavior: "Terms acceptance is enforced after identity is known and before protected workshop access.",
    betterAuthD1Requirement:
      "Preserve the terms gate after Better Auth session validation and before setting protected-route gate headers.",
    localProofStatus: "mapped",
  },
  {
    key: "invite-entry",
    currentSupabaseBehavior: "Invite continue, accept, and sign-out routes branch on current Supabase user context.",
    betterAuthD1Requirement:
      "Port invite entry to the Better Auth D1 session/user context before replacing Supabase session helpers.",
    localProofStatus: "mapped",
  },
  {
    key: "local-dev-bypass",
    currentSupabaseBehavior: "Local dev auth can satisfy protected routes without a live Supabase session.",
    betterAuthD1Requirement:
      "Keep the local dev auth gate ahead of provider-backed Better Auth session validation for local-only proof runs.",
    localProofStatus: "mapped",
  },
  {
    key: "oauth-magic-link-callback",
    currentSupabaseBehavior: "Supabase callback and OTP actions own OAuth, magic-link, and sign-out provider calls.",
    betterAuthD1Requirement:
      "Mount Better Auth handlers and email/OAuth provider config only after D1 schema, secrets, and callback tests are ready.",
    localProofStatus: "deferred",
  },
] as const satisfies readonly BetterAuthRouteGateParityRequirement[];

async function loadBetterAuthRuntime(): Promise<BetterAuthRuntime> {
  const [{ betterAuth }, { nextCookies, toNextJsHandler }, { getMigrations }] = await Promise.all([
    import(BETTER_AUTH_MODULE),
    import(BETTER_AUTH_NEXT_MODULE),
    import(BETTER_AUTH_MIGRATION_MODULE),
  ]);

  return {
    betterAuth: betterAuth as BetterAuthRuntime["betterAuth"],
    nextCookies: nextCookies as BetterAuthRuntime["nextCookies"],
    toNextJsHandler: toNextJsHandler as BetterAuthRuntime["toNextJsHandler"],
    getMigrations: getMigrations as BetterAuthRuntime["getMigrations"],
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
    session: {
      cookieCache: {
        enabled: false,
      },
    },
    advanced: options.waitUntil
      ? {
          backgroundTasks: {
            handler: options.waitUntil,
          },
        }
      : undefined,
    plugins: options.enableNextCookies === false ? [] : [runtime.nextCookies()],
  };

  return config;
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
