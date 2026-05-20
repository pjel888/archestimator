const DEV_AUTH_BYPASS_FLAG = "ARCHESTIMATOR_DEV_AUTH_BYPASS";
const DEV_AUTH_ADMIN_DB_FLAG = "ARCHESTIMATOR_DEV_AUTH_ADMIN_DB";

export function isDevAuthBypassEnabled() {
  return process.env.NODE_ENV !== "production" && process.env[DEV_AUTH_BYPASS_FLAG] === "1";
}

export function isDevAdminDatabaseBypassEnabled() {
  return isDevAuthBypassEnabled() && process.env[DEV_AUTH_ADMIN_DB_FLAG] === "1";
}

export function getHostnameFromHostHeader(hostHeader: string | null | undefined) {
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

export function isDevAuthBypassRequest(hostname: string | null | undefined) {
  return isDevAuthBypassEnabled() && isLocalDevHostname(hostname);
}

export function isDevAdminDatabaseBypassRequest(hostname: string | null | undefined) {
  return isDevAdminDatabaseBypassEnabled() && isLocalDevHostname(hostname);
}
