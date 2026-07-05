// ponytail: trusted client identity helper.
// Replaces insecure getClientIp that trusted X-Forwarded-For / X-Real-IP.
// See evidence/trusted-client-identity-policy.md for the full policy.

import { isIP } from "node:net";

export type ClientIdentitySource = "cf-connecting-ip" | "dev-localhost" | "preview-internal";

export type ClientIdentity = {
  ip: string;
  ipPrefix: string;
  isDev: boolean;
  isPreview: boolean;
  source: ClientIdentitySource;
};

export type ClientIdentityEnv = {
  DEV_AUTH_BYPASS?: string;
};

export function deriveClientIdentity(request: Request, env: ClientIdentityEnv = {}): ClientIdentity | null {
  const cfIp = request.headers.get("CF-Connecting-IP");
  if (cfIp) {
    const trimmed = cfIp.trim();
    if (trimmed) {
      const prefix = computeIpPrefix(trimmed);
      if (prefix) {
        return { ip: trimmed, ipPrefix: prefix, isDev: false, isPreview: false, source: "cf-connecting-ip" };
      }
    }
  }

  // CF-Connecting-IP absent → request did not traverse the Cloudflare edge.
  const url = new URL(request.url);
  const host = url.host.toLowerCase();

  if (env.DEV_AUTH_BYPASS === "1" && isLocalhostHost(host)) {
    return { ip: "127.0.0.1", ipPrefix: "127.0.0.0/24", isDev: true, isPreview: false, source: "dev-localhost" };
  }

  if (host.endsWith(".workers.dev")) {
    return { ip: "0.0.0.0", ipPrefix: "0.0.0.0/24", isDev: false, isPreview: true, source: "preview-internal" };
  }

  return null;
}

function isLocalhostHost(host: string): boolean {
  return host === "localhost" || host.startsWith("localhost:") || host === "127.0.0.1" || host.startsWith("127.0.0.1:");
}

function computeIpPrefix(ip: string): string | null {
  const version = isIP(ip);
  if (version === 4) {
    const parts = ip.split(".");
    if (parts.length !== 4) return null;
    return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
  }
  if (version === 6) {
    return computeIpv6Prefix(ip);
  }
  return null;
}

function computeIpv6Prefix(ip: string): string | null {
  const expanded = expandIpv6(ip);
  if (!expanded) return null;
  const hextets = expanded.split(":");
  let prefixHextets = hextets.slice(0, 3);
  while (prefixHextets.length > 1 && prefixHextets[prefixHextets.length - 1] === "0") {
    prefixHextets = prefixHextets.slice(0, -1);
  }
  return `${prefixHextets.join(":")}::/48`;
}

function expandIpv6(ip: string): string | null {
  const parts = ip.split("::");
  if (parts.length > 2) return null;
  let hextets: string[];
  if (parts.length === 2) {
    const head = parts[0] ? parts[0].split(":") : [];
    const tail = parts[1] ? parts[1].split(":") : [];
    const missing = 8 - head.length - tail.length;
    if (missing < 0) return null;
    hextets = [...head, ...Array<string>(missing).fill("0"), ...tail];
  } else {
    hextets = ip.split(":");
  }
  if (hextets.length !== 8) return null;
  for (const hextet of hextets) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(hextet)) return null;
  }
  return hextets.map((h) => h.toLowerCase()).join(":");
}
