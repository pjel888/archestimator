function readUrlHost(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

function readAppHost(request: Request, headers: Headers): string | null {
  const forwardedHost = headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (forwardedHost) return forwardedHost;
  const host = headers.get("host")?.trim();
  if (host) return host;
  try {
    return new URL(request.url).host;
  } catch {
    return null;
  }
}

export function isAllowedInviteOrigin(request: Request): boolean {
  const headers = request.headers;
  const appHost = readAppHost(request, headers);
  // If host derivation is impossible, preserve local/test behavior rather than
  // blocking a legitimate same-site invite action in a degenerate environment.
  if (!appHost) return true;

  const originHost = readUrlHost(headers.get("origin"));
  if (originHost) {
    return originHost === appHost;
  }

  const refererHost = readUrlHost(headers.get("referer"));
  if (refererHost) {
    return refererHost === appHost;
  }

  return true;
}
