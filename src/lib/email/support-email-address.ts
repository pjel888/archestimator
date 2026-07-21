/**
 * Address and header normalization for support email.
 * Rejects CR/LF injection and control characters.
 */

const CONTROL_OR_CRLF = /[\u0000-\u001f\u007f]/;

export type NormalizedEmailAddress = {
  email: string;
  local: string;
  domain: string;
  name: string | null;
};

export function containsHeaderInjection(value: string) {
  return CONTROL_OR_CRLF.test(value);
}

export function sanitizeHeaderText(value: string, maxLength: number): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (containsHeaderInjection(trimmed)) {
    throw new Error("Header value contains disallowed control characters.");
  }
  if (trimmed.length > maxLength) {
    throw new Error(`Value must be ${maxLength} characters or fewer.`);
  }
  return trimmed;
}

export function normalizeEmailAddress(raw: string, options: { maxLength?: number } = {}): NormalizedEmailAddress {
  const maxLength = options.maxLength ?? 254;
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Email address is required.");
  if (containsHeaderInjection(trimmed)) {
    throw new Error("Email address contains disallowed control characters.");
  }
  if (trimmed.length > maxLength) {
    throw new Error(`Email address must be ${maxLength} characters or fewer.`);
  }

  // Optional display-name form: Name <addr@domain>
  let email = trimmed;
  let name: string | null = null;
  const angle = trimmed.match(/^(.*)<([^>]+)>\s*$/);
  if (angle) {
    name = angle[1]?.trim().replace(/^"|"$/g, "") || null;
    email = angle[2]?.trim() ?? "";
    if (name && containsHeaderInjection(name)) {
      throw new Error("Display name contains disallowed control characters.");
    }
  }

  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) {
    throw new Error("Email address is invalid.");
  }
  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();
  if (!local || !domain || domain.includes(" ") || local.includes(" ")) {
    throw new Error("Email address is invalid.");
  }
  if (containsHeaderInjection(local) || containsHeaderInjection(domain)) {
    throw new Error("Email address contains disallowed control characters.");
  }

  return {
    email: `${local}@${domain}`,
    local,
    domain,
    name: name && name.length > 120 ? name.slice(0, 120) : name,
  };
}

export function normalizeSupportRecipients(input: {
  to: readonly string[];
  cc?: readonly string[];
  excluded?: readonly string[];
  maxRecipients?: number;
}) {
  const excluded = new Set((input.excluded ?? []).map((address) => normalizeEmailAddress(address).email.toLowerCase()));
  const seen = new Set<string>();
  const normalize = (addresses: readonly string[]) => addresses.flatMap((address) => {
    const parsed = normalizeEmailAddress(address);
    const email = parsed.email.toLowerCase();
    if (excluded.has(email) || seen.has(email)) return [];
    seen.add(email);
    return [parsed];
  });
  const to = normalize(input.to);
  const cc = normalize(input.cc ?? []);
  if (to.length === 0) throw new Error("At least one recipient is required.");
  if (to.length + cc.length > (input.maxRecipients ?? 20)) throw new Error("Too many recipients.");
  return { to, cc };
}

export function normalizeMessageId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (containsHeaderInjection(trimmed)) return null;
  // Canonical form without surrounding whitespace; keep angle brackets if present.
  return trimmed.slice(0, 998);
}

export function splitReferencesHeader(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const matches = raw.match(/<[^>]+>/g);
  if (matches?.length) {
    return matches.map((id) => normalizeMessageId(id)).filter((id): id is string => Boolean(id));
  }
  return raw
    .split(/\s+/)
    .map((part) => normalizeMessageId(part))
    .filter((id): id is string => Boolean(id));
}

export function formatReplySubject(subject: string | null | undefined) {
  const base = (subject ?? "").trim() || "Archestimator support";
  if (containsHeaderInjection(base)) {
    throw new Error("Subject contains disallowed control characters.");
  }
  if (/^re:\s*/i.test(base)) return base.slice(0, 160);
  return `Re: ${base}`.slice(0, 160);
}

export function encodeDisplayName(name: string | null | undefined) {
  if (!name) return null;
  const sanitized = sanitizeHeaderText(name, 120);
  return sanitized;
}

/** Redact local-part for logs: a***@domain.com */
export function redactEmailForLogs(email: string | null | undefined) {
  if (!email) return null;
  const at = email.indexOf("@");
  if (at <= 0) return "[redacted]";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}

export function senderDomain(email: string | null | undefined) {
  if (!email) return null;
  const at = email.lastIndexOf("@");
  return at > 0 ? email.slice(at + 1).toLowerCase() : null;
}
