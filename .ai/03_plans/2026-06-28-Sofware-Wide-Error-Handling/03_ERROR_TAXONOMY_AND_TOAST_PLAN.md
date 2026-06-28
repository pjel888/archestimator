# 03 — Error Taxonomy and Toast Plan

Defines the typed `AppError` hierarchy, the toast tone+copy mapping per class, and the migration rules for existing throw sites.

## A. Design principles

1. **Every error has a stable class.** `AppError` is the root; subclasses are discriminated by a `kind` field. Switch statements exhaustively check `kind`.
2. **Every error carries a public-safe message** suitable for the user (no DB internals, no stack traces, no PII).
3. **Every error carries a private cause** for the server log + dev NDJSON (full detail).
4. **Every error maps to a stable toast tone** so the user always knows severity at a glance.
5. **Subclasses are fine-grained enough to drive copy decisions** but coarse enough to keep the taxonomy memorable. Target: 6–10 leaf classes.
6. **Auth errors stay in their own family** to preserve the existing `error-mapping.ts` + `recordAccountSecurityEvent` pattern.

## B. The `AppError` hierarchy

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
│   └── DatabaseError                (500, code: 'DATABASE_*' or 'RLS_*')
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

  /** Convert to a structured log record for the dev NDJSON / prod forwarder. */
  toLogRecord(): AppErrorLogRecord {
    return {
      timestamp: this.timestamp,
      level: 'ERROR',
      kind: this.kind,
      code: this.code,
      message: this.userMessage,
      trace_id: this.traceId,
      context: this.context,
      // stack and cause only in dev; never in prod NDJSON
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined,
      cause: process.env.NODE_ENV === 'development' ? String(this.cause) : undefined,
    };
  }
}
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

### B.3 Helper: `unwrapSupabase`

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

```ts
// src/components/ui/toast.tsx (EXTEND, not replace)

toast.appError = (err: unknown) => {
  if (err instanceof AppError) {
    const cfg = TOAST_CONFIG[err.kind];
    toast({ message: err.userMessage, tone: cfg.tone, durationMs: cfg.durationMs });
  } else if (err instanceof Error) {
    toast({ message: "Something went wrong.", tone: 'error', durationMs: 8000 });
  } else {
    toast({ message: "Unexpected error.", tone: 'error', durationMs: 8000 });
  }
};
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
export async function withActionErrors<T, Args extends unknown[]>(
  fn: (...args: Args) => Promise<T>,
): Promise<(...args: Args) => Promise<ActionResult<T>>> {
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
export function errorResponse(err: unknown, traceId?: string): NextResponse {
  const appError = err instanceof AppError ? err : new InternalError({ cause: err });
  logger.error(appError.toLogRecord());
  return NextResponse.json(
    { ok: false, error: appError.toClientJSON(), trace_id: traceId },
    { status: appError.httpStatus ?? 500 },
  );
}
```

Route handlers use `try/catch` and call `errorResponse(err)` from the catch.

## F. Auth error bridge (preserve existing pattern)

`src/lib/auth/error-mapping.ts` already maps Supabase auth errors to codes (`callback_missing_code`, etc.). Plan adds a bridge:

```ts
// src/lib/auth/error-mapping.ts (EXTEND only)
import { AuthError } from '@/lib/observability/app-error';

export function mapAuthCodeToAppError(code: string, cause?: unknown): AuthError {
  switch (code) {
    case 'callback_missing_code': return new AuthRequiredError(cause, { auth_code: code });
    case 'otp_expired':           return new AuthSessionExpiredError(cause, { auth_code: code });
    case 'beta_access_required':  return new AuthPermissionDeniedError(cause, { auth_code: code });
    // ... existing codes
    default:                      return new AuthRequiredError(cause, { auth_code: code });
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
