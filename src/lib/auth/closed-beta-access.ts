export type ClosedBetaAccessStatus =
  | "disabled"
  | "no-email"
  | "missing"
  | "invited"
  | "active"
  | "revoked"
  | "error";

export type ClosedBetaAccessResult = {
  allowed: boolean;
  status: ClosedBetaAccessStatus;
  normalizedEmail: string;
};

type ClosedBetaRpcRow = {
  allowed?: unknown;
  status?: unknown;
  normalized_email?: unknown;
};

export type ClosedBetaAccessStore = {
  checkAccess: (normalizedEmail: string) => Promise<ClosedBetaAccessResult | ClosedBetaRpcRow | ClosedBetaRpcRow[] | null>;
};

type ClosedBetaEnv = Record<string, string | undefined>;

export function normalizeClosedBetaEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase();
}

/**
 * Resolve closed-beta env with Cloudflare Worker bindings preferred over
 * process.env. Worker secrets are often present on `getCloudflareContext().env`
 * even when Node process.env is incomplete.
 */
export async function resolveClosedBetaRuntimeEnv(
  env: ClosedBetaEnv = process.env,
): Promise<ClosedBetaEnv> {
  const merged: ClosedBetaEnv = { ...env };
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const context = (await getCloudflareContext({ async: true })) as unknown as {
      env?: Record<string, unknown>;
    };
    const flag = context.env?.CLOSED_BETA_ACCESS_ENABLED;
    if (typeof flag === "string" && flag.trim().length > 0) {
      merged.CLOSED_BETA_ACCESS_ENABLED = flag.trim();
    }
    // Marker: Worker binding surface is live — used for fail-closed default.
    if (context.env && typeof context.env === "object") {
      merged.ARCHESTIMATOR_CF_RUNTIME = "1";
    }
  } catch {
    // Local Node / tests without OpenNext context.
  }
  return merged;
}

export function isClosedBetaAccessEnabled(env: ClosedBetaEnv = process.env) {
  if (env.ARCHESTIMATOR_ALLOW_OPEN_BETA === "1") return false;
  const raw = env.CLOSED_BETA_ACCESS_ENABLED;
  if (raw === "true") return true;
  if (raw === "false") return false;
  // Unset on Cloudflare Worker runtime: fail closed (close beta).
  // Unset in local Node: remain open for dogfooding (explicit true required to gate).
  return env.ARCHESTIMATOR_CF_RUNTIME === "1";
}

function normalizeRpcRow(data: ClosedBetaRpcRow | ClosedBetaRpcRow[] | null): ClosedBetaRpcRow | null {
  if (Array.isArray(data)) return data[0] ?? null;
  return data;
}

function isRpcStatus(status: unknown): status is Exclude<ClosedBetaAccessStatus, "disabled" | "no-email" | "error"> {
  return status === "missing" || status === "invited" || status === "active" || status === "revoked";
}

export async function getClosedBetaAccessForEmail({
  email,
  env = process.env,
  store,
}: {
  email: string | null | undefined;
  env?: ClosedBetaEnv;
  store?: ClosedBetaAccessStore | null;
}): Promise<ClosedBetaAccessResult> {
  const normalizedEmail = normalizeClosedBetaEmail(email);

  if (!isClosedBetaAccessEnabled(env)) {
    return { allowed: true, status: "disabled", normalizedEmail };
  }

  if (!normalizedEmail) {
    return { allowed: false, status: "no-email", normalizedEmail };
  }

  const data = await store?.checkAccess(normalizedEmail).catch(() => null);
  if (!data) {
    return { allowed: false, status: "error", normalizedEmail };
  }

  if ("allowed" in data && "normalizedEmail" in data) {
    return data;
  }

  const row = normalizeRpcRow(data);
  const status = isRpcStatus(row?.status) ? row.status : "error";
  const rpcNormalizedEmail = typeof row?.normalized_email === "string" ? row.normalized_email : normalizedEmail;

  return {
    allowed: row?.allowed === true && (status === "invited" || status === "active"),
    status,
    normalizedEmail: rpcNormalizedEmail,
  };
}

export function buildClosedBetaAccessPath(status: ClosedBetaAccessStatus) {
  return status === "revoked" ? "/access-required?status=revoked" : "/access-required";
}
