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

export function isClosedBetaAccessEnabled(env: ClosedBetaEnv = process.env) {
  return env.CLOSED_BETA_ACCESS_ENABLED === "true";
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
