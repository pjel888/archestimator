# 03 — Error Taxonomy and Toast Plan

Defines the typed `AppError` hierarchy, the toast tone+copy mapping per class, and the migration rules for existing throw sites.

## A. Design principles

1. **Every error has a stable class.** `AppError` is the root; subclasses are discriminated by a `kind` field. Switch statements exhaustively check `kind`.
2. **Every error carries a public-safe message** suitable for the user (no DB internals, no stack traces, no PII).
3. **Every error carries a private cause** for the server log + dev NDJSON (full detail).
4. **Every error maps to a stable toast tone** so the user always knows severity at a glance.
5. **Subclasses are fine-grained enough to drive copy decisions** but coarse enough to keep the taxonomy memorable. Target: 6–10 `kind` values and a small concrete class set.
6. **Auth errors stay in their own family** to preserve the existing `error-mapping.ts` + `recordAccountSecurityEvent` pattern.

## B. The `AppError` hierarchy

Canonical count: **9 public `AppErrorKind` values, 12 concrete subclasses**. The four auth subclasses intentionally share `kind: 'auth'` so client code can handle auth consistently while preserving specific codes and copy.

```
AppError (abstract root)
├── kind: 'auth'
│   └── AuthError
│       ├── AuthRequiredError        (401, code: 'AUTH_REQUIRED')
│       ├── AuthSessionExpiredError  (401, code: 'AUTH_SESSION_EXPIRED')
│       ├── AuthPermissionDeniedError(403, code: 'AUTH_PERMISSION_DENIED')
│       └── AuthRateLimitedError     (429, code: 'AUTH_RATE_LIMITED')
├── kind: 'validation'
│   └── ValidationError              (400, code: 'VALIDATION_*')
├── kind: 'not_found'
│   └── NotFoundError                (404, code: 'NOT_FOUND')
├── kind: 'conflict'
│   └── ConflictError                (409, code: 'CONFLICT')
├── kind: 'database'
│   └── DatabaseError                (500, code: 'DATABASE_*') — non-RLS Postgres failures only; RLS/42501 denials go to AuthPermissionDeniedError per B.4 unwrapSupabase
├── kind: 'upstream'
│   └── UpstreamError                (502/503/504, code: 'UPSTREAM_*')
├── kind: 'rate_limit'
│   └── RateLimitError               (429, code: 'RATE_LIMIT_*')
├── kind: 'network'
│   └── NetworkError                 (no HTTP, code: 'NETWORK_*')
└── kind: 'internal'
    └── InternalError                (500, code: 'INTERNAL')
```

### B.1 `AppError` shape (canonical)

```ts
// src/lib/observability/app-error.ts (new in P1)
import { redactForLog } from './redact';
import type { AppErrorLogRecord } from './types';

export type AppErrorKind =
  | 'auth' | 'validation' | 'not_found' | 'conflict'
  | 'database' | 'upstream' | 'rate_limit' | 'network' | 'internal';

export interface AppErrorOptions {
  /** Public-safe message shown to the user via Toast. No PII, no stack. */
  userMessage: string;
  /** Stable machine code for the error class, e.g. 'AUTH_REQUIRED'. */
  code: string;
  /** HTTP status for route handlers; ignored for server actions. */
  httpStatus?: number;
  /** Original cause for server log only. Never sent to client. */
  cause?: unknown;
  /** Optional breadcrumbs for the dev/AI log. */
  context?: Record<string, string | number | boolean | null>;
}

export abstract class AppError extends Error {
  abstract readonly kind: AppErrorKind;
  readonly userMessage: string;
  readonly code: string;
  readonly httpStatus?: number;
  readonly context?: Record<string, string | number | boolean | null>;
  readonly timestamp: string; // ISO 8601
  readonly traceId?: string;  // from AsyncLocalStorage / PERF_TRACE

  constructor(opts: AppErrorOptions) {
    super(opts.userMessage);
    this.name = this.constructor.name;
    this.userMessage = opts.userMessage;
    this.code = opts.code;
    this.httpStatus = opts.httpStatus;
    this.context = opts.context;
    this.cause = opts.cause;
    this.timestamp = new Date().toISOString();
  }

  /** Convert to a redacted client-safe JSON for server action / route handler returns. */
  toClientJSON(): { kind: AppErrorKind; code: string; message: string } {
    return { kind: this.kind, code: this.code, message: this.userMessage };
  }

  /** Severity level for logging. Subclasses override per the table in `04` Section B.3. */
  toLogLevel(): 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL' {
    // Default — most subclasses override (see hierarchy below).
    return 'ERROR';
  }

  /** Convert to a structured log record for the dev NDJSON / prod forwarder. */
  toLogRecord(): AppErrorLogRecord {
    // AppErrorLogRecord is a *partial* DevLogRecord — it omits `record_id`
    // and `severity_number`, which the logger adds at emit time:
    //   - `record_id` is generated per-emit (see `04` Section C.2)
    //   - `severity_number` is derived from `level` per the OTel map in `04` Section B.3
    // `level` is sourced from `toLogLevel()` so each AppError subclass maps
    // to the correct OTel severity (auth/validation/not_found → INFO, conflict/
    // rate_limit/network → WARN, database/upstream/internal → ERROR; see `04` B.3).
    return {
      timestamp: this.timestamp,
      level: this.toLogLevel(),
      message: this.userMessage,
      error: {
        kind: this.kind,
        code: this.code,
        class: this.name,
        message: this.userMessage,
        stack: process.env.NODE_ENV === 'development' ? this.stack?.split('\n').slice(0, 50) : undefined,
        cause: process.env.NODE_ENV === 'development' ? String(redactForLog(this.cause)) : undefined,
      },
      context: this.context,
    };
  }
}
```

**Per-subclass `toLogLevel()` overrides** (matches the severity table in `04` Section B.3):

```ts
// Auth family — INFO for required/expired, WARN for denied/rate-limited
export class AuthRequiredError extends AppError {
  readonly kind = 'auth' as const;
  toLogLevel() { return 'INFO' as const; }
  // ... constructor per B.2
}
export class AuthSessionExpiredError extends AppError {
  readonly kind = 'auth' as const;
  toLogLevel() { return 'INFO' as const; }
}
export class AuthPermissionDeniedError extends AppError {
  readonly kind = 'auth' as const;
  toLogLevel() { return 'WARN' as const; }
}
export class AuthRateLimitedError extends AppError {
  readonly kind = 'auth' as const;
  toLogLevel() { return 'WARN' as const; }
}

// Validation, not_found → INFO
export class ValidationError extends AppError {
  readonly kind = 'validation' as const;
  toLogLevel() { return 'INFO' as const; }
}
export class NotFoundError extends AppError {
  readonly kind = 'not_found' as const;
  toLogLevel() { return 'INFO' as const; }
}

// Conflict, rate_limit, network → WARN
export class ConflictError extends AppError {
  readonly kind = 'conflict' as const;
  toLogLevel() { return 'WARN' as const; }
}
export class RateLimitError extends AppError {
  readonly kind = 'rate_limit' as const;
  toLogLevel() { return 'WARN' as const; }
}
export class NetworkError extends AppError {
  readonly kind = 'network' as const;
  toLogLevel() { return 'WARN' as const; }
}

// Database, upstream → ERROR. These two accept an optional options object
// (same shape as InternalError in B.3) so callers can pass just
// `{ cause, context }` and inherit safe defaults. InternalError is declared
// separately in B.3 with the same object-form pattern.
export class DatabaseError extends AppError {
  readonly kind = 'database' as const;
  constructor(opts?: { cause?: unknown; userMessage?: string; code?: string; context?: AppErrorOptions['context'] }) {
    super({
      userMessage: opts?.userMessage ?? "Something went wrong on our end. We're looking into it.",
      code: opts?.code ?? 'DATABASE',
      httpStatus: 500,
      cause: opts?.cause,
      context: opts?.context,
    });
  }
}
export class UpstreamError extends AppError {
  readonly kind = 'upstream' as const;
  constructor(opts?: { cause?: unknown; userMessage?: string; code?: string; context?: AppErrorOptions['context']; httpStatus?: number }) {
    super({
      userMessage: opts?.userMessage ?? "A third-party service is unavailable. Try again in a moment.",
      code: opts?.code ?? 'UPSTREAM',
      httpStatus: opts?.httpStatus ?? 502,
      cause: opts?.cause,
      context: opts?.context,
    });
  }
}
// InternalError declared in B.3 above (same object-form pattern).
```

`AppErrorLogRecord` and `DevLogRecord` (defined in `04` Section B.1) compose like so:

```ts
// src/lib/observability/types.ts (new in P1)
export interface AppErrorLogRecord {
  timestamp: string;
  level: 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  message: string;
  error?: DevLogRecord['error'];
  context?: DevLogRecord['context'];
  agent_decision?: DevLogRecord['agent_decision'];
  attributes?: DevLogRecord['attributes'];
}

// The logger enriches AppErrorLogRecord → DevLogRecord at emit time:
//   record_id     = `${timestampNs}-${processCounter++}`
//   severity_number = SEVERITY_BY_LEVEL[level]  // per `04` Section B.3
```

### B.2 Concrete subclass example

```ts
export class AuthRequiredError extends AppError {
  readonly kind = 'auth' as const;
  constructor(cause?: unknown, context?: AppErrorOptions['context']) {
    super({
      userMessage: 'Please sign in to continue.',
      code: 'AUTH_REQUIRED',
      httpStatus: 401,
      cause,
      context,
    });
  }
}
```

### B.3 `InternalError` constructor (object form)

`InternalError` accepts an optional options object so both `new InternalError({ cause: err })` (defaults apply) and the `throwActionError` shim form `new InternalError({ userMessage, code: 'LIBRARY_ACTION', cause })` (see `05` B.1) compose cleanly. The other typed subclasses follow the positional `(cause?, context?)` form shown in B.2.

```ts
export class InternalError extends AppError {
  readonly kind = 'internal' as const;
  constructor(opts?: {
    cause?: unknown;
    userMessage?: string;
    code?: string;
    context?: AppErrorOptions['context'];
  }) {
    super({
      userMessage: opts?.userMessage ?? "Something went wrong. We're looking into it.",
      code: opts?.code ?? 'INTERNAL',
      httpStatus: 500,
      cause: opts?.cause,
      context: opts?.context,
    });
  }
}
```

### B.4 Helper: `unwrapSupabase`

```ts
// src/lib/observability/unwrap-supabase.ts (new in P1)

import { AuthRequiredError, AuthPermissionDeniedError, DatabaseError, RateLimitError } from './app-error';

export function unwrapSupabase<T>(
  result: { data: T | null; error: { message: string; code?: string } | null },
  ctx: { operation: string; relation?: string },
): T {
  if (result.error) {
    const msg = result.error.message.toLowerCase();
    const code = result.error.code ?? '';
    if (msg.includes('jwt') || code === 'PGRST301' || msg.includes('auth')) throw new AuthRequiredError(result.error, ctx);
    if (msg.includes('permission') || msg.includes('rls') || code.startsWith('42501')) throw new AuthPermissionDeniedError(result.error, ctx);
    if (msg.includes('rate limit') || code === 'PGRST309') throw new RateLimitError(result.error, ctx);
    throw new DatabaseError({ cause: result.error, context: ctx });
  }
  return result.data as T;
}
```

## C. Toast tone + copy mapping

| `AppError` kind | Toast tone | Default copy | Duration |
|---|---|---|---|
| `auth.AUTH_REQUIRED` | info | "Please sign in to continue." | 5s |
| `auth.AUTH_SESSION_EXPIRED` | info | "Your session expired. Please sign in again." | 7s |
| `auth.AUTH_PERMISSION_DENIED` | warning | "You don't have permission to do that." | 6s |
| `auth.AUTH_RATE_LIMITED` | warning | "Too many attempts. Try again in a minute." | 6s |
| `validation.*` | warning | The validation message (e.g. "Email is required.") | 7s |
| `not_found.*` | info | "We couldn't find that." | 5s |
| `conflict.*` | warning | "That conflicts with existing data. Refresh and try again." | 7s |
| `database.*` | error | "Something went wrong on our end. We're looking into it." | 8s |
| `upstream.*` | error | "A third-party service is unavailable. Try again in a moment." | 8s |
| `rate_limit.*` | warning | "Too many requests. Slow down a bit." | 6s |
| `network.*` | warning | "Network issue. Check your connection." | 6s |
| `internal.*` | error | "Something went wrong. We're looking into it." | 8s |

All toasts are dismissible.

### C.1 Toast convenience method

The toast lookup keys by `code` (which is unique per concrete subclass) — NOT by `kind`. This is required because the four auth subclasses share `kind: 'auth'` but need different tones (info vs warning) and copy. The lookup tables live in the canonical `src/lib/observability/toast-config.ts` module (per `05` Section A.1, `07` FR-006, `08` P1-WP8). `src/components/ui/toast.tsx` imports from there.

```ts
// src/lib/observability/toast-config.ts (new in P1, per 08 P1-WP8)
import type { AppError, AppErrorKind } from './app-error';

// Keyed by AppError `code` (unique per concrete subclass). See Section C table.
export const TOAST_CONFIG: Record<string, { tone: 'info'|'warning'|'error'; durationMs: number }> = {
  AUTH_REQUIRED:           { tone: 'info',    durationMs: 5000 },
  AUTH_SESSION_EXPIRED:    { tone: 'info',    durationMs: 7000 },
  AUTH_PERMISSION_DENIED:  { tone: 'warning', durationMs: 6000 },
  AUTH_RATE_LIMITED:       { tone: 'warning', durationMs: 6000 },
  // validation.* codes vary; fallback below handles them with tone=warning
  NOT_FOUND:               { tone: 'info',    durationMs: 5000 },
  CONFLICT:                { tone: 'warning', durationMs: 7000 },
  RATE_LIMIT:              { tone: 'warning', durationMs: 6000 },
  NETWORK:                 { tone: 'warning', durationMs: 6000 },
  DATABASE:                { tone: 'error',   durationMs: 8000 },
  UPSTREAM:                { tone: 'error',   durationMs: 8000 },
  INTERNAL:                { tone: 'error',   durationMs: 8000 },
};

// Kind-level fallback for validation/database/upstream wildcard codes
export const TOAST_FALLBACK_BY_KIND: Record<AppErrorKind, { tone: 'info'|'warning'|'error'; durationMs: number }> = {
  auth:         { tone: 'info',    durationMs: 5000 },
  validation:   { tone: 'warning', durationMs: 7000 },
  not_found:    { tone: 'info',    durationMs: 5000 },
  conflict:     { tone: 'warning', durationMs: 7000 },
  database:     { tone: 'error',   durationMs: 8000 },
  upstream:     { tone: 'error',   durationMs: 8000 },
  rate_limit:   { tone: 'warning', durationMs: 6000 },
  network:      { tone: 'warning', durationMs: 6000 },
  internal:     { tone: 'error',   durationMs: 8000 },
};
```

```ts
// src/components/ui/toast.tsx (EXTEND, not replace)
import { AppError } from '@/lib/observability/app-error';
import { TOAST_CONFIG, TOAST_FALLBACK_BY_KIND } from '@/lib/observability/toast-config';

toast.appError = (err: unknown) => {
  // Accepts three input shapes:
  //   1. AppError instance — uses err.code / err.kind directly
  //   2. Serialized ActionResult error arm {kind, code, message} from server action —
  //      looks up config by code, falls back by kind, then uses the serialized message
  //   3. Error instance or unknown — generic fallback
  if (err instanceof AppError) {
    const cfg = TOAST_CONFIG[err.code] ?? TOAST_FALLBACK_BY_KIND[err.kind];
    toast({ message: err.userMessage, tone: cfg.tone, durationMs: cfg.durationMs });
  } else if (isSerializedAppError(err)) {
    // err is the wire shape from ActionResult error arm or route handler JSON body.
    const cfg = TOAST_CONFIG[err.code] ?? TOAST_FALLBACK_BY_KIND[err.kind];
    toast({ message: err.message, tone: cfg.tone, durationMs: cfg.durationMs });
  } else if (err instanceof Error) {
    toast({ message: "Something went wrong.", tone: 'error', durationMs: 8000 });
  } else {
    toast({ message: "Unexpected error.", tone: 'error', durationMs: 8000 });
  }
};

// Type guard for the serialized AppError wire shape ({kind, code, message}).
function isSerializedAppError(value: unknown): value is { kind: AppError['kind']; code: string; message: string } {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.kind === 'string' && typeof v.code === 'string' && typeof v.message === 'string';
}
```

This is **additive**. The existing `toast({message, tone, durationMs})` API stays untouched. Off-limits rule preserved.

## D. Server Action canonical return shape

```ts
// src/lib/observability/action-result.ts (new in P1)

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { kind: AppErrorKind; code: string; message: string } };
```

Every server action returns `ActionResult<T>`. Migration rules:

| Current pattern | Migration |
|---|---|
| `throw new Error(msg)` | Replace with `throw new AppError.Subclass(...)` if unexpected, or return `{ok:false, error}` if expected |
| `throw projectError` (raw Supabase) | Wrap with `unwrapSupabase(...)` |
| `{ok:false, error, code}` | Already close — refactor to `{ok:false, error:{kind, code, message}}` |
| `{data, error}` | Repository layer stays as-is; service layer translates via `unwrapSupabase` |
| `{ok:false, code:'unauthenticated'}` | Map code → AppError kind in a thin wrapper |

The wrapper helper:

```ts
// src/lib/observability/with-action-errors.ts (new in P1)
export function withActionErrors<T, Args extends unknown[]>(
  fn: (...args: Args) => Promise<T>,
): (...args: Args) => Promise<ActionResult<T>> {
  return async (...args) => {
    try {
      const data = await fn(...args);
      return { ok: true, data };
    } catch (err) {
      if (err instanceof AppError) {
        logger.error(err.toLogRecord());
        return { ok: false, error: err.toClientJSON() };
      }
      // Unknown error → wrap in InternalError
      const wrapped = new InternalError({ cause: err });
      logger.error(wrapped.toLogRecord());
      return { ok: false, error: wrapped.toClientJSON() };
    }
  };
}
```

Server actions are wrapped at export time. Example:
```ts
// before
export async function createProject(input: CreateProjectInput) { ... }
// after
export const createProject = withActionErrors(async (input: CreateProjectInput) => { ... });
```

## E. Route Handler canonical error response

```ts
// src/lib/observability/route-error.ts (new in P1)
import { getCurrentPerfTraceSnapshot } from '@/lib/perf/server-timing';

export function errorResponse(err: unknown, traceIdOverride?: string): NextResponse {
  const appError = err instanceof AppError ? err : new InternalError({ cause: err });
  logger.error(appError.toLogRecord());
  // Derive trace_id from PERF_TRACE AsyncLocalStorage when caller does not pass one.
  // This satisfies FR-003 AC-003.1 (every handler error response includes trace_id)
  // without requiring every call site to thread the trace manually.
  const traceId = traceIdOverride ?? getCurrentPerfTraceSnapshot()?.requestId ?? generateTraceId();
  return NextResponse.json(
    { ok: false, error: appError.toClientJSON(), trace_id: traceId },
    { status: appError.httpStatus ?? 500 },
  );
}

function generateTraceId(): string {
  return `err_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
```

Route handlers use `try/catch` and call `errorResponse(err)` from the catch; `trace_id` is auto-derived.

## F. Auth error bridge (preserve existing pattern)

`src/lib/auth/error-mapping.ts` already defines six auth codes: `email_required`, `auth_request_failed`, `google_request_failed`, `callback_missing_code`, `callback_exchange_failed`, `invalid_redirect`. Plan adds a bridge that maps each of these existing codes to an `AuthError` subclass. Codes outside the existing set (e.g. Supabase-native `otp_expired`, future `beta_access_required`) are NOT introduced by this plan; if they are added to the source later, the bridge switch is extended at that time.

```ts
// src/lib/auth/error-mapping.ts (EXTEND only)
import { AuthError, AuthRequiredError } from '@/lib/observability/app-error';

export function mapAuthCodeToAppError(code: string, cause?: unknown): AuthError {
  switch (code) {
    case 'email_required':
    case 'auth_request_failed':
    case 'google_request_failed':
    case 'callback_missing_code':
    case 'callback_exchange_failed':
    case 'invalid_redirect':
      return new AuthRequiredError(cause, { auth_code: code });
    default:
      // Unknown code → safest default; do not invent semantics for codes the
      // source does not yet emit (e.g. otp_expired, beta_access_required).
      return new AuthRequiredError(cause, { auth_code: code });
  }
}
```

`recordAccountSecurityEvent` calls stay — they're a complementary audit channel.

## G. Migration inventory (drives P2 implementation)

For each of the 22 server action files (`01_SOURCE_AUDIT.md` B.1):

| Module | Primary change |
|---|---|
| `auth/{account,actions,beta-allowlist-admin}-actions.ts` | Wrap with `withActionErrors`; map auth codes via `mapAuthCodeToAppError` |
| `collaboration/{actions,pending-invite,realtime-identity,summary}-actions.ts` | Wrap; replace raw throws with `AuthPermissionDeniedError` / `ConflictError` |
| `component-library/{actions,template-editor-actions}.ts` | Already uses `throwActionError` — migrate to `withActionErrors` + `AppError` subclasses |
| `estimate-sheet/user-preferences-actions.ts` | Wrap; mostly validation → `ValidationError` |
| `estimates/{actions,express-promotion,subtree}-actions.ts` | Wrap; replace raw Supabase throws with `unwrapSupabase` |
| `favorites/sidebar-favorites-actions.ts` | Wrap |
| `legal/actions.ts` | Wrap |
| `notifications/actions.ts` | Already returns `{ok:false,code}` — refactor to typed shape |
| `projects/{actions,location-actions}.ts` | Wrap; replace raw throws |
| `publication/actions.ts` | **HIGHEST PRIORITY** — has 7 raw `throw projectError` sites that leak DB internals. Wrap + `unwrapSupabase` |
| `publisher/{activity-actions,drawer-actions}.ts` | Wrap |
| `reusable-sources/actions.ts` | Wrap |
| `workshop/{actions,beta-feedback,beta-feedback-review,group-actions}.ts` | Wrap |

Each of the 22 route handlers gets `try { ... } catch (err) { return errorResponse(err, traceId) }`.

## H. Off-limits (per README)

- `src/components/ui/toast.tsx` base `toast()` API — only extended, never renamed.
- `src/lib/auth/error-mapping.ts` existing codes — preserved; bridge is additive.
- `src/lib/auth/account-audit.ts` audit event recorder — preserved.
