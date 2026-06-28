# 06 — Security, Privacy, and Threat Model

PII redaction rules, OWASP logging risks, source-map handling, threat model for the new error-handling layer.

## A. Threat model

| Asset | Trust boundary | Threat | Mitigation |
|---|---|---|---|
| User PII (email, user_id, workspace_id) | Client → server log → AI agent / Sentry | PII leak via logs | Hashed IDs only; mask emails; redaction layer in logger |
| Server DB internals (Postgres error messages) | Supabase → server → client | Raw `error.message` exposes table/column names | `unwrapSupabase` translates to generic `DatabaseError`; raw message dev-only |
| Server-side secrets (Supabase service role, JWTs) | Env vars → server | Accidentally logged in error cause | Logger `redact.ts` strips known secret patterns |
| Source maps | Build artifact → public CDN | Attackers reverse-engineer minified bundles | Upload to Sentry only; never to public CDN; `.map` files in `.gitignore` |
| Auth session token | Cookie → middleware | Logged in `request.headers.cookie` | Logger redacts `cookie`, `authorization`, `set-cookie` headers |
| Client error reports | Browser → `/api/internal/client-error` | Malicious payload, DoS | Rate limit per-IP; payload size cap; validate via Zod schema |
| Sentry event payload | Server → Sentry servers | PII leak to third party | `maskAllText: true` in prod; `beforeSend` redaction hook; data scrubbers |
| Dev NDJSON file | Local filesystem | Accidentally committed to git | `.gitignore` entry; pre-commit check |

## B. PII redaction rules (`src/lib/observability/redact.ts`)

### B.1 Never-logged values

```
NEVER_LOG_KEYS = [
  'password', 'pwd', 'secret', 'token', 'authorization', 'auth', 'jwt',
  'cookie', 'set-cookie', 'api_key', 'apikey', 'service_role',
  'session', 'refresh_token', 'access_token', 'private_key', 'signature',
  'supabase_service_role_key', 'publication_token_encryption_secret',
  'publication_token_hash_secret', 'publication_access_cookie_secret',
  'resend_api_key', 'deepseek_api_key',
  'pepper', 'invite_token_pepper',
]
```

### B.2 Hashed-only values

```
HASHED_ONLY = ['user_id', 'workspace_id', 'session_id', 'account_id']
// Logger stores `user_id_hashed = sha256(user_id).slice(0, 16)` (16 hex chars)
```

### B.3 Masked values

```
MASKED = ['email', 'phone', 'ip_address']
// email: 'u***@example.com'
// phone: '+63 *** *** 1234'
// ip: '203.0.113.0' (last octet zeroed)
```

### B.4 Implementation

```ts
// src/lib/observability/redact.ts (new in P1)

import { createHash } from 'node:crypto';

const NEVER_LOG_KEYS = new Set([...]);
const HASHED_ONLY = new Set([...]);
const MASKED = new Set([...]);

export function redactForLog(
  value: unknown,
  key?: string,
): unknown {
  if (key && NEVER_LOG_KEYS.has(key.toLowerCase())) return '[REDACTED]';
  if (key && HASHED_ONLY.has(key.toLowerCase()) && typeof value === 'string') {
    return createHash('sha256').update(value).digest('hex').slice(0, 16);
  }
  if (key && MASKED.has(key.toLowerCase()) && typeof value === 'string') {
    return maskValue(key, value);
  }
  if (typeof value === 'object' && value !== null) {
    return Array.isArray(value)
      ? value.map((v) => redactForLog(v))
      : Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redactForLog(v, k)]));
  }
  return value;
}

function maskValue(key: string, value: string): string {
  if (key.toLowerCase() === 'email') {
    const [user, domain] = value.split('@');
    return `${user.slice(0, 1)}***@${domain}`;
  }
  if (key.toLowerCase() === 'phone') {
    return value.replace(/\d/g, (m, i) => (i < value.length - 4 ? '*' : m));
  }
  if (key.toLowerCase() === 'ip_address') {
    return value.replace(/\.\d+$/, '.0');
  }
  return value;
}
```

### B.5 Sentry-specific redaction

`sentry.server.config.ts` and `sentry.client.config.ts` use a `beforeSend` hook:

```ts
beforeSend(event) {
  // Scrub request bodies, headers, extra fields
  event.request = scrubRequest(event.request);
  event.extra = scrubExtra(event.extra);
  event.breadcrumbs = event.breadcrumbs?.map(scrumbBreadcrumb);
  return event;
}
```

Sentry dashboard-level Data Scrubbers also configured to mask `$password`, `$auth`, `$cookie`, `email`, `phone`, `ip_address`.

## C. OWASP logging risks addressed

Source: [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) (general reference; specific sub-issues addressed below).

| OWASP recommendation | Plan's mitigation |
|---|---|
| Don't log sensitive data | `NEVER_LOG_KEYS` set + redaction layer |
| Validate log entry size | Max record size 64KB; truncate `error.stack` to 50 frames |
| Encode log data properly | NDJSON strict encoding; no eval; no template injection surface |
| Use structured logging | OTel data model; all records are JSON |
| Don't log to client-side storage | Client errors POST to server endpoint; nothing stored in localStorage/sessionStorage |
| Implement log integrity | File system permissions on `./logs/`; notarize `dev.ndjson` lines with sequence numbers |
| Centralize logging | Single `logger` module in `src/lib/observability/logger.ts` |
| Monitor log injection | AI-tail script validates JSON per line; bad records skipped + WARN line written |

## D. Source-map handling

### D.1 Build
- `next build` produces `.next/static/chunks/*.map` files.
- `@sentry/nextjs` wizard (`sentry:wizard` CLI) adds:
  - `next.config.ts` `sentry` key with `widenClientFileUpload: true`
  - Build step that uploads maps to Sentry during CI
- `.next/*.map` files added to `.gitignore` (Next.js default).

### D.2 Production
- Source maps NEVER published to public CDN (next.config default hides them).
- Sentry stores them privately; stack traces resolve server-side.

### D.3 Dev
- Maps served locally by `next dev`; AI agent can resolve stack frames locally.

## E. Auth-specific safety (preserve existing pattern)

`src/lib/auth/error-mapping.ts` + `recordAccountSecurityEvent` already:
- Use codes instead of free-form messages
- Hash invite tokens before logging (`safe_next` field in auth callback audit)
- Redact IP addresses in audit events (`x-forwarded-for` truncated)

Plan preserves all of this. The `mapAuthCodeToAppError` bridge carries the same redaction discipline forward into `AppError.AuthError`.

## F. Client-side rate limiting

`/api/internal/client-error` route (new P3):

```ts
// src/app/api/internal/client-error/route.ts
const MAX_PER_IP_PER_MIN = 10;
const rateLimiter = new Map<string, { count: number; resetAt: number }>();

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const now = Date.now();
  const entry = rateLimiter.get(ip) ?? { count: 0, resetAt: now + 60_000 };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 60_000; }
  entry.count++;
  rateLimiter.set(ip, entry);
  if (entry.count > MAX_PER_IP_PER_MIN) {
    return new Response(null, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.message !== 'string' || body.message.length > 4096) {
    return new Response(null, { status: 400 });
  }

  logger.warn({
    timestamp: new Date().toISOString(),
    level: 'WARN',
    severity_number: 13,
    message: 'Client error report',
    context: {
      route_handler: 'POST /api/internal/client-error',
      user_agent_hashed: hashUA(req.headers.get('user-agent')),
    },
    attributes: {
      client_message: body.message.slice(0, 1024),
      client_digest: typeof body.digest === 'string' ? body.digest.slice(0, 64) : undefined,
    },
  });

  return new Response(null, { status: 204 });
}
```

For production, the in-memory `rateLimiter` Map should be replaced with an Upstash Redis or Vercel KV counter (P5 task).

## G. Validation

| Behavior | Verified by |
|---|---|
| `redactForLog` redacts every key in `NEVER_LOG_KEYS` | `tests/vitest/redact.test.ts` (new P1) |
| `redactForLog` hashes user_id consistently | same test |
| Logger never writes raw email/phone/IP | property test: random PII inputs → no leaks |
| `/api/internal/client-error` rate-limits at 10/min | `tests/vitest/client-error.test.ts` (new P3) |
| Sentry `beforeSend` strips auth headers | `tests/vitest/sentry-redact.test.ts` (new P5) |
| Source maps absent from public CDN | Playwright probe in P6 |

## H. Ponytail counterweight

The redaction layer covers the realistic threats for an MVP pre-launch:
- PII never reaches dev logs or Sentry.
- Source maps stay private.
- Rate-limit client error reports.

Out of scope for MVP:
- HSM-backed key management for hash salts.
- Formal log-integrity notarization.
- Per-tenant log isolation.
- WAF/DLP integration.
- GDPR DSAR tooling for logs (only PII in logs is hashed IDs).

These get added when external users + GDPR/PIPEDA/CCPA scope arrives.
