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
├── toast-config.ts               # AppErrorKind → {tone, copy, duration} map
└── types.ts                      # DevLogRecord, AppErrorLogRecord shared types
```

Total new code in P1: ~600 lines.

### A.2 `instrumentation.ts` at project root (new in P5)

```ts
// instrumentation.ts
import { type Instrumentation } from 'next';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
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
  Sentry.captureException(error, {
    extra: {
      method: request.method,
      path: request.path,
      routePath: context.routePath,
      routerKind: context.routerKind,
    },
  });
}
```

### A.4 `sentry.client.config.ts` (new in P5)

Mirrors server config; loaded by the Next.js Sentry wizard. Same redaction rules.

### A.5 `src/app/global-error.tsx` (new in P3)

```tsx
"use client";
import { useEffect } from 'react';

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // Client-side error → also forward to server log via /api/internal/client-error
    fetch('/api/internal/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: error.message, digest: error.digest }),
    }).catch(() => { /* swallow; logging is best-effort */ });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main role="alert">
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

### A.6 `src/app/error.tsx` (pilot UI surface in P3)

```tsx
"use client";
import { toast } from '@/components/ui/toast';
import { useEffect } from 'react';

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    toast.appError(error);
  }, [error]);
  return (
    <div role="alert" className="...">
      <h2>Something went wrong</h2>
      <p>We could not load this section. Try again or return home.</p>
      {error.digest ? <p>Reference: {error.digest}</p> : null}
      <button onClick={unstable_retry}>Try again</button>
    </div>
  );
}
```

### A.7 `src/app/not-found.tsx` (new in P3)

404 page for unmatched routes. Brand-styled, points users to home or contact.

### A.8 `src/app/api/internal/client-error/route.ts` (new in P3)

Receives POSTs from `global-error.tsx` and client-side unhandledrejection handler. Writes only redacted, tainted client-report fields to logger: `{ client_message_redacted, digest, path_normalized, user_agent_hashed }`. Client-supplied text is untrusted and never rendered or pasted into AI prompts as instructions.

### A.9 `scripts/tail-dev-logs.mjs` (new in P4)

Per `04_LOGGING_PIPELINE_AND_AI_LOOP.md` Section D.

## B. Modified modules

### B.1 `src/lib/component-library/action-errors.ts` (P2)

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

The pilot wraps one representative handler first. After pilot evidence, each remaining handler gets a try/catch wrapper:
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
    return errorResponse(err);
  }
}
```

### B.5 `src/components/ui/toast.tsx` (P3)

Add `toast.appError(err)` convenience. Existing API untouched.

### B.6 `src/lib/perf/server-timing.ts` (UNCHANGED)

Consumed by the logger; not modified.

### B.7 `next.config.ts` (P5 only)

Add the `sentry` key. CSP/headers/redirects untouched.

### B.8 `.gitignore` (P4)

Add `logs/` entry.

### B.9 `package.json` (P5 only)

P1 uses native file writing and no new logger dependency. P5 adds `@sentry/nextjs` only after the owner/provider gate.

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

### D.3 Page render throws (RSC)

Next.js 16 catches via the nearest `error.tsx` boundary. The `error.tsx` shows a fallback UI + calls `toast.appError` + does NOT auto-notify the server (the boundary already implies Next.js's onRequestError hook fired — see D.5).

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
| `toast.appError` picks correct tone per kind | `tests/vitest/toast-apperror.test.tsx` (new P3a) |
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
