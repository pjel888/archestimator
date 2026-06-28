# 05 — Architecture and Technical Design

Where each module lives, what it exports, how it composes with existing code.

## A. New modules

### A.1 `src/lib/observability/` (new directory in P1)

```
src/lib/observability/
├── app-error.ts                  # AppError root + 9 public kinds / 12 concrete subclasses
├── action-result.ts              # ActionResult<T> discriminated union
├── unwrap-supabase.ts            # Supabase {data,error} → AppError translator
├── with-action-errors.ts         # Server Action wrapper
├── route-error.ts                # Route Handler errorResponse()
├── logger.ts                     # NDJSON writer (dev) + prod forwarder shim
├── redact.ts                     # PII redaction rules
├── toast-config.ts               # code → {tone, durationMs} map (with kind fallback); copy comes from AppError.userMessage
└── types.ts                      # DevLogRecord, AppErrorLogRecord shared types
```

Total new code in P1: ~600 lines.

### A.2 `instrumentation.ts` at project root (new in P5)

```ts
// instrumentation.ts
import { type Instrumentation } from 'next';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const sentry = await import('./sentry.server.config');
    // sentry.server.config.ts exports its own register() that calls Sentry.init().
    // The import alone does not run it — call it explicitly.
    if (typeof sentry.register === 'function') {
      await sentry.register();
    }
  }
}

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const { captureRequestError } = await import('./sentry.server.config');
  await captureRequestError(err, request, context);
};
```

### A.3 `sentry.server.config.ts` (new in P5)

```ts
// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs';

export async function register() {
  // Kill switch per `10_ROLLOUT_ROLLBACK_OPS.md` A: SENTRY_ENABLED=false makes this a no-op.
  if (process.env.SENTRY_ENABLED === 'false') return;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: process.env.npm_package_version,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    maskAllText: process.env.NODE_ENV === 'production',
    beforeSend(event) {
      return redactSentryEvent(event);
    },
  });
}

export async function captureRequestError(error, request, context) {
  // Honor the same kill switch on the capture path.
  if (process.env.SENTRY_ENABLED === 'false') return;
  // Sanitize before capture: use context.routePath (parameter-free Next.js
  // route pattern) instead of request.path (which may include query string
  // per node_modules/next/dist/docs/.../instrumentation.md). Method and
  // routerKind are low-cardinality. No raw URL, no query, no headers.
  Sentry.captureException(error, {
    extra: {
      method: request.method,
      routePath: context.routePath,  // parameter-free; safe per `10` E.1 runbook
      routerKind: context.routerKind,
    },
  });
}
```

### A.4 `sentry.client.config.ts` (new in P5)

Mirrors server config; loaded by the Next.js Sentry wizard. Same redaction rules. **Client-side kill switch uses `NEXT_PUBLIC_SENTRY_ENABLED`** (not `SENTRY_ENABLED`) because Next.js docs require the `NEXT_PUBLIC_` prefix for env vars available in the browser bundle (`node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`). Operators set both `SENTRY_ENABLED=false` (server) and `NEXT_PUBLIC_SENTRY_ENABLED=false` (client) for a full rollback; the client var must be set at build time.

### A.5 `src/app/global-error.tsx` (new in P3a)

```tsx
"use client";
import { useEffect, useRef } from 'react';

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const containerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    // A11Y-002 (pilot scope): move focus into the error container so
    // screen-reader users hear the failure immediately on mount.
    containerRef.current?.focus();
    // Client-side error → also forward to server log via /api/internal/client-error.
    // The CLIENT POST payload is raw `{message, digest, path}` — these are
    // UNTRUSTED client-supplied fields. The SERVER (per `06` Section F)
    // sanitizes them into the logged contract
    // `{client_message_redacted, digest, path_normalized, user_agent_hashed}`
    // before writing to ./logs/dev.ndjson. The client never sends
    // pre-redacted fields; the redaction is server-side.
    fetch('/api/internal/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        digest: error.digest,
        path: window.location.pathname,
      }),
    }).catch(() => { /* swallow; logging is best-effort */ });
  }, [error]);

  return (
    <html lang="en">
      <body>
        {/* tabIndex=-1 makes the container programmatically focusable (not in tab order). */}
        <main ref={containerRef} tabIndex={-1} role="alert">
          <h1>Something went wrong</h1>
          <p>We could not load this page. Try again or return home.</p>
          {error.digest ? <p>Reference: {error.digest}</p> : null}
          <button onClick={() => unstable_retry()}>Try again</button>
          <a href="/">Go home</a>
        </main>
      </body>
    </html>
  );
}
```

**Note:** `global-error.tsx` must render `<html>` and `<body>` itself because the root layout is bypassed.

**Dev-only test trigger (for ADV-05 in `09`):** add a small gated hook in `src/app/layout.tsx` (or a tiny client component mounted by the root layout) that throws on `?forceGlobalError=1` query param when `process.env.NODE_ENV === 'development'`. This makes the Playwright spec `page.goto('/?forceGlobalError=1')` reliably trigger the global boundary in CI without requiring a real production crash. The hook MUST be dev-only — production builds must exclude it via `process.env.NODE_ENV` check so attackers cannot crash pages by sending the query param.

### A.6 `src/app/error.tsx` (post-pilot segment boundary pattern, NOT in approved P3a scope)

The approved P3a pilot only creates `global-error.tsx` (A.5). This section documents the **segment `error.tsx` pattern** that future post-pilot work will use when adding boundaries to specific route segments. It is NOT a P3a deliverable; it is included here as a reference shape so the post-pilot implementer does not have to re-litigate the contract.

```tsx
"use client";
import { toast } from '@/components/ui/toast';
import { useEffect, useRef } from 'react';

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    containerRef.current?.focus();
    toast.appError(error);
    fetch('/api/internal/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message?.slice(0, 1024),
        digest: error.digest,
        path: window.location.pathname,
      }),
    }).catch(() => { /* swallow; logging is best-effort */ });
  }, [error]);
  return (
    <div ref={containerRef} tabIndex={-1} role="alert" className="...">
      <h2>Something went wrong</h2>
      <p>We could not load this section. Try again or return home.</p>
      {error.digest ? <p>Reference: {error.digest}</p> : null}
      <button onClick={unstable_retry}>Try again</button>
    </div>
  );
}
```

### A.7 `src/app/not-found.tsx` (follow-on after P3a pilot, NOT in approved pilot scope)

404 page for unmatched routes. Brand-styled, points users to home or contact. Per `07` FR-005 and `12` FR-005 row (which maps FR-005 to follow-on, not P3a-WP1), `not-found.tsx` is explicitly **out of the approved P3a pilot scope** and is implemented as a follow-on after pilot evidence. Listed here for completeness; do NOT implement in P3a.

### A.8 `src/app/api/internal/client-error/route.ts` (new in P3a)

Receives POSTs from `global-error.tsx` only in the approved P3a pilot scope. (Segment `error.tsx` POSTing is a post-pilot follow-on per `07` FR-005 and `05` A.6. Client-side `unhandledrejection` reporting is NOT in the approved P3a pilot scope per README protected-contracts — `providers.tsx` mount behavior is preserved and additive unhandled-rejection reporting is allowed only after pilot proof. ADV-09 in `09` is correspondingly deferred to follow-on.) Writes only redacted, tainted client-report fields to logger: `{ client_message_redacted, digest, path_normalized, user_agent_hashed }`. Client-supplied text is untrusted and never rendered or pasted into AI prompts as instructions.

### A.9 `scripts/tail-dev-logs.mjs` (new in P4)

Per `04_LOGGING_PIPELINE_AND_AI_LOOP.md` Section D.

## B. Modified modules

### B.1 `src/lib/component-library/action-errors.ts` (P2b follow-on after pilot)

**NOT in approved P2a pilot scope.** The approved P2a pilot is limited to `publication/actions.ts` + one representative route handler per `README` and `08` P2a. The `throwActionError` shim migration below is part of the broad P2b migration that follows pilot evidence. Included here as the reference shape so the post-pilot implementer does not have to re-litigate the contract.

Existing `throwActionError` becomes a thin shim that throws a typed `AppError.InternalError`:

```ts
// after
import { InternalError } from '@/lib/observability/app-error';
import { logger } from '@/lib/observability/logger';

export function throwActionError(userMessage: string, cause?: unknown): never {
  const err = new InternalError({ userMessage, code: 'LIBRARY_ACTION', cause });
  logger.error(err.toLogRecord());
  throw err;
}
```

The function signature is unchanged — call sites keep working. Existing tests in `tests/vitest/library-action-errors.test.ts` continue to pass.

### B.2 `src/lib/auth/error-mapping.ts` (P2b after pilot)

Add `mapAuthCodeToAppError` bridge per `03` Section F. Existing `mapAuthErrorToCode` unchanged.

### B.3 Pilot server action first; all 22 server action files after pilot (P2a/P2b)

The pilot wraps `publication/actions.ts` first. After pilot evidence, each remaining module gets its exported actions wrapped:
```ts
// before
export async function createProject(input: CreateProjectInput) { ... }
// after
const _createProject = async (input: CreateProjectInput) => { ... };
export const createProject = withActionErrors(_createProject);
```

### B.4 Pilot route handler first; all 22 route handler files after pilot (P2a/P2b)

The pilot wraps one representative handler first. After pilot evidence, each remaining handler gets a try/catch wrapper. The handler must include `trace_id` per `07` FR-003 AC-003.1; `errorResponse()` derives it from the active PERF_TRACE context (or generates one when no trace is active) so callers do not need to thread it manually:
```ts
// before
export async function POST(req: NextRequest) {
  const body = await req.json();
  // ... do stuff
  return NextResponse.json({ ok: true, data: result });
}
// after
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // ... do stuff
    return NextResponse.json({ ok: true, data: result });
  } catch (err) {
    // errorResponse() reads PERF_TRACE AsyncLocalStorage to derive trace_id;
    // falls back to a generated id when no trace is active. The returned
    // NextResponse.json body is `{ok:false, error:{...}, trace_id}` per FR-003.
    return errorResponse(err);
  }
}
```

The optional second argument `errorResponse(err, traceId)` is reserved for handlers that compute their own trace id (e.g. middleware-injected); the single-arg form is the canonical pilot pattern.

### B.5 `src/components/ui/toast.tsx` (P3a)

Add `toast.appError(err)` convenience. Existing API untouched.

### B.6 `src/lib/perf/server-timing.ts` (UNCHANGED)

Consumed by the logger; not modified.

### B.7 `next.config.ts` (P5 only)

Add the `sentry` key. CSP/headers/redirects untouched.

### B.8 `.gitignore` (P4)

Add `logs/` entry.

### B.9 `package.json` (P4 scripts + P5 dep)

- **P4** adds local `logs:tail`, `logs:explain`, `logs:dev` scripts (per `08` P4-WP5) — no new dependencies, just script entries.
- **P5** adds the `@sentry/nextjs` dependency only after the owner/provider gate.
- P1 uses native file writing and no new logger dependency.

## C. Module dependency graph

```
instrumentation.ts ───▶ sentry.server.config.ts ─▶ @sentry/nextjs
                                                └▶ src/lib/observability/redact.ts

src/lib/observability/
├── logger.ts ─────▶ src/lib/perf/server-timing.ts (unchanged)
│                └─▶ @sentry/nextjs (P5)
├── app-error.ts ─▶ (none)
├── action-result.ts
├── unwrap-supabase.ts ─▶ app-error.ts
├── with-action-errors.ts ─▶ app-error.ts, logger.ts, action-result.ts
├── route-error.ts ─▶ app-error.ts, logger.ts
├── redact.ts
├── toast-config.ts ─▶ app-error.ts
└── types.ts

src/app/global-error.tsx ─▶ fetch /api/internal/client-error
src/app/error.tsx ─▶ @/components/ui/toast
src/app/api/internal/client-error/route.ts ─▶ src/lib/observability/logger.ts

src/lib/*/actions.ts (22 files) ─▶ src/lib/observability/with-action-errors.ts
src/app/api/**/route.ts (22 files) ─▶ src/lib/observability/route-error.ts
```

## D. Runtime flow — what happens when an error occurs

### D.1 Server action throws

```
1. User clicks "Create Project" in browser
2. Client calls createProject(input) server action via React 19 useActionState
3. Server action body executes:
   try {
     const result = await withActionErrors(_createProject)(input);
     // result is ActionResult<T>
   } catch never — wrapper catches everything
4. Inside wrapper:
   - try { data = await _createProject(input) } catch (err) {
       if (err instanceof AppError) { logger.error(err.toLogRecord()); return { ok:false, error: err.toClientJSON() } }
       const wrapped = new InternalError({ cause: err }); logger.error(wrapped.toLogRecord()); return { ok:false, error: wrapped.toClientJSON() }
     }
5. logger.error writes:
   - DEV: append to ./logs/dev.ndjson
   - PROD (P5): forward to Sentry via captureException
6. Client receives { ok:false, error:{ kind, code, message } }
7. useActionState surfaces error.message → render in form
8. ALSO: if the calling component opts in, toast.appError(err) shows the toast
```

### D.2 Route handler throws

Similar to server action, but uses `errorResponse(err, traceId)` to produce a `NextResponse.json({...}, {status})`.

### D.3 Page render throws (RSC or client)

Next.js 16 catches via the nearest `error.tsx` boundary. The `error.tsx` shows a fallback UI + calls `toast.appError`. It does NOT auto-notify the server: `error.tsx` is a Client Component boundary, and the Next.js 16 `instrumentation.ts` `onRequestError` hook is server-scope only (it fires for errors captured in route handlers, server actions, and server-side render — not for client-side boundary catches). If a segment-level client boundary failure needs server-side diagnosis, the post-pilot segment `error.tsx` (per A.6, NOT in P3a) may explicitly POST to `/api/internal/client-error`. The approved P3a pilot boundary is `global-error.tsx` only (D.4); segment `error.tsx` reporting is post-pilot.

### D.4 Root layout / providers throw

`global-error.tsx` catches. Renders minimal `<html><body>` shell + the failure UI. The `useEffect` POSTs to `/api/internal/client-error` so the server log knows.

### D.5 Production error reaches Sentry

`instrumentation.ts`'s `onRequestError(err, request, context)` fires whenever Next.js server captures an error. Sentry captures the exception with sanitized request/context breadcrumbs only.

## E. Validation contracts (drives `08_IMPLEMENTATION_PLAN.md`)

| Behavior | Verified by |
|---|---|
| `AppError` subclasses are exhaustive | `tests/vitest/app-error.test.ts` (new P1) |
| `unwrapSupabase` maps every Postgres code we care about | `tests/vitest/unwrap-supabase.test.ts` (new P1) |
| `withActionErrors` returns `ActionResult<T>` shape | `tests/vitest/with-action-errors.test.ts` (new P1) |
| Dev logger writes valid NDJSON to `./logs/dev.ndjson` | `tests/vitest/logger.test.ts` (new P4) |
| `toast.appError` picks correct tone per `code` (with `kind` fallback) per `03` Section C.1 | `tests/vitest/toast-apperror.test.tsx` (new P3a) |
| Selected pilot boundary renders safely | DOM/static test or Playwright `e2e/global-error.spec.ts` when browser proof is required (new P3a) |
| `instrumentation.ts` register + onRequestError wires Sentry | `tests/vitest/instrumentation.test.ts` (new P5) |
| `scripts/tail-dev-logs.mjs` parses every record shape | `tests/unit/tail-dev-logs.test.ts` (new P4) |
| Pilot server action migration preserves behavior | Targeted existing tests show no new failures against the recorded baseline |

## F. Bundle impact (verified by `@next/bundle-analyzer` in P5)

- @sentry/nextjs client: ~20 KB gzipped, additive
- @sentry/nextjs server: serverless function size; ~50 KB additive
- Plan adds bundle-analyzer CI gate to fail if delta > 60 KB

## G. Protected-contract reminder

Per README, these contracts stay stable:
- `src/components/ui/toast.tsx` base API (extended only)
- `src/app/providers.tsx` ToastProvider mount behavior
- `src/lib/auth/error-mapping.ts` existing codes (bridge added, not replaced)
- `src/lib/auth/account-audit.ts`
- `src/middleware.ts` / `src/proxy.ts` runtime behavior
- All 67 Supabase migrations
- All RLS policies
- `vercel.json` regions/crons
- `next.config.ts` CSP/headers/redirects (Sentry additions are P5 owner/provider-gated)
- `.github/workflows/*` existing steps (source-map upload is P5 owner/provider-gated)
