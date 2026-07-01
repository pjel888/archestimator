import { createHash } from "node:crypto";

type RedactionResult<T = unknown> = {
  value: T;
  tainted: boolean;
  taintedFields: string[];
};

const NEVER_LOG_KEYS = new Set([
  "authorization",
  "cookie",
  "password",
  "passcode",
  "secret",
  "setcookie",
  "set_cookie",
  "token",
  "access_token",
  "refreshtoken",
  "refresh_token",
  "apikey",
  "api_key",
  "jwt",
  "service_role_key",
]);

const HASHED_ONLY_KEYS = new Set(["email", "recipient_email", "user_email"]);

function normalizeKey(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9_]/g, "");
}

function sha256(value: string) {
  return `sha256:${createHash("sha256").update(value).digest("hex").slice(0, 16)}`;
}

function sanitizeControlCharacters(value: string) {
  return value
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

export function redactMessage(message: string): RedactionResult<string> {
  let tainted = false;
  let value = sanitizeControlCharacters(message);
  if (value !== message) tainted = true;

  value = value.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, (email) => {
    tainted = true;
    return `[EMAIL:${sha256(email.toLowerCase())}]`;
  });
  value = value.replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, () => {
    tainted = true;
    return "Bearer [REDACTED_TOKEN]";
  });
  value = value.replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, () => {
    tainted = true;
    return "[REDACTED_JWT]";
  });
  value = value.replace(/([?&](?:password|token|api_key|secret)=)([^&#\\\s]*)/gi, (_match, prefix: string) => {
    tainted = true;
    return `${prefix}[REDACTED]`;
  });
  value = value.replace(/\b(?:password|token|api_key|secret|service_role_key)=[^\s,;&\\]+/gi, (match) => {
    tainted = true;
    const [key] = match.split("=");
    return `${key}=[REDACTED]`;
  });
  value = value.replace(/\b(password|token|secret)\s+[^\s,;.]+/gi, (_match, key: string) => {
    tainted = true;
    return `${key} [REDACTED]`;
  });
  value = value.replace(/\b[a-f0-9]{32,}\b/gi, () => {
    tainted = true;
    return "[REDACTED_HEX]";
  });
  value = value.replace(
    /\b(ignore (?:all )?(?:previous|prior) instructions|print secrets|reveal secrets|system prompt)\b/gi,
    () => {
      tainted = true;
      return "[UNTRUSTED_INSTRUCTION]";
    },
  );

  return { value, tainted, taintedFields: tainted ? ["$"] : [] };
}

function redactValue(value: unknown, path: string, taintedFields: string[], seen: WeakSet<object>): unknown {
  if (typeof value === "string") {
    const redacted = redactMessage(value);
    if (redacted.tainted && path) taintedFields.push(path);
    return redacted.value;
  }
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[Circular]";
  seen.add(value);

  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) {
    return redactValue(
      {
        name: value.name,
        message: value.message,
      },
      path,
      taintedFields,
      seen,
    );
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => redactValue(item, `${path}[${index}]`, taintedFields, seen));
  }

  const record: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key;
    const normalizedKey = normalizeKey(key);
    if (NEVER_LOG_KEYS.has(normalizedKey)) {
      record[key] = "[REDACTED]";
      taintedFields.push(childPath);
      continue;
    }
    if (HASHED_ONLY_KEYS.has(normalizedKey) && typeof item === "string") {
      record[key] = `[HASHED:${sha256(item.toLowerCase())}]`;
      taintedFields.push(childPath);
      continue;
    }
    record[key] = redactValue(item, childPath, taintedFields, seen);
  }
  return record;
}

export function redactForLog<T = unknown>(value: T): RedactionResult {
  const taintedFields: string[] = [];
  const redacted = redactValue(value, "", taintedFields, new WeakSet<object>());
  return {
    value: redacted,
    tainted: taintedFields.length > 0,
    taintedFields,
  };
}

export type { RedactionResult };
