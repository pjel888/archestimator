const DEV_AUTH_BYPASS_FLAG = "ARCHESTIMATOR_DEV_AUTH_BYPASS";
const DEV_AUTH_ADMIN_DB_FLAG = "ARCHESTIMATOR_DEV_AUTH_ADMIN_DB";
const DEV_AUTH_BYPASS_SECRET_FLAG = "ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET";

export const DEV_AUTH_BYPASS_SECRET_HEADER = "x-archestimator-dev-auth-bypass";
const DEV_AUTH_BYPASS_SECRET_COOKIE = "archestimator-dev-auth-bypass";

export type DevAuthBypassCookieReader = {
  get(name: string): { value?: string } | undefined;
};

export function isDevAuthBypassEnabled() {
  return process.env.NODE_ENV !== "production" && process.env[DEV_AUTH_BYPASS_FLAG] === "1";
}

export function isDevAdminDatabaseBypassEnabled() {
  return isDevAuthBypassEnabled() && process.env[DEV_AUTH_ADMIN_DB_FLAG] === "1";
}

function getHostnameFromHostHeader(hostHeader: string | null | undefined) {
  const host = hostHeader?.trim() ?? "";
  if (!host) return "";
  if (host.startsWith("[")) {
    const closingBracketIndex = host.indexOf("]");
    return closingBracketIndex === -1 ? host : host.slice(1, closingBracketIndex);
  }
  return host.split(":")[0] ?? "";
}

export function isLocalDevHostname(hostname: string | null | undefined) {
  const normalizedHostname = getHostnameFromHostHeader(hostname).toLowerCase();
  return normalizedHostname === "localhost" || normalizedHostname === "127.0.0.1" || normalizedHostname === "::1" || normalizedHostname.endsWith(".localhost");
}

export function getDevAuthBypassCredentialFromRequestParts(headersList: Pick<Headers, "get">, cookieReader?: DevAuthBypassCookieReader) {
  return headersList.get(DEV_AUTH_BYPASS_SECRET_HEADER) ?? cookieReader?.get(DEV_AUTH_BYPASS_SECRET_COOKIE)?.value ?? null;
}

export function isDevAuthBypassCredentialValid(credential: string | null | undefined) {
  const expectedCredential = process.env[DEV_AUTH_BYPASS_SECRET_FLAG]?.trim() ?? "";
  const providedCredential = credential?.trim() ?? "";
  return expectedCredential.length >= 32 && providedCredential === expectedCredential;
}

export function isDevAuthBypassRequest(hostname: string | null | undefined, credential: string | null | undefined) {
  return isDevAuthBypassEnabled() && isLocalDevHostname(hostname) && isDevAuthBypassCredentialValid(credential);
}

export function isDevAdminDatabaseBypassRequest(hostname: string | null | undefined, credential: string | null | undefined) {
  return isDevAdminDatabaseBypassEnabled() && isLocalDevHostname(hostname) && isDevAuthBypassCredentialValid(credential);
}
